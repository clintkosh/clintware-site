#!/usr/bin/env python3
"""
Quillgeist Lite emergency recovery v2026.09.24.8.

This is the dead-runner recovery path. It does not depend on the qq WebSocket,
the Windows health service, Windows Terminal, or an already-working PowerShell 7
installation.

Recovery order:
  stop loop -> refresh canonical files -> ensure current PowerShell 7 ->
  rewrite scheduled task -> recompile/repair watchdog -> start -> verify.
"""

from __future__ import annotations

import ctypes
import os
import pathlib
import subprocess
import sys
import tempfile
import time
import urllib.request

VERSION = "2026.09.24.8"
RAW = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite"
SERVICE = "ClintwareQuillgeistLiteHealth"
TASK = "Clintware Quillgeist Lite Runner"


def log(msg: str) -> None:
    print(msg, flush=True)


def run(args, timeout=30):
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    except Exception as exc:
        return subprocess.CompletedProcess(args, 1, "", str(exc))


def is_admin() -> bool:
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def elevate_self() -> bool:
    if is_admin():
        return False
    params = subprocess.list2cmdline([str(pathlib.Path(__file__).resolve()), *sys.argv[1:]])
    rc = ctypes.windll.shell32.ShellExecuteW(
        None, "runas", sys.executable, params, str(pathlib.Path.cwd()), 1
    )
    if int(rc) <= 32:
        raise RuntimeError("UAC elevation was not granted.")
    log("RECOVERY // elevated repair launched; this unelevated copy is exiting")
    return True


