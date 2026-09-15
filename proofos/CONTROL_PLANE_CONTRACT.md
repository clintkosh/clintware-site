# ProofOS ↔ Clintware Control Plane Contract

ProofOS is the first production consumer of the reusable Clintware Control Plane.

## Runtime boundary

ProofOS browser code must never receive GitHub, Cloudflare, MCP, admin, or infrastructure credentials.

Browser actions reach ProofOS server routes. ProofOS server routes may use `proofos/lib/control-plane.js` with `CLINTWARE_PRODUCT_TOKEN` to emit/query product telemetry.

Infrastructure mutations are not available to the ProofOS runtime token. They are performed through the authenticated Clintware MCP control plane or an administrative credential.

## MCP endpoint

`https://mcp.clintware.com/mcp`

Trusted agent clients receive a Control Plane credential, not the underlying GitHub or Cloudflare credentials.

## Expected Perplexity build capabilities

A trusted ProofOS builder can discover and use:

- `clintware_control_plane_status`
- `clintware_product_manifest`
- `clintware_capability_check`
- `clintware_repo_read_file`
- `clintware_repo_create_branch`
- `clintware_repo_write_file`
- `clintware_deploy_workflow`
- `clintware_dns_ensure_record`
- `clintware_usage_summary`
- `clintware_feature_funnel`
- `clintware_provider_breakdown`
- `clintware_cache_performance`
- `clintware_conversion_summary`
- `clintware_recent_errors`
- `clintware_recent_activity`
- `clintware_daily_activity`

These capabilities cover the Clintware-side assumptions in the ProofOS v3 brief: repository context/change relay, deployment relay, DNS relay, telemetry, provider/cost tracking, cache tracking, funnels, conversions, and auditability.

## Canonical request correlation

ProofOS should generate one `request_id` per meaningful analysis and carry it through:

`visitor action → router decision → cache/Workers AI/Perplexity → sources/evidence merge → response → follow-up action`

All emitted telemetry for that analysis should reuse the same `request_id`.

Use a privacy-safe anonymous session identifier to connect visitor actions without requiring identity or raw prompt retention.

## Perplexity telemetry

When Perplexity returns the information, emit at least:

- provider: `perplexity`
- model
- tool_calls
- source_count
- first_party_source_count
- contradiction_count
- latency_ms
- reported_api_cost
- research_freshness
- cache_status
- fallback_used
- success/error_class

Do not persist hidden reasoning or private chain-of-thought.

## Environment variables used by ProofOS

- `CLINTWARE_CONTROL_PLANE_URL=https://mcp.clintware.com`
- `CLINTWARE_PRODUCT_TOKEN=<scoped ProofOS runtime token>`

These belong only in the ProofOS server runtime.

## Environment secrets retained by the Control Plane

- `CONTROL_PLANE_MCP_TOKEN`
- `CONTROL_PLANE_ADMIN_TOKEN`
- `GITHUB_CONTROL_PLANE_TOKEN`
- `CLOUDFLARE_CONTROL_PLANE_TOKEN`
- `CLOUDFLARE_ZONE_ID`

External systems must never receive the GitHub or Cloudflare values.
