# Clintware™ Right-Click Menu Manager

Local-first Windows 11 context-menu manager and discovery utility.

## Current public build: v0.2.0

The live-use fast path is now integrated into the main installer and the toggle UI:

- `Clintware™ | 7-Zip Extract to Same-Name Folder`
- `Clintware™ | Open Admin PowerShell Here`
- ordered Clintware shell keys keep the two actions grouped on archive right-clicks
- Admin PowerShell works from files, folders, and blank folder backgrounds
- classic/full Windows 11 menu is enabled by the normal installer, but remains toggleable
- preview, registry snapshot, rollback, and Explorer restart remain part of the safety model

Download `Clintware-ContextMenu-Manager-v0.2.0.zip` for the full modular PowerShell source tree, installer, launcher, product plan, and YC-facing working notes.

Runtime state and backups are stored under `%LOCALAPPDATA%\Clintware\ContextMenuManager`.

Unknown COM context-menu handlers are not blindly unregistered.
