# Quillgeist local node alpha

Quillgeist is a user-owned local runtime for AI agents.  The local node performs approved filesystem, shell, Python, PowerShell, Node.js, Git, validation, scheduling, rollback, logging, evidence collection, and account-scoped operational telemetry on the user's own machine.

`AI planner → Quillgeist intent + user preferences → local policy/runtime → verified result → compact evidence`

The model can change.  The user's local execution policy, explicit preferences, and result evidence remain with Quillgeist.

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

## User-owned persistent preferences

Quillgeist can now retain explicit preferences locally and inject them into future compiled instructions independently of the AI provider.

From Quillgeist Desktop, enter an explicit preference command:

```text
remember: Keep the original file and create a copy
```

A later command is compiled with that saved preference before it is handed to the connected AI/planner.  Task-specific instructions always override saved preferences.

The same store can be managed from the CLI:

```bash
quillgeist preferences add "Keep the original file and create a copy"
quillgeist preferences list
quillgeist preferences remove p-1234abcd
```

Preferences are stored under the Quillgeist home directory rather than in a model provider's chat history.  Writes use the existing local DLP settings before persistence; high-risk values are sanitized under the default policy.  Preferences are only saved through explicit user actions such as `remember:` or the preference CLI.

This provides the MVP cross-model loop:

`user correction → local Quillgeist preference → new task → preference injected → any connected model`

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
