---
name: quillgeist-local-offload
description: Route eligible work from ChatGPT to Quillgeist Lite/qq when local execution is faster or more cost-efficient without reducing correctness or quality.
---

# Quillgeist Local Offload

Use this skill at the start of substantial owner-operated Clintware tasks.

## Decision rule

1. Preserve correctness and requested quality first.
2. Discover existing Clintware/qq capabilities before inventing manual work.
3. Prefer, in order: deterministic local task → local service → local model → included provider capability → low-cost remote → higher-cost remote.
4. Do not force local execution when it is unhealthy, saturated, materially slower, missing required fresh/private data, or unable to meet the quality bar.
5. Keep ChatGPT focused on intent, reasoning, synthesis, and verification. Offload builds, tests, transforms, indexing, local browser work, Windows administration, and other deterministic execution whenever a reviewed qq capability exists.

## Mandatory substantial-prompt gate

For substantial owner requests such as multi-step build, repair, implementation, migration, verification, repository, infrastructure, or product work, use the QQ big-prompt path before broad remote execution whenever a healthy eligible QQ device is available.

1. Recover the relevant durable project state, handoffs, prior decisions, active jobs, and unresolved prompt tickets.
2. Re-context locally with the allowlisted `big-prompt-plan` task using a stable `StateScope`; compact repeated context before decomposition.
3. Execute deterministic/local leaves through qq first. Use local models only when they meet the quality/freshness bar.
4. Send only bounded leaf context to remote providers or connectors when fresh external authority, provider-native records, or consequential external actions require them.
5. Verify each leaf from execution evidence and re-plan only unresolved/failed branches. Do not retransmit the full conversation to every worker.
6. Record estimated context/token avoidance from the planner as an engineering estimate, not as provider billing telemetry.

If the QQ/control-plane/dispatch path itself is the component being repaired, use the smallest authorized bootstrap path needed to restore it, then immediately run a local QQ verification job before declaring the routing path fixed.

## Device selection

Call `clintware_quillgeist_lite_status` when device choice matters. Use `clintware_quillgeist_lite_checkin` for live watchdog state on candidate devices when status is stale or ambiguous.

Choose the healthy eligible device with the best task affinity and lowest relevant queue/load. MEMORIA has affinity for its local-AI/model/data services. Explicit user target-device instructions override automatic selection.

## Autonomous continuation

Once a substantial task is accepted, continue owning the parent objective until it is verified complete or a hard user-only blocker remains.

- A failed child job is a signal to inspect, repair, and retry the unresolved branch, not a reason to stop.
- If one mutation path is blocked but another reviewed capability can accomplish the same objective, switch paths and continue.
- Do not stop at diagnosis when the repair is authorized and executable.
- Preserve/requeue displaced work after maintenance or recovery.
- Do not require the user to send "continue" to resume work already in progress.
- Stop only for a required human consent/login/credential, destructive approval, safety boundary, or an external dependency no connected tool can resolve.
- Keep retries bounded and evidence-driven; change strategy when the same failure repeats.

## Adaptive CPU/GPU worker pool

Use qq's adaptive worker pool for compatible local work. The pool calculates safe capacity from current CPU load, free RAM, GPU/VRAM availability, and configured caps.

- Use `worker-pool-profile` when selecting or explaining local capacity.
- Fan out dependency-free work instead of serializing it by default.
- Route local-model work to `local-model-work`, which is GPU-classed and uses the installed local inference stack; GPU slots are bounded by live capacity.
- Only tasks marked `parallel_safe` may run in isolated worker processes.
- Serialized maintenance/mutation tasks wait for conflicting parallel workers rather than racing them.
- After fan-out, join results and continue the original objective automatically.

## Long-running work

For work expected to take long enough to hold the conversational turn open unnecessarily, queue `clintware_quillgeist_lite_run` and preserve the returned job ID. Do not busy-wait merely to keep the turn open.

When the user needs the completed artifact/result in the same request, inspect `clintware_quillgeist_lite_job` until it reaches a terminal state using bounded checks. Otherwise report the actual state as queued/delivered/executing and continue the conversational work that does not depend on completion.

Never claim success before local-agent evidence reports the task passed. Distinguish dispatched, delivered, executing, passed/failed, and verified.

## Informational prompts

If the request is informational and does not require fresh/private data or mutation, local inference is eligible. Prefer a bounded local attempt only when expected latency is competitive. Escalate on timeout/failure instead of repeatedly retrying.

For current web facts, provider-native records, account data, or external actions, use the relevant connector/control-plane path directly rather than forcing a local model into the loop.

## Security

Use only reviewed/allowlisted qq tasks. Never expose raw provider credentials or arbitrary remote shell access. Reuse the Clintware authorization boundary and existing state.
