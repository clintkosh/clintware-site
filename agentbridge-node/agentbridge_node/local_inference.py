from __future__ import annotations

import ctypes
import importlib.util
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import time
from typing import Iterable

_GIB = 1024 ** 3
_DEFAULT_CONTEXT = 4096


def _run(argv: list[str], timeout: int = 8, env: dict[str, str] | None = None) -> tuple[int, str]:
    try:
        proc = subprocess.run(argv, text=True, capture_output=True, timeout=timeout, env=env)
        output = "\n".join(x for x in (proc.stdout.strip(), proc.stderr.strip()) if x).strip()
        return proc.returncode, output[:20000]
    except (OSError, subprocess.TimeoutExpired):
        return 127, ""


def _which_any(names: Iterable[str]) -> str:
    for name in names:
        path = shutil.which(name)
        if path:
            return path
    return ""


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
    state = MEMORYSTATUSEX()
    state.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
    try:
        ok = ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(state))
    except Exception:
        ok = 0
    if not ok:
        return {}
    return {
        "total_bytes": int(state.ullTotalPhys),
        "available_bytes": int(state.ullAvailPhys),
        "load_percent": int(state.dwMemoryLoad),
    }


def _memory_posix() -> dict:
    try:
        page = int(os.sysconf("SC_PAGE_SIZE"))
        total = page * int(os.sysconf("SC_PHYS_PAGES"))
        avail = page * int(os.sysconf("SC_AVPHYS_PAGES"))
        return {
            "total_bytes": total,
            "available_bytes": avail,
            "load_percent": round((1 - (avail / total)) * 100) if total else None,
        }
    except (ValueError, OSError, AttributeError):
        return {}


def memory_snapshot() -> dict:
    row = _memory_windows() if os.name == "nt" else _memory_posix()
    row.setdefault("total_bytes", 0)
    row.setdefault("available_bytes", 0)
    row["total_gib"] = round(row["total_bytes"] / _GIB, 2) if row["total_bytes"] else None
    row["available_gib"] = round(row["available_bytes"] / _GIB, 2) if row["available_bytes"] else None
    return row


def _windows_gpu_rows() -> list[dict]:
    powershell = _which_any(["pwsh", "powershell"])
    if not powershell:
        return []
    script = (
        "Get-CimInstance Win32_VideoController | "
        "Select-Object Name,AdapterRAM,DriverVersion,PNPDeviceID | ConvertTo-Json -Compress"
    )
    code, output = _run([powershell, "-NoProfile", "-Command", script], timeout=8)
    if code != 0 or not output:
        return []
    try:
        data = json.loads(output)
    except json.JSONDecodeError:
        return []
    rows = data if isinstance(data, list) else [data]
    out = []
    for item in rows:
        if not isinstance(item, dict):
            continue
        raw_ram = item.get("AdapterRAM")
        try:
            vram = int(raw_ram or 0)
        except (TypeError, ValueError):
            vram = 0
        out.append({
            "name": str(item.get("Name") or "GPU"),
            "adapter_ram_bytes": vram or None,
            "adapter_ram_gib": round(vram / _GIB, 2) if vram else None,
            "driver": str(item.get("DriverVersion") or ""),
            "pnp_device_id": str(item.get("PNPDeviceID") or ""),
            "note": "Windows AdapterRAM is advisory; shared-memory and large-VRAM devices may be reported imprecisely.",
        })
    return out


def gpu_snapshot() -> list[dict]:
    if os.name == "nt":
        return _windows_gpu_rows()
    rows = []
    nvidia = _which_any(["nvidia-smi"])
    if nvidia:
        code, output = _run([nvidia, "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits"], timeout=6)
        if code == 0:
            for line in output.splitlines():
                parts = [x.strip() for x in line.split(",")]
                if len(parts) >= 3:
                    try:
                        mib = float(parts[1])
                    except ValueError:
                        mib = 0.0
                    rows.append({"name": parts[0], "adapter_ram_gib": round(mib / 1024, 2) if mib else None, "driver": parts[2]})
    return rows


