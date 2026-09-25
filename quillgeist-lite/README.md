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

The visible qq window is also a real local console, not a passive log viewer. The signed-in user can type qq commands, run reviewed local tasks, and use a local-only PowerShell escape. Remote MCP callers remain restricted to the reviewed task allowlist and cannot use that arbitrary local shell escape.

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

After that, the local runner starts at Windows sign-in and waits on the event-driven WebSocket. There is no recurring polling task. The Windows health service also reopens the console automatically if the runner disappears. The managed interactive scheduled task runs at **Highest** privilege, so qq is an administrator console after the one-time elevated install/upgrade.

The console opens with the Clintware/Quillgeist terminal treatment and remains available for both live task logs and direct local input. The prompt is `qq(admin)>` when the managed task is running elevated.

## Initial tasks

- `clintware-doctor`
- `google-cloud-support-access`
- `finish-google-oauth`
- `python-runtime-check`
- `c-runtime-check`
- `ensure-c-runtime`
- `self-update`
- `connect-jira` — open Atlassian OAuth in the browser and connect Jira to the Control Plane without storing Jira credentials locally
- `enable-admin-console` — convert an existing qq installation to the service-supervised interactive administrator console and reopen it elevated

The task registry can grow as new Clintware local automations are needed.

## Interactive local console

The visible qq window accepts local commands while its Control Plane WebSocket remains active:

- `help` / `?` — command reference
- `status` — privilege, service, and Control Plane connection state
- `tasks` — reviewed local task list
- `run <task> [Name=Value ...]` — execute an allowlisted task locally
- `jira` — shorthand for `connect-jira`
- `doctor` — Clintware local diagnostics
- `update` — self-update qq
- `admin` — one-time upgrade/reopen as the supervised admin console
- `reconnect` — reconnect the Control Plane channel
- `clear` — redraw the terminal
- `! <PowerShell>` — **local-only** PowerShell escape

The `!` escape is intentionally available only to keystrokes entered in the local console. It is not represented as an MCP tool or task and cannot be sent by a remote model through the Control Plane.


## Local AI layer

The owner qq build now exposes a bounded `local-ai` task for the local-inference portion of the stack without turning Lite into a general model-administration shell.

From the visible qq console:

```text
run local-ai Action=status
run local-ai Action=recommend ContextTokens=8192
run local-ai Action=fit Model=ollama:MODEL
run local-ai Action=benchmark Model=ollama:MODEL Prompt=Reply_with_READY MaxTokens=48
```

The task inventories installed Ollama/llama.cpp runtimes and models, estimates whether an installed model fits the current RAM envelope, recommends a viable installed local target, and can run a bounded benchmark. It does not download models implicitly and remains inside the reviewed task allowlist.

This capability is part of the internal owner path. Public Quillgeist Full receives the reusable local-inference engine and self-hosted controls, but not the Clintware owner transport, credentials, or internal task channel.

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


## Quality-first runtime selection

Unless the user explicitly chooses a language, Quillgeist Lite uses this priority order:

1. Choose the implementation that best matches the intended result and produces the highest-quality outcome.
2. Prefer the most reliable and maintainable approach for the target environment.
3. Only after the quality bar is met, optimize for setup time, runtime cost, token/log volume, latency, and maintenance overhead.

PowerShell, Python, and C are tools, not rankings. The task decides the runtime. Efficiency is the tiebreaker among approaches that can meet the same quality standard.

See `EXECUTION_POLICY.md`.

## Local health service

The normal Windows installation now has two cooperating components:

```text
ClintwareQuillgeistLiteHealth  (Windows Service / LocalSystem)
        |
        | health + crash monitoring
        | secure device diagnostics
        | restart request
        v
Clintware Quillgeist Lite Runner  (interactive user session)
        |
        | outbound WebSocket
        | task logs/results
        v
mcp.clintware.com
```

The health service:

- starts automatically with Windows;
- monitors the interactive runner process;
- captures crash-log and important warning/error lines;
- requests a runner restart through the registered interactive scheduled task when the runner dies, which causes the visible qq window to reopen automatically;
- rate-limits restart loops;
- sends bounded diagnostics through a separate machine/device credential;
- never receives the user's GitHub token, Google credential, or MCP client secret;
- sends a low-frequency health heartbeat and state changes rather than normal log chatter.

