# Clintware™ Right-Click Menu Manager — Product Plan

## Current wedge: v0.2.0

A local-first Windows utility that turns context-menu maintenance from registry spelunking into explicit toggles with rollback.

Shipped now:

- detection-aware 7-Zip quick action
- extract to archive-name folder
- elevated PowerShell in the relevant working folder
- file, folder, and folder-background coverage
- Windows 11 classic/full-menu toggle
- preview-before-apply UI
- registry snapshot before changes
- undo last apply
- Explorer restart
- per-user registry scope where practical
- one-time self-elevating installer and Start Menu launcher

## v0.3 target

- full discovered registry-verb inventory in the GUI
- enable/disable ordinary discovered verbs without deleting them
- Windows Terminal options when installed
- 7-Zip action pack: Open, Extract Here, Extract Files, Test, Add to ZIP/7z
- profiles: Minimal, Developer, Archive-heavy, Restore Windows defaults
- exact diff preview showing registry values to be added or removed
- persistent change ledger with multiple rollback points
- import/export a portable menu profile

## v0.4 target

- signed packaged executable/installer
- update check with explicit opt-in
- shell-menu latency diagnostics
- identify slow handlers without automatically unregistering unknown COM extensions
- before/after timing for Explorer menu readiness
- repair recommendations with confidence and rollback path

## Broader Clintware direction

The expandable product is not merely a menu customizer. The stronger direction is a **developer workstation reliability layer**: detect configuration drift, expose the cause, apply reversible repairs, and measure time recovered. Context menus are one visible surface. Cursor/VS Code settings, shell configuration, Python tooling, Docker, browser/dev tooling, input latency, startup pressure, and app-specific repair packs are potential adjacent surfaces.

The design contract remains local-first, auditable, reversible, measurable, and useful without an ongoing cloud dependency.
