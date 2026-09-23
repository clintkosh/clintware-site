---
name: llm-ad-shield
description: Build and maintain a local-first, cross-provider AI ad-control and context-hygiene layer that removes clearly identified sponsored content from conversational AI interfaces and prevents sponsored UI from contaminating copied, exported, agent-captured, or RAG-bound context.
---

# LLM Ad Shield

Use this skill when building a browser extension, browser-agent sanitizer, local proxy, or application layer that gives users control over sponsored content in conversational AI products.

The primary goal is not merely visual ad hiding. The goal is **AI context hygiene**: keep clearly identified sponsored material out of both the human interface and any machine-readable context that may later be copied, summarized, exported, indexed, or passed to another model.

## Core principles

1. **Separate ads from answers.** Never rewrite, suppress, or alter organic model output merely because it discusses a product or brand.
2. **Block only high-confidence sponsored surfaces.** Prefer explicit sponsor/ad metadata, labels, container roles, provider-specific selectors, and known ad SDK endpoints.
3. **Fail open on ambiguity.** If a node might be organic content, preserve it and optionally flag it for inspection.
4. **Local first.** Detection and filtering should run on-device by default. Do not upload conversation content or browsing history.
5. **No telemetry by default.** Block counts and preferences should remain local unless the user explicitly opts into synchronization.
6. **Provider-neutral architecture.** Treat ChatGPT, Gemini/Google AI Mode, Copilot, Perplexity, and future AI surfaces as adapters over a shared rule engine.
7. **Do not bypass access controls.** This skill hides or sanitizes sponsored presentation. It must not unlock paid features, defeat subscriptions, bypass paywalls, or impersonate entitlement.
8. **Preserve user control.** Every provider needs an enable/disable switch, a per-site exception, and a way to inspect what was blocked.

## Product model

Build four cooperating layers:

### 1. Presentation filter

Hide or collapse confirmed sponsored UI in the rendered page.

Use, in descending priority:

- explicit attributes such as `data-sponsored`, ad-specific roles, or provider-known IDs/classes;
- accessibility labels such as `Sponsored`, `Advertisement`, or `Promoted`;
- provider-specific structural selectors verified against current production UI;
- disclosure text plus container-level evidence.

Do not remove an element based only on the word "sponsored" appearing inside ordinary answer text.

Use a `MutationObserver` because conversational interfaces render incrementally.

### 2. Network and SDK filter

When a provider loads a separate ad SDK or dedicated ad endpoint, block it with browser-native request rules such as Manifest V3 `declarativeNetRequest`.

Only add a domain or route to the default block list when it is clearly ad-specific. Avoid broad host blocking that could break core chat, authentication, file upload, search, or billing functionality.

Keep network rules as defense in depth. Do not assume AI-native ads will always use a separable network origin.

### 3. Context firewall

Before content is copied, exported, serialized, indexed, summarized, or handed to another model or browser agent:

1. clone the relevant DOM or structured response;
2. remove nodes already classified as sponsored;
3. strip ad-only metadata and tracking parameters;
4. preserve organic answer text, citations, links, code, and user messages;
5. return a sanitized representation plus an audit record.

Apply this layer to:

- copy-to-clipboard helpers;
- transcript export;
- browser-agent DOM snapshots;
- accessibility-tree extraction when controllable;
- webpage-to-markdown pipelines;
- RAG ingestion;
- local conversation archival.

Canonical flow:

`PAGE/RESPONSE -> DETECT -> CLASSIFY -> RENDER FILTER -> CONTEXT SANITIZER -> CLEAN CONTEXT + AUDIT`

### 4. Tracking-link cleaner

For links contained inside confirmed sponsored containers, optionally strip common affiliate and campaign parameters while preserving functional destination parameters.

Examples include `utm_*`, `ref`, `affiliate`, and provider-specific click identifiers.

Never rewrite signed URLs, authentication URLs, payment URLs, or links where removing parameters could change access semantics.

## Detection model

Assign each candidate container a confidence score.

Suggested evidence:

