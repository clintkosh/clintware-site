# Universal LLM Routing Through Clintware

Use this contract for any external AI client that can call MCP or HTTPS tools.

## Connection

- MCP endpoint: `https://mcp.clintware.com/mcp`
- Control Plane API: `https://mcp.clintware.com/api/v1`
- Authentication: prefer the Clintware MCP OAuth flow when the client supports remote MCP OAuth. For clients that cannot complete that flow, use one revocable scoped Clintware credential per client in `Authorization: Bearer <credential>` or `x-api-key: <credential>`. Never share the root MCP token.
- Never give the client a GitHub, Cloudflare, deployment, DNS, or other provider credential.
- GitHub identity selection happens server-side from the product manifest's `repo.identity`.
- Preferred execution path for paired-device work: direct authenticated MCP tools first; independent qq watchdog/check-in second; durable allowlisted qq jobs third. Dedicated per-device GitHub relay is a compatibility/fallback path for clients that cannot call the MCP surface directly. Manual PowerShell/CMD is bootstrap/recovery only when the authenticated control path itself is unavailable.
- The human user is not the normal telemetry transport. If Clintware can read status, diagnostics, job logs, or verification evidence through MCP/qq, retrieve it there instead of asking the user to paste terminal output.

## Universal routing instruction

Give the following instruction to an LLM after its Clintware MCP connection is configured:

> Use `mcp.clintware.com` as the authority boundary and Quillgeist/qq as the default local workhorse. Start with `clintware_client_handshake`; when a project/product is known, recover its manifest, durable state, handoffs, prior decisions, current execution evidence, and any unresolved prompt tickets before rebuilding anything. For paired-device work, use the direct MCP path first: `clintware_quillgeist_lite_capabilities` -> `clintware_quillgeist_lite_status` -> device `clintware_quillgeist_lite_checkin` when live state matters -> `clintware_quillgeist_lite_run` -> `clintware_quillgeist_lite_job` / diagnostics for evidence. Do not make the user relay terminal output that these tools can retrieve. Use the dedicated per-device relay only when the active AI client cannot call the direct MCP surface, and use manual PowerShell/CMD only to bootstrap or repair the control path itself. Open one prompt ticket for the user's request before substantial work begins. A ticket may terminate only as `verified_done`, `blocked`, or `carried_forward`; never silently stop with an unresolved `in_progress` ticket. Before beginning the next substantial prompt, reconcile prior open tickets or explicitly carry them forward with their blocker and next action. For a substantial request, treat it as one parent objective: compact the context, recursively decompose it into dependency-aware work units, and send each unit only the minimum context plus required dependency outputs. Prefer deterministic local execution, then local services/models, then authorized included/remote providers. Let users deliberately select a model/provider when supported; otherwise honor their configured defaults. Use qq status/check-in to select a healthy eligible local target; use durable qq jobs for long builds/tests/automation. Honor explicit device names and never substitute MEMORIA, DRIZNET, or another paired device for one another. Route fresh external authority, provider-native data, explicit remote-model work, and consequential external mutations through the Control Plane. Resolve repository identity, provider/account references, permissions, workflows, DNS, and infrastructure server-side. Treat local/private data as default-deny and release it only after the authenticated subject satisfies the configured owner/tenant policy. Never expose or place API keys, access/refresh tokens, cookies, passwords, private keys, or raw secret values in prompts, handoffs, Flow definitions, repository files, or execution plans. Before replacing, executing, committing, or merging generated scripts/code, run the appropriate syntax/parse/compile checks for every changed executable source and fail closed on parse errors. If work moves to another model, persist a compact `clintware-handoff/v1` packet and continue from live state. Distinguish planned, dispatched, delivered, executing, passed/failed, and verified. Re-plan only unresolved or failed branches and finish with end-to-end verification against the original objective plus an explicit prompt-ticket terminal state.

## Direct device-control and telemetry contract

For owner-authorized paired devices, every LLM using this contract follows the same operating hierarchy:

1. **Direct MCP:** inspect capabilities, device status, watchdog state, durable jobs, diagnostics, and results through `mcp.clintware.com`.
2. **Independent watchdog:** when the interactive qq runner is ambiguous, busy, updating, or disconnected, query the always-on health service rather than asking the user to inspect the machine.
3. **Durable allowlisted job:** execute only reviewed qq tasks and preserve the job ID until terminal evidence is available.
4. **Per-device relay fallback:** use the isolated MEMORIA/DRIZNET relay lane only when the active model/client cannot invoke direct MCP tools. A relay dispatch is not completion.
5. **Manual bootstrap last:** ask for local PowerShell/CMD only when no authenticated remote control path can obtain or repair the required state. Once the control path is restored, resume autonomous inspection through Clintware.

