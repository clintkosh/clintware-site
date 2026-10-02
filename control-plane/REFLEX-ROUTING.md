# Clintware Reflex Routing v1

## Decision

Adopt a hybrid of the strongest patterns in the Awesome Jev catalog rather than copying one project wholesale:

- **Jevonian:** hard deterministic eligibility gates before semantic routing; explicit/pinned routes bypass auto routing; confidence is observable.
- **switchboard / JevRouter:** one provider-neutral router can select models, tools, skills, and subagents while host policy remains authoritative.
- **jev-use:** narrow decision work is separated from text generation and escalates when uncertain.
- **Albatross:** local and cloud models remain interchangeable execution targets rather than being coupled to the router.
- **fast-jev-compaction / winnow:** context keep/drop scoring is a later opt-in capability, never destructive by default.

This is implemented as the **Clintware Reflex Router**, not as a hard dependency on Jev. Jev is an optional calibrated decision provider. BitNet is the preferred local System-One decision provider on MEMORIA when its measured confidence/quality threshold is met.

## Site-wide route

```text
request / PXE
  -> hard policy + capability + privacy gates
  -> explicit user selection (when set)
  -> deterministic rules / known commands
  -> BitNet local classifier (fast path)
  -> Jev calibrated judge (optional ambiguity path)
  -> larger local LLM
  -> authorized remote LLM via mcp.clintware.com
  -> existing execution + verification gates
```

The router recommends. It never grants permission, resolves secrets, bypasses MCP, or performs consequential external mutations itself.

## Why BitNet + Jev instead of BitNet vs Jev

They occupy different slots. BitNet is the local, private, zero-provider-roundtrip fast classifier. Jev is useful when configured as a calibrated typed judge for ambiguous `choice` / `score` / yes-no decisions. The default `auto` mode uses the cheapest safe stage that is confident enough and escalates only when needed.

Do not call Jev for deterministic tasks. Do not call a generative LLM merely to choose among known routes when BitNet/Jev can answer the bounded decision. Do not send `LOCAL_ONLY` PXE blocks to Jev or any remote provider.

## SaaS control

Every Clintware surface that exposes model settings should consume `quillgeist-lite/routing/reflex-router.json` and show **Decision routing** with:

- Auto (default)
- Rules only
- BitNet local
- Jev
- Local LLM
- Remote LLM

Advanced controls: confidence thresholds, shadow mode, fallback policy, route ledger, and per-task override. Explicit selection is sticky for the task/session and bypasses auto selection unless a hard policy/capability gate makes the route ineligible.

## Rollout

1. **Shadow:** compute BitNet/Jev recommendations without changing execution; compare against existing QQ route and final verification.
2. **Assist:** allow high-confidence BitNet decisions for low-risk routing/skill/tool selection; log fallback and disagreement.
3. **Auto:** enable the configured thresholds only after measured false-route rate is acceptable on real Clintware workloads.
4. **Optimize:** optionally add context keep/drop, completion gates, and model-effort selection after independent validation.

## Required telemetry

Record only metadata: CWS ID, PXE revision, selected mode/route, confidence, reason code, latency, fallback, and verification outcome. Do not log prompt plaintext or secrets as ordinary route telemetry.

## BitNet adapter contract

A BitNet adapter returns `{task_class, confidence, reason}`. The initial task vocabulary should include deterministic, local reasoning, code, search/fresh authority, browser, external mutation, multimodal, and escalation. Keep exact aliases/known commands deterministic; BitNet handles ambiguity, not commands already known with certainty.

## Jev adapter contract

A Jev adapter returns the same normalized signal and maps typed Choice/Score/Noul-style judgments into the common contract. Jev remains optional: absence, timeout, policy denial, or low confidence falls through without breaking QQ.

## Definition of done

This architecture is considered live only after the adapters are wired into the QQ runtime, the SaaS setting is rendered by the actual control UI, and shadow/assist tests demonstrate correct routing on representative Clintware workloads. Repository policy/core files alone are implementation groundwork, not proof of runtime deployment.
