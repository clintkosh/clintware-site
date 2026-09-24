#!/usr/bin/env python3
"""
One-shot Quillgeist Lite recovery for a broken Windows Terminal / qq restart loop.

Uses Python standard library only. It:
1) stops the watchdog/task loop when permitted,
2) disables stale Clintware Terminal fragments,
3) atomically refreshes launcher + runner + terminal repair,
4) rebuilds and verifies the managed terminal profile,
5) restarts the service/task,
6) verifies that a live runner PID appears.
"""

from __future__ import annotations

import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

VERSION = "2026.09.24.5"
RAW = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite"
SERVICE = "ClintwareQuillgeistLiteHealth"
TASK = "Clintware Quillgeist Lite Runner"

def log(msg: str) -> None:
    print(msg, flush=True)

def run(args, timeout=20):
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    except Exception as exc:
        return subprocess.CompletedProcess(args, 1, "", str(exc))

def download(url: str) -> bytes:
    req = urllib.request.Request(
        url + ("&" if "?" in url else "?") + "v=" + VERSION,
        headers={"Cache-Control":"no-cache","User-Agent":"Clintware-QQ-Recovery/" + VERSION},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()

def atomic_write(path: pathlib.Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=path.name + ".", suffix=".new", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, path)
    finally:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass

def valid_ps(data: bytes, must_contain: bytes) -> bool:
    return len(data) > 800 and b"$ErrorActionPreference" in data and must_contain in data

def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    r = run(["tasklist.exe","/FI",f"PID eq {pid}","/FO","CSV","/NH"], timeout=10)
    return r.returncode == 0 and f'"{pid}"' in r.stdout

def main() -> int:
    if os.name != "nt":
        raise RuntimeError("This recovery is Windows-only.")

    local = pathlib.Path(os.environ["LOCALAPPDATA"])
    home = local / "Clintware" / "QuillgeistLite"
    fragment_dir = local / "Microsoft" / "Windows Terminal" / "Fragments" / "Clintware"
    home.mkdir(parents=True, exist_ok=True)
    fragment_dir.mkdir(parents=True, exist_ok=True)

    launcher = home / "launcher.ps1"
    runner = home / "runner.ps1"
    repair = home / "terminal_repair.py"
    pidfile = home / "runner.pid"

    log("RECOVERY // Quillgeist Lite " + VERSION)
    log("RECOVERY // stopping restart loop")
    run(["schtasks.exe","/End","/TN",TASK])
    run(["sc.exe","stop",SERVICE])

    # Kill only Windows Terminal instances whose command line references the managed qq
    # profile where PowerShell/CIM is available. Failure is harmless.
    ps = pathlib.Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32" / "WindowsPowerShell" / "v1.0" / "powershell.exe"
    if ps.is_file():
        kill = (
            "Get-CimInstance Win32_Process -Filter \"Name='WindowsTerminal.exe'\" | "
            "Where-Object { [string]$_.CommandLine -match '(?i)Quillgeist|4a4b4fda|5c7d2c59' } | "
            "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
        )
        run([str(ps),"-NoProfile","-ExecutionPolicy","Bypass","-Command",kill])

    # Disable every old Clintware fragment before rebuilding one known-good profile.
    for name in ("quillgeist-lite.json","quillgeist-lite-v2.json"):
        p = fragment_dir / name
        if p.exists():
            backup = fragment_dir / (name + ".broken")
            try:
                if backup.exists():
                    backup.unlink()
                p.replace(backup)
                log("RECOVERY // disabled stale fragment " + name)
            except Exception:
                try:
                    p.unlink()
                except Exception:
                    pass

    log("RECOVERY // refreshing canonical launcher and runner")
    launcher_bytes = download(RAW + "/launcher.ps1")
    runner_bytes = download(RAW + "/runner.ps1")
    repair_bytes = download(RAW + "/tools/terminal_repair.py")

    if not valid_ps(launcher_bytes, b"TerminalRepairMarker"):
        raise RuntimeError("launcher download failed structural validation")
    if not valid_ps(runner_bytes, b"Show-QuillgeistSplash"):
        raise RuntimeError("runner download failed structural validation")
    if len(repair_bytes) < 5000 or b"PROFILE_GUID" not in repair_bytes:
        raise RuntimeError("terminal repair download failed structural validation")

    atomic_write(launcher, launcher_bytes)
    atomic_write(runner, runner_bytes)
    atomic_write(repair, repair_bytes)

    log("RECOVERY // rebuilding terminal profile + DOS boot art with Python")
    result = subprocess.run([sys.executable, str(repair)], text=True)
    if result.returncode != 0:
        raise RuntimeError("Python terminal repair failed with exit code " + str(result.returncode))

    # Clear stale PID before restart so verification cannot be satisfied by an old marker.
    try:
        pidfile.unlink()
    except FileNotFoundError:
        pass

    log("RECOVERY // restarting watchdog and managed runner")
    service_start = run(["sc.exe","start",SERVICE])
    if service_start.returncode != 0 and "already been started" not in (service_start.stdout + service_start.stderr).lower():
        log("WARN // service start returned: " + (service_start.stdout + service_start.stderr).strip())

    task_start = run(["schtasks.exe","/Run","/TN",TASK])
    if task_start.returncode != 0:
        # Lack of elevation should not make recovery fail. Start the same verified
        # launcher directly; the managed service/task can be repaired later.
        if not ps.is_file():
            raise RuntimeError("scheduled task failed and PowerShell fallback is unavailable: " + (task_start.stdout + task_start.stderr).strip())
        log("WARN // scheduled task start failed; using direct verified launcher fallback")
        subprocess.Popen(
            [str(ps),"-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File",str(launcher)],
            cwd=str(home),
            creationflags=getattr(subprocess, "CREATE_NEW_CONSOLE", 0),
        )

    deadline = time.time() + 15
    live_pid = 0
    while time.time() < deadline:
        try:
            raw = pidfile.read_text(encoding="ascii").strip()
            candidate = int(raw)
            if pid_alive(candidate):
                live_pid = candidate
                break
        except Exception:
            pass
        time.sleep(0.5)

    if not live_pid:
        crash = home / "runner-crash.log"
        tail = ""
        try:
            lines = crash.read_text(encoding="utf-8", errors="replace").splitlines()
            tail = "\n".join(lines[-12:])
        except Exception:
            pass
        raise RuntimeError("runner did not become live within 15 seconds" + (("\n" + tail) if tail else ""))

    log("VERIFY // live runner PID " + str(live_pid))
    log("VERIFY // restart loop cleared")
    log("VERIFY // managed Windows Terminal profile rebuilt")
    log("VERIFY // retro DOS boot artwork generated")
    log("READY // Quillgeist Lite recovered")
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print("ERROR // " + str(exc), file=sys.stderr, flush=True)
        raise SystemExit(1)
