from __future__ import annotations
from pathlib import Path
from datetime import datetime, timezone
import base64
import hashlib
import json
import os
import platform
import shlex
import shutil
import subprocess
import sys
import time

from .config import Config, home_dir
from .contextor import compact
from .dlp import evaluate as evaluate_dlp
from .ledger import append as ledger_append
from .pack import ExecutionPack, load_pack
from .policy import evaluate, required_capabilities

class ExecutionError(RuntimeError):
    pass

def _sha256(path: Path) -> str | None:
    if not path.exists() or not path.is_file():
        return None
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def safe_path(workspace: Path, value: str) -> Path:
    p = (workspace / value).resolve()
    w = workspace.resolve()
    if p != w and w not in p.parents:
        raise ExecutionError(f"path escapes workspace: {value}")
    return p

def _run(runtime: str, command, cwd: Path, timeout: int) -> dict:
    runtime = (runtime or "shell").lower()
    if isinstance(command, list):
        argv = [str(x) for x in command]
    elif runtime == "git":
        argv = ["git", *shlex.split(str(command), posix=os.name != "nt")]
    elif runtime == "python":
        argv = [sys.executable, "-c", str(command)]
    elif runtime == "node":
        argv = ["node", "-e", str(command)]
    elif runtime == "powershell":
        exe = shutil.which("pwsh") or shutil.which("powershell")
        if not exe:
            raise ExecutionError("PowerShell runtime not found")
        argv = [exe, "-NoProfile", "-NonInteractive", "-Command", str(command)]
    else:
        argv = ["cmd.exe", "/d", "/s", "/c", str(command)] if os.name == "nt" else ["/bin/sh", "-lc", str(command)]
    started = time.time()
    try:
        proc = subprocess.run(argv, cwd=str(cwd), text=True, capture_output=True, timeout=timeout)
        return {
            "runtime": runtime,
            "command": command,
            "exit_code": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "duration_ms": int((time.time() - started) * 1000)
        }
    except subprocess.TimeoutExpired as exc:
        return {
            "runtime": runtime,
            "command": command,
            "exit_code": 124,
            "stdout": exc.stdout or "",
            "stderr": (exc.stderr or "") + f"\nAgentBridge timeout after {timeout}s",
            "duration_ms": int((time.time() - started) * 1000)
        }

def _mutated_paths(pack: ExecutionPack, workspace: Path) -> list[Path]:
    out = []
    for step in pack.manifest.get("steps", []):
        if step.get("type") in {"write_file", "patch", "delete_file", "mkdir", "extract_embedded"} and step.get("path"):
            out.append(safe_path(workspace, step["path"]))
        elif step.get("type") == "copy_file":
            out.append(safe_path(workspace, step["dst"]))
    unique, seen = [], set()
    for p in out:
        if str(p) not in seen:
            unique.append(p); seen.add(str(p))
    return unique

def _snapshot(run_id: str, workspace: Path, paths: list[Path]) -> Path:
    snap = home_dir() / "runs" / run_id / "snapshot"
    snap.mkdir(parents=True, exist_ok=True)
    entries = []
    for p in paths:
        rel = p.relative_to(workspace).as_posix()
        if p.exists() and p.is_file():
            entries.append({"path": rel, "kind": "file", "payload": base64.b64encode(p.read_bytes()).decode("ascii")})
        elif p.exists() and p.is_dir():
            entries.append({"path": rel, "kind": "dir"})
        else:
            entries.append({"path": rel, "kind": "absent"})
    (snap / "snapshot.json").write_text(json.dumps(entries, indent=2), encoding="utf-8")
    return snap

def rollback(run_id: str, workspace: str | Path) -> dict:
    workspace = Path(workspace).expanduser().resolve()
    snap = home_dir() / "runs" / run_id / "snapshot" / "snapshot.json"
    if not snap.exists():
        raise ExecutionError(f"snapshot not found for run {run_id}")
    entries = json.loads(snap.read_text(encoding="utf-8"))
    restored = []
    for item in entries:
        p = safe_path(workspace, item["path"])
        if item["kind"] == "absent":
            if p.is_file(): p.unlink()
            elif p.is_dir(): shutil.rmtree(p)
        elif item["kind"] == "dir":
            p.mkdir(parents=True, exist_ok=True)
        else:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(base64.b64decode(item["payload"]))
        restored.append(item["path"])
    ledger_append({"type": "rollback", "run_id": run_id, "workspace": str(workspace), "restored": restored})
    return {"run_id": run_id, "restored": restored}

