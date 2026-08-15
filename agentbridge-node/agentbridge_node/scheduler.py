from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path
import json
import threading
import time
import uuid
from .config import home_dir

def _path() -> Path:
    return home_dir() / "schedules.json"

def load_schedules() -> list[dict]:
    p = _path()
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []

def save_schedules(rows: list[dict]) -> None:
    p = _path(); p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(rows, indent=2, sort_keys=True), encoding="utf-8")

def add_schedule(pack_path: str, at_epoch: float | None = None, every_seconds: int | None = None, owner: str = "device", device_id: str | None = None) -> dict:
    if not at_epoch:
        at_epoch = time.time() + (every_seconds or 60)
    row = {
        "id": str(uuid.uuid4()),
        "pack_path": str(Path(pack_path).expanduser().resolve()),
        "next_run_at": float(at_epoch),
        "every_seconds": int(every_seconds) if every_seconds else None,
        "owner": owner,
        "device_id": device_id,
        "enabled": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    rows = load_schedules(); rows.append(row); save_schedules(rows)
    return row

def remove_schedule(schedule_id: str) -> bool:
    rows = load_schedules(); new = [x for x in rows if x["id"] != schedule_id]
    save_schedules(new); return len(new) != len(rows)

class SchedulerEngine:
    def __init__(self, callback, interval: float = 2.0, after_run=None):
        self.callback, self.interval, self.after_run, self._stop = callback, interval, after_run, threading.Event()
    def stop(self): self._stop.set()
    def run_forever(self):
        while not self._stop.is_set():
            now = time.time(); rows = load_schedules(); dirty = False
            for row in rows:
                if not row.get("enabled") or row.get("owner") != "device": continue
                if float(row.get("next_run_at", 0)) <= now:
                    result = None
                    try:
                        result = self.callback(row)
                    finally:
                        every = row.get("every_seconds")
                        if every:
                            while row["next_run_at"] <= now: row["next_run_at"] += int(every)
                        else: row["enabled"] = False
                        row["last_run_at"] = now
                        row["last_status"] = (result or {}).get("status") if isinstance(result, dict) else None
                        dirty = True
                        if self.after_run:
                            try: self.after_run(row, result)
                            except Exception as exc: print(f"Schedule state sync failed for {row.get('id')}: {exc}")
            if dirty: save_schedules(rows)
            self._stop.wait(self.interval)


def approve_schedule(schedule_id: str, approved: bool = True) -> bool:
    rows=load_schedules(); found=False
    for row in rows:
        if row.get("id")==schedule_id:
            row["approved_local"]=bool(approved); row["updated_at"]=datetime.now(timezone.utc).isoformat(); found=True
    if found: save_schedules(rows)
    return found
