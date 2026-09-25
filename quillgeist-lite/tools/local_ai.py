from __future__ import annotations

import argparse
import ctypes
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import time
import urllib.request

GIB = 1024 ** 3


def run(argv, timeout=8):
    try:
        p = subprocess.run(argv, text=True, capture_output=True, timeout=timeout)
        output = "\n".join(x for x in (p.stdout.strip(), p.stderr.strip()) if x).strip()
        return p.returncode, output[:20000]
    except (OSError, subprocess.TimeoutExpired):
        return 127, ""


def memory():
    if os.name == "nt":
        class M(ctypes.Structure):
            _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                        ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                        ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                        ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                        ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]
        s = M()
        s.dwLength = ctypes.sizeof(M)
        try:
            ok = ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(s))
        except Exception:
            ok = 0
        if ok:
            return {"total_bytes": int(s.ullTotalPhys), "available_bytes": int(s.ullAvailPhys),
                    "total_gib": round(s.ullTotalPhys / GIB, 2), "available_gib": round(s.ullAvailPhys / GIB, 2)}
    try:
        page = int(os.sysconf("SC_PAGE_SIZE"))
        total = page * int(os.sysconf("SC_PHYS_PAGES"))
        avail = page * int(os.sysconf("SC_AVPHYS_PAGES"))
        return {"total_bytes": total, "available_bytes": avail, "total_gib": round(total / GIB, 2), "available_gib": round(avail / GIB, 2)}
    except Exception:
        return {"total_bytes": 0, "available_bytes": 0, "total_gib": None, "available_gib": None}


def parse_size(value):
    m = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)\s*([kmgt]?b)\s*$", str(value), re.I)
    if not m:
        return 0
    scale = {"b": 1, "kb": 1024, "mb": 1024**2, "gb": 1024**3, "tb": 1024**4}[m.group(2).lower()]
    return int(float(m.group(1)) * scale)


def model_dirs():
    values = []
    raw = os.environ.get("QUILLGEIST_MODEL_DIRS", "")
    if raw:
        values.extend(x for x in raw.split(os.pathsep) if x.strip())
    values.extend([
        str(Path.home() / ".quillgeist" / "models"),
        str(Path(os.environ.get("LOCALAPPDATA", Path.home())) / "Clintware" / "QuillgeistLite" / "models"),
    ])
    out = []
    seen = set()
    for raw in values:
        try:
            p = Path(raw).expanduser().resolve()
        except OSError:
            continue
        key = os.path.normcase(str(p))
        if key not in seen:
            seen.add(key)
            out.append(p)
    return out


def bitnet_roots():
    values = []
    if os.environ.get("QUILLGEIST_BITNET_HOME"):
        values.append(os.environ["QUILLGEIST_BITNET_HOME"])
    if os.name == "nt":
        values.extend([r"C:\AI\BitNet", r"F:\AI-Data\BitNet", r"F:\AI-Data\Models\BitNet"])
    values.append(str(Path.home() / ".quillgeist" / "bitnet"))
    out, seen = [], set()
    for raw in values:
        p = Path(raw).expanduser()
        key = os.path.normcase(str(p))
        if key not in seen:
            seen.add(key)
            out.append(p)
    return out


def bitnet_executable(name):
    names = [name + ".exe", name] if os.name == "nt" and not name.lower().endswith(".exe") else [name]
    for root in bitnet_roots():
        for candidate in names:
            for rel in (Path("build") / "bin" / "Release" / candidate, Path("build") / "bin" / candidate):
                path = root / rel
                if path.is_file():
                    return str(path)
    return ""


def bitnet_models():
    rows, seen = [], set()
    for root in bitnet_roots():
        if not root.exists():
            continue
        for base in (root / "models", root):
            if not base.exists():
                continue
            try:
                for path in base.rglob("*.gguf"):
                    key = os.path.normcase(str(path))
                    if key in seen:
                        continue
                    seen.add(key)
                    try:
                        size = path.stat().st_size
                    except OSError:
                        continue
                    rows.append({"id": "bitnet:" + str(path), "name": path.name, "runtime": "bitnet.cpp", "size_bytes": size, "path": str(path)})
                    if len(rows) >= 100:
                        return rows
            except OSError:
                pass
    return rows


