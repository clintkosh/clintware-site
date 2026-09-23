from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import json
import os
import threading

from .config import home_dir

_LOCK = threading.RLock()

def _path() -> Path:
    return home_dir() / "active_jobs.json"

def _load() -> list[dict]:
    p = _path()
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return []

def _save(rows: list[dict]) -> None:
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(rows, indent=2, sort_keys=True), encoding="utf-8")
    os.replace(tmp, p)

def list_active_jobs() -> list[dict]:
    with _LOCK:
        return [dict(x) for x in _load() if x.get("state") in {"running", "stop_requested"}]

def begin_job(run_id: str, job_id: str, title: str | None = None, source: str = "local", schedule_id: str | None = None) -> dict:
    row = {
        "run_id": run_id,
        "job_id": job_id,
        "title": title or job_id,
        "source": source,
        "schedule_id": schedule_id,
        "state": "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "current_pid": None,
    }
    with _LOCK:
        rows = [x for x in _load() if x.get("run_id") != run_id and x.get("state") in {"running", "stop_requested"}]
        rows.append(row)
        _save(rows)
    return row

def update_job(run_id: str, **changes) -> None:
    with _LOCK:
        rows = _load()
        for row in rows:
            if row.get("run_id") == run_id:
                row.update(changes)
                row["updated_at"] = datetime.now(timezone.utc).isoformat()
                break
        _save(rows)

def finish_job(run_id: str, state: str = "completed") -> None:
    with _LOCK:
        rows = [x for x in _load() if x.get("run_id") != run_id]
        _save(rows)

def request_stop(run_id: str) -> dict | None:
    with _LOCK:
        rows = _load()
        found = None
        for row in rows:
            if row.get("run_id") == run_id:
                row["state"] = "stop_requested"
                row["stop_requested_at"] = datetime.now(timezone.utc).isoformat()
                found = dict(row)
                break
        _save(rows)
    return found

def stop_requested(run_id: str) -> bool:
    with _LOCK:
        return any(x.get("run_id") == run_id and x.get("state") == "stop_requested" for x in _load())
