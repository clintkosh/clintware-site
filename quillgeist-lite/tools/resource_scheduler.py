from __future__ import annotations

import argparse
import ctypes
import json
import math
import os
import shutil
import subprocess
import time
from pathlib import Path

GIB = 1024 ** 3


def _memory_windows() -> dict:
    class MEMORYSTATUSEX(ctypes.Structure):
        _fields_ = [
            ("dwLength", ctypes.c_ulong),
            ("dwMemoryLoad", ctypes.c_ulong),
            ("ullTotalPhys", ctypes.c_ulonglong),
            ("ullAvailPhys", ctypes.c_ulonglong),
            ("ullTotalPageFile", ctypes.c_ulonglong),
            ("ullAvailPageFile", ctypes.c_ulonglong),
            ("ullTotalVirtual", ctypes.c_ulonglong),
            ("ullAvailVirtual", ctypes.c_ulonglong),
            ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
        ]
    row = MEMORYSTATUSEX()
    row.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
    if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(row)):
        return {
            "total_bytes": int(row.ullTotalPhys),
            "available_bytes": int(row.ullAvailPhys),
            "load_percent": int(row.dwMemoryLoad),
        }
    return {}


def _memory() -> dict:
    if os.name == "nt":
        row = _memory_windows()
    else:
        try:
            page = int(os.sysconf("SC_PAGE_SIZE"))
            total = page * int(os.sysconf("SC_PHYS_PAGES"))
            avail = page * int(os.sysconf("SC_AVPHYS_PAGES"))
            row = {"total_bytes": total, "available_bytes": avail, "load_percent": round((1 - avail / total) * 100) if total else 0}
        except Exception:
            row = {}
    total = int(row.get("total_bytes") or 0)
    avail = int(row.get("available_bytes") or 0)
    row["total_gib"] = round(total / GIB, 2) if total else None
    row["available_gib"] = round(avail / GIB, 2) if avail else None
    return row


def _cpu_percent_windows(sample_seconds: float = 0.25) -> float | None:
    class FILETIME(ctypes.Structure):
        _fields_ = [("dwLowDateTime", ctypes.c_ulong), ("dwHighDateTime", ctypes.c_ulong)]

    def value(ft: FILETIME) -> int:
        return (int(ft.dwHighDateTime) << 32) | int(ft.dwLowDateTime)

    def sample():
        idle, kernel, user = FILETIME(), FILETIME(), FILETIME()
        ok = ctypes.windll.kernel32.GetSystemTimes(ctypes.byref(idle), ctypes.byref(kernel), ctypes.byref(user))
        return (value(idle), value(kernel), value(user)) if ok else None

    a = sample()
    if not a:
        return None
    time.sleep(max(0.05, min(sample_seconds, 1.0)))
    b = sample()
    if not b:
        return None
    idle = b[0] - a[0]
    total = (b[1] - a[1]) + (b[2] - a[2])
    if total <= 0:
        return None
    return round(max(0.0, min(100.0, (1.0 - idle / total) * 100.0)), 1)


def _cpu_percent() -> float | None:
    if os.name == "nt":
        return _cpu_percent_windows()
    try:
        load1 = os.getloadavg()[0]
        cpus = max(1, os.cpu_count() or 1)
        return round(max(0.0, min(100.0, load1 / cpus * 100.0)), 1)
    except Exception:
        return None


def _nvidia_rows() -> list[dict]:
    exe = shutil.which("nvidia-smi")
    if not exe:
        return []
    args = [
        exe,
        "--query-gpu=index,name,memory.total,memory.free,utilization.gpu,utilization.memory",
        "--format=csv,noheader,nounits",
    ]
    try:
        proc = subprocess.run(args, text=True, capture_output=True, timeout=5)
    except (OSError, subprocess.TimeoutExpired):
        return []
    if proc.returncode != 0:
        return []
    rows = []
    for line in proc.stdout.splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 6:
            continue
        try:
            index = int(parts[0])
            total_mib = float(parts[2])
            free_mib = float(parts[3])
            util = float(parts[4])
            mem_util = float(parts[5])
        except ValueError:
            continue
        free_gib = free_mib / 1024.0
        slots = 0
        if free_gib >= 3.0 and util < 92:
            slots = 1
            if free_gib >= 16.0 and util < 60:
                slots = 2
        rows.append({
            "index": index,
            "name": parts[1],
            "total_gib": round(total_mib / 1024.0, 2),
            "free_gib": round(free_gib, 2),
            "utilization_percent": round(util, 1),
            "memory_utilization_percent": round(mem_util, 1),
            "worker_slots": slots,
            "source": "nvidia-smi",
        })
    return rows


