# Clintware™ Context Tools — Product Plan

## Current public build: v0.3.0 beta

A local-first Windows utility that turns context-menu maintenance from registry spelunking into explicit, current-state-aware toggles with rollback.

Shipped in the v0.3.0 package:

- live registry scan each refresh; checkboxes derive from the menu state actually present on the machine
- two Clintware modules with independent toggles:
  - `Clintware™ | Open Admin PowerShell Here`
  - `Clintware™ | 7-Zip Extract to Same-Name Folder`
- persistent Admin PowerShell authorization using a fixed highest-privilege scheduled task
- one-time installer elevation; normal right-click Admin PowerShell launches do not require a new UAC consent prompt
- elevated broker installed under `%ProgramFiles%\Clintware\ContextTools`, not a user-writable directory
- task ACL hardening: normal user token receives read/execute only; SYSTEM and elevated Administrators retain control
- task accepts no arbitrary executable, script, command, or dynamic task argument
- path-only request handoff and fixed PowerShell launch with `-NoProfile`
- common archive-extension registration when 7-Zip is detected
- compatible current-user registry verbs can be enabled/disabled with `LegacyDisable` without deleting their keys
- machine-scope verbs, COM shell extensions, and IExplorerCommand handlers are displayed read-only rather than blindly unregistered
- preview-before-apply
- first-seen baseline for third-party verbs
- per-Apply JSON change ledger
- Undo Last Apply
- Restore Baseline
- repair flow, Explorer restart, and clean uninstall

### Current boundary

v0.3.0 does not claim complete control over every Windows 11 shell integration. Modern COM/IExplorerCommand handlers and machine-scope entries are deliberately not modified by the normal manager. The public build remains a PowerShell/WinForms beta pending broader target-machine testing and signed executable packaging.

## v0.4 target

- signed packaged executable and installer
- richer context-menu latency diagnostics
- identify slow handlers without automatically unregistering unknown COM extensions
- before/after timing for Explorer menu readiness
- export/import portable menu profiles
- richer 7-Zip action pack
- Windows Terminal module where installed
- clearer per-handler provenance and confidence scoring
- automated integration tests on supported Windows 11 builds

## Broader Clintware direction

The expandable product is not merely a menu customizer. The stronger direction remains a **developer workstation reliability layer**: detect configuration drift, expose the cause, apply reversible repairs, and measure time recovered. Context menus are one visible surface. Cursor/VS Code settings, shell configuration, Python tooling, Docker, browser/dev tooling, input latency, startup pressure, and app-specific repair packs are potential adjacent surfaces.

The design contract remains local-first, auditable, reversible, measurable, and useful without an ongoing cloud dependency.
