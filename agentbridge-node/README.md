# Quillgeist local node alpha

Quillgeist is a local-first adaptive AI execution layer.  The local node performs approved filesystem, shell, Python, PowerShell, Node.js, Git, validation, scheduling, rollback, logging, evidence collection, and account-scoped operational telemetry on the user's own machine.

`AI planner → Quillgeist execution pack → Quillgeist Cloud → local Quillgeist node → verified result → compact evidence`

## Windows alpha

Download `Quillgeist-Windows-x64.exe` from the current Quillgeist GitHub prerelease.

First run:

```powershell
.\Quillgeist-Windows-x64.exe init
.\Quillgeist-Windows-x64.exe doctor
.\Quillgeist-Windows-x64.exe pair --cloud https://quillgeist.clintware.com
.\Quillgeist-Windows-x64.exe daemon
```

The pair command prints a short code.  Open Quillgeist Cloud, enter the code, and the computer appears in the Quillgeist control room.

## macOS and Linux alpha

Use the matching single-file build from the Quillgeist prerelease, then run the same commands with that executable name.

## Install from source

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -e .
quillgeist init
quillgeist doctor
quillgeist pair --cloud https://quillgeist.clintware.com
quillgeist daemon
```

The legacy `agentbridge` command remains only as a temporary compatibility alias for existing alpha installs.

## Local authority

Quillgeist does not expose an unrestricted administrator shell to the internet.

- The local node opens an outbound authenticated connection to Quillgeist Cloud.
- Every execution pack declares requested capabilities.
- Local policy decides `always`, `ask`, or `never`.
- Workspaces can be allow-listed.
- Mutated files are snapshotted before writes.
- Cloud approval can satisfy `ask`; it cannot override a local `never`.
- Markdown and JSON clipboard detection never silently executes by default.
- Sensitive-data detection runs locally before execution and before eligible external-model routing.

## First local run

```bash
quillgeist make-pack examples/hello-manifest.json hello.abpack
quillgeist inspect hello.abpack
quillgeist run hello.abpack --workspace ./sandbox
```

## Help Center

```bash
quillgeist help start
quillgeist help faq
quillgeist help glossary --search Contextor
quillgeist help fixes
```

The Help Center is stored under the Quillgeist home directory (`~/.quillgeist` by default for new installs).

## Operational telemetry

Quillgeist records account-scoped operational metadata so the Cloud dashboard can report real usage and product quality.  Events can include connection/send/receive counts, run status and duration, Contextor token estimates, patch/file counts, node version, and redacted errors.

Prompt text and file contents are not included in telemetry events.  Telemetry can be inspected or disabled locally:

```bash
quillgeist telemetry status
quillgeist telemetry off
quillgeist telemetry on
quillgeist telemetry flush
```

## File associations

```bash
quillgeist install-associations
```

This registers `.abpack` and `.abresult` as Quillgeist documents.  The extensions are retained for alpha compatibility; the OS-visible application and descriptions are Quillgeist.

## Scheduling

```bash
quillgeist schedule add hello.abpack --at 2026-08-18T09:00:00-05:00
quillgeist schedule add hello.abpack --every 3600
quillgeist schedule list
```

Cloud-owned and device-owned schedules use the same schedule shape.  Device-owned schedules can continue locally if Cloud is unavailable.

## Result evidence

Each completed run writes an `.abresult` containing execution status, Definition-of-Done checks, changed-file evidence, Contextor metrics, planner feedback, and rollback metadata.  Contextor compacts large execution output before it is returned to an upstream planner.
