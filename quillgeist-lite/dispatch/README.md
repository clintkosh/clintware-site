# ChatGPT ↔ QQ control-plane routing

This file is the durable routing contract for ChatGPT sessions working on Clintware, Quillgeist Lite, QQ, MEMORIA, local execution, deployments, infrastructure, or recovery work.

## Chat mode default

Use normal ChatGPT chat mode by default for Clintware work.

- Do not switch to Work mode unless the user explicitly asks for Work mode.
- Prefer completing the task inside the current chat using available connectors, tools, GitHub relay, Clintware control-plane paths, and QQ.
- If a task can be completed in chat, keep it in chat.
- For work that touches the user's local Windows machine, MEMORIA, local files, local services, processes, scheduled tasks, installed apps, or machine configuration, use QQ whenever an authorized QQ path can perform the action.
- Prefer QQ over asking the user to run PowerShell, Command Prompt, scripts, installers, or manual local steps.
- If QQ lacks the needed local capability, first inspect whether an existing allowlisted task can do it or whether a safe reusable QQ task can be added within existing authorization.
- Do not treat Work mode as a fallback merely because a task is long, technical, multi-step, or involves files, repos, deployments, infrastructure, or local execution.
- Only use or recommend Work mode when the user specifically requests it.
- Preserve continuity in the current chat whenever possible rather than moving the task into a separate execution surface.

## Mandatory routing rule

Before saying Clintware, QQ, MEMORIA, or local execution is unavailable, inspect the currently authorized paths in this order:

1. Native Clintware / Quillgeist / QQ capability, if exposed in the current ChatGPT session.
2. Existing provider-specific connector when it is the better scoped tool.
3. The established GitHub relay in this repository:
   `ChatGPT → GitHub dispatch file → Clintware control plane → QQ on MEMORIA`.
4. Only after those paths are unavailable or verified broken should the user be asked for another connection or manual intervention.

Do not confuse "no native Clintware plugin visible" with "QQ cannot be reached."

## GitHub fallback dispatch

When ChatGPT has GitHub access but no native Clintware MCP capability, use the existing `Dispatch Quillgeist Lite Task` workflow as the scoped relay.

1. Read `quillgeist-lite/dispatch/request.json` and `quillgeist-lite/dispatch/result.json` first.
2. Do not overwrite an active request until it has been consumed, has a matching result, or has been shown to be stale/failed.
3. Update `quillgeist-lite/dispatch/request.json` on `main` with:
   - a unique `request_id`
   - an allowlisted `task_id`
   - validated string arguments
   - a bounded `objective`
4. The path-scoped push triggers `.github/workflows/quillgeist-lite-dispatch.yml`.
5. The Action uses its server-side `CONTROL_PLANE_MCP_TOKEN` to queue work at Clintware. Never place credentials, API keys, bearer tokens, cookies, or provider secrets in the request file.
6. Verify completion from `quillgeist-lite/dispatch/result.json` and, when necessary, the workflow/job evidence. A commit or queued job is not proof of successful local execution.
7. Report separately:
   - dispatched
   - delivered
   - executed
   - verified
8. For recoverable failures, inspect result/log evidence and continue through another safe allowlisted task rather than immediately asking the user to run commands.

## Always-on local check-in

QQ uses an independent watchdog channel for status and recovery while the runner is busy or restarting. Use the native check-in capability when available. GitHub fallback status requests use `quillgeist-lite/status-request.json` and publish to `ops/quillgeist-lite-live-status.json`. A `restart_runner` request defers when a fresh busy heartbeat is present. Task completion still requires a matching local runner result.

## Live local confirmation

QQ execution is event-driven. The local agent is the authority for execution state.

- A queued request is not execution evidence.
- MEMORIA/QQ sends ACK, log, and final result frames over its authenticated Control Plane WebSocket.
- The Control Plane publishes those frames on the scoped job-event stream.
- The GitHub relay subscribes to that stream and records completion only when it receives local-agent confirmation provenance.
- A valid final relay result includes `confirmation_source: qq-local-agent` (or its scoped recovery equivalent), the confirmed device, confirmation timestamp, and transport.
- Never infer success from a commit, queue response, heartbeat, another device, elapsed time, or an old `result.json`.
- Match `request_id`, `job_id`, and target device before reporting completion.
- Polling is only a bounded compatibility fallback when the event stream is unavailable; it is not the normal execution path.
- If local-agent confirmation is absent, report the action as unconfirmed rather than completed.
- Preserve this event path for chat-mode execution so future sessions can obtain concrete local evidence instead of assuming what happened.

## Browser-control and authentication rule

Visible QQ browser automation must clearly indicate when the local agent is controlling the page. Use the maintained blue/cyan/purple edge glow and `QQ // CONTROL` badge during automated interaction; use a distinct user-handoff state when the user is expected to act.

Provider authentication is a separate security boundary:

- Never automate Google, Microsoft, or other identity-provider sign-in UI with Playwright/CDP.
- Never type passwords, passkeys, MFA/OTP values, security codes, or provider tokens.
- Open provider sign-in/consent in the user's normal supported system Edge session with no QQ automation flags.
- After authentication returns to a Clintware-owned application, QQ may resume governed automation on the application page.
- A provider rejection such as an "insecure browser/app" error is a routing defect: repair the auth handoff path rather than repeatedly asking the user to sign in through the automated browser.

## Execution philosophy

Use:

`intent → discover → recover state → inspect → execute → verify → persist → report evidence`

Prefer the existing architecture and registrations over parallel replacements. Use QQ for Windows/MEMORIA actions. Keep credentials behind the control plane. Prefer deterministic/local execution over paid model calls where practical.

## Usage telemetry invariant

Provider usage/balance gauges must not create model inference calls just to measure usage. Prefer billing/admin/quota APIs, local ledgers, cached state, and bounded reconciliation. Multiple QQ windows must share state rather than create independent provider pollers.

## Native ChatGPT connection

For client maintenance, stay in the current chat. Read status and diagnostics, then use `clintware_quillgeist_lite_run` with `task_id: self-update`, an explicit `target_device`, and `resume_after: true`. Inspect the returned job until it passes or fails, then check that device's post-restart connection. A queued update or another device's heartbeat is not success. The same fields are supported by the GitHub dispatch fallback. Missing credentials require restoration of the authorized device registration; recovery must not launch enrollment browsers in the background.

Runtime updates stage and validate the complete task bundle from the deployment's pinned source revision before publishing its registry. Unchanged complete bundles stay cached. Interrupted startup and temporary network failures retain credentials and use bounded retries. This route does not depend on ChatGPT Work; it requires an authorized native MCP connection or the established writable GitHub relay in that chat.

When a native Clintware capability is available, prefer it over the GitHub relay. The personal OAuth MCP endpoint remains:

`https://mcp.clintware.com/mcp`

The GitHub relay remains the recovery/fallback route and should stay functional even when the native path exists.

## Historical verification

Verified 2026-09-26: request `chatgpt-qq-bridge-check-20260926-0036` queued `clintware-doctor` as job `d151b9c1-a889-4dba-b6fa-15a45b96e7fb`; delivery succeeded but execution failed because MEMORIA lacked the packaged local task registry at that time.

Verified 2026-09-27: ChatGPT recovered this relay from repository history and dispatched work to MEMORIA by updating `quillgeist-lite/dispatch/request.json`. This route must be checked before declaring QQ inaccessible.
