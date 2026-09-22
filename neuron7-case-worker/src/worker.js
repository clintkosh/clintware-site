const CANONICAL_HOST = "n7.clintware.com";
const LEGACY_HOST = "n7case.clintware.com";
const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;
const AUTH_ORIGIN = "https://auth.clintware.com";
const AUTH_CONFIG_URL = `${AUTH_ORIGIN}/client-config/neuron7-case`;
const APPLICATION_ID = "neuron7-case";
const COMPANY_EMAIL_DOMAIN = "neuron7.ai";
const OWNER_EMAILS = new Set(["clint.kosh@gmail.com"]);
const REQUIRED_CONTEXT = "neuron7-case:read";
const TX_COOKIE = "__Host-n7-auth-tx";
const SESSION_COOKIE = "__Host-n7-session";
const te = new TextEncoder();

function securityHeaders(headers) {
  headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("cache-control", "no-store");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set(
    "content-security-policy",
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
  );
  return headers;
}

function cookieValue(request, name) {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return "";
}

function setCookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookie(name) {
  return `${name}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", te.encode(verifier));
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function html(body, status = 200, extra = {}) {
  const headers = securityHeaders(new Headers({
    "content-type": "text/html; charset=utf-8",
    ...extra,
  }));
  return new Response(body, { status, headers });
}

async function authConfig() {
  const response = await fetch(AUTH_CONFIG_URL, { headers: { accept: "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "clintware_identity_unavailable");
    error.status = response.status;
    throw error;
  }
  return data;
}

function applicationUserAllowed(user) {
  if (!user?.sub || user.email_verified !== true) return false;
  if (user.application !== APPLICATION_ID) return false;
  const context = Array.isArray(user.application_context) ? user.application_context : [];
  if (!context.includes(REQUIRED_CONTEXT)) return false;
  const email = String(user.email || "").trim().toLowerCase();
  const domain = email.includes("@") ? email.split("@").pop() : "";
  return domain === COMPANY_EMAIL_DOMAIN || OWNER_EMAILS.has(email);
}

async function currentUser(request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const response = await fetch(`${AUTH_ORIGIN}/userinfo`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return applicationUserAllowed(user) ? user : null;
}

async function startLogin() {
  const cfg = await authConfig();
  const state = randomToken(24);
  const verifier = randomToken(48);
  const challenge = await pkceChallenge(verifier);
  const authorize = new URL(cfg.authorization_endpoint);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", cfg.client_id);
  authorize.searchParams.set("redirect_uri", cfg.redirect_uri);
  authorize.searchParams.set("scope", (cfg.scopes || ["identity", "email", "profile"]).join(" "));
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  authorize.searchParams.set("resource", cfg.resource);

  const headers = securityHeaders(new Headers({
    location: authorize.toString(),
    "set-cookie": setCookie(TX_COOKIE, `${state}.${verifier}`, 600),
  }));
  return new Response(null, { status: 302, headers });
}

async function finishLogin(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const tx = cookieValue(request, TX_COOKIE);
  const dot = tx.indexOf(".");
  const expectedState = dot > 0 ? tx.slice(0, dot) : "";
  const verifier = dot > 0 ? tx.slice(dot + 1) : "";

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return html("<h1>Login could not be completed</h1><p>The authorization transaction was missing, expired, or did not match this browser.</p>", 400, {
      "set-cookie": clearCookie(TX_COOKIE),
    });
  }

  const cfg = await authConfig();
  const tokenResponse = await fetch(cfg.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cfg.client_id,
      code,
      redirect_uri: cfg.redirect_uri,
      code_verifier: verifier,
    }),
  });
  const tokens = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokens.access_token) {
    return html("<h1>Login could not be completed</h1><p>Clintware Identity did not issue a usable access token.</p>", 502, {
      "set-cookie": clearCookie(TX_COOKIE),
    });
  }

  const userResponse = await fetch(cfg.userinfo_endpoint, {
    headers: { authorization: `Bearer ${tokens.access_token}`, accept: "application/json" },
  });
  const user = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok || !user.sub) {
    return html("<h1>Login could not be verified</h1><p>The identity token was issued but the Clintware user profile could not be validated.</p>", 502, {
      "set-cookie": clearCookie(TX_COOKIE),
    });
  }
  if (!applicationUserAllowed(user)) {
    return html("<h1>Access is not authorized for this application</h1><p>This operator surface accepts verified Neuron7 company identities scoped specifically to the Neuron7 case application, plus the Clintware owner identity. It does not grant access to other Clintware products or infrastructure.</p>", 403, {
      "set-cookie": clearCookie(TX_COOKIE),
    });
  }

  const headers = securityHeaders(new Headers({ location: "/operator" }));
  headers.append("set-cookie", setCookie(SESSION_COOKIE, tokens.access_token, 15 * 60));
  headers.append("set-cookie", clearCookie(TX_COOKIE));
  return new Response(null, { status: 302, headers });
}

function operatorPage(user, setupError = "") {
  if (!user) {
    const detail = setupError
      ? `<p class="warn">Identity setup status: ${escapeHtml(setupError)}</p>`
      : "";
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>N7 Operator | Clintware</title>
<style>body{margin:0;background:#070b12;color:#f5f7fb;font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:720px;margin:8vh auto;padding:24px}.card{background:#0e1623;border:1px solid #26364c;border-radius:12px;padding:24px}a{display:inline-block;margin-top:12px;background:#f5f7fb;color:#07101a;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:700}.muted{color:#9fb0c6}.warn{color:#fbbf24}</style></head><body><main><div class="card"><div class="muted">CLINTWARE IDENTITY</div><h1>N7 operator mode</h1><p>The public Neuron7 case remains read-only. Operator mode accepts verified <strong>@neuron7.ai</strong> identities only for this application context, plus the Clintware owner identity. Authentication does not grant access to other Clintware products, MCP, or infrastructure.</p>${detail}<a href="/auth/login">Continue with Google through Clintware</a></div></main></body></html>`;
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>N7 Operator | Clintware</title>
<style>body{margin:0;background:#070b12;color:#f5f7fb;font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:720px;margin:8vh auto;padding:24px}.card{background:#0e1623;border:1px solid #26364c;border-radius:12px;padding:24px}.muted{color:#9fb0c6}code{color:#4fd1e5}button{background:#f5f7fb;color:#07101a;border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}</style></head><body><main><div class="card"><div class="muted">AUTHENTICATED THROUGH CLINTWARE</div><h1>N7 operator mode</h1><p><strong>${escapeHtml(user.name || user.email || "Clintware user")}</strong></p><p class="muted">${escapeHtml(user.email || "")}</p><p>Stable identity: <code>${escapeHtml(user.sub)}</code></p><p>Authority: <code>${AUTH_ORIGIN}</code></p><p>This short operator session is bound to <code>neuron7-case</code> context only. It does not grant access to other Clintware products, MCP, repository, deployment, DNS, or infrastructure privileges.</p><form method="post" action="/auth/logout"><button type="submit">Sign out</button></form></div></main></body></html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === LEGACY_HOST) {
      url.hostname = CANONICAL_HOST;
      url.protocol = "https:";
      url.port = "";
      return new Response(null, {
        status: 308,
        headers: securityHeaders(new Headers({ location: url.toString() }))
      });
    }

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "clintware-neuron7-case",
        mode: "candidate-operating-proof",
        canonicalUrl: CANONICAL_ORIGIN,
        legacyUrl: `https://${LEGACY_HOST}`,
        publicViewer: true,
        identityBroker: AUTH_ORIGIN,
        identityConfig: AUTH_CONFIG_URL,
        operatorMode: "/operator",
        oauthOperatorMode: "central-clintware-first-party-client",
        applicationId: APPLICATION_ID,
        allowedCompanyDomain: COMPANY_EMAIL_DOMAIN,
        requiredApplicationContext: REQUIRED_CONTEXT,
        crossProductIdentityAccess: false,
        noCustomerData: true
      }, {
        headers: securityHeaders(new Headers())
      });
    }

    if (request.method === "GET" && url.pathname === "/auth/login") {
      try {
        return await startLogin();
      } catch (error) {
        return html(operatorPage(null, error?.message || "identity unavailable"), error?.status || 503);
      }
    }

    if (request.method === "GET" && url.pathname === "/auth/callback") {
      try {
        return await finishLogin(request);
      } catch (error) {
        return html("<h1>Login unavailable</h1><p>Clintware Identity is not ready yet.</p>", error?.status || 503, {
          "set-cookie": clearCookie(TX_COOKIE),
        });
      }
    }

    if (request.method === "POST" && url.pathname === "/auth/logout") {
      return new Response(null, {
        status: 303,
        headers: securityHeaders(new Headers({
          location: "/operator",
          "set-cookie": clearCookie(SESSION_COOKIE),
        })),
      });
    }

    if (request.method === "GET" && url.pathname === "/operator") {
      const user = await currentUser(request).catch(() => null);
      return html(operatorPage(user), 200, user ? {} : { "set-cookie": clearCookie(SESSION_COOKIE) });
    }

    const response = await env.ASSETS.fetch(request);
    const headers = securityHeaders(new Headers(response.headers));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
