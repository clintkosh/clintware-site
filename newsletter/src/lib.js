const encoder = new TextEncoder();

function errorWithCode(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

export function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  return email.length <= 254 ? email : "";
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function cleanText(value, maximum = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maximum);
}

export function createToken(bytesLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(bytesLength));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function secureEquals(expected, received) {
  if (typeof expected !== "string" || typeof received !== "string") return false;
  const left = encoder.encode(expected);
  const right = encoder.encode(received);
  if (left.byteLength !== right.byteLength) return false;
  if (typeof crypto.subtle.timingSafeEqual === "function") {
    return Boolean(await crypto.subtle.timingSafeEqual(left, right));
  }
  let different = 0;
  for (let index = 0; index < left.length; index += 1) different |= left[index] ^ right[index];
  return different === 0;
}

export function chunks(values, size) {
  const groups = [];
  for (let index = 0; index < values.length; index += size) groups.push(values.slice(index, index + size));
  return groups;
}

export async function readRequestPayload(request, limit = 8192) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > limit) throw errorWithCode("payload_too_large");
  if (!request.body) return {};

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let raw = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw errorWithCode("payload_too_large");
    }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();

  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    try {
      const value = JSON.parse(raw || "{}");
      if (!value || Array.isArray(value) || typeof value !== "object") throw errorWithCode("invalid_payload");
      return value;
    } catch (error) {
      if (error.code) throw error;
      throw errorWithCode("invalid_payload");
    }
  }

  return Object.fromEntries(new URLSearchParams(raw).entries());
}

export function validBlogPostUrl(value, siteUrl) {
  try {
    const candidate = new URL(value);
    const site = new URL(siteUrl);
    return candidate.protocol === "https:"
      && candidate.hostname === site.hostname
      && /^\/blog\/[^/]+\/?$/.test(candidate.pathname);
  } catch {
    return false;
  }
}