def runtime_snapshot() -> list[dict]:
    ollama = shutil.which("ollama")
    llama_server = _which_any(["llama-server", "llama-server.exe"])
    llama_cli = _which_any(["llama-cli", "llama-cli.exe", "main", "main.exe"])
    rows: list[dict] = []
    if ollama:
        code, _ = _run([ollama, "list"], timeout=6)
        rows.append({"runtime": "ollama", "path": ollama, "ready": code == 0, "detail": "local service responding" if code == 0 else "installed; service unavailable"})
    if llama_server or llama_cli:
        rows.append({"runtime": "llama.cpp", "path": llama_server or llama_cli, "server": llama_server, "cli": llama_cli, "ready": True, "detail": "local binary detected"})
    if importlib.util.find_spec("onnxruntime_genai") is not None:
        rows.append({"runtime": "onnxruntime-genai", "path": "python", "ready": True, "detail": "Python package detected"})
    return rows


def _parse_size(value: str) -> int:
    m = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)\s*([kmgt]?b)\s*$", value, re.I)
    if not m:
        return 0
    scale = {"b": 1, "kb": 1024, "mb": 1024**2, "gb": 1024**3, "tb": 1024**4}[m.group(2).lower()]
    return int(float(m.group(1)) * scale)


def _ollama_models() -> list[dict]:
    exe = shutil.which("ollama")
    if not exe:
        return []
    code, output = _run([exe, "list"], timeout=7)
    if code != 0:
        return []
    rows = []
    for line in output.splitlines()[1:]:
        parts = line.split()
        if not parts:
            continue
        name = parts[0]
        size = 0
        for i in range(1, len(parts) - 1):
            size = _parse_size(parts[i] + parts[i + 1])
            if size:
                break
        rows.append({"id": f"ollama:{name}", "name": name, "runtime": "ollama", "size_bytes": size or None, "path": None})
    return rows


def configured_model_dirs(config: dict | None = None) -> list[Path]:
    config = config or {}
    values: list[str] = []
    values.extend(str(x) for x in (config.get("model_dirs") or []) if str(x).strip())
    env_dirs = os.environ.get("QUILLGEIST_MODEL_DIRS", "")
    if env_dirs:
        values.extend(x for x in env_dirs.split(os.pathsep) if x.strip())
    values.append(str(Path.home() / ".quillgeist" / "models"))
    seen = set()
    result = []
    for raw in values:
        try:
            p = Path(raw).expanduser().resolve()
        except OSError:
            continue
        key = os.path.normcase(str(p))
        if key not in seen:
            seen.add(key)
            result.append(p)
    return result


def _gguf_models(config: dict | None = None, max_files: int = 200) -> list[dict]:
    rows = []
    for root in configured_model_dirs(config):
        if not root.exists() or not root.is_dir():
            continue
        try:
            for path in root.rglob("*.gguf"):
                try:
                    size = path.stat().st_size
                except OSError:
                    continue
                rows.append({"id": f"gguf:{path}", "name": path.name, "runtime": "llama.cpp", "size_bytes": size, "path": str(path)})
                if len(rows) >= max_files:
                    return rows
        except OSError:
            continue
    return rows


def model_inventory(config: dict | None = None) -> list[dict]:
    rows = _ollama_models() + _gguf_models(config)
    rows.sort(key=lambda r: (r.get("runtime", ""), r.get("name", "").lower()))
    return rows


def estimate_fit(size_bytes: int | None, *, context_tokens: int = _DEFAULT_CONTEXT, memory: dict | None = None, reserve_gib: float = 2.0) -> dict:
    memory = memory or memory_snapshot()
    available = int(memory.get("available_bytes") or 0)
    if not size_bytes or size_bytes <= 0 or available <= 0:
        return {"fit": "unknown", "reason": "model size or available memory is unknown", "estimated_working_set_gib": None, "available_after_reserve_gib": None}
    context_tokens = max(512, min(int(context_tokens or _DEFAULT_CONTEXT), 262144))
    reserve = max(0.5, float(reserve_gib or 2.0)) * _GIB
    overhead = max(768 * 1024**2, int(size_bytes * 0.16))
    context = context_tokens * 384 * 1024
    estimated = int(size_bytes) + overhead + context
    usable = max(0, available - int(reserve))
    ratio = estimated / usable if usable else 99.0
    if ratio <= 0.72:
        fit_state = "likely"
    elif ratio <= 1.0:
        fit_state = "tight"
    else:
        fit_state = "no"
    return {
        "fit": fit_state,
        "estimated_working_set_gib": round(estimated / _GIB, 2),
        "available_after_reserve_gib": round(usable / _GIB, 2),
        "context_tokens": context_tokens,
        "reserve_gib": reserve_gib,
        "method": "conservative architecture-neutral estimate; benchmark before trusting production settings",
    }


