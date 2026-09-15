// ProofOS transport to the Clintware Control Plane (https://mcp.clintware.com).
// All server-side intelligence, telemetry, and platform calls go through the
// Control Plane — ProofOS holds no third-party API keys of any kind.
//
// Transport, in order of preference:
//   1. Cloudflare service binding `env.CONTROL_PLANE` — private worker-to-worker
//      call to the Control Plane. The Control Plane identifies ProofOS by the
//      binding caller identity, so no credential exists in this runtime at all.
//   2. Public Control Plane URL + optional CLINTWARE_PRODUCT_TOKEN (Bearer),
//      for local development or environments without the binding.
const CONTROL_PLANE_URL = (process.env.CLINTWARE_CONTROL_PLANE_URL || "https://mcp.clintware.com").replace(/\/$/, "");
const SERVICE_WORKER_NAME = "clintware-proofos";

let runtimeBinding = null;
/** Install the Control Plane service binding for this isolate (called per request). */
export function setControlPlaneBinding(binding) {
  runtimeBinding = binding || null;
}

async function cpFetch(path, init = {}) {
  const headers = new Headers(init.headers || {});
  const token = process.env.CLINTWARE_PRODUCT_TOKEN || "";
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (runtimeBinding) headers.set("cf-worker", SERVICE_WORKER_NAME);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const url = `${CONTROL_PLANE_URL}${path}`;
  const response = runtimeBinding
    ? await runtimeBinding.fetch(url, { ...init, headers })
    : await fetch(url, { ...init, headers });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) {
    const error = new Error(body?.error || `control_plane_${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function environment() {
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export async function emitProofOsEvent(event) {
  return cpFetch("/api/v1/events", {
    method: "POST",
    body: JSON.stringify({
      product: "proofos",
      environment: environment(),
      timestamp: new Date().toISOString(),
      ...event,
    }),
  });
}

/** Invoke research through the Control Plane gateway (research.invoke capability). */
export async function invokeProofOsResearch({ company, request_id }) {
  return cpFetch("/api/v1/research", {
    method: "POST",
    body: JSON.stringify({ product: "proofos", company, request_id, environment: environment() }),
  });
}

export async function getProofOsSummary(days = 30) {
  return cpFetch(`/api/v1/products/proofos/summary?days=${encodeURIComponent(days)}`);
}

export async function getProofOsRecentActivity(limit = 50) {
  return cpFetch(`/api/v1/products/proofos/recent?limit=${encodeURIComponent(limit)}`);
}
