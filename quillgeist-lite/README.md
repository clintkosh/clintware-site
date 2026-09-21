# Clintware Quillgeist Lite

Clintware Quillgeist Lite restores the original lightweight Agent Broker idea: let an authorized LLM/client ask the Clintware MCP Control Plane to trigger a bounded task on the user's Windows machine, then return execution evidence to the model.

```text
authorized LLM / MCP client
        |
        v
mcp.clintware.com
  scoped product access
  task allowlist
  durable job record
        |
        v
outbound WebSocket
        |
        v
Clintware Quillgeist Lite
  local task allowlist
  PowerShell execution
  result evidence
        |
        v
MCP job result
```

## Why Lite exists

Full Quillgeist remains the richer local-agent product with execution packs, policy modes, scheduling, local preferences, rollback, DLP, telemetry, and broader runtimes.

Quillgeist Lite is intentionally smaller. It exists for the recurring Clintware case where an LLM needs to run a known maintenance/bootstrap task on Clint's Windows machine without requiring a new PowerShell block to be copied out of chat every time.

## Security model

Quillgeist Lite is not an arbitrary remote shell.

- The runner creates only an outbound WebSocket.
- The Control Plane authenticates the local receiver against the existing `clintkosh` GitHub CLI identity.
- MCP callers must be allowed to access the `quillgeist-lite` product.
- The MCP may submit only task IDs present in the server allowlist.
- The Windows runner independently checks the task ID against `quillgeist-lite/tasks.json`.
- Each task points to a version-controlled PowerShell file in `clintkosh/clintware-site`.
- Only parameters declared for that task are accepted.
- Results are bounded before returning to the Control Plane.
- Duplicate job IDs are not executed twice.
- Provider secrets remain in their native stores and are not sent through the job payload.

A new type of local work is added by committing a reviewed task script and registering its task ID. It is not enabled by sending raw shell text through MCP.

## One-time install

```powershell
irm https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/install.ps1 | iex
```

After that, the local runner starts at Windows sign-in and waits on the event-driven WebSocket. There is no recurring polling task.

## Initial tasks

- `clintware-doctor`
- `google-cloud-support-access`
- `finish-google-oauth`

The task registry can grow as new Clintware local automations are needed.

## MCP surface

The Control Plane exposes:

- `clintware_quillgeist_lite_status`
- `clintware_quillgeist_lite_run`
- `clintware_quillgeist_lite_job`

The caller never receives the local GitHub token or provider credentials.