def _execute_step(step: dict, pack: ExecutionPack, workspace: Path, timeout: int) -> dict:
    t = step.get("type")
    if t == "mkdir":
        p = safe_path(workspace, step["path"]); p.mkdir(parents=True, exist_ok=True)
        return {"type": t, "path": step["path"], "ok": True}
    if t == "write_file":
        p = safe_path(workspace, step["path"]); p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(str(step.get("content", "")), encoding=step.get("encoding", "utf-8"))
        return {"type": t, "path": step["path"], "ok": True, "sha256": _sha256(p)}
    if t == "extract_embedded":
        name = step["embedded"]
        if name not in pack.embedded_files:
            raise ExecutionError(f"embedded file not found: {name}")
        p = safe_path(workspace, step["path"]); p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(pack.embedded_files[name])
        return {"type": t, "path": step["path"], "ok": True, "sha256": _sha256(p)}
    if t == "patch":
        p = safe_path(workspace, step["path"])
        enc = step.get("encoding", "utf-8")
        text = p.read_text(encoding=enc)
        find = str(step["find"]); replace = str(step.get("replace", "")); count = int(step.get("count", 1))
        if find not in text:
            raise ExecutionError(f"patch text not found in {step['path']}")
        p.write_text(text.replace(find, replace, count), encoding=enc)
        return {"type": t, "path": step["path"], "ok": True, "sha256": _sha256(p)}
    if t == "copy_file":
        src = safe_path(workspace, step["src"]); dst = safe_path(workspace, step["dst"])
        dst.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(src, dst)
        return {"type": t, "src": step["src"], "dst": step["dst"], "ok": True, "sha256": _sha256(dst)}
    if t == "delete_file":
        p = safe_path(workspace, step["path"])
        if p.is_dir():
            shutil.rmtree(p) if step.get("recursive") else p.rmdir()
        elif p.exists():
            p.unlink()
        return {"type": t, "path": step["path"], "ok": True}
    if t == "read_file":
        p = safe_path(workspace, step["path"])
        text = p.read_text(encoding=step.get("encoding", "utf-8"))
        return {"type": t, "path": step["path"], "ok": True, "content": text[:int(step.get("max_chars", 12000))]}
    if t == "run":
        result = _run(step.get("runtime", "shell"), step.get("command", ""), workspace, int(step.get("timeout", timeout)))
        result["type"] = t
        result["ok"] = result["exit_code"] == int(step.get("expect_exit", 0))
        if not result["ok"] and not step.get("continue_on_error", False):
            raise ExecutionError(f"command failed ({result['exit_code']}): {step.get('command')}\n{result['stderr'][-4000:]}")
        return result
    raise ExecutionError(f"unsupported step type: {t}")

def _check(check: dict, workspace: Path, step_results: list[dict], timeout: int) -> dict:
    t = check.get("type")
    out = {"type": t, "label": check.get("label") or t}
    if t == "file_exists":
        out["ok"] = safe_path(workspace, check["path"]).exists()
    elif t == "file_contains":
        p = safe_path(workspace, check["path"]); out["ok"] = check["text"] in p.read_text(encoding=check.get("encoding", "utf-8"))
    elif t == "file_not_contains":
        p = safe_path(workspace, check["path"]); out["ok"] = check["text"] not in p.read_text(encoding=check.get("encoding", "utf-8"))
    elif t == "command":
        res = _run(check.get("runtime", "shell"), check.get("command", ""), workspace, int(check.get("timeout", timeout)))
        out.update(res); out["ok"] = res["exit_code"] == int(check.get("expect_exit", 0))
    elif t == "step_exit":
        index = int(check["step"]); expected = int(check.get("expect_exit", 0)); actual = step_results[index].get("exit_code")
        out.update({"actual": actual, "expected": expected, "ok": actual == expected})
    else:
        out["ok"] = False; out["error"] = f"unsupported Definition-of-Done check: {t}"
    return out

