# Clintware™ Context Tools

Local-first Windows 11 context-menu manager and discovery utility.

## Current public build: v0.3.0 beta

Download `Clintware-Context-Tools-v0.3.0.zip`.

SHA-256:

`b1ec31c47c2788770ba89a1fe594d8e0230c68fd78ec7e8120f96ea3168a8a66`

### Current functions

- live check/uncheck state derived from compatible registry verbs actually present on the machine
- `Clintware™ | Open Admin PowerShell Here`
- `Clintware™ | 7-Zip Extract to Same-Name Folder`
- one-time UAC setup for the persistent PowerShell-only broker
- protected broker under `%ProgramFiles%\Clintware\ContextTools`
- hardened task ACL so the normal user token can read/run the task but cannot rewrite its action
- fixed PowerShell launch with `-NoProfile`; no arbitrary program/command passthrough
- safe enable/disable of compatible HKCU registry verbs using `LegacyDisable`
- machine-scope and COM/IExplorerCommand entries shown read-only
- preview, first-seen baseline, per-Apply change ledger, undo, restore, repair, and uninstall

The Admin PowerShell task persists across reboot and does not globally disable UAC. Normal applications continue to use normal Windows elevation behavior.

Runtime state and backups are stored under `%LOCALAPPDATA%\Clintware\ContextTools`.

Protected application files are installed under `%ProgramFiles%\Clintware\ContextTools`.

Unknown COM context-menu handlers are not blindly unregistered.
