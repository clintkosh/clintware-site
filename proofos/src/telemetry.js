// ProofOS telemetry — emits privacy-safe, request-correlated events through the
// Clintware Control Plane using proofos/lib/control-plane.js.
// Telemetry must never break the visitor path: every emit is fail-open.

import { emitProofOsEvent } from "../lib/control-plane.js";

const seenStartupConfig = { checked: false };

/** Safe feature/action view event. */
export async function trackPageView({ request_id, anonymous_session_id, route, feature = "site", action = "view", success = true }) {
  return safeEmit({
    request_id,
    anonymous_session_id,
    feature,
    action,
    route,
    success,
  });
}

/**
 * Canonical analysis event per the ProofOS ↔ Control Plane contract.
 * fields: provider, model, tool_calls, source_count, first_party_source_count,
 * contradiction_count, latency_ms, reported_api_cost, research_freshness,
 * cache_status, fallback_used, success, error_class.
 */
export async function trackAnalysis(fields) {
  return safeEmit({
    request_id: fields.request_id,
    anonymous_session_id: fields.anonymous_session_id,
    feature: "brief",
    action: "analyze",
    route: "/api/brief",
    provider: fields.provider || "clintware-control-plane",
    model: fields.model || null,
    tool_calls: fields.tool_calls ?? 0,
    source_count: fields.source_count ?? 0,
    first_party_source_count: fields.first_party_source_count ?? 0,
    contradiction_count: fields.contradiction_count ?? 0,
    evidence_nodes_considered: fields.evidence_nodes_considered ?? fields.source_count ?? 0,
    evidence_nodes_used: fields.evidence_nodes_used ?? fields.source_count ?? 0,
    latency_ms: fields.latency_ms ?? null,
    input_size: fields.input_size ?? null,
    output_size: fields.output_size ?? null,
    reported_api_cost: fields.reported_api_cost ?? null,
    research_freshness: fields.research_freshness || "unknown",
    cache_status: fields.cache_status || "miss",
    fallback_used: fields.fallback_used ? true : false,
    success: fields.success !== false,
    error_class: fields.error_class || null,
    metadata: fields.metadata || {},
  });
}

/** Conversion events: resume, contact, meeting. */
export async function trackConversion({ action, request_id, anonymous_session_id, route = "/api/action" }) {
  if (!["resume", "contact", "meeting"].includes(action)) return { ok: false, skipped: "unknown_action" };
  return safeEmit({
    request_id,
    anonymous_session_id,
    feature: "conversion",
    action,
    route,
    conversion_event: true,
    success: true,
  });
}

/** Emit an error event without raw visitor content. */
export async function trackError({ request_id, anonymous_session_id, feature, action, route, error_class }) {
  return safeEmit({
    request_id,
    anonymous_session_id,
    feature: feature || "site",
    action: action || "error",
    route: route || null,
    success: false,
    error_class: error_class || "unknown",
  });
}

function safeEmit(event) {
  try {
    return Promise.resolve(emitProofOsEvent(event)).catch(() => ({ ok: false, degraded: true }));
  } catch {
    return Promise.resolve({ ok: false, degraded: true });
  }
}

/** Whether a product token is configured in this runtime (for /health only — never leaks values). */
export function telemetryConfigured() {
  return Boolean(process.env.CLINTWARE_PRODUCT_TOKEN);
}
