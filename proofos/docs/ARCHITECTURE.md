# ProofOS Architecture

## Overview

ProofOS is a Cloudflare Workers application that serves live implementation intelligence briefs. It is the first production consumer of the Clintware Control Plane.

## System Diagram

```
Browser
  ↓ HTTPS
ProofOS Worker (clintware-proofos)
  ↓ Cloudflare service binding (env.CONTROL_PLANE)
Clintware Control Plane (clintware-control-plane)
  ├── /api/v1/research  → Exa retrieval + Workers AI synthesis
  ├── /api/v1/events    → Durable Object telemetry storage
  ├── /api/v1/products/* → Analytics queries
  ├── /mcp              → MCP server (17 tools)
  ├── /api/v1/repo/*    → GitHub operations
  ├── /api/v1/deploy    → Workflow dispatch
  └── /api/v1/dns/ensure → Cloudflare DNS
```

## Security Model

### Identity → Policy → Capability → Action → Audit

1. **Identity**: The Control Plane identifies ProofOS via Cloudflare service binding. Binding traffic has no `cf-connecting-ip` header (edge sets it on public requests only). ProofOS sets `cf-worker: clintware-proofos`. The Control Plane checks both: no `cf-connecting-ip` + `cf-worker` matching a registered service worker.

2. **Policy**: Each product has a manifest defining allowed capabilities, write prefixes, allowed workflows, and DNS names. The manifest is stored in a Durable Object.

3. **Capability**: The Control Plane checks `capabilityMatches(manifest, capability)` before executing any action. ProofOS has `research.invoke`, `analytics.write:proofos`, `analytics.read:proofos`, `cache.read/write:proofos`.

4. **Action**: The requested operation executes only after capability verification.

5. **Audit**: Every significant action logs a telemetry event with request_id, action, success/error.

### Credential Boundary

| Credential | Location | Never In |
|---|---|---|
| EXA_API_KEY | Control Plane worker secret | ProofOS, browser, GitHub |
| GITHUB_CONTROL_PLANE_TOKEN | Control Plane worker secret | ProofOS, browser |
| CLOUDFLARE_CONTROL_PLANE_TOKEN | Control Plane worker secret | ProofOS, browser |
| CONTROL_PLANE_MCP_TOKEN | Control Plane worker secret | ProofOS runtime |
| CLINTWARE_PRODUCT_TOKEN | ProofOS (optional, fallback only) | Browser |

ProofOS uses the service binding as its primary transport. The `CLINTWARE_PRODUCT_TOKEN` is an optional fallback for local development only.

## Research Architecture

### Provider Chain

```
invokeResearchProvider(env, body)
  1. Check cache (24h TTL)
  2. Check EXA_API_KEY (worker secret first, durable storage fallback)
  3. Provider A: Exa search + Workers AI synthesis
  4. Provider B (fallback): Exa answer endpoint
  5. Cache successful results
  6. Return structured response
```

### Provider A: Exa Search + Workers AI

1. Exa `/search` with 6 results, content extraction (1800 chars text, 400 chars highlights)
2. Workers AI `@cf/meta/llama-3.3-70b-instruct-fp8-fast` synthesizes from retrieved sources
3. System prompt: "Never fabricate metrics, dates, names, customers, or events"
4. Returns: model, text, citations, usage (including Exa cost)

### Provider B: Exa Answer (Fallback)

1. Exa `/answer` endpoint — retrieval and synthesis in one call
2. Used when Provider A fails (e.g., Workers AI unavailable)
3. Returns same structured shape

### Cache Strategy

- **Control Plane cache**: 24h TTL on research results
- **ProofOS cache**: Fresh 12h, stale 7d
- **Cache hit**: No Exa call, no Workers AI call, $0 cost
- **Stale fallback**: Serves most recent verified brief when live research fails

## Telemetry

All telemetry flows through the Control Plane `/api/v1/events` endpoint to a Durable Object.