def models():
    rows = []
    ollama = shutil.which("ollama")
    if ollama:
        code, output = run([ollama, "list"], 7)
        if code == 0:
            for line in output.splitlines()[1:]:
                parts = line.split()
                if not parts:
                    continue
                size = 0
                for i in range(1, len(parts) - 1):
                    size = parse_size(parts[i] + parts[i + 1])
                    if size:
                        break
                rows.append({"id": "ollama:" + parts[0], "name": parts[0], "runtime": "ollama", "size_bytes": size or None, "path": None})
    for root in model_dirs():
        if not root.exists() or not root.is_dir():
            continue
        try:
            for path in root.rglob("*.gguf"):
                try:
                    size = path.stat().st_size
                except OSError:
                    continue
                rows.append({"id": "gguf:" + str(path), "name": path.name, "runtime": "llama.cpp", "size_bytes": size, "path": str(path)})
                if len(rows) >= 200:
                    return rows
        except OSError:
            pass
    rows.extend(bitnet_models())
    return rows


def fit(size_bytes, context_tokens=4096, reserve_gib=2.0, mem=None):
    mem = mem or memory()
    available = int(mem.get("available_bytes") or 0)
    if not size_bytes or not available:
        return {"fit": "unknown", "reason": "model size or available memory is unknown"}
    context_tokens = max(512, min(int(context_tokens), 262144))
    reserve = max(.5, float(reserve_gib)) * GIB
    estimated = int(size_bytes) + max(768 * 1024**2, int(size_bytes * .16)) + context_tokens * 384 * 1024
    usable = max(0, available - int(reserve))
    ratio = estimated / usable if usable else 99
    state = "likely" if ratio <= .72 else "tight" if ratio <= 1 else "no"
    return {"fit": state, "estimated_working_set_gib": round(estimated / GIB, 2), "available_after_reserve_gib": round(usable / GIB, 2), "context_tokens": context_tokens, "reserve_gib": reserve_gib, "method": "conservative local estimate; benchmark before trusting production settings"}


def snapshot(context_tokens=4096):
    mem = memory()
    rows = models()
    runtimes = []
    if shutil.which("ollama"):
        code, _ = run([shutil.which("ollama"), "list"], 6)
        runtimes.append({"runtime": "ollama", "ready": code == 0, "path": shutil.which("ollama")})
    llama = next((shutil.which(x) for x in ["llama-cli", "llama-cli.exe", "main", "main.exe"] if shutil.which(x)), None)
    if llama:
        runtimes.append({"runtime": "llama.cpp", "ready": True, "path": llama})
    bitnet_cli = bitnet_executable("llama-cli")
    bitnet_root = next((str(p) for p in bitnet_roots() if p.exists()), "")
    if bitnet_cli or bitnet_root:
        runtimes.append({"runtime": "bitnet.cpp", "ready": bool(bitnet_cli), "path": bitnet_cli or bitnet_root})
    return {
        "scope": "owner-machine",
        "platform": platform.platform(),
        "memory": mem,
        "runtimes": runtimes,
        "models": [{**m, "fit": fit(m.get("size_bytes"), context_tokens, mem=mem)} for m in rows],
        "network_required": False,
        "model_downloads_performed": False,
    }


def find_model(selector, rows):
    selector = str(selector or "").strip()
    for row in rows:
        if selector in {row.get("id"), row.get("name"), row.get("path")}:
            return row
    return None