- +5 explicit provider ad/sponsored attribute
- +5 provider-documented sponsored component selector
- +4 accessibility label explicitly identifying an ad
- +3 visible disclosure label inside a bounded card/container
- +2 known ad SDK ownership
- +1 outbound tracking pattern

Default action:

- score >= 5: block/collapse;
- score 3-4: audit-only unless a provider adapter explicitly approves it;
- score < 3: preserve.

Keep the scoring configurable.

## Provider adapters

Each provider adapter should expose:

- provider ID;
- supported hostnames;
- high-confidence selectors;
- disclosure labels;
- known ad SDK or endpoint rules;
- sanitization hooks;
- regression fixtures;
- last-verified date.

Do not hard-code one giant universal selector list.

## User modes

Support three modes:

- **Hide** — remove confirmed sponsored UI.
- **Collapse** — replace it with a compact "Sponsored content hidden" placeholder.
- **Audit** — leave content visible but mark what the detector would block.

Audit mode is the preferred default for new or recently changed provider adapters.

## Browser extension baseline

For Chromium-based browsers, prefer Manifest V3 with:

- minimal host permissions;
- content scripts scoped only to supported AI domains;
- `MutationObserver` for dynamic UI;
- `declarativeNetRequest` for confirmed ad-only endpoints;
- local storage for preferences and counters;
- no remote code execution;
- no conversation-content telemetry.

Keep Firefox support through a compatibility layer when practical.

## Agent and SDK baseline

Expose a small sanitizer interface independent of the browser extension:

```text
sanitize(input, provider, sourceType) ->
  {
    cleanContent,
    removedItems[],
    provider,
    rulesVersion,
    timestamp
  }
```

Supported `sourceType` values should include at least:

- `dom`
- `html`
- `markdown`
- `accessibility-tree`
- `transcript`

A caller must be able to run the sanitizer without sending content to a remote service.

## False-positive protections

Never block content solely because it contains:

- brand names;
- prices;
- shopping recommendations;
- affiliate-related discussion;
- the words "ad", "advertising", or "sponsored" in ordinary prose.

Require container-level evidence.

Provide:

- one-click restore for the current page;
- provider disable switch;
- rule-level audit log;
- fixture-based regression tests.

## Testing requirements

For every supported provider, maintain fixtures for:

1. organic answer with product recommendations;
2. explicit sponsored card;
3. user message containing the word "sponsored";
4. citation/link block;
5. streaming response update;
6. UI redesign or unknown structure;
7. copied/exported transcript;
8. agent snapshot or markdown extraction.

A release passes only when:

- sponsored fixtures are filtered;
- organic answer fixtures remain byte-for-byte equivalent where feasible;
- core chat remains functional;
- no authentication or billing route is blocked;
- sanitized exports contain no confirmed sponsored nodes.

## Rule updates

Keep rules in a versioned, inspectable registry.

Recommended fields:

- provider
- selector or matcher
- evidence type
- confidence
- introduced date
- last verified date
- source/reference
- enabled state

If remote rule updates are supported, use a signed rules manifest and allow users to disable auto-update. Never ship executable remote JavaScript as a rules update.

## Privacy and security boundary

Do not collect prompt text, response text, account identifiers, authentication tokens, cookies, or browsing history.

Do not attempt to manipulate the underlying model, inject hidden instructions, or alter answer ranking.

This is a presentation and context-integrity layer.

## Positioning

The durable category is broader than "AI ad blocker."

Position the capability as an **AI Context Firewall**:

> Keep sponsored UI out of your view, your exports, and your agent context.

The consumer extension can remain free/open to accelerate adoption. The defensible layer is the reusable sanitizer/rule engine that can be embedded in browser agents, enterprise AI gateways, RAG pipelines, and managed AI workspaces.

## Maintenance workflow

When a provider changes its UI:

1. reproduce the changed sponsored surface;
2. capture only the minimum structural evidence needed;
3. update the provider adapter;
4. run all organic and sponsored fixtures;
5. verify core chat and authentication still work;
6. increment rules version;
7. record last-verified date;
8. publish the rules change with a short explanation.

Do not claim support for a provider that has not been verified against its current UI.
