# Clintware Audio + Focus Fix v2

Windows x64 utility for two related workstation problems:

- Diagnose and repair common Windows microphone echo/feedback states, including microphone monitoring, loopback inputs, communications audio state, Jabra/Hands-Free profile indicators, and an optional deeper capture-effects reset.
- Find non-Microsoft recurring Scheduled Tasks that can create visible PowerShell/cmd/script windows and move compatible tasks to hidden/background execution after backing up their task XML.

## Usage

```text
Clintware-AudioFocusFix-v2.exe
Clintware-AudioFocusFix-v2.exe --diagnose
Clintware-AudioFocusFix-v2.exe --audio-only
Clintware-AudioFocusFix-v2.exe --tasks-only
Clintware-AudioFocusFix-v2.exe --deep
Clintware-AudioFocusFix-v2.exe --restore-tasks
```

The default run applies the safe audio repair and recurring-task focus repair.

## Safety

- Requires Administrator elevation for Windows audio registry and Scheduled Task changes.
- Backs up capture/audio registry state before repair.
- Excludes Microsoft Scheduled Tasks.
- Backs up candidate Scheduled Tasks under `%ProgramData%\Clintware\AudioFocusFix\scheduled-tasks`.
- `--restore-tasks` restores saved task XML.
