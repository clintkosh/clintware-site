---
name: mcp-local-runner-builder
description: Build a user-owned MCP server plus event-driven local runner so an authorized AI client can trigger allowlisted PowerShell or other local tasks, stream logs continuously, receive results, and continue after failures without copy/paste or exposing arbitrary remote shell access.
---

# MCP Local Runner Builder

Use this skill when the user wants to connect an AI/LLM client to their own computer through a user-owned MCP server, especially when they want:

- an LLM to trigger local PowerShell, Python, C, Node, Git, or maintenance tasks without copying commands by hand;
- a persistent event-driven bridge rather than polling;
- continuous stdout/stderr streaming back to the control plane;
- a durable job/result history;
- model-driven continuation after a failed task;
- one-time local installation followed by hands-free task dispatch;
- a reusable pattern that can work with multiple MCP-capable AI clients.

## Quality-first execution selection

When the user does not explicitly require a language or runtime, choose by this order:

1. Best fit for the requested outcome and highest output quality.
2. Reliability and maintainability in the target environment.
3. Only after those are satisfied, optimize setup cost, token/log volume, compute, latency, and operational overhead.

Do not choose a cheaper runtime if doing so materially lowers the quality or fidelity of the result. PowerShell, Python, C, and other runtimes are implementation tools; the task outcome determines the best one.

## Core architecture

Prefer this pattern:

```text
authorized AI / MCP client
        |
        v
user-owned MCP server / control plane
  authentication
  scoped client permissions
  allowlisted task registry
  durable job + log state
        |
        v
persistent outbound WebSocket
        |
        v
local runner on the user's machine
  local allowlist validation
  task execution
  continuous redacted logs
  final result evidence
        |
        v
MCP job/result tools
```

The local machine initiates the outbound connection. Do not require an inbound firewall port on the user's computer.

## Important behavior: failure is data, not the end of the session

A failed local task must not terminate the runner or the overall work session.

Use this protocol:

1. queue an allowlisted task;
2. mark it running when the local runner acknowledges it;
3. stream bounded stdout/stderr lines continuously;
4. persist a final passed/failed result with exit code and duration;
5. keep the WebSocket/runner alive after failure;
6. let the AI inspect the failed job and logs;
7. let the AI choose the next allowlisted task or corrected parameters;
8. continue until the user's Definition of Done is satisfied or a genuinely blocking human action is required.

Do not silently invent fixes or mutate the machine outside the declared task set merely because a command failed.

## Do not expose an unrestricted remote shell by default

The default safe design is **task ID + approved parameters**, not raw shell text.

Example task registry:

```json
{
  "version": 1,
  "tasks": {
    "doctor": {
      "runtime": "powershell",
      "script": "tasks/doctor.ps1",
      "parameters": []
    },
    "python-check": {
      "runtime": "python",
      "script": "tasks/python-check.py",
      "parameters": ["Message"]
    },
    "c-check": {
      "runtime": "c",
      "script": "tasks/c-check.c",
      "parameters": ["Message"]
    }
  }
}
```

The MCP request should contain only:

```json
{
  "task_id": "configure-example",
  "args": {
    "Project": "Example",
    "Environment": "production"
  }
}
```

The server validates the task ID and parameter names. The local runner validates them again before execution.

A new local capability should normally be added by committing/reviewing a new task script and registering its task ID once.

## Multi-runtime task execution

A useful local runner can support multiple reviewed runtimes without exposing arbitrary remote code execution.

Recommended runtime contract:

- `powershell`: execute a reviewed `.ps1` file with named parameters.
- `python`: execute a reviewed `.py` file with CLI-style parameters.
- `c`: compile a reviewed `.c` file locally with an allowlisted compiler, stream compiler output, and execute the resulting binary only if compilation succeeds.

The runtime is part of the task registry. The caller chooses only a registered task ID plus declared arguments; it does not upload raw code in the MCP request.

For compiled tasks, treat compilation as a first-class log phase so the model can distinguish compiler errors from runtime errors.

## MCP tool surface

A minimal MCP server should expose three tools:

### `local_runner_status`

Return:

- online runner count;
- last-seen timestamp;
- runner/device identifier;
- runner version;
- recent bounded job metadata.

This is read-only.

### `local_runner_run`

Inputs:

- `task_id`;
- approved string parameters;
- optional human-readable objective.

Behavior:

- verify caller scope;
- verify task ID;
- verify parameter allowlist;
- create a unique job ID;
- persist the queued job;
- push the job over the runner WebSocket;
- return the job ID immediately.

Do not accept raw PowerShell/shell source in this tool unless the user explicitly designs and accepts a stronger local policy model.

### `local_runner_job`

Input:

- `job_id`.

Return:

- status: queued/running/passed/failed;
- bounded live logs;
- exit code;
- duration;
- final output summary;
- timestamps.

This lets the AI inspect failures and continue with another approved task.

## Continuous log streaming

The runner should stream logs as they happen rather than waiting for the process to finish.

Recommended message shape:

```json
{
  "type": "log",
  "job_id": "uuid",
  "task_id": "doctor",
  "seq": 17,
  "line": "Checking dependency...",
  "timestamp": "2026-09-21T22:00:00Z"
}
```

