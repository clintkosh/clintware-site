# AgentBridge Node alpha

AgentBridge Node is the local executor in the AgentBridge architecture:

`LLM → Execution Pack → AgentBridge Cloud/Node → local execution → Contextor → Result Pack`

The hosted model plans. The Node does the filesystem, shell, Python, PowerShell, Node.js, Git, validation, scheduling, rollback, logging, and evidence collection locally.

## Safety model

AgentBridge does **not** expose a raw administrator shell to the internet.

- A Node opens an outbound authenticated connection to AgentBridge Cloud.
- Every pack declares capabilities.
- Local policy decides `always`, `ask`, or `never`.
- Workspaces are allow-listed.
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

The `pair` command prints a short code. Enter that code in the AgentBridge Cloud dashboard.

## File associations

```bash
agentbridge install-associations
```

This registers `.abpack` with AgentBridge. It intentionally does **not** take over all `.md` or `.json` files unless `--include-md-json` is provided.

## Clipboard

```bash
agentbridge clipboard-watch --mode detect
```

Modes: `off`, `detect`, `import`, and `trusted`. Trusted auto-run requires explicit Owner Mode plus trusted-auto-run.

## Scheduling

```bash
agentbridge schedule add hello.abpack --at 2026-08-16T09:00:00-05:00
agentbridge schedule add hello.abpack --every 3600
agentbridge schedule list
```

Cloud-owned and device-owned schedules use the same schedule shape.
