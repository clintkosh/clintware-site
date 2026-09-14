# ProofOS

ProofOS is the live implementation-intelligence product for Clintware, deployed at
`https://proof.clintware.com`. It is the first production consumer of the
[Clintware Control Plane](../control-plane/README.md).

A visitor enters a company name. ProofOS invokes research through the Clintware
Control Plane server-side, merges the answer with cited sources, and returns an
implementation-focused brief — through a production pipeline: input validation,
rate limiting, cache routing with stale fallback, evidence merge, request-id
correlation, and privacy-safe telemetry. ProofOS holds no third-party API keys;
provider selection and credentials live entirely behind the Clintware Control
Plane.

## Runtime architecture

```
visitor action -> router decision -> cache / Clintware Control Plane research
-> sources + evidence merge -> response -> conversion telemetry
```

All intelligence, telemetry, and platform calls flow to the Control Plane
(`clintware-control-plane` worker) over a Cloudflare service binding — a private
worker-to-worker call in which the Control Plane identifies ProofOS by its
caller identity. No credential exists in the ProofOS runtime.

- `src/index.js` — Worker entry: routes, session cookie, cache, rate limiting
- `src/research.js` — Control Plane research response handling and brief parsing
- `src/telemetry.js` — Control Plane event emission (fail-open, never blocks UX)
- `src/page.js` — self-contained Clintware-branded landing page
- `src/util.js` — pure helpers (ids, validation, slugs)
- `lib/control-plane.js` — Control Plane transport (service binding first, public URL fallback)

## Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/` | GET | Landing page |
| `/health` | GET | Health/status JSON (`service: "proofos"`) |
| `/api/brief` | POST | Run or fetch a company brief (`{ "company": "..." }`) |
| `/api/action` | POST | Conversion tracking (`resume`, `contact`, `meeting`) |
| `/api/summary` | GET | 30-day telemetry summary from the Control Plane |

## Environment

No secrets are required. The `CONTROL_PLANE` service binding (declared in
`wrangler.jsonc`) is the credential-free transport for research and telemetry.

Optional, for local development or environments without the binding:

- `CLINTWARE_CONTROL_PLANE_URL` — defaults to `https://mcp.clintware.com`
- `CLINTWARE_PRODUCT_TOKEN` — ProofOS product token from the Control Plane
  (minted by a Control Plane administrator via
  `POST /api/v1/products/client`), used as Bearer auth on the public transport

The research provider itself is configured on the Clintware Control Plane side
(`RESEARCH_PROVIDER_URL` / `RESEARCH_PROVIDER_TOKEN` / `RESEARCH_PROVIDER_MODEL`
secrets on the `clintware-control-plane` worker). Until a provider is activated,
`/api/brief` responds with a graceful `research_unavailable` mode — the
pipeline (routing, caching, telemetry, conversions) stays fully operational and
no brief is fabricated.

## Development

```bash
npm install
npm run check   # syntax checks
npm test        # unit tests (node:test, no network)
npm run dev     # local wrangler dev
npm run deploy  # or dispatch .github/workflows/deploy-proofos.yml
```

## Operational notes

- Briefs cache fresh for 12h; a 7d stale copy is served as a fallback when live
  research is unavailable (response is flagged `stale_fallback`). With no stale
  copy, `/api/brief` returns a graceful `research_unavailable` response.
- Telemetry failures never break the visitor path; the Control Plane analytics
  remain available through `clintware_usage_summary` and related MCP tools.
- Rate limit: 10 briefs per anonymous session per 5 minutes (best effort,
  per-isolate).
- No raw prompts or responses are persisted; only the canonical event model
  fields defined in the Control Plane contract.
