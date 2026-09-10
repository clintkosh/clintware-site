# Clintware™ Context Tools

Local-first Windows 11 context-menu, registry hygiene, tune-up, and modular configuration utility.

## Current public build: v0.3.0 beta

Primary chat-built / Cloudflare-served installer:

`https://www.clintware.com/downloads/context-menu-manager/v0.3.0/Install.ps1`

Legacy packaged beta remains available as `Clintware-Context-Tools-v0.3.0.zip` for the earlier context-menu bundle.

### Context-menu functions

- live check/uncheck state derived from compatible registry verbs actually present on the machine
- `Clintware™ | Open Admin PowerShell Here`
- `Clintware™ | 7-Zip Extract to Same-Name Folder`
- one-time UAC setup for the persistent PowerShell-only broker
- protected broker under `%ProgramFiles%\Clintware\ContextTools`
- fixed PowerShell launch with `-NoProfile`; no arbitrary program/command passthrough
- safe enable/disable of compatible HKCU registry verbs using `LegacyDisable`
- machine-scope and COM/IExplorerCommand entries shown read-only

### New maintenance modules

#### Registry Clean

- scans current-user and machine startup registry locations
- automatically classifies startup values pointing to missing `.exe` files as low-risk cleanup candidates
- reports questionable uninstall records as review-only rather than deleting them
- previews candidates before mutation
- creates a registry export before every applied cleanup

#### Tune-Up

- reports current-user temporary-file usage
- clears unlocked current-user temp files only after explicit `APPLY`
- inventories startup entries without automatically disabling them
- reports Explorer classic/compact menu state
- can restart Explorer after selected shell changes

#### Modular Registry Editor

- reads and edits explicit Windows software/class registry scopes
- supports String, ExpandString, DWord, QWord, MultiString, and Binary values
- previews set/remove operations before mutation
- creates a backup immediately before each applied edit
- intentionally blocks arbitrary registry roots outside the default approved scopes

### Backup and rollback

Every registry mutation performed by the v0.3 maintenance modules calls the shared backup core first. Backups are stored under:

`%LOCALAPPDATA%\Clintware\ContextTools\Backups`

Each backup contains exported `.reg` data plus a JSON manifest recording which keys existed before the change. The interactive shell can list and restore backup points.

### Install

From a normal PowerShell window:

```powershell
irm https://www.clintware.com/downloads/context-menu-manager/v0.3.0/Install.ps1 | iex
```

The installer downloads the versioned modules from `www.clintware.com`, stores them under `%LOCALAPPDATA%\Clintware\ContextTools\v0.3.0`, creates a Start Menu launcher, and starts the tool.

Unknown COM context-menu handlers are not blindly unregistered. Generic registry-cleaner heuristics are intentionally excluded.