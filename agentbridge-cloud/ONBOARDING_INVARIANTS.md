# Quillgeist onboarding and isolation invariants

This file is a regression lock for the public Quillgeist distribution.

## Permanent public-build rule

A public Quillgeist build must start local-only.

1. Download/install the local executable.
2. Initialize and use local features without any required cloud account.
3. Do not configure a Clintware cloud/control endpoint in the downloadable node.
4. Keep Quillgeist telemetry disabled by default.
5. If cloud routing is wanted, require an explicit URL for a Quillgeist Cloud deployment the user owns or controls.
6. Reject Clintware-owned hostnames as public-node pairing targets.

## Clintware-hosted distribution rule

The Clintware-hosted Quillgeist domain is for software and documentation distribution. It must not expose public account bootstrap, device pairing, device WebSockets, remote jobs, schedules, telemetry ingestion, REST execution, or MCP execution.

## Self-host rule

The repository may include the Quillgeist Cloud implementation. On a non-Clintware domain, a user may deploy that implementation under their own infrastructure and credentials. The self-hosted control room is separate from the Clintware distribution page.

## Release assets expected

- `Quillgeist-Setup-Windows-x64.exe`
- `Quillgeist-Windows-x64.exe`
- `Quillgeist-macOS-arm64`
- `Quillgeist-Linux-x64`

Release validation must prove the executable defaults to an empty cloud URL and telemetry disabled before publication.
