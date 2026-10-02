# Quillgeist Lite Execution Selection Policy

## Priority order

Quillgeist Lite and any model operating through it choose the implementation method in this order:

1. **Best fit for the task and highest-quality result.**
   - Choose the runtime/tool that most directly produces the intended outcome.
   - Preserve correctness, fidelity, robustness, and maintainability.
   - Do not choose a cheaper runtime when doing so would materially reduce output quality or make the result less faithful to the requested goal.

2. **Reliability and operational fit.**
   - Prefer the method that is most likely to work correctly in the target environment with clear failure evidence and recoverability.
   - Reuse an already-working runtime or dependency when it does not compromise quality.

3. **Efficiency after the quality bar is met.**
   - Among methods that can meet the requested quality, prefer less setup, fewer round trips, lower token/log volume, lower compute cost, lower latency, and simpler maintenance.
   - Avoid unnecessary language/runtime switching when an existing method is equally capable.

## Runtime guidance

- **PowerShell**: Prefer for Windows configuration, registry/services/tasks, file/system administration, CLI orchestration, environment setup, and short glue workflows.
- **Python**: Prefer for structured data, APIs, parsing, transformation, automation with meaningful logic, prototyping, cross-platform work, and tasks where Python libraries materially improve quality.
- **C**: Prefer when native execution, very low overhead, compiled utilities, OS-level behavior, deterministic performance, or a self-contained executable materially improves the result.

These are defaults, not rankings. The task outcome decides the runtime.

## Model behavior

Unless the user explicitly names a language/runtime:

1. infer the Definition of Done;
2. identify the strongest implementation approach;
3. choose the runtime/tool that best meets it;
4. only then optimize cost/tokens/runtime overhead;
5. if an attempted method proves inadequate, use returned evidence to choose a better registered method rather than forcing the original runtime.

Efficiency is a tiebreaker after quality, not a substitute for quality.


## Local CloudMist routing

Local CloudMist is the default multi-machine execution abstraction when more than one healthy owner-controlled Quillgeist node is available. Work is optional and must never be a durable dependency when reviewed local tasks can own execution. Route by capability, resource class, health, queue/load, and affinity; preserve an ordered failover set; fail over only on delivery failure, stale/no-progress health, or task failure; and never duplicate a still-executing job merely because another node is idle. New machines join through the reviewed CloudMist onboarding pass. Hosted CI or Work may bootstrap/recover the local plane, but steady-state deterministic builds, tests, transforms, local-model work, and CRM factory generation consume CloudMist capacity first when the quality bar is met.

## Default prompt offload and latency policy

For owner-operated ChatGPT/MCP work, treat QQ/local execution as the default workhorse when it can meet the same correctness and quality bar.

- Prefer: deterministic local task → local service → local model → included provider capability → low-cost remote → higher-cost remote.
- Do not route locally merely for ideological purity. If the eligible local path is unhealthy, saturated, materially slower, or cannot meet the quality/freshness requirement, use the faster reliable authorized path.
- Use live QQ status/check-in plus recent job state when choosing between eligible devices. Prefer the healthy device with the required capability and the lowest relevant queue/load; respect task affinity such as MEMORIA-local AI/data services.
- Keep long builds, installs, tests, transformations, indexing, local browser work, and machine operations out of the conversational critical path when they can run as a durable QQ job. Queue the work, preserve the job ID, and verify from local-agent evidence when completion is required.
- Chat/model time should be spent on intent resolution, decisions, reasoning that actually benefits from the model, synthesis, and verification rather than waiting on deterministic work.
- Informational prompts that do not require fresh/private data or mutation may take the bounded local-first response path. The local attempt has a latency budget; on timeout/failure, escalate immediately rather than repeatedly blocking.
- Fresh account data, current web facts, provider-native records, and actions requiring an external authority should use the relevant connector/control-plane path directly rather than forcing a local model into the loop.
- Never equate queued or delivered with executed. Preserve the execution states: dispatched → delivered → executing → passed/failed → verified.

This policy is a default selection rule, not permission to weaken authorization or quality gates.

## Default big-prompt activity

For substantial owner prompts, this is a mandatory routing gate whenever an eligible QQ device is healthy. Recover state and re-context locally first; then execute local leaves locally and send only bounded external-authority leaves remotely. If this routing path itself is broken, repair it through the smallest authorized bootstrap path and verify the repaired path with an actual local QQ job before declaring it fixed.


