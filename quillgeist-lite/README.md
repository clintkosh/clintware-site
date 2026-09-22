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
  PowerShell / Python / C execution
  continuous redacted logs
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
- Each task points to a version-controlled PowerShell (`.ps1`), Python (`.py`), or C (`.c`) source file in `clintkosh/clintware-site`.
- C tasks compile locally with an approved detected compiler (`clang`, `gcc`, or `cl`) before execution.
- Only parameters declared for that task are accepted.
- Results are bounded before returning to the Control Plane.
- Duplicate job IDs are not executed twice.
- Provider secrets remain in their native stores and are not sent through the job payload.

A new type of local work is added by committing a reviewed task script and registering its task ID. It is not enabled by sending raw shell text through MCP.

## One-time install

```powershell
irm https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/install.ps1 | iex
```

After that, the local runner starts at Windows sign-in and waits on the event-driven WebSocket. There is no recurring polling task. The console opens with an animated retro ASCII interpretation of the Clintware mark and the `"GO FURTHEST.(TM)"` line, then remains available for live task logs.

## Initial tasks

- `clintware-doctor`
- `google-cloud-support-access`
- `finish-google-oauth`
- `python-runtime-check`
- `c-runtime-check`
- `ensure-c-runtime`
- `self-update`

The task registry can grow as new Clintware local automations are needed.

## MCP surface

The Control Plane exposes:

- `clintware_quillgeist_lite_status`
- `clintware_quillgeist_lite_run`
- `clintware_quillgeist_lite_job`

The caller never receives the local GitHub token or provider credentials.

## Runtime contract

Each registry entry declares a `runtime`:

- `powershell`: run a reviewed `.ps1` task with named parameters.
- `python`: run a reviewed `.py` task with `--Name value` parameters.
- `c`: download a reviewed `.c` source, compile it locally, stream compile logs, then run the resulting executable with `--Name value` parameters.

The model does not send arbitrary source code directly to the runner. New source is first committed/reviewed in the repository and registered as an allowlisted task.

The `self-update` task updates the maintained runner file and safely restarts it after the task result has had time to return.
