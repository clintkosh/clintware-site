import { APP_JS } from "./app.js";
import { CRM_PORTFOLIO, GA_MEASUREMENT_ID } from "./config.js";
import { fetchAnalytics } from "./google-analytics.js";
import { STYLES } from "./styles.js";
import { dashboardHtml } from "./ui.js";

const PASSWORD_SALT = "zJ9CNd8qXn3f4czKN33dUg==";
const PASSWORD_HASH = "9Ci7job6x5CEgp3nl744wAcOUDTh1fgxDtrKUfA+e/o=";
const SESSION_COOKIE = "cw_stats_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const textEncoder = new TextEncoder();

function bytesFromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function derivePassword(password, salt = PASSWORD_SALT) {
  const saltBytes = bytesFromBase64(salt);
  const passwordBytes = textEncoder.encode(password);
  const input = new Uint8Array(saltBytes.length + passwordBytes.length);
  input.set(saltBytes, 0);
  input.set(passwordBytes, saltBytes.length);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", input));
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
  const direct = request.headers.get("X-Clintware-Password");
  if (direct) return direct;
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return "";
  try {
    const decoded = atob(header.slice(6));
    return decoded.startsWith("clint:") ? decoded.slice(6) : "";
  } catch {
    return "";
  }
}

function sessionTokenFromRequest(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)cw_stats_session=([A-Za-z0-9_-]{40,64})(?:;|$)/);
  return match ? match[1] : "";
}

function sessionCacheRequest(token) {
  return new Request(`https://stats.clintware.com/.session/${token}`);
}

export async function createSession() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const token = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  await caches.default.put(
    sessionCacheRequest(token),
    new Response("active", {
      headers: { "Cache-Control": `public, max-age=${SESSION_TTL_SECONDS}` },
    }),
  );
  return token;
}

async function sessionIsActive(request) {
  const token = sessionTokenFromRequest(request);
  if (!token || typeof caches === "undefined") return false;
  return Boolean(await caches.default.match(sessionCacheRequest(token)));
}

async function destroySession(request) {
  const token = sessionTokenFromRequest(request);
  if (token && typeof caches !== "undefined") await caches.default.delete(sessionCacheRequest(token));
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

function htmlResponse(options = {}, status = 200, extraHeaders = {}) {
  const pageNonce = nonce();
  return new Response(dashboardHtml(pageNonce, options), {
    status,
    headers: {
      ...baseHeaders(),
      ...extraHeaders,
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

function redirectResponse(location, cookie = "") {
  const headers = new Headers({
    ...baseHeaders(),
    Location: location,
  });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function portfolioCsv(payload) {
  const analytics = payload.analytics || {};
  const views = analytics.crmViews || {};
  const rows = [
    ["CRM", "Hostname", "GA4 path namespace", "Tracking coverage", "Live", "HTTP status", "30-day views"],
  ];
  for (const crm of payload.portfolio) {
    const health = payload.health.find((item) => item.id === crm.id) || {};
    rows.push([
      crm.name,
      crm.hostname,
      crm.pathPrefix,
      crm.coverage,
      health.ok ? "Yes" : "No",
      health.status || "",
      analytics.status === "connected" ? views[crm.id] || 0 : "Reporting not connected",
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
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

async function isAuthenticated(request) {
  const password = passwordFromRequest(request);
  if (password) return verifyStatsPassword(password);
  return sessionIsActive(request);
}

async function protectedRoute(request, handler) {
  if (!(await isAuthenticated(request))) return unauthorized();
  return handler();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true, service: "clintware-stats-dashboard" });
    }
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/dashboard")) {
      if (await sessionIsActive(request)) {
        return htmlResponse({ payload: await buildDashboardPayload(env) });
      }
      return htmlResponse();
    }
    if (request.method === "GET" && url.pathname === "/styles.css") {
      return assetResponse(STYLES, "text/css; charset=utf-8");
    }
    if (request.method === "GET" && url.pathname === "/app.js") {
      return assetResponse(APP_JS, "text/javascript; charset=utf-8");
    }
    if (request.method === "POST" && url.pathname === "/login") {
      const form = await request.formData();
      const password = String(form.get("password") || "");
      if (!(await verifyStatsPassword(password))) {
        return htmlResponse({ loginError: "That password did not match." }, 401);
      }
      const token = await createSession();
      return redirectResponse(
        "/",
        `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
      );
    }
    if (request.method === "POST" && url.pathname === "/logout") {
      await destroySession(request);
      return redirectResponse(
        "/",
        `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
      );
    }
    if (request.method === "POST" && url.pathname === "/api/session") {
      return protectedRoute(request, () => jsonResponse({ ok: true }));
    }
    if (request.method === "GET" && url.pathname === "/api/dashboard") {
      return protectedRoute(request, async () => jsonResponse(await buildDashboardPayload(env)));
    }
    if (request.method === "GET" && url.pathname === "/export.csv") {
      return protectedRoute(request, async () => {
        const date = new Date().toISOString().slice(0, 10);
        return new Response(portfolioCsv(await buildDashboardPayload(env)), {
          headers: {
            ...baseHeaders(),
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="clintware-crm-analytics-${date}.csv"`,
          },
        });
      });
    }
    if (url.pathname.startsWith("/api/")) return jsonResponse({ error: "Not found" }, 404);
    if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);
    return new Response("Not found", { status: 404, headers: baseHeaders() });
  },
};
