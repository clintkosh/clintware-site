# Clintware Control Plane

Reusable, least-privilege access and telemetry layer for Clintware products and external AI systems.

ProofOS is the first registered production consumer. The control plane keeps GitHub, Cloudflare, deployment, analytics, and product credentials centralized inside Clintware instead of distributing broad credentials to every external system.

## Architecture

`external AI/app -> mcp.clintware.com -> identity -> policy -> capability -> action -> audit`

The MCP endpoint is one interface into the broader control plane. The same Worker also exposes authenticated application/event APIs.

## Primary endpoints

- `GET /health` — safe health/configuration status
- `POST /mcp` — authenticated MCP endpoint
- `GET /api/v1` — API index
- `POST /api/v1/events` — canonical product event ingestion
- `GET /api/v1/products/:product/summary`
- `GET /api/v1/products/:product/recent`
- `GET /api/v1/products/:product/errors`
- `GET /api/v1/products/:product/daily`
- `GET /api/v1/products/:product/funnel`
- `GET /api/v1/products/:product/providers`
- `GET /api/v1/products/:product/cache`
- `GET /api/v1/products/:product/conversions`
- `POST /api/v1/repo/read`
- `POST /api/v1/repo/branch`
- `POST /api/v1/repo/write`
- `POST /api/v1/deploy`
- `POST /api/v1/dns/ensure`

## MCP tools

Read/analytics:

- `clintware_control_plane_status`
- `clintware_product_manifest`
- `clintware_capability_check`
- `clintware_usage_summary`
- `clintware_feature_funnel`
- `clintware_provider_breakdown`
- `clintware_cache_performance`
- `clintware_conversion_summary`
- `clintware_recent_errors`
- `clintware_recent_activity`
- `clintware_daily_activity`
- `clintware_repo_read_file`

Scoped mutations:

- `clintware_repo_create_branch`
- `clintware_repo_write_file`
- `clintware_deploy_workflow`
- `clintware_dns_ensure_record`

Mutation tools enforce each product's manifest before touching external infrastructure.

## ProofOS scope

The default ProofOS manifest permits:

- reading `clintkosh/clintware-site`
- writing only `proofos/`, `control-plane/`, and `public/proofos/`
- branch creation
- dispatching only the ProofOS/control-plane deployment workflows
- ensuring only allowlisted Clintware DNS names
- ProofOS telemetry read/write

It explicitly denies secret reads, billing administration, repository deletion, unrelated repository writes, and broad infrastructure administration.

## Required Worker secrets

Provision these once in Cloudflare. External AI systems receive only the scoped Control Plane MCP credential, never the underlying credentials.

- `CONTROL_PLANE_MCP_TOKEN` — bearer credential used by trusted MCP clients such as the Perplexity ProofOS project
- `CONTROL_PLANE_ADMIN_TOKEN` — administrative API credential used to register products/clients
- `GITHUB_CONTROL_PLANE_TOKEN` — central GitHub credential with only the repository permissions needed for scoped writes/branch/workflow actions
- `CLOUDFLARE_CONTROL_PLANE_TOKEN` — Cloudflare token limited to required DNS operations
- `CLOUDFLARE_ZONE_ID` — Clintware zone ID

`GITHUB_CONTROL_PLANE_TOKEN` and the Cloudflare token are never returned through the API or MCP.

## Create a ProofOS application token

After deployment, an administrator can create the ProofOS application token once:

```bash
curl -X POST https://mcp.clintware.com/api/v1/products/client \
  -H "Authorization: Bearer $CONTROL_PLANE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product":"proofos"}'
```

Store the returned token as `CLINTWARE_PRODUCT_TOKEN` in the ProofOS server runtime. Only its SHA-256 hash is retained by the Control Plane.

The ProofOS application must never expose this token to browser JavaScript. Browser actions should reach ProofOS server routes, which emit telemetry server-side through `proofos/lib/control-plane.js`.

## Canonical event model

Events support:

- `event_id`
- `timestamp` / `ts`
- `product`
- `environment`
- `anonymous_session_id`
- `request_id`
- `feature`
- `action`
- `route`
- `provider`
- `model`
- `cache_status`
- `research_freshness`
- `tool_calls`
- `source_count`
- `first_party_source_count`
- `contradiction_count`
- `evidence_nodes_considered`
- `evidence_nodes_used`
- `latency_ms`
- `input_size`
- `output_size`
- `reported_api_cost`
- `estimated_cost_avoided`
- `fallback_used`
- `success`
- `error_class`
- `conversion_event`
- safe `metadata`

Raw visitor prompts/responses are intentionally not required for product analytics.

## Deployment

The Worker is configured for `mcp.clintware.com`. Use `.github/workflows/deploy-control-plane.yml` or run from this directory:

```bash
npm install
npm run check
npx wrangler deploy --dry-run
npm run deploy
```

The deployment workflow uses the repository's existing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` GitHub secrets.
