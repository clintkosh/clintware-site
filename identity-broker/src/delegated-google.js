import { createRemoteJWKSet, jwtVerify } from "jose";

const DEFAULT_GOOGLE_CLIENT_ID = "378690450945-nnb0d9st2d9s5lj2alt7q1hdm3pfige7.apps.googleusercontent.com";
const GOOGLE_CALLBACK = "https://auth.clintware.com/callback";
const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = "https://www.googleapis.com/oauth2/v3/certs";
const GRANT_KEY = "delegated:google:primary";
const STATUS_KEY = "delegated:google:last-status";
const BIND_COOKIE = "__Host-clintware-google-delegated";
const STATE_TTL_MS = 10 * 60 * 1000;
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

const te = new TextEncoder();
const td = new TextDecoder();

function googleClientId(env) {
  return String(env.GOOGLE_OAUTH_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim();
}

function googleClientSecret(env) {
  return String(env.GOOGLE_OAUTH_CLIENT_SECRET || "").trim();
}

function json(value, status = 200, extra = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extra,
    },
  });
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64url(value);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", te.encode(String(value || "")));
  return base64url(new Uint8Array(digest));
}

async function secureEq(a, b) {
  if (!a || !b) return false;
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  return x === y;
}

async function cryptoKey(env, purpose) {
  const secret = googleClientSecret(env) || String(env.OAUTH_STATE_SECRET || env.CONTROL_PLANE_MCP_TOKEN || "").trim();
  if (!secret) throw new Error("delegated_crypto_secret_missing");
  const raw = await crypto.subtle.digest(
    "SHA-256",
    te.encode(`clintware-google-delegated:\0${purpose}:\0${secret}`),
  );
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function seal(env, value, purpose) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await cryptoKey(env, purpose);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: te.encode(`clintware-google-delegated:${purpose}:v1`) },
    key,
    te.encode(JSON.stringify(value)),
  );
  return `${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`;
}

async function unseal(env, value, purpose) {
  const [ivPart, cipherPart] = String(value || "").split(".");
  if (!ivPart || !cipherPart) throw new Error("invalid_delegated_envelope");
  const key = await cryptoKey(env, purpose);
  const clear = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64url(ivPart),
      additionalData: te.encode(`clintware-google-delegated:${purpose}:v1`),
    },
    key,
    fromBase64url(cipherPart),
  );
  return JSON.parse(td.decode(clear));
}

function cookieValue(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return "";
}

function setCookie(value) {
  return `${BIND_COOKIE}=${encodeURIComponent(value)}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600`;
}

