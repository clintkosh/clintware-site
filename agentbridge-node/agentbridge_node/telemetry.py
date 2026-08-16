from __future__ import annotations

from pathlib import Path
import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.request
import uuid

from .config import Config, home_dir
from .dlp import redact_text
from . import __version__

_SECRET_RE = re.compile(r"(?i)\b(authorization|api[_-]?key|token|password|secret)\b(\s*[:=]\s*)([^\s,;]+)")
_UUID_RE = re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.I)
_HEX_RE = re.compile(r"\b[0-9a-f]{16,}\b", re.I)
_NUMBER_RE = re.compile(r"\b\d{3,}\b")


def _telemetry_config(config: Config) -> dict:
    return config.data.get("telemetry", {})


def sanitize_error(text: str | None) -> str:
    if not text:
        return ""
    out = str(text)
    try:
        home = str(Path.home())
        if home:
            out = out.replace(home, "~")
    except Exception:
        pass
    out = _SECRET_RE.sub(lambda m: f"{m.group(1)}{m.group(2)}[REDACTED]", out)
    # DLP redaction covers payment cards, private keys, tokens, SSNs and contact PII
    # before an error can enter telemetry or its offline queue.
    out = redact_text(out, min_severity="medium")
    return out[:8000]


def error_fingerprint(text: str | None, error_kind: str | None = None) -> str | None:
    clean = sanitize_error(text)
    if not clean:
        return None
    normalized = _UUID_RE.sub("<uuid>", clean.lower())
    normalized = _HEX_RE.sub("<hex>", normalized)
    normalized = _NUMBER_RE.sub("<n>", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    payload = f"{error_kind or 'error'}|{normalized}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:24]


def build_run_event(result: dict, device_id: str) -> dict:
    context = result.get("contextor") or {}
    error_kind = result.get("error_kind") or ("task" if result.get("status") == "failed" else None)
    err = sanitize_error(result.get("error"))
    changes = result.get("changes") or []
    steps = result.get("steps") or []
    return {
        "event_id": f"run:{result.get('run_id') or result.get('job_id') or uuid.uuid4()}",
        "type": "run_complete",
        "ts": int(time.time() * 1000),
        "device_id": device_id,
        "job_id": result.get("job_id"),
        "run_id": result.get("run_id"),
        "status": result.get("status"),
        "duration_ms": int(result.get("duration_ms") or 0),
        "tokens_avoided_est": int(context.get("external_tokens_avoided_est") or 0),
        "net_tokens_saved_est": int(context.get("net_tokens_avoided_est") or 0),
        "local_tokens_est": int(context.get("local_llm_input_tokens_est") or 0) + int(context.get("local_llm_output_tokens_est") or 0),
        "raw_tokens_est": int(context.get("raw_tokens_est") or 0),
        "sent_tokens_est": int(context.get("sent_tokens_est") or 0),
        "error_kind": error_kind,
        "error_fingerprint": error_fingerprint(err, error_kind),
        "error_message": err,
        "product_bug": error_kind == "agentbridge_internal",
        "changes_count": len(changes),
        "patch_count": sum(1 for step in steps if step.get("type") == "patch" and step.get("ok")),
        "affected_paths": [str(x.get("path")) for x in changes[:30] if x.get("path")],
        "fixes_bug_ids": list(result.get("fixes_bug_ids") or []),
        "retry_of": result.get("retry_of"),
        "node_version": __version__,
    }


def _queue_path() -> Path:
    p = home_dir() / "telemetry-queue.jsonl"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def _post(config: Config, event: dict, timeout: float = 1.5) -> None:
    body = json.dumps({"device_id": config.data["device_id"], "event": event}, separators=(",", ":")).encode("utf-8")
    req = urllib.request.Request(
        config.data["cloud_url"].rstrip("/") + "/api/device/telemetry",
        data=body,
        headers={"content-type": "application/json", "authorization": f"Bearer {config.data['device_token']}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        response.read()


def _append_queue(event: dict) -> None:
    path = _queue_path()
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, separators=(",", ":"), default=str) + "\n")


def emit_event(config: Config, event: dict, *, queue_on_failure: bool = True) -> bool:
    settings = _telemetry_config(config)
    if settings.get("enabled", True) is False:
        return False
    try:
        _post(config, event)
        return True
    except urllib.error.HTTPError as exc:
        # An unclaimed/revoked node should not accumulate an infinite local queue.
        if exc.code in {401, 403, 404, 409}:
            return False
        if queue_on_failure:
            _append_queue(event)
    except Exception:
        if queue_on_failure:
            _append_queue(event)
    return False


def emit_run_result(config: Config, result: dict) -> bool:
    return emit_event(config, build_run_event(result, config.data["device_id"]))


def emit_error(config: Config, kind: str, message: str, *, product_bug: bool = False, metadata: dict | None = None) -> bool:
    clean = sanitize_error(message)
    event = {
        "event_id": f"error:{uuid.uuid4()}",
        "type": "error",
        "ts": int(time.time() * 1000),
        "device_id": config.data["device_id"],
        "status": "failed",
        "error_kind": kind,
        "error_fingerprint": error_fingerprint(clean, kind),
        "error_message": clean,
        "product_bug": bool(product_bug),
        "node_version": __version__,
        "metadata": metadata or {},
    }
    return emit_event(config, event)


def flush(config: Config, limit: int = 100) -> dict:
    path = _queue_path()
    if not path.exists():
        return {"sent": 0, "remaining": 0}
    lines = path.read_text(encoding="utf-8").splitlines()
    sent = 0
    remaining: list[str] = []
    for index, line in enumerate(lines):
        if index >= limit:
            remaining.extend(lines[index:])
            break
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        try:
            _post(config, event)
            sent += 1
        except urllib.error.HTTPError as exc:
            if exc.code in {401, 403, 404, 409}:
                continue
            remaining.append(line)
        except Exception:
            remaining.append(line)
    if remaining:
        path.write_text("\n".join(remaining) + "\n", encoding="utf-8")
    else:
        try:
            path.unlink()
        except OSError:
            pass
    return {"sent": sent, "remaining": len(remaining)}
