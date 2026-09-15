// ProofOS — live implementation-intelligence worker for Clintware.
// Serves the portfolio product at proof.clintware.com.
//
// Pipeline per the Control Plane contract:
//   visitor action -> router decision -> cache / Clintware Control Plane research
//   -> sources + evidence merge -> response -> conversion telemetry
// All intelligence, telemetry, and platform calls flow through the Clintware
// Control Plane service binding; ProofOS holds no third-party API keys.

import { renderPage } from "./page.js";
import { parseBrief, extractSources, normalizeResearch, researchErrorClass } from "./research.js";
import { trackAnalysis, trackConversion, trackError, trackPageView } from "./telemetry.js";
import { getProofOsSummary, invokeProofOsResearch, setControlPlaneBinding } from "../lib/control-plane.js";
import { newRequestId, newSessionId, normalizeCompany, companySlug, hostLabel, jsonResp } from "./util.js";

const VERSION = "1.0.0";
const FRESH_TTL = 43200; // 12h — a brief is considered fresh
const STALE_TTL = 604800; // 7d — stale copies may serve as a fallback
const SESSION_COOKIE = "proofos_sid";
const RATE_LIMIT = { max: 10, windowMs: 5 * 60 * 1000 };
const rateBuckets = new Map(); // best-effort, per-isolate

export default {
  async fetch(request, env, ctx) {
    setControlPlaneBinding(env && env.CONTROL_PLANE);
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        return pageResponse(request, env, ctx);
      }
      if (request.method === "GET" && url.pathname === "/health") {
        return healthResponse(env);
      }
      if (request.method === "POST" && url.pathname === "/api/brief") {
        return briefResponse(request, env, ctx);
      }
      if (request.method === "POST" && url.pathname === "/api/action") {
        return actionResponse(request, env, ctx);
      }
      if (request.method === "GET" && url.pathname === "/api/summary") {
        return summaryResponse(env);
      }
      return jsonResp({ error: "not_found", path: url.pathname }, 404);
    } catch (error) {
      console.error(JSON.stringify({ event: "proofos_error", path: url.pathname, error: String(error) }));
      return jsonResp({ error: "internal_error" }, 500);
    }
  },
};

/* ---------- routes ---------- */

