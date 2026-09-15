# Clintware™ Context Tools

Local-first Windows 11 context-menu, registry hygiene, tune-up, browser hygiene, and modular configuration utility.

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

### Maintenance modules

#### Registry Clean

- scans current-user and machine startup registry locations
- classifies startup values pointing to missing `.exe` files as low-risk cleanup candidates
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

#### Browser & Web Hygiene

Current browser support: Chrome, Edge, and Brave Chromium profiles.

- reports profile cache size, cookies/history presence, password-store presence, extension count, and extension-review count
- audits installed extension manifests for broad or security-sensitive permissions such as all-site access, proxy, debugger, management, nativeMessaging, privacy, and webRequestBlocking
- never opens, decrypts, exports, or reads saved passwords; password checks are metadata/presence only
- can clear cache, cookies, history, or site-storage classes separately
- requires the target browser to be closed before profile files are changed
- backs up selected browser data before deletion
- preserves passwords, autofill, and bookmarks by default
- provides Guided search-engine setup through the browser's own settings page
- optionally enforces Google, Brave Search, DuckDuckGo, or Startpage through browser policy after preview and explicit `APPLY`
- warns that policy enforcement can cause Chromium browsers to display `Managed by your organization`

Search recommendation defaults:

- Google: default for result quality
- Brave Search: default privacy / independent-index alternative
- DuckDuckGo and Startpage: optional privacy alternatives

The tool does not silently rewrite opaque Chromium profile databases just to change search defaults.

### Additional hygiene areas planned / being evaluated

- stale site permissions and notification grants
- orphaned service-worker/site-storage inventory
- suspicious/unpacked extension detection
- download-list hygiene without deleting downloaded files
- browser update/version posture
- DNS/proxy/VPN drift checks
- homepage/startup-page hijack detection
- per-site cookie allowlist cleanup
- credential-health handoff to the browser/vendor's supported password-breach checker without exposing credentials to Clintware

### Backup and rollback

Every registry mutation performed by the v0.3 maintenance modules calls the shared backup core first. Backups are stored under:

`%LOCALAPPDATA%\Clintware\ContextTools\Backups`

Browser-data backups are stored under:

`%LOCALAPPDATA%\Clintware\ContextTools\Backups\Browser`

Each registry backup contains exported `.reg` data plus a JSON manifest recording which keys existed before the change. The interactive shell can list and restore registry backup points.

### Install

From a normal PowerShell window:

```powershell
irm https://www.clintware.com/downloads/context-menu-manager/v0.3.0/Install.ps1 | iex
```

The installer downloads the versioned modules from `www.clintware.com`, stores them under `%LOCALAPPDATA%\Clintware\ContextTools\v0.3.0`, creates a Start Menu launcher, and starts the tool.

Unknown COM context-menu handlers are not blindly unregistered. Generic registry-cleaner heuristics are intentionally excluded.