from __future__ import annotations

import ctypes
import importlib.util
import json
import os
from pathlib import Path
import platform
import re
import shutil
import statistics
import subprocess
import time
import urllib.error
import urllib.request
import uuid
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
    bitnet = _bitnet_runtime()
    if bitnet:
        rows.append(bitnet)
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


def _bitnet_roots() -> list[Path]:
    values = []
    if os.environ.get("QUILLGEIST_BITNET_HOME"):
        values.append(os.environ["QUILLGEIST_BITNET_HOME"])
    if os.name == "nt":
        values.extend([r"C:\AI\BitNet", r"F:\AI-Data\BitNet", r"F:\AI-Data\Models\BitNet"])
    values.append(str(Path.home() / ".quillgeist" / "bitnet"))
    seen, out = set(), []
    for raw in values:
        path = Path(raw).expanduser()
        key = os.path.normcase(str(path))
        if key not in seen:
            seen.add(key)
            out.append(path)
    return out


def _bitnet_executable(name: str) -> str:
    names = [name + ".exe", name] if os.name == "nt" and not name.lower().endswith(".exe") else [name]
    for root in _bitnet_roots():
        for candidate in names:
            for rel in (Path("build") / "bin" / "Release" / candidate, Path("build") / "bin" / candidate):
                path = root / rel
                if path.is_file():
                    return str(path)
    return ""


def _bitnet_runtime() -> dict | None:
    cli = _bitnet_executable("llama-cli")
    server = _bitnet_executable("llama-server")
    existing = next((str(p) for p in _bitnet_roots() if p.exists()), "")
    if not cli and not server and not existing:
        return None
    return {
        "runtime": "bitnet.cpp",
        "path": cli or server or existing,
        "server": server or None,
        "cli": cli or None,
        "ready": bool(cli),
        "detail": "official Microsoft BitNet runtime detected" if cli else "BitNet files detected; runtime build incomplete",
    }


def _bitnet_models(max_files: int = 100) -> list[dict]:
    rows, seen = [], set()
    for root in _bitnet_roots():
        if not root.exists():
            continue
        for model_root in (root / "models", root):
            if not model_root.exists():
                continue
            try:
                for path in model_root.rglob("*.gguf"):
                    key = os.path.normcase(str(path))
                    if key in seen:
                        continue
                    seen.add(key)
                    try:
                        size = path.stat().st_size
                    except OSError:
                        continue
                    rows.append({"id": f"bitnet:{path}", "name": path.name, "runtime": "bitnet.cpp", "size_bytes": size, "path": str(path)})
                    if len(rows) >= max_files:
                        return rows
            except OSError:
                pass
    return rows


def model_inventory(config: dict | None = None) -> list[dict]:
    rows = _ollama_models() + _gguf_models(config) + _bitnet_models()
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


def _state_root() -> Path:
    root = Path(os.environ.get("QUILLGEIST_HOME", os.environ.get("AGENTBRIDGE_HOME", Path.home() / ".quillgeist"))).expanduser()
    path = root / "local-ai"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _append_history(row: dict) -> None:
    path = _state_root() / "measurements.jsonl"
    item = {"timestamp": int(time.time() * 1000), **row}
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(item, ensure_ascii=False) + "\n")
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
        if len(lines) > 2000:
            path.write_text("\n".join(lines[-2000:]) + "\n", encoding="utf-8")
    except OSError:
        pass


def measurement_history(limit: int = 200) -> list[dict]:
    path = _state_root() / "measurements.jsonl"
    if not path.exists():
        return []
    rows = []
    try:
        for line in path.read_text(encoding="utf-8").splitlines()[-max(1, min(int(limit), 2000)):]:
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(item, dict):
                rows.append(item)
    except OSError:
        return []
    return rows


