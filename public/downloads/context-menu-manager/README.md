# Clintware™ Context Tools

Local-first Windows 11 context-menu manager and discovery utility.

## Current public build: v0.3.0 beta

Download `Clintware-Context-Tools-v0.3.0.zip`.

SHA-256:

`1a23f694ea5472b265247b4bb1811326523425842f0a9c94bcc1e15afdd88852`

### Current functions

- live check/uncheck state derived from compatible registry verbs actually present on the machine
- `Clintware™ | Open Admin PowerShell Here`
- `Clintware™ | 7-Zip Extract to Same-Name Folder`
- one-time UAC setup for the persistent PowerShell-only broker
- protected broker under `%ProgramFiles%\Clintware\ContextTools`
- hardened task ACL so the normal user token can read/run the task but cannot rewrite its action
- fixed PowerShell launch with `-NoProfile`; no arbitrary program/command passthrough
- path requests must resolve through PowerShell's `FileSystem` provider before the elevated broker uses them
- safe enable/disable of compatible HKCU registry verbs using `LegacyDisable`
- machine-scope and COM/IExplorerCommand entries shown read-only
- preview, first-seen baseline, per-Apply change ledger, undo, restore, repair, and uninstall

The Admin PowerShell task persists across reboot and does not globally disable UAC. Normal applications continue to use normal Windows elevation behavior.

Runtime state and backups are stored under `%LOCALAPPDATA%\Clintware\ContextTools`.

Protected application files are installed under `%ProgramFiles%\Clintware\ContextTools`.

Unknown COM context-menu handlers are not blindly unregistered.