function clearCookie() {
  return `${BIND_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
}

async function recordDelegatedStatus(env, value = {}) {
  if (!env.OAUTH_KV) return;
  const safe = {
    state: String(value.state || "unknown").slice(0, 40),
    stage: String(value.stage || "").slice(0, 80),
    error: String(value.error || "").slice(0, 120),
    upstreamStatus: Number(value.upstreamStatus || 0),
    refreshTokenReceived: Boolean(value.refreshTokenReceived),
    idTokenReceived: Boolean(value.idTokenReceived),
    updatedAt: new Date().toISOString(),
  };
  await env.OAUTH_KV.put(STATUS_KEY, JSON.stringify(safe), { expirationTtl: 7 * 24 * 60 * 60 });
}

async function readDelegatedStatus(env) {
  if (!env.OAUTH_KV) return null;
  const raw = await env.OAUTH_KV.get(STATUS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const DEFAULT_DELEGATED_GOOGLE_EMAILS = Object.freeze(["clint.kosh@gmail.com", "fedfromchat@gmail.com", "clint@clintware.com", "clint.kosh@clintware.com", "clinton@clintware.com", "hello@clintware.com", "support@clintware.com", "sales@clintware.com", "billing@clintware.com", "abuse@clintware.com", "bb@clintware.com", "studio@clintware.com"]);

function allowedEmails(env) {
  const configured = String(env.GOOGLE_DELEGATED_ALLOWED_EMAILS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_DELEGATED_GOOGLE_EMAILS, ...configured])];
}

function safeReturnTo(value) {
  const fallback = "https://meet.clintware.com/?calendar=connected";
  if (!value) return fallback;
  try {
    const u = new URL(String(value));
    if (u.protocol !== "https:") return fallback;
    if (!["cc.clintware.com", "meet.clintware.com"].includes(u.hostname)) return fallback;
    if (u.username || u.password) return fallback;
    return u.toString();
  } catch {
    return fallback;
  }
}

async function codeChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", te.encode(verifier));
  return base64url(new Uint8Array(digest));
}

function delegatedGoogleDisclosure(returnTo) {
  const next = `/delegated/google/start?confirm=1&return_to=${encodeURIComponent(returnTo)}`;
  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Connect Google | Clintware</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#07090d;color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;line-height:1.55}.wrap{max-width:760px;margin:0 auto;padding:56px 22px}.brand{font:700 14px/1.2 ui-monospace,Consolas,monospace;letter-spacing:.18em;color:#7cecff}.card{margin-top:18px;padding:28px;border:1px solid #293441;border-radius:18px;background:#0e1319;box-shadow:0 24px 70px #0008}h1{font-size:30px;margin:0 0 12px}h2{font-size:16px;margin:24px 0 8px;color:#dce6f2}p,li{color:#bec9d6}ul{padding-left:22px}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}.primary,.secondary{display:inline-block;padding:12px 17px;border-radius:9px;text-decoration:none;font-weight:700}.primary{background:#f4f7fb;color:#111820}.secondary{border:1px solid #3b4857;color:#dce6f2}.fine{font-size:13px;color:#8f9cac;margin-top:22px}</style>
</head><body><main class="wrap"><div class="brand">CLINTWARE™ · GOOGLE CONNECTION</div><section class="card">
<h1>Connect Google to Clintware</h1>
<p>Clintware will ask Google for only the permissions used by the connected scheduling and email features shown below.</p>
<h2>What Clintware will access</h2>
<ul>
<li>Your verified Google account identity so the authorized connection is bound to the intended account.</li>
<li>Permission to send Gmail messages that a Clintware feature asks to send. The core delegated connection does not read your Gmail inbox.</li>
<li>Google Calendar free/busy availability and event access needed to create, view, update, reschedule, and cancel scheduling events.</li>
</ul>
<h2>How the connection is handled</h2>
<p>Clintware stores an encrypted delegated Google refresh credential so approved features can continue to work. Google access tokens are short-lived. Google user data is not sold, used for targeted advertising, or used to train generalized or non-personalized AI or machine-learning models.</p>
<p>You can revoke Clintware from your Google Account at any time or request deletion of stored connection data using the contact in the Privacy Policy.</p>
<div class="actions"><a class="primary" href="${next}">Continue to Google</a><a class="secondary" href="https://www.clintware.com/privacy/">Privacy Policy</a><a class="secondary" href="https://www.clintware.com/terms/">Terms</a></div>
<p class="fine">Continuing opens Google's own authorization screen. Google shows the requested permissions before you decide whether to grant access.</p>
</section></main></body></html>`, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

export async function beginDelegatedGoogle(request, env) {
  if (!env.OAUTH_KV || !env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return json({ error: "google_delegated_not_configured" }, 503);
  }

  await recordDelegatedStatus(env, { state: "started", stage: "authorization_redirect" });

  const requestUrl = new URL(request.url);
  const returnTo = safeReturnTo(requestUrl.searchParams.get("return_to"));
  if (requestUrl.searchParams.get("confirm") !== "1") {
    await recordDelegatedStatus(env, { state: "started", stage: "disclosure" });
    return delegatedGoogleDisclosure(returnTo);
  }
  const binding = randomToken(32);
  const verifier = randomToken(48);
  const nonce = randomToken(24);
  const state = await seal(env, {
    kind: "google_delegated",
    createdAt: Date.now(),
    bindingHash: await sha256(binding),
    verifier,
    nonce,
    returnTo,
  }, "state");

  const auth = new URL(GOOGLE_AUTH);
  auth.searchParams.set("client_id", googleClientId(env));
  auth.searchParams.set("redirect_uri", GOOGLE_CALLBACK);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", SCOPES.join(" "));
  auth.searchParams.set("access_type", "offline");
  auth.searchParams.set("prompt", "consent");
  auth.searchParams.set("include_granted_scopes", "true");
  auth.searchParams.set("state", state);
  auth.searchParams.set("nonce", nonce);
  auth.searchParams.set("code_challenge", await codeChallenge(verifier));
  auth.searchParams.set("code_challenge_method", "S256");

  return new Response(null, {
    status: 302,
    headers: {
      location: auth.toString(),
      "set-cookie": setCookie(binding),
      "cache-control": "no-store",
    },
  });
}

export async function finishDelegatedGoogle(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const stateRaw = url.searchParams.get("state") || "";
  const upstreamError = url.searchParams.get("error") || "";
  if (upstreamError) {
    await recordDelegatedStatus(env, { state: "error", stage: "google_authorization", error: upstreamError });
    return json({ error: "google_delegated_authorization_failed", google_error: upstreamError }, 400, {
      "set-cookie": clearCookie(),
    });
  }
  if (!code || !stateRaw) {
    await recordDelegatedStatus(env, { state: "error", stage: "callback", error: "missing_google_delegated_response" });
    return json({ error: "missing_google_delegated_response" }, 400, { "set-cookie": clearCookie() });
  }

  let state;
  try {
    state = await unseal(env, stateRaw, "state");
  } catch {
    await recordDelegatedStatus(env, { state: "error", stage: "state_unseal", error: "invalid_google_delegated_state" });
    return json({ error: "invalid_google_delegated_state" }, 400, { "set-cookie": clearCookie() });
  }
  const age = Date.now() - Number(state.createdAt || 0);
  const binding = cookieValue(request, BIND_COOKIE);
  if (
    state.kind !== "google_delegated" ||
    !Number.isFinite(age) ||
    age < 0 ||
    age > STATE_TTL_MS ||
    !binding ||
    !(await secureEq(await sha256(binding), state.bindingHash))
  ) {
    await recordDelegatedStatus(env, { state: "error", stage: "state_validation", error: "google_delegated_state_expired" });
    return json({ error: "google_delegated_state_expired" }, 400, { "set-cookie": clearCookie() });
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId(env),
      client_secret: googleClientSecret(env),
      redirect_uri: GOOGLE_CALLBACK,
      grant_type: "authorization_code",
      code_verifier: state.verifier,
    }),
  });
  const tokens = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokens.refresh_token || !tokens.id_token) {
    await recordDelegatedStatus(env, {
      state: "error",
      stage: "token_exchange",
      error: tokens.error || "google_delegated_token_exchange_failed",
      upstreamStatus: tokenResponse.status,
      refreshTokenReceived: Boolean(tokens.refresh_token),
      idTokenReceived: Boolean(tokens.id_token),
    });
    return json({
      error: "google_delegated_token_exchange_failed",
      status: tokenResponse.status,
      refresh_token_received: Boolean(tokens.refresh_token),
      id_token_received: Boolean(tokens.id_token),
      google_error: String(tokens.error || ""),
    }, 502, { "set-cookie": clearCookie() });
  }

  const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS));
  const verified = await jwtVerify(tokens.id_token, jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: googleClientId(env),
    clockTolerance: 10,
  });
  const claims = verified.payload;
  if (claims.nonce !== state.nonce) {
    await recordDelegatedStatus(env, { state: "error", stage: "id_token_validation", error: "google_delegated_nonce_mismatch" });
    return json({ error: "google_delegated_nonce_mismatch" }, 400, { "set-cookie": clearCookie() });
  }
  const email = String(claims.email || "").toLowerCase();
  if (!email || !allowedEmails(env).includes(email) || !(claims.email_verified === true || claims.email_verified === "true")) {
    await recordDelegatedStatus(env, { state: "error", stage: "account_validation", error: "google_delegated_account_not_allowed" });
    return json({ error: "google_delegated_account_not_allowed" }, 403, { "set-cookie": clearCookie() });
  }

  const grant = await seal(env, {
    refreshToken: tokens.refresh_token,
    email,
    subject: String(claims.sub || ""),
    scope: String(tokens.scope || SCOPES.join(" ")),
    createdAt: Date.now(),
  }, "grant");
  await env.OAUTH_KV.put(GRANT_KEY, grant);
  await recordDelegatedStatus(env, { state: "connected", stage: "complete" });

  return new Response(null, {
    status: 302,
    headers: {
      location: safeReturnTo(state.returnTo),
      "set-cookie": clearCookie(),
      "cache-control": "no-store",
    },
  });
}

