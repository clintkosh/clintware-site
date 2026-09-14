# ProofOS

**ProofOS is a fully functional, production-verified research-to-implementation intelligence system designed and built by Clint Kosh.** It is live at `https://proof.clintware.com` and is the first production consumer of the [Clintware Control Plane](../control-plane/README.md).

A visitor enters a company name. ProofOS runs live web research through the Clintware Control Plane, combines the answer with cited sources, and returns a structured implementation-focused brief. The request moves through a production pipeline with input validation, rate limiting, cache routing, stale fallback, evidence merge, request-id correlation, privacy-safe telemetry, and conversion instrumentation.

The application is deliberately separated from its research providers. ProofOS holds no third-party API keys and does not need to know which provider is active. Provider selection, credentials, model routing, and research execution remain behind the Control Plane boundary. The currently verified production path uses Exa plus Workers AI; the boundary is designed so provider integrations can evolve without rewriting the visitor experience or exposing credentials to the product runtime.

## What this demonstrates

ProofOS is intended to show the operating system around an AI/research feature, not only the final generated answer.

- **Grounded research:** live web research is returned with cited sources instead of an unsupported generated brief.
- **Provider abstraction:** research providers and model choices are isolated behind the Clintware Control Plane rather than hard-coded into the front end.
- **Reliability engineering:** fresh cache, seven-day stale fallback, graceful research-unavailable behavior, request validation, and rate limiting keep failures from becoming fabricated answers.
- **Provenance:** one `request_id` follows the analysis through research, evidence handling, response generation, and telemetry.
- **Observability:** latency, provider/model, cache status, source counts, failures, estimated cost, and conversion events are captured as privacy-safe operational signals.
- **Security boundaries:** browser and ProofOS runtime never receive third-party research credentials; worker-to-worker service binding is the primary transport.
- **Product thinking:** the system connects research output to real visitor actions while measuring the path without storing raw prompts or responses.
- **Production delivery:** Cloudflare Workers, Durable Objects in the Control Plane, service bindings, MCP-facing platform capabilities, automated checks, and deployment workflows are part of the implementation.

## Current production state

As of September 14, 2026, the checked-in build state is `PRODUCTION_VERIFIED`:

- `proof.clintware.com` live and healthy
- ProofOS v1.0.0 deployed
- Clintware Control Plane live with service binding active
- live research verified with Exa + Workers AI
- cache hit/miss and stale-fallback paths verified
- telemetry and conversion event paths verified
- `/api/brief`, `/api/action`, and `/health` verified

See [`BUILD_STATE.md`](./BUILD_STATE.md) for the current verification snapshot.

## Runtime architecture

```text
visitor action
  -> validation + rate limit
  -> router decision
  -> fresh cache / stale fallback / live research
  -> Clintware Control Plane
  -> provider + model execution
  -> sources + evidence merge
  -> structured response
  -> privacy-safe telemetry
```

All intelligence, telemetry, and platform calls flow to the Control Plane (`clintware-control-plane` worker) over a Cloudflare service binding: a private worker-to-worker call in which the Control Plane identifies ProofOS by caller identity. No third-party credential exists in the ProofOS runtime.

### Key files

- `src/index.js` — Worker entry, routes, session cookie, cache, and rate limiting
- `src/research.js` — Control Plane research response handling and brief parsing
- `src/telemetry.js` — Control Plane event emission; fail-open so analytics never block UX
- `src/page.js` — self-contained Clintware-branded live application UI
- `src/util.js` — pure helpers for ids, validation, and slugs
- `lib/control-plane.js` — Control Plane transport; service binding first, public URL fallback
- `CONTROL_PLANE_CONTRACT.md` — product/control-plane integration contract
- `BUILD_STATE.md` — production verification state

## Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/` | GET | Live application |
| `/health` | GET | Health/status JSON (`service: "proofos"`) |
| `/api/brief` | POST | Run or fetch a company brief (`{ "company": "..." }`) |
| `/api/action` | POST | Conversion tracking (`resume`, `contact`, `meeting`) |
| `/api/summary` | GET | 30-day telemetry summary from the Control Plane |

## Environment and provider boundary

No third-party research secret is required by ProofOS. The `CONTROL_PLANE` service binding declared in `wrangler.jsonc` is the primary credential-free transport for research and telemetry.

Optional, for local development or environments without the binding:

- `CLINTWARE_CONTROL_PLANE_URL` — defaults to `https://mcp.clintware.com`
- `CLINTWARE_PRODUCT_TOKEN` — ProofOS product token minted by a Control Plane administrator and used as Bearer auth on the public transport fallback

Research-provider credentials and configuration belong to the Control Plane, not ProofOS. This is intentional: provider-specific variables are implementation details behind a stable internal contract, allowing the research layer to change without coupling the public product to one vendor.

If no research provider is available, `/api/brief` returns a graceful `research_unavailable` mode. Routing, caching, telemetry, and conversion paths remain operational, and ProofOS does not fabricate a brief.

## Development

```bash
npm install
npm run check   # syntax checks
npm test        # unit tests (node:test, no network)
npm run dev     # local wrangler dev
npm run deploy  # or dispatch .github/workflows/deploy-proofos.yml
```

## Operational notes

- Briefs cache fresh for 12 hours; a seven-day stale copy can be served when live research is unavailable and is explicitly flagged `stale_fallback`.
- Telemetry failures never break the visitor path.
- Rate limit: 10 briefs per anonymous session per five minutes, best effort per isolate.
- No raw prompts or model responses are persisted by ProofOS; telemetry uses the canonical event model defined by the Control Plane contract.

## Design principle

**Treat AI research like a production dependency, not a magic text box.** ProofOS makes source grounding, provider boundaries, fallback behavior, telemetry, security, and user outcomes visible parts of the product architecture.