# ProofOS

ProofOS is the live implementation-intelligence product for Clintware, deployed at
`https://proof.clintware.com`. It is the first production consumer of the
[Clintware Control Plane](../control-plane/README.md).

A visitor enters a company name. ProofOS runs a live research call server-side,
merges the answer with cited sources, and returns an implementation-focused
brief — through a production pipeline: input validation, rate limiting, cache
routing with stale fallback, evidence merge, request-id correlation, and
privacy-safe telemetry.

## Runtime architecture

```
visitor action -> router decision -> cache / Perplexity research
-> sources + evidence merge -> response -> conversion telemetry
```

- `src/index.js` — Worker entry: routes, session cookie, cache, rate limiting
- `src/research.js` — Perplexity provider integration and brief parsing
- `src/telemetry.js` — Control Plane event emission (fail-open, never blocks UX)
- `src/page.js` — self-contained Clintware-branded landing page
- `src/util.js` — pure helpers (ids, validation, slugs)
- `lib/control-plane.js` — shared Control Plane client (server-side only)

## Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/` | GET | Landing page |
| `/health` | GET | Health/status JSON (`service: "proofos"`) |
| `/api/brief` | POST | Run or fetch a company brief (`{ "company": "..." }`) |
| `/api/action` | POST | Conversion tracking (`resume`, `contact`, `meeting`) |
| `/api/summary` | GET | 30-day telemetry summary from the Control Plane |

## Environment

Set once from this directory:

```bash
npx wrangler secret put PERPLEXITY_API_KEY        # live research provider
npx wrangler secret put CLINTWARE_PRODUCT_TOKEN   # ProofOS runtime token from the Control Plane
```

`CLINTWARE_CONTROL_PLANE_URL` defaults to `https://mcp.clintware.com`.
Optional: `PERPLEXITY_MODEL` (default `sonar`).

The product token is created by a Control Plane administrator:

```bash
curl -X POST https://mcp.clintware.com/api/v1/products/client \
  -H "Authorization: Bearer $CONTROL_PLANE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product":"proofos"}'
```

Never expose these values to browser code. All provider calls and telemetry
emission happen in Worker server routes.

## Development

```bash
npm install
npm run check   # syntax checks
npm test        # unit tests (node:test, no network)
npm run dev     # local wrangler dev
npm run deploy  # or dispatch .github/workflows/deploy-proofos.yml
```

## Operational notes

- Briefs cache fresh for 12h; a 7d stale copy is served as a fallback when the
  research provider fails (response is flagged `stale_fallback`).
- Telemetry failures never break the visitor path; the Control Plane analytics
  remain available through `clintware_usage_summary` and related MCP tools.
- Rate limit: 10 briefs per anonymous session per 5 minutes (best effort,
  per-isolate).
- No raw prompts or responses are persisted; only the canonical event model
  fields defined in the Control Plane contract.