async function loadGrant(env) {
  if (!env.OAUTH_KV) return null;
  const sealed = await env.OAUTH_KV.get(GRANT_KEY);
  if (!sealed) return null;
  try {
    return await unseal(env, sealed, "grant");
  } catch {
    return null;
  }
}

export async function delegatedGoogleStatus(env) {
  const [grant, last] = await Promise.all([loadGrant(env), readDelegatedStatus(env)]);
  return json({
    connected: Boolean(grant),
    scopes: grant ? String(grant.scope || "").split(/\s+/).filter((x) => x && !["openid", "email", "profile"].includes(x)) : [],
    last_status: last,
  });
}

export async function internalGoogleAccessToken(request, env) {
  const expected = String(env.GOOGLE_DELEGATED_BRIDGE_SECRET || "");
  const supplied = request.headers.get("x-clintware-google-secret") || "";
  if (!expected || !(await secureEq(expected, supplied))) return json({ error: "unauthorized" }, 401);
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) return json({ error: "google_client_credentials_missing" }, 503);

  const grant = await loadGrant(env);
  if (!grant?.refreshToken) return json({ error: "google_delegated_grant_missing" }, 404);

  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId(env),
      client_secret: googleClientSecret(env),
      refresh_token: grant.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    return json({ error: "google_delegated_refresh_failed", status: response.status }, 502);
  }
  return json({
    access_token: data.access_token,
    token_type: data.token_type || "Bearer",
    expires_in: Number(data.expires_in || 3600),
    scope: data.scope || grant.scope || "",
    email: String(grant.email || "").toLowerCase(),
  });
}
