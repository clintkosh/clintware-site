# Clintware™ Right-Click Menu Manager

Local-first Windows 11 context-menu toggler and discovery utility.

## v0.1.0

The downloadable ZIP contains the full modular PowerShell source tree:

- `Core/Engine.ps1`
- `Providers/Windows.ps1`
- `Providers/PowerShell.ps1`
- `Providers/Terminal.ps1`
- `Providers/SevenZip.ps1`
- `Providers/Discovered.ps1`
- `Clintware.ContextMenuManager.ps1`
- `Install.ps1`
- launcher and README

It detects registry-backed shell verbs, inventories shell extensions, toggles Windows 11 classic/full context menu mode, adds PowerShell/Terminal commands when available, exposes modular 7-Zip actions when 7-Zip is installed, previews pending changes, backs up registry state before Apply, and supports rollback.

Runtime state and backups are stored under `%LOCALAPPDATA%\Clintware\ContextMenuManager`.

Unknown COM context-menu handlers are inventory-only rather than being blindly unregistered.
