from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
import platform
import subprocess
import sys
import uuid


class NativeScheduleError(RuntimeError):
    pass


def _schedule_parts(every_seconds: int) -> tuple[str, int]:
    seconds = int(every_seconds)
    if seconds < 60:
        raise NativeScheduleError("Windows native schedules must be at least 60 seconds apart.")
    if seconds % 604800 == 0:
        return "WEEKLY", seconds // 604800
    if seconds % 86400 == 0:
        return "DAILY", seconds // 86400
    if seconds % 3600 == 0 and seconds // 3600 <= 23:
        return "HOURLY", seconds // 3600
    if seconds % 60 == 0 and seconds // 60 <= 1439:
        return "MINUTE", seconds // 60
    raise NativeScheduleError("Cadence cannot be represented safely by Windows Task Scheduler. Use whole minutes, hours, days, or weeks.")


def _runner_command(pack_path: str | Path, approve_all: bool) -> str:
    pack = str(Path(pack_path).expanduser().resolve())
    approve = " --approve-all" if approve_all else ""
    if getattr(sys, "frozen", False):
        exe = str(Path(sys.executable).resolve())
        return f'"{exe}" run "{pack}"{approve}'
    exe = str(Path(sys.executable).resolve())
    return f'"{exe}" -m agentbridge_node run "{pack}"{approve}'


def build_windows_task_spec(
    pack_path: str | Path,
    every_seconds: int,
    *,
    approve_all: bool = False,
    task_name: str | None = None,
) -> dict:
    schedule, modifier = _schedule_parts(every_seconds)
    name = task_name or f"Quillgeist-Autonomy-{uuid.uuid4().hex[:8]}"
    start = (datetime.now() + timedelta(minutes=1)).strftime("%H:%M")
    command = _runner_command(pack_path, approve_all)
    argv = [
        "schtasks.exe", "/Create", "/F",
        "/TN", name,
        "/TR", command,
        "/SC", schedule,
        "/MO", str(modifier),
        "/ST", start,
        "/RL", "LIMITED",
    ]
    return {
        "provider": "windows_task_scheduler",
        "task_name": name,
        "schedule": schedule,
        "modifier": modifier,
        "start_time": start,
        "command": command,
        "argv": argv,
    }


def install_windows_schedule(
    pack_path: str | Path,
    every_seconds: int,
    *,
    approve_all: bool = False,
    task_name: str | None = None,
) -> dict:
    if platform.system().lower() != "windows":
        raise NativeScheduleError("Windows Task Scheduler is only available on Windows.")
    spec = build_windows_task_spec(pack_path, every_seconds, approve_all=approve_all, task_name=task_name)
    proc = subprocess.run(spec["argv"], text=True, capture_output=True)
    result = {k: v for k, v in spec.items() if k != "argv"}
    result.update({
        "exit_code": proc.returncode,
        "stdout": proc.stdout.strip(),
        "stderr": proc.stderr.strip(),
        "installed": proc.returncode == 0,
    })
    if proc.returncode != 0:
        raise NativeScheduleError(proc.stderr.strip() or proc.stdout.strip() or f"schtasks exited {proc.returncode}")
    return result
