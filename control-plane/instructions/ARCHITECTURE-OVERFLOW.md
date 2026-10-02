# Clintware Architecture Overflow

Purpose: carry fast-moving operational architecture that supplements `control-plane/MASTER-PROMPT.md` without bloating the stable root prompt. Load this document through the live instruction manifest. The canonical master remains authoritative when the two differ.

## First-contact rule

Before saying Clintware, QQ, MEMORIA, DRIZNET, or another registered capability is disconnected:

1. Inspect the tools/connectors exposed in the current client.
2. Call `clintware_client_handshake` when exposed.
3. Refresh `clintware_instruction_manifest_get`.
4. Check `clintware_quillgeist_lite_capabilities` and `clintware_quillgeist_lite_status` when exposed.
5. If the current client does not expose Clintware directly but a connected GitHub/repository route exists, use the reviewed per-device relay/control-plane path before declaring the execution fabric unavailable.
6. Distinguish client binding, authentication, authorization, tool exposure, Control Plane reachability, target-device health, and job execution as separate states.
7. Never invent QQ CLI syntax, local paths, or ask the owner to relay telemetry that an available route can retrieve.

Canonical reconnect surface: `https://mcp.clintware.com/connect`.

## Event-driven device control

- Prefer persistent event/WebSocket delivery and local health-service replies over polling.
- QQ health/watchdog must remain independently responsive while the interactive runner is busy, updating, restarting, or reconnecting.
- A fresh `busy` heartbeat is not proof of progress. Require progress timestamps, log movement, checkpoints, child-process evidence, changed-file evidence, or task-specific state.
- Use bounded wake/restart/self-heal only after stale-progress evidence.
- Background services and scheduled automation must not steal desktop focus.

## Multi-machine execution

MEMORIA and DRIZNET are independent execution targets and may work concurrently when dependency-safe. Route based on required files, health, current load, model inventory, GPU capacity, latency, and task affinity. Preserve device-specific evidence and never silently substitute one machine for another.

For substantial independent work, fan out safe branches across machines and local worker pools. Join the branches before declaring the parent objective complete.

## Cloudflare / GitHub efficiency

- Minimize unnecessary Worker, Pages Function, GitHub API, and workflow requests.
- Prefer event-driven state changes over high-frequency polling.
- Cache immutable/runtime assets by reviewed version or content hash.
- Do not repeatedly fetch the same runtime when the local revision already matches the Control Plane revision.
- Compact status/evidence payloads before returning them to reasoning models.
- Prefer browser-local state for demos and single-user tools when server-authoritative shared state is unnecessary.
- Durable/server state is reserved for cases that genuinely require cross-user, cross-device, shared, transactional, or authoritative persistence.

## Workspace isolation

Workspace switching is explicit and fail-closed.

- Clintware work uses the Clintware manifest/repository identity.
- A non-Clintware workspace must resolve through its own private Control Plane registration.
- Never cross-fallback credentials, repositories, telemetry, assets, or logs between workspace identities.
- External workspace aliases and credentials should not be embedded in Clintware public source.

## One-prompt orchestration

The substantial-prompt path is:

`recover state -> compact -> classify -> decompose -> dependency graph -> choose machine/model/tool -> execute safe branches -> collect evidence -> retry failed branches -> synthesize -> verify parent objective`.

Persist the parent objective, branch/job identifiers, dependency outputs, retry count, and verification state where the reviewed execution surface supports it. Do not abandon a graph because one leaf failed.

## Product boundary

Quillgeist is the human-facing product/portal. Quillgeist Lite / QQ is the local execution layer. MCP/API is the machine-facing interoperability and authority boundary.

The public Quillgeist distribution must not silently become a credential-bearing shared runtime. Interactive public SaaS surfaces should remain browser-local or explicitly connect to a user-selected/self-hosted gateway unless an authenticated tenant boundary is deliberately enabled and verified.

## Recent architecture reconciliation

The current implementation must preserve these recent decisions:

- direct MCP first; reviewed relay fallback when a client lacks direct MCP exposure;
- local-first deterministic execution and local inference when quality/freshness permit;
- current external facts use live authority;
- browser-local persistence by default for demos/portfolio systems;
- adaptive CPU/RAM/GPU worker pools and dependency-safe concurrency;
- event-based watchdog/health and no-focus background execution;
- explicit workspace isolation;
- compact handoffs and delta-state rehydration rather than full-history retransmission;
- exact terminal evidence before calling work complete.


## Local-AI prompt/cache discipline

For local model work, preserve a stable prompt-prefix ordering so static instructions remain byte-stable across repeated requests and model/provider KV caches can be reused where supported:

1. stable universal/master prefix;
2. stable workspace/project rules;
3. task-class routing contract;
4. compact recovered state/delta;
5. current task;
6. volatile tool/results suffix.

Benchmark before enabling persistent KV, embedding-cache, speculative, or quantization changes. Pin model/artifact versions for correctness canaries and record cache-hit, latency, and answer-quality evidence before claiming savings.

BitNet is an eligible local text model, not a universal substitute for embeddings, vision, image generation, or tool-calling models.


## Chat surface defaults

Normal ChatGPT chat is the default interactive reasoning surface. Use Work only when explicitly requested.

Use QQ/local execution for local Windows work when quality and freshness do not require a remote provider.

Do not send the complete account/chat history to local or remote workers. Recover the minimum relevant state, compile only the needed instruction subset, and preserve a stable prompt prefix where cache reuse helps.