function pageResponse(request, env, ctx) {
  const { session_id, set_cookie: setCookie } = ensureSession(request);
  ctx.waitUntil(
    trackPageView({ request_id: newRequestId(), anonymous_session_id: session_id, route: "/" }).catch(() => {})
  );
  const headers = { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" };
  if (setCookie) headers["set-cookie"] = setCookie;
  return new Response(renderPage({ version: VERSION }), { headers });
}

function healthResponse(env) {
  const binding = Boolean(env && env.CONTROL_PLANE);
  return jsonResp({
    ok: true,
    service: "proofos",
    version: VERSION,
    gateway: "clintware-control-plane",
    gateway_transport: binding ? "service-binding" : "public",
    research: "via-clintware-control-plane",
    telemetry: binding || env.CLINTWARE_PRODUCT_TOKEN ? "configured" : "not_configured",
  });
}

async function briefResponse(request, env, ctx) {
  const started = Date.now();
  const request_id = newRequestId();
  const { session_id, set_cookie: setCookie } = ensureSession(request);

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const company = normalizeCompany(body.company);

  // Router decision: reject invalid input before any provider work.
  if (!company) {
    ctx.waitUntil(
      trackError({ request_id, anonymous_session_id: session_id, feature: "brief", action: "analyze", error_class: "invalid_input" }).catch(() => {})
    );
    return withSession(jsonResp({ error: "invalid_input", detail: "Provide a company name (letters, digits, spaces, basic punctuation)." }, 400, { "x-proofos-request-id": request_id }), setCookie);
  }
  if (!allowRate(session_id)) {
    ctx.waitUntil(
      trackError({ request_id, anonymous_session_id: session_id, feature: "brief", action: "analyze", error_class: "rate_limited" }).catch(() => {})
    );
    return withSession(jsonResp({ error: "rate_limited", detail: "Too many briefs requested. Try again in a few minutes." }, 429, { "x-proofos-request-id": request_id }), setCookie);
  }

  const slug = companySlug(company);
  const cache = (env && env.__CACHE) || (typeof caches !== "undefined" ? caches.default : null);
  const freshKey = `https://cache.proofos.internal/brief/${slug}.json`;
  const staleKey = `https://cache.proofos.internal/brief/${slug}.stale.json`;

  // Router decision: serve fresh cache when present.
  let cached = null;
  if (cache) {
    try {
      const hit = await cache.match(freshKey);
      if (hit) cached = await hit.json();
    } catch {
      cached = null;
    }
  }
  if (cached && Date.now() - cached.generated_at < FRESH_TTL * 1000) {
    const response = withSession(jsonResp({ ...cached, request_id, cache_status: "hit", served_by: "proofos" }, 200, { "x-proofos-request-id": request_id, "x-proofos-cache": "hit" }), setCookie);
    ctx.waitUntil(
      trackAnalysis({
        request_id,
        anonymous_session_id: session_id,
        model: cached.model,
        source_count: cached.sources ? cached.sources.length : 0,
        first_party_source_count: cached.sources ? cached.sources.filter((s) => s.first_party).length : 0,
        latency_ms: Date.now() - started,
        research_freshness: `cached ${Math.round((Date.now() - cached.generated_at) / 60000)}m`,
        cache_status: "hit",
        fallback_used: false,
        success: true,
        provider: cached.provider || "clintware-control-plane",
        input_size: company.length,
        output_size: cached.brief ? JSON.stringify(cached.brief).length : null,
        metadata: { company: slug },
      }).catch(() => {})
    );
    return response;
  }

  // Live research through the Clintware Control Plane gateway. ProofOS holds
  // no provider credentials; provider selection and routing are Clintware-side.
  let research;
  try {
    research = normalizeResearch(await invokeProofOsResearch({ company, request_id }));
  } catch (error) {
    research = { ok: false, error_class: researchErrorClass(error) };
  }

  if (research.ok && research.available) {
    // Evidence merge: sections + cited sources + provenance.
    const sources = extractSources(research.citations, slug, hostLabel);
    const payload = {
      company,
      generated_at: Date.now(),
      provider: research.provider,
      model: research.model,
      brief: parseBrief(research.text),
      sources,
      usage: research.usage,
    };

    if (cache) {
      ctx.waitUntil(
        (async () => {
          try {
            const fresh = new Response(JSON.stringify(payload), { headers: { "content-type": "application/json", "cache-control": `max-age=${FRESH_TTL}` } });
            const stale = new Response(JSON.stringify(payload), { headers: { "content-type": "application/json", "cache-control": `max-age=${STALE_TTL}` } });
            await cache.put(freshKey, fresh);
            await cache.put(staleKey, stale);
          } catch {
            // cache write failures are non-fatal
          }
        })()
      );
    }

    const response = withSession(
      jsonResp({ ...payload, request_id, cache_status: "miss", served_by: "proofos" }, 200, { "x-proofos-request-id": request_id, "x-proofos-cache": "miss" }),
      setCookie
    );
    ctx.waitUntil(
      trackAnalysis({
        request_id,
        anonymous_session_id: session_id,
        provider: research.provider,
        model: research.model,
        tool_calls: 1,
        source_count: sources.length,
        first_party_source_count: sources.filter((s) => s.first_party).length,
        contradiction_count: 0,
        latency_ms: Date.now() - started,
        input_size: company.length,
        output_size: research.text ? research.text.length : null,
        reported_api_cost: research.usage.reported_api_cost,
        research_freshness: "live",
        cache_status: "miss",
        fallback_used: false,
        success: true,
        metadata: { company: slug },
      }).catch(() => {})
    );
    return response;
  }

  // Gateway reachable but no research provider is activated yet, or the gateway
  // call failed. Fall back to the most recent stale brief; if none exists,
  // degrade gracefully without fabricating data.
  const unavailable = research.ok && !research.available;
  const errorClass = unavailable ? research.reason : research.error_class;
  if (cache) {
    try {
      const staleHit = await cache.match(staleKey);
      if (staleHit) {
        const stale = await staleHit.json();
        const response = withSession(jsonResp({ ...stale, request_id, cache_status: "stale_fallback", fallback_used: true, warning: "Live research is temporarily unavailable; showing the most recent verified brief." }, 200, { "x-proofos-request-id": request_id, "x-proofos-cache": "stale" }), setCookie);
        ctx.waitUntil(
          trackAnalysis({
            request_id,
            anonymous_session_id: session_id,
            provider: stale.provider || "clintware-control-plane",
            model: stale.model,
            source_count: stale.sources ? stale.sources.length : 0,
            first_party_source_count: stale.sources ? stale.sources.filter((s) => s.first_party).length : 0,
            latency_ms: Date.now() - started,
            research_freshness: "stale_fallback",
            cache_status: "stale",
            fallback_used: true,
            success: true,
            error_class: errorClass,
            input_size: company.length,
            metadata: { company: slug },
          }).catch(() => {})
        );
        return response;
      }
    } catch {
      // fall through to graceful degradation
    }
  }
  ctx.waitUntil(
    trackAnalysis({
      request_id,
      anonymous_session_id: session_id,
      provider: unavailable ? research.provider : "clintware-control-plane",
      latency_ms: Date.now() - started,
      cache_status: "miss",
      fallback_used: false,
      success: false,
      error_class: errorClass,
      research_freshness: unavailable ? "unavailable" : "error",
      input_size: company.length,
      metadata: { company: slug },
    }).catch(() => {})
  );
  if (unavailable) {
    // Graceful available-data mode: the pipeline (routing, cache, telemetry,
    // conversions) is live; the research provider is pending activation on the
    // Clintware Control Plane. Never fabricate a brief.
    return withSession(
      jsonResp({
        mode: "research_unavailable",
        company,
        request_id,
        cache_status: "miss",
        served_by: "proofos",
        notice: "The full ProofOS pipeline (routing, caching, telemetry, conversions) is live. Live research is pending activation on the Clintware Control Plane — no brief was fabricated.",
      }, 200, { "x-proofos-request-id": request_id }),
      setCookie
    );
  }
  return withSession(jsonResp({ error: "research_failed", error_class: errorClass, detail: "Live research is temporarily unavailable. Try again shortly.", request_id }, 502, { "x-proofos-request-id": request_id }), setCookie);
}

const CONVERSION_TARGETS = {
  resume: "https://www.clintware.com/work/",
  contact: "https://www.clintware.com/contact/",
  meeting: "https://meet.clintware.com/",
};

async function actionResponse(request, env, ctx) {
  const request_id = newRequestId();
  const { session_id, set_cookie: setCookie } = ensureSession(request);
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const action = typeof body.action === "string" ? body.action : "";
  const target = CONVERSION_TARGETS[action];
  if (!target) {
    return withSession(jsonResp({ error: "invalid_action", actions: Object.keys(CONVERSION_TARGETS) }, 400), setCookie);
  }
  ctx.waitUntil(trackConversion({ action, request_id, anonymous_session_id: session_id }).catch(() => {}));
  return withSession(jsonResp({ ok: true, action, target, request_id }, 200), setCookie);
}

async function summaryResponse(env) {
  if (!(env && env.CONTROL_PLANE) && !env.CLINTWARE_PRODUCT_TOKEN) {
    return jsonResp({ ok: false, detail: "control plane transport not configured" }, 200);
  }
  try {
    const summary = await getProofOsSummary(30);
    return jsonResp({ ok: true, summary });
  } catch {
    return jsonResp({ ok: false, detail: "control plane unreachable" }, 200);
  }
}

/* ---------- helpers ---------- */

function ensureSession(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([A-Za-z0-9-]+)`));
  if (match) return { session_id: match[1], set_cookie: null };
  const session_id = newSessionId();
  return {
    session_id,
    set_cookie: `${SESSION_COOKIE}=${session_id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
  };
}

function allowRate(session_id) {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.start > RATE_LIMIT.windowMs) rateBuckets.delete(key);
  }
  const bucket = rateBuckets.get(session_id);
  if (!bucket) {
    rateBuckets.set(session_id, { start: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT.max;
}

function withSession(response, setCookie) {
  if (!setCookie) return response;
  const headers = new Headers(response.headers);
  headers.append("set-cookie", setCookie);
  return new Response(response.body, { status: response.status, headers });
}
