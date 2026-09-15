# ProofOS

**DON'T JUST READ MY RÉSUMÉ. TEST ME.**

ProofOS is an evidence-based candidate intelligence system built to move hiring beyond passive résumé review. A visitor enters a company name; ProofOS runs live research through the Clintware Control Plane and returns an implementation-focused brief with cited sources. The system is live at [proof.clintware.com](https://proof.clintware.com).

## Why I Built It

Traditional hiring compresses years of work into résumé bullets, keywords, titles, interviews, and pedigree. That compression loses the most important signal: how someone actually thinks and executes.

ProofOS instead exposes evidence, decisions, reasoning patterns, work artifacts, outcomes, transferable capability, live research, uncertainty, and gaps — all verifiable in real time.

## What You Can Test

- **Live company brief**: Enter any company. ProofOS runs live Exa retrieval and Workers AI synthesis, then returns a structured implementation brief with cited sources.
- **Evidence boundaries**: Every source is labeled INTERNAL EVIDENCE (first-party), EXTERNAL INTELLIGENCE (external), or INFERENCE (uncited analysis).
- **Cache behavior**: Results are cached 12h. Repeat requests hit cache; the system records cache status in telemetry.
- **Telemetry**: Provider, model, latency, source count, cache status, cost, and success/error state are captured for every request.
- **Conversion tracking**: Resume, contact, and meeting actions are instrumented end to end.
- **System stats**: Live 30-day aggregates are displayed on the landing page.

## What I Built

Clinton designed and implemented the entire system across:

- Product concept and UX
- Evidence model with tier labeling
- AI orchestration (Exa retrieval + Workers AI synthesis)
- Research architecture with provider abstraction
- Security boundaries (service binding, no client-side credentials)
- Clintware Control Plane (MCP server, Durable Objects, provider routing)
- Cloudflare Workers infrastructure
- GitHub integration through the Control Plane
- Exa retrieval integration
- Workers AI synthesis integration
- Cache strategy (fresh 12h, stale 7d fallback)
- Telemetry pipeline (fail-open, privacy-safe)
- Failure handling and graceful degradation
- Deployment workflows
- Production verification

## Architecture

```text
Visitor
  ↓
ProofOS Worker (clintware-proofos)
  ↓ Cloudflare service binding (credential-free, worker-to-worker)
Clintware Control Plane (clintware-control-plane)
  ├── Exa research retrieval
  ├── Workers AI synthesis (@cf/meta/llama-3.3-70b-instruct-fp8-fast)
  ├── Cache (24h)
  ├── GitHub capabilities (read/write/deploy)
  ├── Cloudflare capabilities (DNS)
  └── Telemetry (Durable Objects)
```

**Key design choice**: External AI systems receive scoped Clintware capabilities rather than broad GitHub, Cloudflare, or provider credentials. The security model follows: identity → policy → capability → action → audit.

This matters because:
- Least privilege: each caller gets only the capabilities it needs
- Reusable infrastructure: the Control Plane serves future Clintware products
- Centralized observability: all telemetry flows through one pipeline
- Provider abstraction: Exa can be replaced without touching ProofOS
- Safer automation: no credential sprawl across workers
- Lower operational risk: credentials never leave Clintware

## Evidence Model

ProofOS distinguishes facts from interpretation:

| Tier | Label | Meaning |
|---|---|---|
| L1 | Self-reported claim | Stated without corroboration |
| L2 | Historical role evidence | Supported by role/work history |
| L3 | Quantified outcome | Includes measurable results |
| L4 | Corroborating artifact | Backed by a verifiable source |
| L5 | Live demonstration | Produced in real time |

Each source in a brief is labeled:

- **INTERNAL EVIDENCE** — first-party source (company's own domain)
- **EXTERNAL INTELLIGENCE** — third-party source
- **INFERENCE** — uncited analysis, clearly separated from verified evidence

Inferred conclusions never appear indistinguishable from verified evidence.

## Research Architecture

- Exa handles live web retrieval (6 results per query, content extraction)
- Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) synthesizes the brief from retrieved sources
- Citations remain attached to the research output as inline [n] references
- Structured research is cached 24h at the Control Plane level
- ProofOS adds a second cache layer (fresh 12h, stale 7d)
- Duplicate provider spend is avoided on cache hits
- Cache status, latency, provider, model, and cost are recorded in telemetry
- Stale fallback serves the most recent verified brief when live research fails
- External research is never presented as internal work evidence

## Production Verification

Verified September 14, 2026 (point-in-time, not a permanent performance guarantee):

- ProofOS live at [proof.clintware.com](https://proof.clintware.com) — health OK, service binding active
- Control Plane live at [mcp.clintware.com](https://mcp.clintware.com) — all adapters operational
- Exa retrieval verified — 6 sources returned for "Cloudflare" query
- Workers AI synthesis verified — brief generated with 5 structured sections
- First request: cache miss, 16.2s latency, $0.007 Exa cost
- Second request: cache hit, 0.054s latency, $0 cost (duplicate Exa request avoided)
- Telemetry captures: request_id, timestamp, provider, model, source_count, cache_status, latency_ms, success, reported_api_cost, fallback_used
- No Exa credential exposed to ProofOS or the browser

## What This Demonstrates

### Customer Success / Post-Sales
- Turning ambiguous customer/business problems into structured workflows
- Designing around time-to-value
- Identifying risk and unknowns
- Building evidence into decision-making
- Translating technical systems into executive-visible outcomes

### Implementation
- Requirements → architecture → integration → validation → deployment
- Handling dependencies and failure modes
- Reducing implementation friction
- Creating reusable delivery patterns

### CS Operations
- Instrumentation: every request tracked with provider, cost, cache, latency
- Health signals: live status chip, system stats, error logging
- Process design: rate limiting, cache routing, stale fallback
- Repeatability: deployment workflows, automated checks
- Operational visibility: 30-day aggregates, provider breakdown, error tracking

### AI Adoption / Workflow Transformation
- Deciding where AI adds value (synthesis) and where deterministic logic is better (routing, validation)
- Provider orchestration: Exa retrieval + Workers AI synthesis with fallback
- Grounding: system prompt instructs "never fabricate metrics, dates, names, customers, or events"
- Source provenance: every claim traced to a cited URL
- Cost-aware routing: cache hits avoid duplicate provider spend
- Failure handling: graceful degradation instead of fabricated answers
- Safe credential boundaries: no provider keys in the product runtime

### Technical Leadership
- Architecture tradeoffs: service binding vs. public endpoint, dual-layer cache, provider abstraction
- Least-privilege access: identity → policy → capability → action → audit
- Integrating multiple systems: Cloudflare Workers, Durable Objects, Exa, Workers AI, GitHub, MCP
- Debugging live production workflows: telemetry-driven, request_id-correlated
- Shipping instead of only proposing: production-verified, not a prototype

## Why This Matters to an Employer

ProofOS is not intended to prove that one person already knows every domain. It demonstrates how Clinton approaches an unfamiliar problem:

1. Establish the objective
2. Find the evidence
3. Identify uncertainty
4. Research what changed
5. Challenge assumptions
6. Design the system
7. Test it
8. Instrument it
9. Iterate
10. Ship it

That operating pattern maps directly to onboarding, adoption, implementation, renewal risk, customer health, technical escalations, AI adoption, and workflow transformation.

## Built During a Five-Month Compound-Output Period

This system was built during a concentrated period of building, learning, and skill compounding that also included:

- Clintware infrastructure (Control Plane, MCP bridge, DNS management, deployment automation)
- RenewNudge (customer success workflow tool)
- AI systems and technical experiments
- Professional certifications and research
- Clintware company site and tools

The point is continued execution and skill compounding, not idle time.

## Hire / Talk to Clinton

If you are evaluating Clinton for Customer Success, Customer Success Operations, implementation, AI adoption, technical post-sales, or adjacent leadership work, use ProofOS to test the fit directly.

- [Live system](https://proof.clintware.com)
- [Book a meeting](https://meet.clintware.com)
- [Clintware](https://www.clintware.com)

## Key Files

| File | Purpose |
|---|---|
| `src/index.js` | Worker entry, routes, session, cache, rate limiting |
| `src/research.js` | Research response handling and brief parsing |
| `src/telemetry.js` | Control Plane event emission (fail-open) |
| `src/page.js` | Self-contained Clintware-branded UI |
| `src/util.js` | Pure helpers: ids, validation, slugs |
| `lib/control-plane.js` | Control Plane transport (service binding first) |
| `wrangler.jsonc` | Cloudflare Worker configuration |
| `test/research.test.js` | Research pipeline unit tests |
| `test/util.test.js` | Utility function unit tests |
| `../control-plane/` | Clintware Control Plane (MCP server, research gateway) |
| `../.github/workflows/deploy-proofos.yml` | Deployment workflow |
