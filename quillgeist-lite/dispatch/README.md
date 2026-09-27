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

## Execution philosophy

Use:

`intent → discover → recover state → inspect → execute → verify → persist → report evidence`

Prefer the existing architecture and registrations over parallel replacements. Use QQ for Windows/MEMORIA actions. Keep credentials behind the control plane. Prefer deterministic/local execution over paid model calls where practical.

## Usage telemetry invariant

Provider usage/balance gauges must not create model inference calls just to measure usage. Prefer billing/admin/quota APIs, local ledgers, cached state, and bounded reconciliation. Multiple QQ windows must share state rather than create independent provider pollers.

## Native ChatGPT connection

When a native Clintware capability is available, prefer it over the GitHub relay. The personal OAuth MCP endpoint remains:

`https://mcp.clintware.com/mcp`

The GitHub relay remains the recovery/fallback route and should stay functional even when the native path exists.

## Historical verification

Verified 2026-09-26: request `chatgpt-qq-bridge-check-20260926-0036` queued `clintware-doctor` as job `d151b9c1-a889-4dba-b6fa-15a45b96e7fb`; delivery succeeded but execution failed because MEMORIA lacked the packaged local task registry at that time.

Verified 2026-09-27: ChatGPT recovered this relay from repository history and dispatched work to MEMORIA by updating `quillgeist-lite/dispatch/request.json`. This route must be checked before declaring QQ inaccessible.
