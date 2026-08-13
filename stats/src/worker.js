import { APP_JS } from "./app.js";
import { CRM_PORTFOLIO, GA_MEASUREMENT_ID } from "./config.js";
import { fetchAnalytics } from "./google-analytics.js";
import { STYLES } from "./styles.js";
import { dashboardHtml } from "./ui.js";

const PASSWORD_SALT = "zJ9CNd8qXn3f4czKN33dUg==";
const PASSWORD_HASH = "8c8/sUQkhy5uaNXA3QXGL5bmbMy4yYUDCzHTOLzy68U=";
const PASSWORD_ITERATIONS = 240000;
const textEncoder = new TextEncoder();

function bytesFromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function derivePassword(password, salt = PASSWORD_SALT, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: bytesFromBase64(salt),
      iterations,
    },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export function constantTimeEqual(left, right) {
  const maximum = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < maximum; index += 1) {
    mismatch |= (left[index] || 0) ^ (right[index] || 0);
  }
  return mismatch === 0;
}

export async function verifyStatsPassword(password) {
  if (typeof password !== "string" || password.length < 1 || password.length > 128) return false;
  const actual = await derivePassword(password);
  return constantTimeEqual(actual, bytesFromBase64(PASSWORD_HASH));
}

function passwordFromRequest(request) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return "";
  try {
    const decoded = atob(header.slice(6));
    return decoded.startsWith("clint:") ? decoded.slice(6) : "";
  } catch {
    return "";
  }
}

function nonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function baseHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  };
}

function htmlResponse() {
  const pageNonce = nonce();
  return new Response(dashboardHtml(pageNonce), {
    headers: {
      ...baseHeaders(),
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": [
        "default-src 'none'",
        `script-src 'self' 'nonce-${pageNonce}' https://www.googletagmanager.com`,
        "style-src 'self'",
        "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com",
        "img-src 'self' data: https://www.google-analytics.com",
        "font-src 'self'",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; "),
    },
  });
}

function assetResponse(body, contentType) {
  return new Response(body, {
    headers: {
      ...baseHeaders(),
      "Cache-Control": "public, max-age=300, must-revalidate",
      "Content-Type": contentType,
    },
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...baseHeaders(),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function unauthorized() {
  return jsonResponse({ error: "Password required" }, 401);
}

async function checkHealth(crm) {
  const startedAt = Date.now();
  try {
    const response = await fetch(crm.url, {
      method: "GET",
      headers: { Accept: "text/html", "User-Agent": "Clintware-Stats-Health/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
    });
    if (response.body) await response.body.cancel();
    return {
      id: crm.id,
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return { id: crm.id, ok: false, status: 0, latencyMs: Date.now() - startedAt };
  }
}

export async function buildDashboardPayload(env) {
  const [health, analytics] = await Promise.all([
    Promise.all(CRM_PORTFOLIO.map(checkHealth)),
    fetchAnalytics(env),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    measurementId: GA_MEASUREMENT_ID,
    coveragePercent: 100,
    audit: {
      status: "verified",
      verifiedAt: "2026-08-13",
      scope: "All primary routes, workspaces, account tabs, and SPA route templates",
    },
    portfolio: CRM_PORTFOLIO,
    health,
    analytics,
  };
}

async function protectedRoute(request, handler) {
  const password = passwordFromRequest(request);
  if (!(await verifyStatsPassword(password))) return unauthorized();
  return handler();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true, service: "clintware-stats-dashboard" });
    }
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return htmlResponse();
    }
    if (request.method === "GET" && url.pathname === "/styles.css") {
      return assetResponse(STYLES, "text/css; charset=utf-8");
    }
    if (request.method === "GET" && url.pathname === "/app.js") {
      return assetResponse(APP_JS, "text/javascript; charset=utf-8");
    }
    if (request.method === "POST" && url.pathname === "/api/session") {
      return protectedRoute(request, () => jsonResponse({ ok: true }));
    }
    if (request.method === "GET" && url.pathname === "/api/dashboard") {
      return protectedRoute(request, async () => jsonResponse(await buildDashboardPayload(env)));
    }
    if (url.pathname.startsWith("/api/")) return jsonResponse({ error: "Not found" }, 404);
    if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);
    return new Response("Not found", { status: 404, headers: baseHeaders() });
  },
};