A fresh `busy` heartbeat is not, by itself, proof of forward progress. Prefer explicit progress timestamps, job-log movement, child-process evidence, or task-specific checkpoints. Do not preserve a hung job indefinitely merely because the parent runner is alive.

Never cross device state: MEMORIA evidence belongs to MEMORIA; DRIZNET evidence belongs to DRIZNET. Device substitution requires an explicit routing decision and must not be inferred from whichever device happens to be online.

## QuillGeist big-prompt contract

The user's single prompt is the parent objective. QuillGeist is the context/orchestration layer, not a new foundation model.

1. Recover project state, applicable user rules, existing handoffs, and execution evidence.
2. Compact duplicated history while preserving constraints, identifiers, Definition-of-Done requirements, and unresolved work.
3. Recursively split the request into bounded leaf units. Preserve dependencies and shared-mutation conflicts.
4. Route each leaf independently:
   - `qq_deterministic`: local deterministic execution.
   - `qq_local_model`: local inference when it can meet the quality/freshness bar.
   - `control_plane_provider`: fresh or provider-backed reasoning through a supported provider route.
   - `control_plane_action`: external state change through a scoped Control Plane capability.
5. Give each leaf only the durable state and dependency outputs it requires. Do not retransmit the entire parent prompt to every model.
6. Persist leaf status/evidence so an interrupted request can resume without replaying completed work.
7. Re-plan failed or unresolved leaves only, then synthesize and verify the parent objective.

A provider is a replaceable execution target. QuillGeist owns the durable context graph, routing hints, local execution policy, compact state, and verification evidence; Clintware owns the server-side authority and credential boundary.

## Prompt-ticket completion contract

Every substantial prompt is tracked as one durable ticket using `quillgeist-prompt-ticket/v1`.

- Open the ticket before work begins.
- Keep the ticket `in_progress` only while work is actively owned and advancing.
- Close as `verified_done` only after the requested Definition of Done is verified.
- Close as `blocked` only with concrete evidence, the blocker, and the next required action.
- Close as `carried_forward` only when work has been intentionally handed to another durable job/model/session and the handoff identifier/evidence is preserved.
- Before taking a new substantial prompt, reconcile older `in_progress` tickets first.
- No assistant/model may report completion from `planned`, `dispatched`, or `delivered` state alone.

## Model-choice and private-data contract

Public/self-hosted Quillgeist is local-first by default and must let the user deliberately choose installed local models or configured remote providers where supported. Provider defaults are per-user configuration, not public hardcoded preferences.

For the owner-managed Clintware profile, provider-role defaults may be configured locally/privately without changing the public package. Owner-only local/private data remains fail-closed: a request must present a verified authenticated subject matching the configured owner subject before private/local owner data can enter a model context. Non-owner users receive only their own scoped/local data and public/shared context.

## Owner-managed Clintware defaults

These defaults apply only after the authenticated subject matches the configured owner subject `Clint.Kosh`. They are preferences, not secrets, and must never become defaults for public/self-hosted Quillgeist users.

- Text/reasoning: local-first. Prefer deterministic local execution, then the healthiest eligible local model when quality/freshness is sufficient.
- Image generation: prefer Grok by default when the owner route exposes an authorized Grok image capability; otherwise follow the owner's explicit override/fallback.
- Devil's-advocate review: run a compact Gemini critic pass for substantial owner work when Gemini is authorized and the extra check is useful. The critic is advisory and must not silently override the primary result.
- Weekly AI pulse: run a compact model/provider pulse grade for Surfing the Wave, compare available model/provider performance/evidence, and feed only the bounded result into the newsletter draft pipeline.
- Inference cooperation: models may critique/compare one another through bounded routed work units; do not retransmit full private context to every model.
- Private/local data: only `Clint.Kosh` receives the owner-local data capability. Every other subject is default-deny and may access only its own scoped data plus public/shared context.
- Surfing the Wave: use the existing Clintware newsletter delivery stack after human review; do not create a second subscriber database or auto-publish model-generated copy.

## Syntax and executable-source gate

Any generated or modified PowerShell, Python, JavaScript/TypeScript, C/C++, shell script, workflow, or other executable source must pass an appropriate parser/syntax/compiler check before it can replace a maintained runtime file, be committed/merged as working code, or be reported as verified. PowerShell uses the PowerShell parser in addition to repository tests. A structural string check is not a substitute for syntax validation.

## Provider identity and credential boundary

