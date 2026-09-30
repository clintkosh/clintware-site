from __future__ import annotations

from contextlib import AbstractContextManager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import json
import os
import threading
import time
import uuid


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class HealthAssessment:
    healthy: bool
    reason: str
    heartbeat_age_seconds: float
    progress_age_seconds: float


def assess_health(payload: dict, *, now: datetime | None = None, heartbeat_stale_seconds: int = 120, no_progress_seconds: int = 900) -> HealthAssessment:
    now = now or _utc_now()
    try:
        heartbeat_at = datetime.fromisoformat(str(payload.get("timestamp", "")).replace("Z", "+00:00"))
        heartbeat_age = max(0.0, (now - heartbeat_at.astimezone(timezone.utc)).total_seconds())
    except Exception:
        return HealthAssessment(False, "heartbeat_invalid", float("inf"), float("inf"))

    try:
        progress_at = datetime.fromisoformat(str(payload.get("progress_at", "")).replace("Z", "+00:00"))
        progress_age = max(0.0, (now - progress_at.astimezone(timezone.utc)).total_seconds())
    except Exception:
        progress_age = float("inf")

    if heartbeat_age > heartbeat_stale_seconds:
        return HealthAssessment(False, "heartbeat_stale", heartbeat_age, progress_age)
    if str(payload.get("state", "")).lower() == "busy" and progress_age > no_progress_seconds:
        return HealthAssessment(False, "busy_no_progress", heartbeat_age, progress_age)
    return HealthAssessment(True, "busy_progress_fresh" if str(payload.get("state", "")).lower() == "busy" else "healthy", heartbeat_age, progress_age)


class HealthPulse(AbstractContextManager):
    """Host-neutral local liveness/progress pulse for Quillgeist runtimes."""

    def __init__(self, path: str | Path, *, task_id: str = "", interval_seconds: int = 15):
        self.path = Path(path)
        self.task_id = task_id
        self.interval_seconds = max(2, int(interval_seconds))
        self.session_id = uuid.uuid4().hex
        self.sequence = 0
        self.progress_sequence = 0
        self.progress_at = _utc_now()
        self.state = "starting"
        self.phase = "start"
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()

    def _write(self) -> None:
        with self._lock:
            self.sequence += 1
            now = _utc_now()
            payload = {
                "version": "2",
                "runner_id": os.environ.get("COMPUTERNAME") or os.environ.get("HOSTNAME") or "local",
                "pid": os.getpid(),
                "session_id": self.session_id,
                "state": self.state,
                "job_id": "",
                "task_id": self.task_id,
                "phase": self.phase,
                "sequence": self.sequence,
                "progress_sequence": self.progress_sequence,
                "progress_at": _iso(self.progress_at),
                "network_state": "local",
                "timestamp": _iso(now),
            }
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temp = self.path.with_suffix(self.path.suffix + ".new")
            temp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
            temp.replace(self.path)

    def mark_progress(self, phase: str) -> None:
        with self._lock:
            self.progress_sequence += 1
            self.progress_at = _utc_now()
            self.phase = phase
        self._write()

    def set_state(self, state: str, phase: str | None = None, *, progress: bool = False) -> None:
        self.state = state
        if phase is not None:
            self.phase = phase
        if progress:
            self.mark_progress(self.phase)
        else:
            self._write()

    def _loop(self) -> None:
        while not self._stop.wait(self.interval_seconds):
            self._write()

    def __enter__(self):
        self.state = "busy"
        self.mark_progress("execute")
        self._thread = threading.Thread(target=self._loop, name="quillgeist-health-pulse", daemon=True)
        self._thread.start()
        return self

    def __exit__(self, exc_type, exc, tb):
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=max(2, self.interval_seconds + 1))
        self.state = "failed" if exc_type else "idle"
        self.mark_progress("failed" if exc_type else "complete")
        return False
