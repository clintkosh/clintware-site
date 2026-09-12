const CONTROL_PLANE_URL = (process.env.CLINTWARE_CONTROL_PLANE_URL || "https://mcp.clintware.com").replace(/\/$/, "");

function productToken() {
  const token = process.env.CLINTWARE_PRODUCT_TOKEN || "";
  if (!token) throw new Error("CLINTWARE_PRODUCT_TOKEN is not configured");
  return token;
}

async function cpFetch(path, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("authorization", `Bearer ${productToken()}`);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${CONTROL_PLANE_URL}${path}`, { ...init, headers });
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

export async function emitProofOsEvent(event) {
  return cpFetch("/api/v1/events", {
    method: "POST",
    body: JSON.stringify({
      product: "proofos",
      environment: process.env.NODE_ENV === "production" ? "production" : "development",
      timestamp: new Date().toISOString(),
      ...event,
    }),
  });
}

export async function getProofOsSummary(days = 30) {
  return cpFetch(`/api/v1/products/proofos/summary?days=${encodeURIComponent(days)}`);
}

export async function getProofOsRecentActivity(limit = 50) {
  return cpFetch(`/api/v1/products/proofos/recent?limit=${encodeURIComponent(limit)}`);
}

export async function readClintwareRepo(path, ref) {
  return cpFetch("/api/v1/repo/read", {
    method: "POST",
    body: JSON.stringify({ product: "proofos", path, ref }),
  });
}

export async function writeClintwareRepo({ path, content, message, branch, sha, request_id }) {
  return cpFetch("/api/v1/repo/write", {
    method: "POST",
    body: JSON.stringify({ product: "proofos", path, content, message, branch, sha, request_id }),
  });
}

export async function createClintwareBranch(branch, base = "main", request_id) {
  return cpFetch("/api/v1/repo/branch", {
    method: "POST",
    body: JSON.stringify({ product: "proofos", branch, base, request_id }),
  });
}

export async function deployProofOs({ ref = "main", inputs = {}, request_id } = {}) {
  return cpFetch("/api/v1/deploy", {
    method: "POST",
    body: JSON.stringify({ product: "proofos", workflow: "deploy-proofos.yml", ref, inputs, request_id }),
  });
}

export async function ensureProofOsDns({ content, type = "CNAME", proxied = true, request_id }) {
  return cpFetch("/api/v1/dns/ensure", {
    method: "POST",
    body: JSON.stringify({ product: "proofos", name: "proof.clintware.com", type, content, proxied, request_id }),
  });
}