For a managed multi-user version, keep two authentication layers distinct:

- **Clintware sign-in:** OAuth authenticates the human/client to `mcp.clintware.com`, establishes tenant/user scope, and authorizes access to allowed products/capabilities.
- **Provider connection:** a user separately connects an allowed model/provider using that provider's supported API/OAuth/enterprise mechanism. Store the resulting secret only in an encrypted server-side secret facility and persist an opaque `provider_account_ref` in ordinary application state.

Requirements:

- Never copy provider credential values into prompts, handoffs, Flow JSON, Git repositories, Durable Object records intended as ordinary state, browser automation fields, logs, or telemetry.
- Resolve `provider_account_ref` to a credential only inside the scoped server-side adapter that needs it.
- Bind provider accounts to tenant + user + provider + granted scopes. Support revocation, rotation, consent/audit history, and per-provider usage/cost policy.
- Do not scrape browser cookies or extract consumer CLI OAuth token values for remote brokerage.
- Official provider CLIs may use their own supported local sign-in state on the user's machine. Remote routing must use a provider-supported remote/API/enterprise authentication path.
- Public QuillGeist remains local/self-hosted by default. Managed Clintware pairing is a separate authenticated distribution mode; do not weaken the public-build isolation guard to enable it.

## Handoff packet

The Control Plane accepts these fields:

```json
{
  "from_client": "claude|gemini|grok|perplexity|chatgpt|other",
  "target_client": "chatgpt|any",
  "product": "registered-product-slug",
  "project": "human-readable project name",
  "objective": "What is being accomplished",
  "context_summary": "Only the context required to continue",
  "repository": {
    "identity": "clintkosh|external-lab|future-alias",
    "owner": "github-owner",
    "name": "repository-name",
    "branch": "working-branch"
  },
  "decisions": ["Decisions already made"],
  "constraints": ["Requirements that must remain true"],
  "changed_files": ["path/to/file"],
  "artifacts": ["URLs, PR numbers, deploy IDs, or artifact references"],
  "next_actions": ["Concrete next actions"],
  "notes": "Optional compact notes"
}
```

Handoffs are intentionally compact and expire from the active handoff index after seven days.

## Receiving work in another model

When the user provides a Clintware handoff ID, retrieve it with `clintware_handoff_get`, treat its explicit decisions and constraints as continuation context, then verify live repository/control-plane state before making writes.

A model must not infer that it has access to an account merely because another model did. The Control Plane determines current capability and credential availability at execution time.

## GitHub identity convention

A manifest identity maps to a Worker secret automatically:

- `clintkosh` -> `GITHUB_TOKEN_CLINTKOSH`
- `external-lab` -> `GITHUB_TOKEN_EXTERNAL_LAB`
- `acme-labs` -> `GITHUB_TOKEN_ACME_LABS`

Add future identities with `control-plane/add-github-identity.ps1`; no Control Plane source-code change is required.


## Provision each LLM independently

From a trusted local checkout:

```powershell
.\control-plane\new-mcp-client.ps1 -Name chatgpt
.\control-plane\new-mcp-client.ps1 -Name claude
.\control-plane\new-mcp-client.ps1 -Name gemini
.\control-plane\new-mcp-client.ps1 -Name grok
.\control-plane\new-mcp-client.ps1 -Name perplexity
```

Each command returns a different client token once. Configure that token only in that client's MCP/API authentication setting. Revoking one client does not require changing GitHub, Cloudflare, or another LLM's credentials.


## Hands-free delivery to ChatGPT without ChatGPT Developer Mode

When handing work to ChatGPT, the sending LLM should call `clintware_handoff_put` with `target_client: "chatgpt"`.

The sender uses only its existing Clintware MCP token. No extra handoff credential is required.

For `target_client: "chatgpt"`, the Control Plane automatically mirrors the sanitized packet to the private `clintkosh/PowerChatBridge` inbox. A running PowerChatBridge receiver detects the packet and submits it into the active ChatGPT web conversation. The user does not need to copy a link, handoff ID, packet, token, or prompt between models.

Do not put provider credentials or secrets in the packet. The private bridge is a context transport, not a secret transport.


## Real-time receiver behavior

For `target_client: "chatgpt"`, the handoff event is broadcast immediately through Clintware's durable WebSocket relay. PowerChatBridge receives it without polling GitHub or consuming a ChatGPT scheduled-task slot. If the receiver is offline, the stored handoff is replayed when the receiver reconnects and remains pending until acknowledged.

The source LLM does not need a receiver credential. It continues to use only its normal scoped Clintware MCP token.