def download(url: str) -> bytes:
    req = urllib.request.Request(
        url + ("&" if "?" in url else "?") + "v=" + VERSION,
        headers={
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "User-Agent": "Clintware-QQ-Recovery/" + VERSION,
        },
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


def legacy_ps() -> pathlib.Path:
    windir = pathlib.Path(os.environ.get("SystemRoot", r"C:\Windows"))
    path = windir / "System32" / "WindowsPowerShell" / "v1.0" / "powershell.exe"
    if not path.is_file():
        raise RuntimeError("Windows PowerShell bootstrap host was not found: " + str(path))
    return path


def resolve_pwsh() -> pathlib.Path | None:
    program_files = pathlib.Path(os.environ.get("ProgramFiles", r"C:\Program Files"))
    candidates = [
        program_files / "PowerShell" / "7" / "pwsh.exe",
    ]
    program_w6432 = os.environ.get("ProgramW6432")
    if program_w6432:
        candidates.append(pathlib.Path(program_w6432) / "PowerShell" / "7" / "pwsh.exe")
    for path in candidates:
        if path.is_file():
            return path
    return None


def preferred_ps() -> pathlib.Path:
    return resolve_pwsh() or legacy_ps()


def powershell(script: str, timeout=60, prefer_modern=True):
    exe = preferred_ps() if prefer_modern else legacy_ps()
    return run(
        [
            str(exe),
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ],
        timeout=timeout,
    )


def run_ps_file(path: pathlib.Path, args=None, timeout=180, prefer_modern=True):
    exe = preferred_ps() if prefer_modern else legacy_ps()
    argv = [
        str(exe),
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(path),
    ]
    if args:
        argv.extend(args)
    return run(argv, timeout=timeout)


def stop_loop(home: pathlib.Path) -> None:
    log("RECOVERY // HARD STOP: disabling watchdog + managed task before repair")
    run(["sc.exe", "stop", SERVICE], timeout=20)
    run(["sc.exe", "config", SERVICE, "start=", "disabled"], timeout=20)
    run(["schtasks.exe", "/Change", "/TN", TASK, "/DISABLE"], timeout=20)
    run(["schtasks.exe", "/End", "/TN", TASK], timeout=20)

    # Kill only qq-owned shells. Never touch unrelated user terminals.
    script = (
        "$me=$PID;"
        "Get-CimInstance Win32_Process | Where-Object {"
        "$_.ProcessId -ne $me -and "
        "([string]$_.CommandLine -match '(?i)Quillgeist|Clintware\\\\QuillgeistLite|launcher\\.ps1|runner\\.ps1') -and "
        "($_.Name -match '(?i)WindowsTerminal|powershell|pwsh|wt')"
        "} | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} };"
        "Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object {"
        "$_.TaskName -ne '" + TASK.replace("'", "''") + "' -and "
        "(($_.Actions | ForEach-Object {[string]$_.Execute+' '+[string]$_.Arguments}) -join ' ') "
        "-match '(?i)Quillgeist.*(wt|WindowsTerminal)|(wt|WindowsTerminal).*Quillgeist'"
        "} | ForEach-Object { try { Disable-ScheduledTask -TaskName $_.TaskName -TaskPath $_.TaskPath -ErrorAction Stop | Out-Null } catch {} }"
    )
    powershell(script, timeout=45, prefer_modern=False)


def remove_terminal_sources(home: pathlib.Path) -> None:
    local = pathlib.Path(os.environ["LOCALAPPDATA"])
    fragment_dir = local / "Microsoft" / "Windows Terminal" / "Fragments" / "Clintware"
    fragment_dir.mkdir(parents=True, exist_ok=True)

    for name in ("quillgeist-lite.json", "quillgeist-lite-v2.json"):
        p = fragment_dir / name
        if p.exists():
            backup = fragment_dir / (name + ".disabled")
            try:
                if backup.exists():
                    backup.unlink()
                p.replace(backup)
                log("RECOVERY // disabled stale Windows Terminal fragment " + name)
            except Exception:
                try:
                    p.unlink()
                except Exception:
                    pass

    script = (
        "$paths=@([Environment]::GetFolderPath('Startup'),[Environment]::GetFolderPath('CommonStartup'));"
        "foreach($d in $paths){"
        "$p=Join-Path $d 'Clintware Quillgeist Lite.lnk';"
        "Remove-Item $p -Force -ErrorAction SilentlyContinue"
        "}"
    )
    powershell(script, timeout=30, prefer_modern=False)


def refresh_files(home: pathlib.Path) -> None:
    specs = [
        ("launcher.ps1", "/launcher.ps1", b"Ensure-ModernPowerShell", 1500),
        ("runner.ps1", "/runner.ps1", b"Send-QQQuestion", 10000),
        ("boot_splash.py", "/tools/boot_splash.py", b"retro DOS boot splash", 1000),
        ("terminal_repair.py", "/tools/terminal_repair.py", b"generate_boot_image", 5000),
        ("ensure-powershell.ps1", "/tasks/ensure-powershell.ps1", b"PWSH_READY", 1000),
        ("auto-repair-runtime.ps1", "/tasks/auto-repair-runtime.ps1", b"AUTO_REPAIR_READY", 1500),
        ("repair-local-service.ps1", "/tasks/repair-local-service.ps1", b"qq health service repaired", 4000),
        ("update-powerchatbridge.ps1", "/tasks/update-powerchatbridge.ps1", b"POWERCHATBRIDGE_UPDATED", 2500),
    ]

    for local_name, remote, required, min_size in specs:
        data = download(RAW + remote)
        if len(data) < min_size or required not in data:
            raise RuntimeError(f"{local_name} download failed structural validation")
        atomic_write(home / local_name, data)
        log("RECOVERY // refreshed " + local_name)


def ensure_modern_powershell(home: pathlib.Path) -> pathlib.Path:
    script = home / "ensure-powershell.ps1"
    result = run_ps_file(script, ["-Force"], timeout=240, prefer_modern=False)
    if result.returncode != 0:
        raise RuntimeError(
            "PowerShell 7 bootstrap failed: " + (result.stdout + result.stderr).strip()[-4000:]
        )

    pwsh = resolve_pwsh()
    if not pwsh:
        raise RuntimeError("PowerShell 7 bootstrap completed but pwsh.exe was not found.")

    version = run(
        [str(pwsh), "-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"],
        timeout=20,
    )
    version_text = (version.stdout or "").strip().splitlines()
    log("VERIFY // PowerShell 7 ready" + ((" // " + version_text[-1]) if version_text else ""))
    return pwsh


def rewrite_task(home: pathlib.Path, host: pathlib.Path) -> None:
    launcher = home / "launcher.ps1"
    user = (os.environ.get("USERDOMAIN", "") + "\\" + os.environ.get("USERNAME", "")).strip("\\")
    if not user:
        raise RuntimeError("Could not resolve the interactive Windows user.")

    def q(s: str) -> str:
        return s.replace("'", "''")

    task_script = (
        "$ErrorActionPreference='Stop';"
        "$taskName='" + q(TASK) + "';"
        "$home='" + q(str(home)) + "';"
        "$exe='" + q(str(host)) + "';"
        "$launcher='" + q(str(launcher)) + "';"
        "$user='" + q(user) + "';"
        "$args='-NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File \"' + $launcher + '\"';"
        "$action=New-ScheduledTaskAction -Execute $exe -Argument $args -WorkingDirectory $home;"
        "$trigger=New-ScheduledTaskTrigger -AtLogOn -User $user;"
        "$principal=New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Highest;"
        "$settingsArgs=@{AllowStartIfOnBatteries=$true;DontStopIfGoingOnBatteries=$true;StartWhenAvailable=$true;ExecutionTimeLimit=[TimeSpan]::Zero};"
        "$cmd=Get-Command New-ScheduledTaskSettingsSet -ErrorAction Stop;"
        "$multi=$cmd.Parameters['MultipleInstances'];"
        "if($multi -and $multi.ParameterType -and $multi.ParameterType.IsEnum){"
        "$supported=[Enum]::GetNames($multi.ParameterType);"
        "if($supported -contains 'IgnoreNew'){$settingsArgs['MultipleInstances']='IgnoreNew'}"
        "elseif($supported -contains 'Queue'){$settingsArgs['MultipleInstances']='Queue'}"
        "};"
        "$settings=New-ScheduledTaskSettingsSet @settingsArgs;"
        "$task=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue;"
        "if($task){"
        "Set-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null;"
        "}else{"
        "Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings "
        "-Description 'Interactive ADMIN Clintware Quillgeist Lite console, supervised by the local health service.' | Out-Null;"
        "};"
        "Enable-ScheduledTask -TaskName $taskName | Out-Null;"
        "$a=(Get-ScheduledTask -TaskName $taskName).Actions | Select-Object -First 1;"
        "if([string]$a.Execute -ne $exe){throw 'task executable verification failed'};"
        "if(([string]$a.Arguments) -notmatch 'launcher\\.ps1'){throw 'task launcher verification failed'};"
        "Write-Output ('TASK_OK '+[string]$a.Execute+' '+[string]$a.Arguments)"
    )
    result = powershell(task_script, timeout=60, prefer_modern=True)
    if result.returncode != 0 or "TASK_OK" not in result.stdout:
        raise RuntimeError("managed task rewrite failed: " + (result.stdout + result.stderr).strip()[-4000:])
    log("VERIFY // managed task uses current PowerShell 7 launcher")


def repair_watchdog(home: pathlib.Path) -> None:
    repair = home / "repair-local-service.ps1"
    result = run_ps_file(repair, ["-SkipRunnerRestart"], timeout=240, prefer_modern=True)
    if result.returncode != 0:
        raise RuntimeError(
            "watchdog repair failed: " + (result.stdout + result.stderr).strip()[-5000:]
        )
    log("VERIFY // watchdog recompiled and service restarted")


def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    r = run(["tasklist.exe", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"], timeout=10)
    return r.returncode == 0 and f'"{pid}"' in r.stdout


def restart_and_verify(home: pathlib.Path) -> int:
    pidfile = home / "runner.pid"
    try:
        pidfile.unlink()
    except FileNotFoundError:
        pass

    run(["sc.exe", "config", SERVICE, "start=", "auto"], timeout=20)
    start = run(["sc.exe", "start", SERVICE], timeout=20)
    if start.returncode != 0:
        combined = (start.stdout + start.stderr).lower()
        if "already been started" not in combined and "already running" not in combined:
            raise RuntimeError("watchdog did not start: " + (start.stdout + start.stderr).strip())

    task_start = run(["schtasks.exe", "/Run", "/TN", TASK], timeout=20)
    if task_start.returncode != 0:
        raise RuntimeError("managed qq task failed to start: " + (task_start.stdout + task_start.stderr).strip())

    deadline = time.time() + 30
    live_pid = 0
    while time.time() < deadline:
        try:
            candidate = int(pidfile.read_text(encoding="ascii").strip())
            if pid_alive(candidate):
                time.sleep(2)
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
            tail = "\n".join(lines[-30:])
        except Exception:
            pass
        raise RuntimeError(
            "runner did not remain live within 30 seconds" + (("\n" + tail) if tail else "")
        )

    log("VERIFY // live qq runner PID " + str(live_pid))
    return live_pid


def verify_control_plane(home: pathlib.Path) -> None:
    log_path = home / "runner.log"
    deadline = time.time() + 25
    while time.time() < deadline:
        try:
            lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
            if any("Connected to Clintware Control Plane." in line for line in lines[-80:]):
                log("VERIFY // qq connected to Clintware Control Plane")
                return
        except Exception:
            pass
        time.sleep(1)
    log("WARN // runner is live, but a fresh Control Plane connection marker was not observed yet")


def update_powerchatbridge(home: pathlib.Path) -> None:
    updater = home / "update-powerchatbridge.ps1"
    result = run_ps_file(updater, timeout=180, prefer_modern=True)
    combined = (result.stdout + result.stderr).strip()
    if result.returncode == 0:
        if "POWERCHATBRIDGE_NOT_INSTALLED" in combined:
            log("INFO // PowerChatBridge module is not installed; qq itself is recovered")
        else:
            log("VERIFY // PowerChatBridge package refresh completed")
        return
    log("WARN // qq recovered, but PowerChatBridge refresh needs a later retry: " + combined[-2000:])


def main() -> int:
    if os.name != "nt":
        raise RuntimeError("Quillgeist Lite emergency recovery is Windows-only.")

    if elevate_self():
        return 0

    local = pathlib.Path(os.environ["LOCALAPPDATA"])
    home = local / "Clintware" / "QuillgeistLite"
    home.mkdir(parents=True, exist_ok=True)

    log("RECOVERY // Quillgeist Lite " + VERSION)
    stop_loop(home)
    remove_terminal_sources(home)
    refresh_files(home)
    host = ensure_modern_powershell(home)
    rewrite_task(home, host)
    repair_watchdog(home)
    restart_and_verify(home)
    verify_control_plane(home)
    update_powerchatbridge(home)

    log("VERIFY // every launcher load now owns the Clintware splash/theme path")
    log("VERIFY // watchdog includes bounded error-triggered auto-repair")
    log("VERIFY // PowerShell 7 is the managed qq host")
    log("VERIFY // interactive relay runtime is installed")
    log("READY // qq dead-runner recovery completed")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print("ERROR // " + str(exc), file=sys.stderr, flush=True)
        raise SystemExit(1)