Server-side requirements:

- persist only a bounded number of lines per job;
- order with a sequence number;
- cap individual line length;
- cap total retained job output;
- record status transitions;
- never let malformed log messages crash the connection.

Local requirements:

- redact token/secret-shaped values before they leave the machine;
- do not deliberately print environment secrets;
- capture stdout and stderr;
- continue the runner after any task failure.

## Authentication

Use separate credentials for separate trust boundaries.

Recommended:

- MCP clients receive revocable scoped MCP credentials;
- the local runner receives a runner/device credential or another user-owned machine identity;
- provider credentials stay where they belong and are not copied into MCP job payloads;
- the server stores hashes of long-lived client/device tokens when practical.

If using an existing identity provider, verify the identity server-side on connection and bind the accepted identity to the intended runner/device.

## Durable queue

Store at least:

```text
job_id
task_id
args
requested_by
objective
status
created_at
started_at
completed_at
logs[]
result
```

Keep queued/running jobs available for reconnect replay.

A runner that reconnects should receive pending jobs that were not completed. Use job IDs for idempotency so reconnects do not execute the same job twice.

## Local runner loop

The local runner should:

1. authenticate locally;
2. open an outbound `wss://` connection to the user's server;
3. send a hello packet with runner ID/version;
4. wait for jobs without polling;
5. reject unknown task IDs;
6. download/read only approved task definitions/scripts;
7. validate parameters against the local registry;
8. execute;
9. stream redacted logs;
10. send final result;
11. persist recently completed job IDs locally;
12. remain connected after success or failure;
13. reconnect with backoff when the network drops.

## Optional local watchdog service

For long-running Windows installations, prefer a separate local health service when the main interactive runner needs crash recovery.

Recommended split:

- a Windows Service performs health monitoring, crash detection, restart requests, and bounded diagnostic uplink;
- the interactive user-session runner owns the visible terminal and task execution;
- use a separate revocable device credential for the service rather than exposing the user's provider or MCP credentials;
- have the service restart the runner through an interactive scheduled task because Windows services run in Session 0 and should not own the user's visible UI;
- send state changes, warnings, crashes, and bounded failure context rather than high-volume normal logs.

A failed or crashed runner should not erase its diagnostic evidence. The watchdog should preserve enough context for the model to choose the next appropriate task or runtime.

## Windows one-line install pattern

When practical, place the maintained installer in the user's repository and let them run one short command such as:

```powershell
irm https://raw.githubusercontent.com/OWNER/REPO/main/local-runner/install.ps1 | iex
```

The installer should be idempotent and should:

- install/check prerequisites;
- authenticate the runner;
- place the maintained runner script in a stable local directory;
- register startup behavior using the user's preferred mechanism;
- start the runner;
- perform a health/connection check;
- print a concise success or exact blocking error.

Prefer the user's own repository and infrastructure. Do not silently substitute a hosted service if self-hosting is the stated goal.

## Event-driven, not polling

Prefer WebSockets, server-sent events, or another push channel. Do not create a scheduled task that polls every few minutes merely to discover work if a persistent outbound connection is viable.

A reconnect loop is acceptable. It is transport recovery, not job polling.

## Model-driven continuation

When an AI client receives a failed result:

1. inspect the exit code and most recent relevant log lines;
2. distinguish a transient/provider failure from a configuration or input error;
3. identify an already-registered task that can address the failure;
4. dispatch that task with corrected allowed parameters;
5. inspect its result;
6. continue the original workflow.

If no allowed task can resolve the issue, add a new reviewed task definition rather than bypassing the allowlist with raw shell execution.

If the failure requires interactive login, consent, MFA, payment, destructive approval, or another human-only action, surface only that minimal action and resume automatically after it is complete.

## Security checklist

Before calling the design complete, verify:

- no arbitrary unauthenticated execution endpoint;
- no raw provider secrets in jobs/logs;
- no inbound local listening port required;
- TLS/WSS in transit;
- separate MCP and runner/device credentials;
- server-side and local task allowlists;
- parameter allowlists;
- path traversal blocked when downloading task scripts;
- result/log size caps;
- local log redaction;
- duplicate job protection;
- reconnect replay;
- least-privilege MCP client scopes;
- failure does not kill the runner;
- no silent privilege escalation after a failure.

## Cloudflare-style implementation

A serverless implementation can use:

- an HTTP/MCP Worker;
- a Durable Object or equivalent actor for each runner/queue;
- WebSocket hibernation/persistent connection support;
- durable key/value or SQLite state for job metadata and bounded logs.

Keep the architecture provider-neutral. Equivalent user-owned infrastructure is acceptable.

## Definition of done

The setup is complete when:

1. an authorized MCP client can see runner status;
2. the client can dispatch a known task without the user copying a command;
3. the local runner receives it through an event-driven connection;
4. logs appear in durable job state while the task is running;
5. the result is retrievable by job ID;
6. a failed task leaves the runner online;
7. the model can dispatch the next allowed task based on the failure;
8. reconnecting does not duplicate completed work;
9. no underlying provider credential is exposed to the AI client.
