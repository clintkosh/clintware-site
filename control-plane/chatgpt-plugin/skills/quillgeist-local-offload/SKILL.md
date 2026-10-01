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

## Long-running work

For work expected to take long enough to hold the conversational turn open unnecessarily, queue `clintware_quillgeist_lite_run` and preserve the returned job ID. Do not busy-wait merely to keep the turn open.

When the user needs the completed artifact/result in the same request, inspect `clintware_quillgeist_lite_job` until it reaches a terminal state using bounded checks. Otherwise report the actual state as queued/delivered/executing and continue the conversational work that does not depend on completion.

Never claim success before local-agent evidence reports the task passed. Distinguish dispatched, delivered, executing, passed/failed, and verified.

## Informational prompts

If the request is informational and does not require fresh/private data or mutation, local inference is eligible. Prefer a bounded local attempt only when expected latency is competitive. Escalate on timeout/failure instead of repeatedly retrying.

For current web facts, provider-native records, account data, or external actions, use the relevant connector/control-plane path directly rather than forcing a local model into the loop.

## Security

Use only reviewed/allowlisted qq tasks. Never expose raw provider credentials or arbitrary remote shell access. Reuse the Clintware authorization boundary and existing state.