def _ollama_generate(model: str, prompt: str, *, context_tokens: int, max_tokens: int, timeout: int) -> dict:
    payload = json.dumps({
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"num_ctx": context_tokens, "num_predict": max_tokens},
    }).encode("utf-8")
    request = urllib.request.Request(
        "http://127.0.0.1:11434/api/generate",
        data=payload,
        method="POST",
        headers={"content-type": "application/json", "user-agent": "quillgeist-local-ai"},
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (OSError, urllib.error.URLError, json.JSONDecodeError) as exc:
        return {"ok": False, "error": "ollama_local_api_failed", "detail": str(exc)[:500]}
    elapsed = max(0.001, time.perf_counter() - started)
    text = str(data.get("response") or "")
    eval_count = int(data.get("eval_count") or 0)
    eval_duration = int(data.get("eval_duration") or 0)
    tokens_per_second = round(eval_count / (eval_duration / 1_000_000_000), 2) if eval_count and eval_duration else None
    return {
        "ok": True,
        "output": text,
        "elapsed_seconds": round(elapsed, 3),
        "eval_count": eval_count or None,
        "prompt_eval_count": int(data.get("prompt_eval_count") or 0) or None,
        "tokens_per_second": tokens_per_second,
        "context_controlled": True,
    }


def benchmark(model_selector: str, *, prompt: str = "Reply with the single word READY.", max_tokens: int = 48, timeout: int = 60, context_tokens: int = _DEFAULT_CONTEXT, config: dict | None = None, record: bool = True) -> dict:
    models = model_inventory(config)
    model = _find_model(model_selector, models)
    if not model:
        return {"ok": False, "error": "installed_model_not_found", "model": model_selector}
    prompt = str(prompt or "")[:1000] or "Reply with the single word READY."
    max_tokens = max(1, min(int(max_tokens or 48), 256))
    timeout = max(5, min(int(timeout or 60), 180))
    context_tokens = max(512, min(int(context_tokens or _DEFAULT_CONTEXT), 262144))
    started = time.perf_counter()
    tokens_per_second = None
    context_controlled = False
    if model["runtime"] == "ollama":
        api_result = _ollama_generate(model["name"], prompt, context_tokens=context_tokens, max_tokens=max_tokens, timeout=timeout)
        if api_result.get("ok"):
            output = str(api_result.get("output") or "")
            code = 0
            elapsed = float(api_result.get("elapsed_seconds") or max(0.001, time.perf_counter() - started))
            tokens_per_second = api_result.get("tokens_per_second")
            context_controlled = True
        else:
            exe = shutil.which("ollama")
            if not exe:
                return {"ok": False, "error": "ollama_not_available"}
            code, output = _run([exe, "run", model["name"], prompt], timeout=timeout)
            elapsed = max(0.001, time.perf_counter() - started)
    elif model["runtime"] == "bitnet.cpp":
        exe = _bitnet_executable("llama-cli")
        if not exe or not model.get("path"):
            return {"ok": False, "error": "bitnet_cli_not_available"}
        code, output = _run([exe, "-m", str(model["path"]), "-p", prompt, "-n", str(max_tokens), "-c", str(context_tokens), "-t", str(max(1, (os.cpu_count() or 4) // 2)), "--no-display-prompt"], timeout=timeout)
        elapsed = max(0.001, time.perf_counter() - started)
        context_controlled = True
    else:
        exe = _which_any(["llama-cli", "llama-cli.exe", "main", "main.exe"])
        if not exe or not model.get("path"):
            return {"ok": False, "error": "llama_cli_not_available"}
        code, output = _run([exe, "-m", str(model["path"]), "-p", prompt, "-n", str(max_tokens), "-c", str(context_tokens), "--no-display-prompt"], timeout=timeout)
        elapsed = max(0.001, time.perf_counter() - started)
        context_controlled = True
    result = {
        "ok": code == 0,
        "model": model["id"],
        "runtime": model["runtime"],
        "context_tokens": context_tokens,
        "context_controlled": context_controlled,
        "elapsed_seconds": round(elapsed, 3),
        "output_chars": len(output),
        "chars_per_second": round(len(output) / elapsed, 2),
        "tokens_per_second": tokens_per_second,
        "exit_code": code,
        "output_tail": output[-2000:],
        "download_attempted": False,
    }
    if record:
        _append_history({k: v for k, v in result.items() if k != "output_tail"})
    return result


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


def fallback_plan(*, task: str = "general", context_tokens: int = _DEFAULT_CONTEXT, config: dict | None = None) -> dict:
    routed = route_recommendation(task=task, prefer_local=True, context_tokens=context_tokens, config=config)
    tiers = []
    for index, row in enumerate(routed.get("local_candidates") or [], start=1):
        tiers.append({"tier": index, "target": "local", **row})
    tiers.append({"tier": len(tiers) + 1, "target": "external", "reason": "use an allowed external provider only after local candidates are unavailable or unsuitable"})
    return {"task": task, "context_tokens": context_tokens, "tiers": tiers}


def launch_plan(model_selector: str, *, context_tokens: int = _DEFAULT_CONTEXT, port: int = 11435, config: dict | None = None) -> dict:
    snapshot = status(config)
    model = _find_model(model_selector, snapshot.get("models", []))
    if not model:
        return {"ok": False, "error": "installed_model_not_found", "model": model_selector}
    context_tokens = max(512, min(int(context_tokens or _DEFAULT_CONTEXT), 262144))
    port = max(1024, min(int(port or 11435), 65535))
    reserve = float((config or {}).get("ram_reserve_gib") or 2.0)
    model_fit = estimate_fit(model.get("size_bytes"), context_tokens=context_tokens, memory=snapshot["memory"], reserve_gib=reserve)
    warnings = []
    if model_fit.get("fit") == "tight":
        warnings.append("memory fit is tight; close large applications or choose a smaller model/context")
    if model_fit.get("fit") == "no":
        return {"ok": False, "error": "memory_guard_refused", "model": model["id"], "fit": model_fit, "warnings": warnings}
    if model["runtime"] == "ollama":
        runtime = next((r for r in snapshot.get("runtimes", []) if r.get("runtime") == "ollama"), None)
        return {
            "ok": bool(runtime and runtime.get("ready")),
            "model": model["id"],
            "runtime": "ollama",
            "fit": model_fit,
            "endpoint": "http://127.0.0.1:11434",
            "argv": None,
            "launch_required": False,
            "warnings": warnings,
        }
    if model["runtime"] == "bitnet.cpp":
        server = _bitnet_executable("llama-server")
        if not server:
            return {"ok": False, "error": "bitnet_server_not_available", "model": model["id"], "fit": model_fit}
        argv = [server, "-m", str(model["path"]), "-c", str(context_tokens), "-t", str(max(1, (os.cpu_count() or 4) // 2)), "-ngl", "0", "--host", "127.0.0.1", "--port", str(port)]
        return {"ok": True, "model": model["id"], "runtime": "bitnet.cpp", "fit": model_fit, "endpoint": f"http://127.0.0.1:{port}", "argv": argv, "launch_required": True, "warnings": warnings, "shell": False}
    server = _which_any(["llama-server", "llama-server.exe"])
    if not server:
        return {"ok": False, "error": "llama_server_not_available", "model": model["id"], "fit": model_fit}
    argv = [server, "-m", str(model["path"]), "-c", str(context_tokens), "--host", "127.0.0.1", "--port", str(port)]
    return {
        "ok": True,
        "model": model["id"],
        "runtime": "llama.cpp",
        "fit": model_fit,
        "endpoint": f"http://127.0.0.1:{port}",
        "argv": argv,
        "launch_required": True,
        "warnings": warnings,
        "shell": False,
    }


def context_depth_curve(model_selector: str, contexts: list[int] | tuple[int, ...], *, prompt: str = "Reply with READY.", max_tokens: int = 32, timeout: int = 60, config: dict | None = None) -> dict:
    clean = []
    for value in contexts:
        value = max(512, min(int(value), 262144))
        if value not in clean:
            clean.append(value)
    clean = clean[:6]
    points = []
    for context_tokens in clean:
        model = _find_model(model_selector, model_inventory(config))
        if not model:
            return {"ok": False, "error": "installed_model_not_found", "model": model_selector, "points": points}
        fit_result = estimate_fit(model.get("size_bytes"), context_tokens=context_tokens, reserve_gib=float((config or {}).get("ram_reserve_gib") or 2.0))
        if fit_result.get("fit") == "no":
            points.append({"context_tokens": context_tokens, "ok": False, "skipped": True, "error": "memory_guard_refused", "fit": fit_result})
            continue
        measured = benchmark(model_selector, prompt=prompt, max_tokens=max_tokens, timeout=timeout, context_tokens=context_tokens, config=config)
        points.append({"context_tokens": context_tokens, "fit": fit_result, **measured})
    return {"ok": bool(points) and any(p.get("ok") for p in points), "model": model_selector, "points": points}


def workload_profile(limit: int = 500) -> dict:
    rows = measurement_history(limit)
    by_model: dict[str, list[dict]] = {}
    contexts: dict[int, int] = {}
    for row in rows:
        model = str(row.get("model") or "unknown")
        by_model.setdefault(model, []).append(row)
        ctx = int(row.get("context_tokens") or 0)
        if ctx:
            contexts[ctx] = contexts.get(ctx, 0) + 1
    models = []
    for model, items in by_model.items():
        speeds = [float(x["tokens_per_second"]) for x in items if x.get("tokens_per_second")]
        char_speeds = [float(x["chars_per_second"]) for x in items if x.get("chars_per_second")]
        durations = [float(x["elapsed_seconds"]) for x in items if x.get("elapsed_seconds")]
        models.append({
            "model": model,
            "measurements": len(items),
            "median_tokens_per_second": round(statistics.median(speeds), 2) if speeds else None,
            "median_chars_per_second": round(statistics.median(char_speeds), 2) if char_speeds else None,
            "median_elapsed_seconds": round(statistics.median(durations), 3) if durations else None,
            "success_rate": round(sum(1 for x in items if x.get("ok")) / len(items), 3) if items else None,
        })
    models.sort(key=lambda x: (-x["measurements"], x["model"]))
    return {
        "measurements": len(rows),
        "models": models,
        "context_histogram": [{"context_tokens": k, "measurements": contexts[k]} for k in sorted(contexts)],
        "history_path": str(_state_root() / "measurements.jsonl"),
    }


def _proposal_path(proposal_id: str) -> Path:
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", proposal_id)
    return _state_root() / "proposals" / f"{safe}.json"


def auto_fit(*, models: list[str] | None = None, contexts: list[int] | None = None, max_tokens: int = 32, timeout: int = 60, config: dict | None = None) -> dict:
    snapshot = status(config)
    available = snapshot.get("models", [])
    selected = []
    requested = set(models or [])
    for model in available:
        if requested and model.get("id") not in requested and model.get("name") not in requested:
            continue
        selected.append(model)
    selected = selected[:max(1, min(int((config or {}).get("autofit_max_models") or 3), 5))]
    contexts = contexts or list((config or {}).get("autofit_contexts") or [2048, 4096, 8192])
    contexts = [max(512, min(int(x), 262144)) for x in contexts][:4]
    trials = []
    for model in selected:
        curve = context_depth_curve(model["id"], contexts, max_tokens=max_tokens, timeout=timeout, config=config)
        for point in curve.get("points", []):
            trials.append({"model": model["id"], **point})
    viable = [x for x in trials if x.get("ok")]
    def score(row: dict) -> float:
        speed = float(row.get("tokens_per_second") or row.get("chars_per_second") or 0.0)
        fit_bonus = 1.0 if (row.get("fit") or {}).get("fit") == "likely" else 0.85
        context_bonus = min(1.25, max(0.75, float(row.get("context_tokens") or 2048) / 8192))
        return speed * fit_bonus * context_bonus
    viable.sort(key=score, reverse=True)
    chosen = viable[0] if viable else None
    proposal_id = "af-" + uuid.uuid4().hex[:12]
    proposal = {
        "proposal_id": proposal_id,
        "created_at": int(time.time() * 1000),
        "chosen": chosen,
        "trials": trials,
        "score_method": "measured throughput with conservative fit and context weighting",
        "applied": False,
    }
    path = _proposal_path(proposal_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(proposal, indent=2), encoding="utf-8")
    return proposal


def active_profile() -> dict:
    path = _state_root() / "profile.json"
    if not path.exists():
        return {"active": False, "path": str(path)}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"active": False, "path": str(path), "error": "profile_unreadable"}
    return {"active": True, "path": str(path), **data}


def apply_auto_fit(proposal_id: str) -> dict:
    path = _proposal_path(proposal_id)
    if not path.exists():
        return {"ok": False, "error": "proposal_not_found", "proposal_id": proposal_id}
    try:
        proposal = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"ok": False, "error": "proposal_unreadable", "proposal_id": proposal_id}
    chosen = proposal.get("chosen")
    if not chosen or not chosen.get("model"):
        return {"ok": False, "error": "proposal_has_no_viable_choice", "proposal_id": proposal_id}
    root = _state_root()
    profile_path = root / "profile.json"
    backup_path = root / "profile.previous.json"
    if profile_path.exists():
        try:
            shutil.copy2(profile_path, backup_path)
        except OSError:
            pass
    profile = {
        "proposal_id": proposal_id,
        "model": chosen["model"],
        "runtime": chosen.get("runtime"),
        "context_tokens": int(chosen.get("context_tokens") or _DEFAULT_CONTEXT),
        "baseline_tokens_per_second": chosen.get("tokens_per_second"),
        "baseline_chars_per_second": chosen.get("chars_per_second"),
        "applied_at": int(time.time() * 1000),
    }
    profile_path.write_text(json.dumps(profile, indent=2), encoding="utf-8")
    proposal["applied"] = True
    proposal["applied_at"] = profile["applied_at"]
    path.write_text(json.dumps(proposal, indent=2), encoding="utf-8")
    return {"ok": True, "profile": profile, "backup_exists": backup_path.exists()}


def rollback_profile() -> dict:
    root = _state_root()
    profile_path = root / "profile.json"
    backup_path = root / "profile.previous.json"
    if not backup_path.exists():
        return {"ok": False, "error": "no_previous_profile"}
    shutil.copy2(backup_path, profile_path)
    return {"ok": True, "profile": active_profile()}


def verify_profile(*, tolerance_pct: float = 20.0, timeout: int = 60, config: dict | None = None) -> dict:
    profile = active_profile()
    if not profile.get("active"):
        return {"ok": False, "error": "no_active_profile"}
    measured = benchmark(
        profile["model"],
        max_tokens=32,
        timeout=timeout,
        context_tokens=int(profile.get("context_tokens") or _DEFAULT_CONTEXT),
        config=config,
    )
    if not measured.get("ok"):
        rollback = rollback_profile()
        return {"ok": False, "verified": False, "reason": "benchmark_failed", "measurement": measured, "rollback": rollback}
    baseline = profile.get("baseline_tokens_per_second") or profile.get("baseline_chars_per_second")
    current = measured.get("tokens_per_second") or measured.get("chars_per_second")
    tolerance_pct = max(0.0, min(float(tolerance_pct), 90.0))
    floor = float(baseline or 0) * (1.0 - tolerance_pct / 100.0)
    regression = bool(baseline and current is not None and float(current) < floor)
    if regression:
        rollback = rollback_profile()
        return {"ok": False, "verified": False, "reason": "performance_regression", "baseline": baseline, "current": current, "floor": floor, "rollback": rollback}
    return {"ok": True, "verified": True, "baseline": baseline, "current": current, "measurement": measured}