### Captured Fields

- request_id, anonymous_session_id, timestamp
- feature, action, route
- provider, model
- source_count, first_party_source_count
- cache_status, research_freshness
- latency_ms, reported_api_cost
- fallback_used, success, error_class
- conversion_event (for action tracking)

### Design Principles

- **Fail-open**: Telemetry failure never breaks the user flow
- **Privacy-safe**: No raw prompts, responses, or personal data stored
- **No secrets**: Auth headers, API keys, and tokens never appear in events

## Failure Handling

| Failure | Behavior |
|---|---|
| Exa not configured | Returns `provider_not_configured`, ProofOS shows graceful message |
| Exa API error | Falls back to Exa answer endpoint |
| Workers AI unavailable | Falls back to Exa answer endpoint |
| All providers fail | Returns `provider_unavailable`, ProofOS serves stale cache |
| No stale cache | ProofOS degrades gracefully without fabricating data |
| Control Plane unreachable | ProofOS returns `control_plane_unreachable` error class |
| Telemetry emit fails | Silently swallowed, user flow continues |

## Deployment

### ProofOS Worker

- Name: `clintware-proofos`
- Domain: `proof.clintware.com`
- Service binding: `CONTROL_PLANE → clintware-control-plane`
- Deployed via: `.github/workflows/deploy-proofos.yml`
- Checks: syntax check, unit tests, Wrangler dry-run, production health verification

### Control Plane Worker

- Name: `clintware-control-plane`
- Domain: `mcp.clintware.com`
- Durable Objects: `RegistryHub` (product manifests, research config), `ProductHub` (telemetry events)
- AI binding: Workers AI
- Deployed via: `.github/workflows/deploy-control-plane.yml`
- Secret sync: CLOUDFLARE_CONTROL_PLANE_TOKEN, CLOUDFLARE_ZONE_ID, CONTROL_PLANE_MCP_TOKEN, CONTROL_PLANE_ADMIN_TOKEN, GITHUB_CONTROL_PLANE_TOKEN

## Tradeoffs

### Service Binding vs. Public Endpoint

**Chosen**: Service binding. The Control Plane identifies ProofOS by worker identity, not a shared secret. This eliminates credential management for the primary transport.

**Tradeoff**: Tightly couples ProofOS to the same Cloudflare account. The optional `CLINTWARE_PRODUCT_TOKEN` fallback covers cross-account or local development.

### Dual-Layer Cache

**Chosen**: Control Plane 24h + ProofOS 12h fresh / 7d stale.

**Tradeoff**: Potential staleness (up to 12h for fresh, 7d for stale). Acceptable for company intelligence; would need tuning for time-sensitive use cases.

### Workers AI vs. External LLM

**Chosen**: Workers AI (free allocation, no API key, same Cloudflare account).

**Tradeoff**: Model quality is lower than frontier models. Acceptable for evidence synthesis where the source material is the primary value, not the generation quality.

### Provider Abstraction

**Chosen**: Abstract provider interface returning `{model, text, citations, usage}`.

**Tradeoff**: Slightly more code than a direct Exa integration. Worth it: Exa can be replaced or supplemented without touching ProofOS.

## What Was Intentionally Not Automated

- No automatic provider failover to a second paid provider (cost control)
- No automatic cache invalidation (TTL-based is sufficient for this use case)
- No raw prompt/response storage (privacy by design)
- No self-service provider configuration (admin-only via MCP)
- No automatic DNS management (manual via MCP tool when needed)

## How the System Could Generalize

The Control Plane is product-aware, not ProofOS-specific. Adding a new product requires:

1. Register a product manifest (capabilities, repo bounds, DNS bounds)
2. Create a worker with a service binding to the Control Plane
3. The product inherits research, telemetry, cache, GitHub, Cloudflare, and MCP capabilities

The evidence model, cache strategy, and telemetry pipeline are reusable across any research-backed product.