def benchmark(selector, prompt, max_tokens=48):
    rows = models()
    model = find_model(selector, rows)
    if not model:
        return {"ok": False, "error": "installed_model_not_found", "model": selector}
    prompt = (prompt or "Reply with the single word READY.")[:1000]
    max_tokens = max(1, min(int(max_tokens), 256))
    started = time.perf_counter()
    if model["runtime"] == "ollama":
        exe = shutil.which("ollama")
        if not exe:
            return {"ok": False, "error": "ollama_not_available"}
        code, output = run([exe, "run", model["name"], prompt], 60)
    elif model["runtime"] == "bitnet.cpp":
        exe = bitnet_executable("llama-cli")
        if not exe:
            return {"ok": False, "error": "bitnet_cli_not_available"}
        code, output = run([exe, "-m", model["path"], "-p", prompt, "-n", str(max_tokens), "-c", "4096", "-t", str(max(1, (os.cpu_count() or 4) // 2)), "--no-display-prompt"], 120)
    else:
        exe = next((shutil.which(x) for x in ["llama-cli", "llama-cli.exe", "main", "main.exe"] if shutil.which(x)), None)
        if not exe:
            return {"ok": False, "error": "llama_cli_not_available"}
        code, output = run([exe, "-m", model["path"], "-p", prompt, "-n", str(max_tokens), "--no-display-prompt"], 60)
    elapsed = max(.001, time.perf_counter() - started)
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



def services():
    probes = [
        ("Open WebUI", "http://127.0.0.1:3015"),
        ("Ollama", "http://127.0.0.1:11434/api/tags"),
        ("SearXNG", "http://127.0.0.1:8088"),
        ("n8n", "http://127.0.0.1:5678"),
        ("Pipelines", "http://127.0.0.1:9099"),
        ("Web Search Agent", "http://127.0.0.1:8788/health"),
        ("Media Agent", "http://127.0.0.1:8799/health"),
        ("ComfyUI", "http://127.0.0.1:8188/system_stats"),
    ]
    rows = []
    for name, url in probes:
        try:
            req = urllib.request.Request(url, headers={"user-agent": "quillgeist-lite-local-ai"})
            with urllib.request.urlopen(req, timeout=4) as response:
                rows.append({"name": name, "url": url, "ok": True, "status": response.status})
        except Exception as exc:
            rows.append({"name": name, "url": url, "ok": False, "error": str(exc)[:300]})
    return rows


def start_existing_stack():
    if os.name != "nt":
        return None
    candidates = [
        Path(r"C:\AI\LOCAL-CHATGPT\START-LOCAL-CHATGPT.bat"),
        Path(r"C:\AI\LOCAL-CHATGPT\START-LOCAL-CHATGPT.ps1"),
        Path(r"C:\AI\LOCAL-CHATGPT\START-LOCAL-AI.bat"),
    ]
    launcher = next((p for p in candidates if p.exists()), None)
    if not launcher:
        return None
    try:
        if launcher.suffix.lower() == ".ps1":
            shell = shutil.which("pwsh") or shutil.which("powershell")
            subprocess.Popen([shell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(launcher)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            subprocess.Popen(["cmd.exe", "/d", "/c", "start", "", "/min", str(launcher)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return str(launcher)
    except OSError:
        return None


def reconcile():
    before = services()
    launcher = None
    if any(not row["ok"] for row in before):
        launcher = start_existing_stack()
        if launcher:
            time.sleep(10)
    return {"before": before, "after": services(), "launcher_used": launcher, "snapshot": snapshot(4096)}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--Action", default="status", choices=["status", "fit", "benchmark", "recommend", "services", "reconcile"])
    p.add_argument("--Model", default="")
    p.add_argument("--Prompt", default="")
    p.add_argument("--ContextTokens", type=int, default=4096)
    p.add_argument("--MaxTokens", type=int, default=48)
    a = p.parse_args()
    snap = snapshot(a.ContextTokens)
    if a.Action == "status":
        out = snap
    elif a.Action == "fit":
        model = find_model(a.Model, snap["models"])
        out = {"ok": bool(model), "model": model, "error": None if model else "installed_model_not_found"}
    elif a.Action == "benchmark":
        out = benchmark(a.Model, a.Prompt, a.MaxTokens)
    elif a.Action == "services":
        out = {"services": services()}
    elif a.Action == "reconcile":
        out = reconcile()
    else:
        viable = [m for m in snap["models"] if m.get("fit", {}).get("fit") in {"likely", "tight"}]
        viable.sort(key=lambda x: (x["fit"]["fit"] != "likely", -(x.get("size_bytes") or 0)))
        out = {
            "choice": viable[0] if viable else None,
            "candidates": viable[:8],
            "reason": "largest installed model inside the current conservative memory envelope" if viable else "no installed model fits the current conservative memory envelope",
        }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
