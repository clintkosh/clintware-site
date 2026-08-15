# AgentBridge Node alpha 2

AgentBridge Node is the local executor in the AgentBridge architecture:

`LLM → Execution Pack → AgentBridge Cloud/Node → local execution → Contextor → Result Pack`

The hosted model plans.  The Node does filesystem, shell, Python, PowerShell, Node.js, Git, validation, scheduling, rollback, logging, evidence collection, and account-scoped operational telemetry locally.

## Safety model

AgentBridge does **not** expose a raw administrator shell to the internet.

- A Node opens an outbound authenticated connection to AgentBridge Cloud.
- Every pack declares capabilities.
- Local policy decides `always`, `ask`, or `never`.
- Workspaces can be allow-listed.
- Mutated files are snapshotted before writes.
- Cloud approval can satisfy `ask`; it can never override a local `never`.
- `.md` and `.json` clipboard detection never silently executes by default.

## Install from source

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -e .
agentbridge init
agentbridge doctor
```

## First local run

```bash
agentbridge make-pack examples/hello-manifest.json hello.abpack
agentbridge inspect hello.abpack
agentbridge run hello.abpack --workspace ./sandbox
```

## Pair with AgentBridge Cloud

```bash
agentbridge pair --cloud https://agentbridge.clintware.com
agentbridge daemon
```

The `pair` command prints a short code.  Enter it in AgentBridge Cloud.  While the daemon is connected, Cloud routing, schedules, Help Center synchronization, and queued operational telemetry can synchronize with the account.

## Local + Cloud Help Center

```bash
agentbridge help start
agentbridge help faq
agentbridge help glossary --search Contextor
agentbridge help fixes
```

The Help Center is stored locally under `~/.agentbridge/help/help.json`.  It starts with Getting Started, setup/removal, FAQ, glossary, and Recent Fixes sections.  Passed Execution Packs may include `help_updates`, allowing relevant documentation and the fix feed to evolve with functionality changes.

## Operational telemetry

Alpha 2 records account-scoped operational metadata by default so the user's Cloud dashboard can report real usage and product quality.  Events include connection/send/receive counts, run status and duration, Contextor token estimates, patch/file counts, Node version, and redacted errors.

Prompt text and file contents are not included in telemetry events.  Telemetry can be inspected or disabled locally:

```bash
agentbridge telemetry status
agentbridge telemetry off
agentbridge telemetry on
agentbridge telemetry flush
```

When Cloud is unreachable, eligible telemetry is queued locally and retried later.  Authentication/revocation failures are not queued indefinitely.

## Product bug lifecycle

Ordinary user-task failures do not automatically count as AgentBridge product bugs.  AgentBridge-internal failures, or failures explicitly reported by the user, receive a normalized bug fingerprint.  Cloud tracks their lifecycle as open, resolved, or reopened.  A successful repair pack can declare `fixes_bug_ids` or `retry_of` so a known bug is marked resolved when the repair actually passes.

## File associations

```bash
agentbridge install-associations
```

This registers `.abpack` with AgentBridge.  It intentionally does **not** take over all `.md` or `.json` files unless `--include-md-json` is provided.

## Clipboard

```bash
agentbridge clipboard-watch --mode detect
```

Modes: `off`, `detect`, `import`, and `trusted`.  Trusted auto-run requires explicit Owner Mode plus trusted-auto-run.

## Scheduling

```bash
agentbridge schedule add hello.abpack --at 2026-08-16T09:00:00-05:00
agentbridge schedule add hello.abpack --every 3600
agentbridge schedule list
```

Cloud-owned and device-owned schedules use the same schedule shape.  Device-owned schedules can continue locally if Cloud is unavailable.

## Result evidence

Each completed run writes an `.abresult` containing execution status, Definition-of-Done checks, changed-file evidence, Contextor metrics, planner feedback, and rollback metadata.  Contextor compacts large execution output before it is returned to an upstream planner.