def _find_model(selector: str, models: list[dict]) -> dict | None:
    target = str(selector or "").strip()
    if not target:
        return None
    exact = [m for m in models if target in {m.get("id"), m.get("name"), m.get("path")}]
    if exact:
        return exact[0]
    lowered = target.lower()
    fuzzy = [m for m in models if lowered == str(m.get("name") or "").lower()]
    return fuzzy[0] if fuzzy else None


def status(config: dict | None = None) -> dict:
    memory = memory_snapshot()
    runtimes = runtime_snapshot()
    models = model_inventory(config)
    reserve = float((config or {}).get("ram_reserve_gib") or 2.0)
    rows = []
    for model in models:
        row = dict(model)
        row["fit"] = estimate_fit(row.get("size_bytes"), memory=memory, reserve_gib=reserve)
        rows.append(row)
    return {
        "platform": platform.platform(),
        "machine": platform.machine(),
        "memory": memory,
        "gpus": gpu_snapshot(),
        "runtimes": runtimes,
        "models": rows,
        "model_count": len(rows),
        "network_required": False,
        "model_downloads_performed": False,
    }


def benchmark(model_selector: str, *, prompt: str = "Reply with the single word READY.", max_tokens: int = 48, timeout: int = 60, config: dict | None = None) -> dict:
    models = model_inventory(config)
    model = _find_model(model_selector, models)
    if not model:
        return {"ok": False, "error": "installed_model_not_found", "model": model_selector}
    prompt = str(prompt or "")[:1000] or "Reply with the single word READY."
    max_tokens = max(1, min(int(max_tokens or 48), 256))
    timeout = max(5, min(int(timeout or 60), 180))
    started = time.perf_counter()
    if model["runtime"] == "ollama":
        exe = shutil.which("ollama")
        if not exe:
            return {"ok": False, "error": "ollama_not_available"}
        code, output = _run([exe, "run", model["name"], prompt], timeout=timeout)
    else:
        exe = _which_any(["llama-cli", "llama-cli.exe", "main", "main.exe"])
        if not exe or not model.get("path"):
            return {"ok": False, "error": "llama_cli_not_available"}
        code, output = _run([exe, "-m", str(model["path"]), "-p", prompt, "-n", str(max_tokens), "--no-display-prompt"], timeout=timeout)
    elapsed = max(0.001, time.perf_counter() - started)
    return {
        "ok": code == 0,
        "model": model["id"],
        "runtime": model["runtime"],
        "elapsed_seconds": round(elapsed, 3),
        "output_chars": len(output),
        "chars_per_second": round(len(output) / elapsed, 2),
        "exit_code": code,
        "output_tail": output[-2000:],
        "download_attempted": False,
    }


def route_recommendation(*, task: str = "general", prefer_local: bool = True, privacy_required: bool = False, context_tokens: int = _DEFAULT_CONTEXT, config: dict | None = None) -> dict:
    snapshot = status(config)
    viable = []
    for model in snapshot["models"]:
        model_fit = estimate_fit(model.get("size_bytes"), context_tokens=context_tokens, memory=snapshot["memory"], reserve_gib=float((config or {}).get("ram_reserve_gib") or 2.0))
        if model_fit.get("fit") in {"likely", "tight"}:
            viable.append({"model": model["id"], "runtime": model["runtime"], "fit": model_fit["fit"], "size_bytes": model.get("size_bytes")})
    viable.sort(key=lambda x: (x["fit"] != "likely", -(x.get("size_bytes") or 0)))
    if viable and (prefer_local or privacy_required):
        choice = {"target": "local", **viable[0]}
        reason = "local model selected because it is installed and fits the current memory envelope"
    else:
        choice = {"target": "external"}
        reason = "no installed local model met the requested routing preference and fit guard"
    return {
        "task": task,
        "privacy_required": bool(privacy_required),
        "prefer_local": bool(prefer_local),
        "choice": choice,
        "local_candidates": viable[:8],
        "reason": reason,
        "note": "This local router ranks installed runtimes only; an upstream provider router may compare external-model quality separately.",
    }