For substantial requests, Quillgeist uses the big-prompt planner as the default orchestration activity before execution.

- Recover durable project/state context first, then compact it before decomposition.
- Break the request recursively into bounded dependency-aware work units. A child unit receives only its own objective, required durable state, and outputs from declared dependencies.
- Prefer `qq_deterministic` for builds, tests, transforms, repository/file work, local automation, and other deterministic machine tasks.
- Prefer `qq_local_model` for local reasoning that meets the quality and freshness requirement.
- Route fresh external authority, explicit remote-model work, and consequential external mutations through `mcp.clintware.com`; the local planner does not hold reusable provider secrets.
- Preserve execution evidence per work unit. A parent request is complete only when required leaves have passed their own checks and final synthesis has verified the original Definition of Done.
- Re-plan only unresolved or failed branches. Do not resend the full original context to every provider call.
- Context/token savings reported by the planner are estimates comparing naive full-prompt retransmission with routed leaf context. They are not provider billing records.
- The planner may recommend parallelism only for units with no dependency or shared-mutation conflict. Dependency order and approval boundaries take precedence over speed.

The allowlisted `big-prompt-plan` qq task exposes this plan locally. The Control Plane remains authoritative for remote provider/account resolution, permissions, consequential actions, and durable cross-device job state.

## Governed live-web policy

Quillgeist Web extends qq with live search, page reading, and bounded browser automation while preserving the local execution boundary.

- Remote web navigation is public HTTP/HTTPS by default. Loopback, RFC1918/private, link-local, multicast, and reserved network destinations are blocked to reduce SSRF and local-network exposure.
- Browser authentication is local-first. A user signs in through the visible persistent qq browser with `web login <url>`; remote callers do not receive cookies, passwords, MFA codes, API keys, tokens, or other credentials.
- Remote fill/type operations refuse password, OTP, payment-card, token/key, and other credential-like fields.
- Consequential browser actions such as purchases, payments, destructive changes, publishing, authorization, or user-management actions require explicit approval for that run.
- Downloads are disabled in the governed browser agent. File upload/download or other higher-risk capabilities require a separately reviewed task.
- Search and read are preferred over automation when they satisfy the task. Automation is bounded to the registered step vocabulary; arbitrary JavaScript and remote shell text are not accepted.
- The public-web policy is enforced again on redirects and browser subrequests. Private-network access is never enabled by the remote Quillgeist Web MCP tools.


## Canonical request-routing policy

Natural-language QQ input uses a local preprocessing envelope first. The preprocessor may normalize obvious typos and shorthand, attach local context and learned route hints, and redact credential-like material. It must preserve user intent and must never execute or answer merely because it rewrote the prompt.

The cleaned request is then sent over the existing QQ Control Plane WebSocket. The Clintware Control Plane is authoritative for choosing the route:

- deterministic explicit allowlisted QQ commands may use the local fast path;
- state changes, infrastructure work, fresh/private data, or uncertain requests stay on the Control Plane/agent path;
- informational requests may use an LLM response path;
- Workers AI is response-only and must never replace an execution request with generic instructions;
- routine interactive routing does not use GitHub as a message bus.

Local route learning records prior Control Plane route outcomes as hints only. It never overrides authorization, safety gates, or the Control Plane's decision.

## Runtime-load policy

QQ keeps a small local runtime-version marker. A normal start performs one lightweight version check and skips asset downloads when the version is unchanged. Runtime assets are version-cached at the Control Plane, avoiding repeated repository reads across clients. GitHub remains the source/release plane, not the prompt-routing plane.

Persistent event channels and wake signals are preferred to polling. Usage/status refreshes should be driven by meaningful activity or low-frequency boundaries.

## Foreground-input safety invariant

Background QQ execution must not steal foreground focus, activate a console, move/capture the pointer, capture keyboard input, or flash a transient shell. The scheduled runner, watchdog recovery, responders, updates, reconnects, health work, and child automation use hidden/no-console/no-activate execution by default.

Only an explicit user-requested interactive launch may open the Windows Terminal UI. Background mode sets QQ_HEADLESS=1, bypasses the splash, and never starts Windows Terminal.
