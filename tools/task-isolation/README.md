# Clintware Task Isolation

Standalone Windows x64 utility for Scheduled Tasks that launch PowerShell, pwsh, cmd, script files, Python, or Node in a way that creates visible console windows or steals desktop focus.

The utility does **not** merely set Task Scheduler's Hidden flag. It replaces matching Exec actions with a GUI-subsystem wrapper. The wrapper starts the original command with Windows `CREATE_NO_WINDOW`, waits for it to finish, and returns its exit code without creating a console window.

## Default behavior

- Excludes Microsoft Scheduled Tasks.
- Preserves intentional QQ visible-launch tasks.
- Backs up each task XML before changing actions.
- Preserves the task's principal, triggers, credentials, conditions, and settings by changing only the action list.
- Restarts matching tasks that are already running so the current instance also moves behind the background wrapper.
- Skips tasks containing non-Exec actions rather than risking destructive conversion.

## Usage

```text
Clintware-TaskIsolation.exe
Clintware-TaskIsolation.exe --scan
Clintware-TaskIsolation.exe --restore
Clintware-TaskIsolation.exe --no-restart-running
Clintware-TaskIsolation.exe --qq-auto
```

State and backups are kept under:

```text
%ProgramData%\Clintware\TaskIsolation
```
