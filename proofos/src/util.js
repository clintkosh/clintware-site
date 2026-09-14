// ProofOS shared utilities — pure functions, no Workers-only APIs.

export const MAX_COMPANY_LEN = 80;

/** Generate a correlation id for one meaningful analysis. */
export function newRequestId(cryptoObj = globalThis.crypto) {
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") return cryptoObj.randomUUID();
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Generate a privacy-safe anonymous session identifier. */
export function newSessionId(cryptoObj = globalThis.crypto) {
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") return cryptoObj.randomUUID();
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Normalize and validate a company query from a visitor.
 * Returns the cleaned string, or null when the input must be rejected.
 */
export function normalizeCompany(raw) {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  if (cleaned.length > MAX_COMPANY_LEN) return null;
  // Letters (incl. accents), digits, spaces, and common company punctuation only.
  if (!/^[\p{L}\p{N}\s.,&'\-()]+$/u.test(cleaned)) return null;
  if (cleaned.replace(/\p{L}/gu, "").length === cleaned.length) return null; // at least one letter
  return cleaned;
}

/** URL/cache-safe slug for a company name. */
export function companySlug(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "company";
}

/** Extract the registrable label heuristic from a hostname ("www.acme.com" -> "acme"). */
export function hostLabel(hostname) {
  const parts = String(hostname || "").toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return parts[0] || "";
  const secondLevelTlds = new Set(["co", "com", "org", "net", "gov", "edu"]);
  if (parts.length >= 3 && secondLevelTlds.has(parts[parts.length - 2])) return parts[parts.length - 3];
  return parts[parts.length - 2] || parts[0] || "";
}

/** JSON response helper. */
export function jsonResp(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

/** Clamp a value for display/telemetry. */
export function clampInt(value, min, max) {
  const n = Number.isFinite(Number(value)) ? Math.round(Number(value)) : min;
  return Math.min(max, Math.max(min, n));
}