The interactive runner remains responsible for task execution and the visible terminal UI. A Windows service cannot safely draw directly into the signed-in desktop from Session 0, so the service launches and supervises a user-session scheduled task instead. That task is registered at Highest privilege and opens the qq Windows Terminal profile in the interactive user session.

The installer registers the service credential by sending only its SHA-256 hash to the Control Plane. The plaintext device credential is stored only in the protected local service configuration.

The Control Plane exposes the bounded health stream through `clintware_quillgeist_lite_diagnostics`.

## Interactive qq runtime

Quillgeist Lite now treats the local qq window as an interactive local-agent terminal, not only a task runner.

- Every launcher window load refreshes the maintained runner, PowerShell 7 bootstrap, auto-repair asset, and boot splash.
- qq prefers the current PowerShell 7 runtime and can install or upgrade `Microsoft.PowerShell` through winget when needed.
- Plain natural-language input is relayed through the Clintware Control Plane as a durable interactive question. `ask <text>` is the explicit equivalent.
- Replies are pushed over the existing qq WebSocket and polled every five seconds as a recovery path until the local runner acknowledges delivery.
- Obvious credential/token assignments are redacted before natural-language relay leaves Windows.
- `! <PowerShell>` remains a local-only shell escape. Remote MCP callers still execute only reviewed allowlisted tasks.
- The Windows health service watches bounded runner/crash diagnostics. Repeated errors or a restart loop trigger the canonical runtime repair path with cooldown/rate limits rather than restarting indefinitely.
- The design remains local-first: Windows owns the interactive runtime and execution boundary; Clintware routes scoped intent, handoffs, diagnostics, and replies.



## Quillgeist Web

qq now provides a TinyFish-class live-web surface using the existing local Playwright runtime rather than a third-party browser-automation API:

- `web search <query>` — live public-web search through the local browser, with Bing-first and DuckDuckGo fallback.
- `web read <url>` — structured page text, headings, and links.
- `web run <json>` — bounded multi-step navigation, form, click, wait, inspect, extraction, search, and read actions.
- `web login <url>` — visible local authentication into the persistent browser profile; credentials stay on the Windows device.

The authenticated plugin/MCP endpoint is `https://mcp.clintware.com/mcp`. It uses the existing Clintware OAuth/PKCE flow, so a compatible client can connect through browser authorization without asking the user to paste a Control Plane API key. The current OAuth policy remains owner/admin scoped; this is not a general public remote-control grant.

The plugin bundle and curated skill live under `control-plane/chatgpt-plugin/`. Search and read queue allowlisted qq browser jobs, and multi-step automation uses the same task with an explicit approval bit for consequential actions. Results return through the existing durable Quillgeist Lite job record.


## Responder agent

The reviewed `responder-agent` task installs a lightweight local scheduled scanner and a loopback-only management UI.

Local qq shortcuts:

```text
responder install
responder
responder on
responder off
responder run
responder status
responder kill
responder unkill
```

The UI binds only to `127.0.0.1:8765`. It provides an enable toggle, global kill switch, run-now action, editable expertise/voice/goals text, Discourse source list, report address/hour, scoring threshold, optional local Ollama model, resource metrics, and the current opportunity queue.

State is kept under `%LOCALAPPDATA%\Clintware\QuillgeistLite\responder-agent` using JSON configuration, SQLite WAL state, and local daily report files. The Windows scheduled task is `ClintwareResponderAgent` and defaults to a 15-minute cadence with overlapping runs disabled.

The first built-in discovery adapter uses the official Hacker News API. Hacker News is hard-coded `RESEARCH_ONLY` because its current guidelines prohibit generated or AI-edited comments. Stack Overflow is disabled by default for the same reason. Discourse sites can be added explicitly and remain `RESEARCH_ONLY` by default. A separate UI field lets you mark a site as AI-drafting-permitted only after you have verified that site's current rules; those items become `APPROVAL_REQUIRED`, never automatic writes.

If an installed Ollama model is configured, eligible approval-gated items can pass through independent draft, factual-verifier, adversarial-reviewer, and voice/policy-review passes. A passing local review does not grant publication permission.

Daily reports are generated locally. When a report address is configured, the scheduled wrapper sends the report through the authenticated qq/Control Plane boundary. The Control Plane obtains a short-lived delegated Google token from the identity broker and uses the existing Gmail send scope; provider refresh credentials never enter the local responder process.

See `ASTRO_RESPONDER_AGENT_SKILL.md` for the default design invariant.