def _windows_gpu_fallback() -> list[dict]:
    if os.name != "nt":
        return []
    exe = shutil.which("pwsh") or shutil.which("powershell")
    if not exe:
        return []
    script = "Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Json -Compress"
    try:
        proc = subprocess.run([exe, "-NoProfile", "-Command", script], text=True, capture_output=True, timeout=7)
        if proc.returncode != 0 or not proc.stdout.strip():
            return []
        data = json.loads(proc.stdout)
    except Exception:
        return []
    rows = data if isinstance(data, list) else [data]
    out = []
    for index, item in enumerate(rows):
        if not isinstance(item, dict):
            continue
        try:
            raw = int(item.get("AdapterRAM") or 0)
        except (TypeError, ValueError):
            raw = 0
        out.append({
            "index": index,
            "name": str(item.get("Name") or "GPU"),
            "total_gib": round(raw / GIB, 2) if raw else None,
            "free_gib": None,
            "utilization_percent": None,
            "memory_utilization_percent": None,
            "worker_slots": 1 if raw >= 3 * GIB else 0,
            "source": "win32_video_controller",
            "note": "Fallback capacity is conservative because live VRAM utilization is unavailable.",
        })
    return out


def profile(max_workers_cap: int = 12) -> dict:
    logical = max(1, os.cpu_count() or 1)
    memory = _memory()
    cpu_percent = _cpu_percent()
    available_gib = float(memory.get("available_gib") or 0.0)

    reserve_gib = max(2.0, min(8.0, float(memory.get("total_gib") or 8.0) * 0.12))
    memory_worker_budget = max(1, int(max(0.0, available_gib - reserve_gib) // 1.5)) if available_gib else max(1, logical // 4)

    base_cpu_workers = max(1, logical // 3)
    if cpu_percent is None:
        load_factor = 0.75
    elif cpu_percent >= 90:
        load_factor = 0.25
    elif cpu_percent >= 75:
        load_factor = 0.45
    elif cpu_percent >= 55:
        load_factor = 0.70
    else:
        load_factor = 1.0
    cpu_workers = max(1, int(math.floor(base_cpu_workers * load_factor)))
    cpu_workers = min(cpu_workers, memory_worker_budget, max_workers_cap)

    gpus = _nvidia_rows() or _windows_gpu_fallback()
    gpu_workers = sum(int(row.get("worker_slots") or 0) for row in gpus)
    gpu_workers = min(gpu_workers, max(1, max_workers_cap // 2)) if gpu_workers else 0

    io_workers = min(max_workers_cap, max(2, cpu_workers + 2))
    total_workers = min(max_workers_cap, max(1, cpu_workers + min(gpu_workers, 2)))
    if memory.get("load_percent") is not None and int(memory["load_percent"]) >= 90:
        total_workers = 1
        cpu_workers = 1
        gpu_workers = min(gpu_workers, 1)
        io_workers = 1

    gpu_slot_indices = []
    for row in gpus:
        gpu_slot_indices.extend([int(row["index"])] * int(row.get("worker_slots") or 0))

    return {
        "ok": True,
        "host": os.environ.get("COMPUTERNAME") or os.uname().nodename,
        "logical_cpu_count": logical,
        "cpu_load_percent": cpu_percent,
        "memory": memory,
        "gpu_devices": gpus,
        "gpu_slot_indices": gpu_slot_indices,
        "limits": {
            "max_workers": total_workers,
            "cpu_workers": max(1, cpu_workers),
            "io_workers": max(1, io_workers),
            "gpu_workers": max(0, gpu_workers),
            "hard_cap": max_workers_cap,
        },
        "policy": {
            "adaptive": True,
            "reserve_memory_gib": round(reserve_gib, 2),
            "gpu_preferred_for_local_model": True,
            "exclusive_mutations_serialized": True,
        },
        "timestamp": time.time(),
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Quillgeist adaptive local worker capacity profiler.")
    parser.add_argument("--MaxWorkers", "--max-workers", dest="max_workers", type=int, default=int(os.environ.get("QQ_MAX_WORKERS", "12") or 12))
    args = parser.parse_args(argv)
    cap = max(1, min(32, int(args.max_workers)))
    print(json.dumps(profile(cap), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