def execute(pack: ExecutionPack, config: Config | None = None, workspace_override: str | Path | None = None, approved: bool = False) -> dict:
    config = config or Config.load()
    manifest = pack.manifest
    workspace = Path(workspace_override or manifest.get("workspace") or ".").expanduser().resolve()
    workspace.mkdir(parents=True, exist_ok=True)
    if not config.workspace_allowed(workspace):
        return {"job_id": pack.id, "status": "denied", "reason": "workspace_not_allowed", "workspace": str(workspace)}

    dlp_settings = config.data.get("dlp", {})
    dlp = evaluate_dlp(manifest, dlp_settings, approved=approved) if dlp_settings.get("scan_before_execution", True) else {"enabled": False, "mode": "off", "action": "allow", "findings": [], "counts": {}}
    if dlp["action"] == "deny":
        return {
            "job_id": pack.id,
            "status": "denied",
            "reason": "sensitive_data_detected",
            "dlp": dlp,
            "planner_feedback": "Quillgeist blocked this run locally because Strict sensitive-data protection found protected content. Redact or remove the finding before retrying."
        }
    if dlp["action"] == "approval_required":
        return {
            "job_id": pack.id,
            "status": "approval_required",
            "reason": "sensitive_data_detected",
            "needs_approval": ["dlp.sensitive_data"],
            "dlp": dlp,
            "planner_feedback": "Quillgeist found high-risk sensitive data before execution. Review or redact it before sending it onward; Standard mode permits an explicit override."
        }

    decision = evaluate(manifest, config.data.get("policy", {}), approved=approved)
    if decision.denied:
        return {"job_id": pack.id, "status": "denied", "denied": decision.denied, "needs_approval": decision.needs_approval, "dlp": dlp}
    if decision.needs_approval:
        return {
            "job_id": pack.id,
            "status": "approval_required",
            "needs_approval": decision.needs_approval,
            "capabilities": sorted(required_capabilities(manifest)),
            "dlp": dlp
        }

    run_id = f"{pack.id}-{int(time.time())}"
    mutation_paths = _mutated_paths(pack, workspace)
    changed_before = {p.as_posix(): _sha256(p) for p in mutation_paths}
    _snapshot(run_id, workspace, mutation_paths)
    started = time.time()
    step_results, checks = [], []
    status, error = "passed", None
    timeout = int(manifest.get("max_runtime_seconds", 900))
    try:
        for idx, step in enumerate(manifest.get("steps", [])):
            result = _execute_step(step, pack, workspace, timeout); result["index"] = idx; step_results.append(result)
    except Exception as exc:
        status, error = "failed", str(exc)

    if status != "failed" or manifest.get("run_checks_after_failure", True):
        for check in manifest.get("definition_of_done", []):
            try:
                checks.append(_check(check, workspace, step_results, timeout))
            except Exception as exc:
                checks.append({"type": check.get("type"), "label": check.get("label"), "ok": False, "error": str(exc)})
    if checks and not all(c.get("ok") for c in checks):
        status = "failed"

    changes = []
    for p in mutation_paths:
        rel = p.relative_to(workspace).as_posix(); before = changed_before.get(p.as_posix()); after = _sha256(p)
        if before != after:
            changes.append({"path": rel, "before_sha256": before, "after_sha256": after, "exists": p.exists()})

    raw_sections = []
    for r in step_results:
        if r.get("stdout"): raw_sections.append(f"STEP {r.get('index')} STDOUT\n{r['stdout']}")
        if r.get("stderr"): raw_sections.append(f"STEP {r.get('index')} STDERR\n{r['stderr']}")
    for c in checks:
        if c.get("stdout"): raw_sections.append(f"CHECK {c.get('label')} STDOUT\n{c['stdout']}")
        if c.get("stderr"): raw_sections.append(f"CHECK {c.get('label')} STDERR\n{c['stderr']}")
    if error: raw_sections.append(f"EXECUTION ERROR\n{error}")
    raw_log = "\n\n".join(raw_sections)
    compacted, metrics = compact(raw_log, config.data.get("contextor", {}))
    result = {
        "agentbridge_result": "1.0",
        "job_id": pack.id,
        "run_id": run_id,
        "title": manifest.get("title"),
        "status": status,
        "workspace": str(workspace),
        "platform": platform.system().lower(),
        "duration_ms": int((time.time() - started) * 1000),
        "capabilities": sorted(required_capabilities(manifest)),
        "steps": [{k:v for k,v in r.items() if k not in {"stdout","stderr","content"}} for r in step_results],
        "definition_of_done": [{k:v for k,v in c.items() if k not in {"stdout","stderr"}} for c in checks],
        "changes": changes,
        "error": error,
        "contextor": metrics.to_dict(),
        "dlp": dlp,
        "planner_feedback": compacted,
        "rollback_available": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    run_dir = home_dir() / "runs" / run_id; run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "result.abresult").write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")
    ledger_append({"type":"run","result":result})
    return result

def execute_pack_path(path: str | Path, config: Config | None = None, workspace_override: str | Path | None = None, approved: bool = False) -> dict:
    return execute(load_pack(path), config=config, workspace_override=workspace_override, approved=approved)
