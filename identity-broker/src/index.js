import { OAuthProvider, AuthorizationError, getOAuthApi } from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import * as oauth from "oauth4webapi";
import { z } from "zod";
import { FIRST_PARTY_CLIENT, FIRST_PARTY_APPS, FIRST_PARTY_CLIENT_ID, firstPartyApp, firstPartyClientMetadata } from "./first-party.js";

const VERSION = "2026-09-21";
const AUTH_ORIGIN = "https://auth.clintware.com";
const USERINFO_RESOURCE = `${AUTH_ORIGIN}/userinfo`;
const SUPPORTED_SCOPES = ["identity", "email", "profile"];
const GOOGLE_ISSUER = new URL("https://accounts.google.com");
const GOOGLE_CALLBACK = `${AUTH_ORIGIN}/callback`;
const TX_TTL_SECONDS = 600;
const BIND_COOKIE = "__Host-clintware-oauth-bind";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  pragma: "no-cache",
};

const json = (value, status = 200, extra = {}) =>
  new Response(JSON.stringify(value), { status, headers: { ...JSON_HEADERS, ...extra } });

const te = new TextEncoder();
const td = new TextDecoder();

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
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

async function stateCryptoKey(env) {
  const secret = String(env.GOOGLE_OAUTH_CLIENT_SECRET || "");
  if (!secret) throw new Error("google_oauth_not_configured");
  const raw = await crypto.subtle.digest(
    "SHA-256",
    te.encode(`clintware-oauth-transaction-v1\0${secret}`),
  );
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function seal(env, value) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await stateCryptoKey(env);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: te.encode("clintware-oauth-txn-v1") },
    key,
    te.encode(JSON.stringify(value)),
  );
  return `${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`;
}

async function unseal(env, value) {
  const [ivPart, cipherPart] = String(value || "").split(".");
  if (!ivPart || !cipherPart) throw new Error("invalid_transaction_envelope");
  const key = await stateCryptoKey(env);
  const clear = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64url(ivPart),
      additionalData: te.encode("clintware-oauth-txn-v1"),
    },
    key,
    fromBase64url(cipherPart),
  );
  return JSON.parse(td.decode(clear));
}

function cookieValue(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return "";
}

function setBindingCookie(value) {
  return `${BIND_COOKIE}=${encodeURIComponent(value)}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${TX_TTL_SECONDS}`;
}

function clearBindingCookie() {
  return `${BIND_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function html(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      pragma: "no-cache",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      "x-frame-options": "DENY",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...extra,
    },
  });
}

function oauthConfigured(env) {
  return Boolean(env.OAUTH_KV && env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);
}

async function kvKey(prefix, token) {
  return `clintware:${prefix}:${await sha256(token)}`;
}

async function putTransaction(env, prefix, token, value) {
  await env.OAUTH_KV.put(await kvKey(prefix, token), await seal(env, value), {
    expirationTtl: TX_TTL_SECONDS,
  });
}

async function takeTransaction(env, prefix, token) {
  const key = await kvKey(prefix, token);
  const value = await env.OAUTH_KV.get(key);
  if (!value) return null;
  await env.OAUTH_KV.delete(key);
  return unseal(env, value);
}

async function googleAuthorizationServer() {
  const response = await oauth.discoveryRequest(GOOGLE_ISSUER, { algorithm: "oidc" });
  return oauth.processDiscoveryResponse(GOOGLE_ISSUER, response);
}

function googleClient(env) {
  return { client_id: String(env.GOOGLE_OAUTH_CLIENT_ID) };
}

function redirectAuthorizationError(error) {
  if (!(error instanceof AuthorizationError)) throw error;
  if (!error.redirectUri) return html("<h1>Invalid OAuth request</h1><p>The client or redirect URI was not accepted.</p>", 400);
  const redirect = new URL(error.redirectUri);
  redirect.searchParams.set("error", error.code);
  redirect.searchParams.set("error_description", error.description);
  if (error.state) redirect.searchParams.set("state", error.state);
  if (error.issuer) redirect.searchParams.set("iss", error.issuer);
  return Response.redirect(redirect, 302);
}

function denyAuthorization(oauthRequest) {
  const redirect = new URL(oauthRequest.redirectUri);
  redirect.searchParams.set("error", "access_denied");
  redirect.searchParams.set("error_description", "The user denied the authorization request.");
  if (oauthRequest.state) redirect.searchParams.set("state", oauthRequest.state);
  if (oauthRequest.issuer) redirect.searchParams.set("iss", oauthRequest.issuer);
  return Response.redirect(redirect, 302);
}

function consentPage(client, oauthRequest, consentId, csrfToken) {
  const labels = {
    identity: "Know your stable Clintware account ID",
    email: "Read your verified Google email address",
    profile: "Read your Google display name and profile image",
  };
  const scopes = oauthRequest.scope.filter((scope) => SUPPORTED_SCOPES.includes(scope));
  const scopeList = scopes.map((scope) => `<li><strong>${htmlEscape(scope)}</strong> — ${htmlEscape(labels[scope] || scope)}</li>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Authorize ${htmlEscape(client.clientName || "Clintware service")}</title>
<style>body{margin:0;background:#0b0d10;color:#f4f7fb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:620px;margin:8vh auto;padding:28px}section{background:#14181d;border:1px solid #2b333d;border-radius:16px;padding:28px}h1{font-size:1.55rem;margin-top:0}p,li{color:#c8d0da;line-height:1.55}ul{padding-left:1.25rem}.actions{display:flex;gap:12px;margin-top:24px}button{border:0;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer}.approve{background:#f4f7fb;color:#0b0d10}.deny{background:#262d36;color:#f4f7fb}.fine{font-size:.85rem;color:#8f9aa7;margin-top:18px}</style></head>
<body><main><section><p>CLINTWARE IDENTITY</p><h1>${htmlEscape(client.clientName || "A Clintware service")} wants to sign you in</h1><p>You will continue to Google to prove which account you control. Clintware does not store your Google password and does not keep a Google refresh token for sign-in.</p><ul>${scopeList}</ul>
<form method="post" action="/authorize"><input type="hidden" name="consent" value="${htmlEscape(consentId)}"><input type="hidden" name="csrf" value="${htmlEscape(csrfToken)}"><div class="actions"><button class="approve" name="decision" value="approve" type="submit">Continue with Google</button><button class="deny" name="decision" value="deny" type="submit">Cancel</button></div></form>
<p class="fine">Access is limited to the scopes shown above. Service authorization can be revoked without exposing your Google credentials.</p></section></main></body></html>`;
}

async function beginConsent(request, env) {
  if (!oauthConfigured(env)) return json({ error: "identity_provider_not_configured" }, 503);
  let oauthRequest;
  try {
    oauthRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request);
  } catch (error) {
    return redirectAuthorizationError(error);
  }
  const client = await env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId);
  if (!client) return html("<h1>Unknown OAuth client</h1>", 400);
  if (!oauthRequest.scope.includes("identity")) {
    const redirect = new URL(oauthRequest.redirectUri);
    redirect.searchParams.set("error", "invalid_scope");
    redirect.searchParams.set("error_description", "The identity scope is required for Clintware sign-in.");
    if (oauthRequest.state) redirect.searchParams.set("state", oauthRequest.state);
    if (oauthRequest.issuer) redirect.searchParams.set("iss", oauthRequest.issuer);
    return Response.redirect(redirect, 302);
  }

  const consentId = randomToken(24);
  const csrf = randomToken(24);
  const binding = randomToken(32);
  await putTransaction(env, "consent", consentId, {
    oauthRequest,
    csrfHash: await sha256(csrf),
    bindingHash: await sha256(binding),
    createdAt: Date.now(),
  });
  return html(consentPage(client, oauthRequest, consentId, csrf), 200, { "set-cookie": setBindingCookie(binding) });
}

async function startGoogle(oauthRequest, binding, env) {
  const as = await googleAuthorizationServer();
  if (!as.authorization_endpoint) throw new Error("google_authorization_endpoint_missing");
  const state = randomToken(32);
  const nonce = oauth.generateRandomNonce();
  const codeVerifier = oauth.generateRandomCodeVerifier();
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
  await putTransaction(env, "google", state, {
    oauthRequest,
    bindingHash: await sha256(binding),
    codeVerifier,
    nonce,
    createdAt: Date.now(),
  });

  const url = new URL(as.authorization_endpoint);
  url.searchParams.set("client_id", String(env.GOOGLE_OAUTH_CLIENT_ID));
  url.searchParams.set("redirect_uri", GOOGLE_CALLBACK);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("include_granted_scopes", "true");
  return new Response(null, {
    status: 302,
    headers: {
      location: url.href,
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}

async function finishConsent(request, env) {
  if (!oauthConfigured(env)) return json({ error: "identity_provider_not_configured" }, 503);
  const len = Number(request.headers.get("content-length") || 0);
  if (len > 16_384) return json({ error: "request_too_large" }, 413);
  const form = await request.formData();
  const consentId = String(form.get("consent") || "");
  const csrf = String(form.get("csrf") || "");
  const decision = String(form.get("decision") || "");
  if (!consentId || !csrf) return json({ error: "invalid_consent_submission" }, 400);
  const transaction = await takeTransaction(env, "consent", consentId);
  if (!transaction) return json({ error: "authorization_transaction_expired" }, 400);
  const binding = cookieValue(request, BIND_COOKIE);
  if (!binding || (await sha256(binding)) !== transaction.bindingHash || (await sha256(csrf)) !== transaction.csrfHash) {
    return json({ error: "authorization_transaction_mismatch" }, 400, { "set-cookie": clearBindingCookie() });
  }
  if (decision !== "approve") return denyAuthorization(transaction.oauthRequest);
  return startGoogle(transaction.oauthRequest, binding, env);
}

async function finishGoogle(request, env) {
  if (!oauthConfigured(env)) return json({ error: "identity_provider_not_configured" }, 503);
  const currentUrl = new URL(request.url);
  const state = currentUrl.searchParams.get("state") || "";
  if (!state) return json({ error: "missing_state" }, 400);
  const transaction = await takeTransaction(env, "google", state);
  if (!transaction) return json({ error: "authorization_transaction_expired" }, 400, { "set-cookie": clearBindingCookie() });
  const binding = cookieValue(request, BIND_COOKIE);
  if (!binding || (await sha256(binding)) !== transaction.bindingHash) {
    return json({ error: "authorization_transaction_mismatch" }, 400, { "set-cookie": clearBindingCookie() });
  }

  const as = await googleAuthorizationServer();
  const client = googleClient(env);
  const clientAuth = oauth.ClientSecretPost(String(env.GOOGLE_OAUTH_CLIENT_SECRET));
  const params = oauth.validateAuthResponse(as, client, currentUrl, state);
  const tokenResponse = await oauth.authorizationCodeGrantRequest(
    as,
    client,
    clientAuth,
    params,
    GOOGLE_CALLBACK,
    transaction.codeVerifier,
  );
  const tokenResult = await oauth.processAuthorizationCodeResponse(as, client, tokenResponse, {
    expectedNonce: transaction.nonce,
    requireIdToken: true,
  });
  const claims = oauth.getValidatedIdTokenClaims(tokenResult);
  if (!claims?.sub) throw new Error("google_subject_missing");

  let profile = claims;
  if (tokenResult.access_token && as.userinfo_endpoint) {
    try {
      const userInfoResponse = await oauth.userInfoRequest(as, client, tokenResult.access_token);
      profile = await oauth.processUserInfoResponse(as, client, String(claims.sub), userInfoResponse);
    } catch {
      profile = claims;
    }
  }

  const email = typeof profile.email === "string" ? profile.email : typeof claims.email === "string" ? claims.email : "";
  const emailVerified = profile.email_verified === true || claims.email_verified === true;
  if (!email || !emailVerified) return json({ error: "verified_google_email_required" }, 403, { "set-cookie": clearBindingCookie() });

  const userId = `cw_${(await sha256(`google:${claims.sub}`)).slice(0, 40)}`;
  const grantedScopes = transaction.oauthRequest.scope.filter((scope) => SUPPORTED_SCOPES.includes(scope));
  const authResult = await env.OAUTH_PROVIDER.completeAuthorization({
    request: transaction.oauthRequest,
    userId,
    metadata: { provider: "google" },
    scope: grantedScopes,
    props: {
      userId,
      provider: "google",
      providerSubject: String(claims.sub),
      email,
      emailVerified: true,
      name: typeof profile.name === "string" ? profile.name : typeof claims.name === "string" ? claims.name : "",
      picture: typeof profile.picture === "string" ? profile.picture : typeof claims.picture === "string" ? claims.picture : "",
      scopes: grantedScopes,
    },
  });

  const headers = new Headers({ location: authResult.redirectTo, "cache-control": "no-store" });
  headers.set("set-cookie", clearBindingCookie());
  return new Response(null, { status: 302, headers });
}

const userInfoHandler = {
  async fetch(_request, _env, ctx) {
    const props = ctx.props || {};
    const scopes = Array.isArray(props.scopes) ? props.scopes : [];
    if (!props.userId || !scopes.includes("identity")) return json({ error: "insufficient_scope" }, 403);
    const result = { sub: props.userId, provider: props.provider || "google" };
    if (scopes.includes("email")) {
      result.email = props.email || "";
      result.email_verified = props.emailVerified === true;
    }
    if (scopes.includes("profile")) {
      result.name = props.name || "";
      result.picture = props.picture || "";
    }
    return json(result);
  },
};

function bearer(request) {
  const value = request.headers.get("authorization") || "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

async function secureEq(a, b) {
  if (!a || !b) return false;
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  return x === y;
}

function validRedirectUri(value) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function oauthApi(env) {
  if (!env.OAUTH_KV) throw new Error("oauth_kv_not_configured");
  return getOAuthApi(OAUTH_OPTIONS, env);
}

function publicClient(client) {
  return {
    client_id: client.clientId,
    client_name: client.clientName || "",
    client_uri: client.clientUri || "",
    redirect_uris: client.redirectUris || [],
    token_endpoint_auth_method: client.tokenEndpointAuthMethod || "client_secret_basic",
  };
}


async function firstPartyClientConfig(_env, key) {
  const app = firstPartyApp(key);
  if (!app) return null;
  return {
    client_id: FIRST_PARTY_CLIENT_ID,
    client_name: FIRST_PARTY_CLIENT.clientName,
    app: app.product,
    app_name: app.name,
    app_home: app.home,
    redirect_uri: app.redirectUri,
    authorization_endpoint: `${AUTH_ORIGIN}/authorize`,
    token_endpoint: `${AUTH_ORIGIN}/oauth/token`,
    userinfo_endpoint: USERINFO_RESOURCE,
    resource: USERINFO_RESOURCE,
    scopes: [...app.scopes],
    pkce: "S256",
    client_model: "central-first-party-cimd",
    client_metadata_document: FIRST_PARTY_CLIENT_ID,
  };
}

function createAdminMcpServer(env) {
  const server = new McpServer({ name: "Clintware Identity Broker Admin", version: VERSION });

  server.registerTool("clintware_oauth_status", {
    title: "Get Clintware OAuth identity status",
    description: "Return safe OAuth/Google identity broker configuration and canonical endpoints. Never returns secrets.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async () => ({
    content: [{ type: "text", text: JSON.stringify({
      ok: true,
      service: "Clintware Identity Broker",
      version: VERSION,
      configured: oauthConfigured(env),
      issuer: AUTH_ORIGIN,
      resource: USERINFO_RESOURCE,
      endpoints: {
        authorization: `${AUTH_ORIGIN}/authorize`,
        token: `${AUTH_ORIGIN}/oauth/token`,
        revocation: `${AUTH_ORIGIN}/oauth/token`,
        userinfo: USERINFO_RESOURCE,
        metadata: `${AUTH_ORIGIN}/.well-known/oauth-authorization-server`,
        protected_resource_metadata: `${AUTH_ORIGIN}/.well-known/oauth-protected-resource/userinfo`,
      },
      scopes: SUPPORTED_SCOPES,
      google_upstream: Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET),
      storage: Boolean(env.OAUTH_KV),
      policy: "Google proves identity; Clintware issues scoped rotating tokens; privileged Control Plane MCP remains separate.",
    }) }],
  }));

  server.registerTool("clintware_oauth_create_client", {
    title: "Register a Clintware service OAuth client",
    description: "Create a first-party OAuth client for a Clintware service. Server/BFF clients receive a secret once; browser clients are public and must use S256 PKCE.",
    inputSchema: {
      client_name: z.string().min(2).max(120),
      redirect_uris: z.array(z.string().url()).min(1).max(12),
      client_type: z.enum(["server", "browser"]).default("server"),
      client_uri: z.string().url().optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async ({ client_name, redirect_uris, client_type, client_uri }) => {
    if (!env.OAUTH_KV) return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: "oauth_kv_not_configured" }) }] };
    const unique = [...new Set(redirect_uris.map((u) => u.trim()))];
    if (unique.some((u) => !validRedirectUri(u))) {
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: "invalid_redirect_uri", rule: "HTTPS required except loopback localhost development URIs; fragments and embedded credentials are rejected." }) }] };
    }
    if (client_uri && !validRedirectUri(client_uri)) {
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: "invalid_client_uri" }) }] };
    }
    const created = await oauthApi(env).createClient({
      clientName: client_name,
      redirectUris: unique,
      clientUri: client_uri,
      tokenEndpointAuthMethod: client_type === "browser" ? "none" : "client_secret_basic",
    });
    return { content: [{ type: "text", text: JSON.stringify({
      ok: true,
      client_id: created.clientId,
      client_secret: created.clientSecret || null,
      client_type,
      redirect_uris: created.redirectUris,
      token_endpoint_auth_method: created.tokenEndpointAuthMethod,
      scopes: SUPPORTED_SCOPES,
      authorization_endpoint: `${AUTH_ORIGIN}/authorize`,
      token_endpoint: `${AUTH_ORIGIN}/oauth/token`,
      userinfo_endpoint: USERINFO_RESOURCE,
      resource: USERINFO_RESOURCE,
      secret_warning: created.clientSecret ? "This client secret is returned once. Put it in the service's secret store; never ship it to browser code, logs, chat, or source control." : "Public client: no secret is issued. S256 PKCE is mandatory.",
    }) }] };
  });

  server.registerTool("clintware_oauth_list_clients", {
    title: "List Clintware OAuth clients",
    description: "List registered OAuth clients with secrets redacted.",
    inputSchema: { limit: z.number().int().min(1).max(100).default(50), cursor: z.string().optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ limit, cursor }) => {
    if (!env.OAUTH_KV) return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: "oauth_kv_not_configured" }) }] };
    const result = await oauthApi(env).listClients({ limit, cursor });
    return { content: [{ type: "text", text: JSON.stringify({ clients: (result.items || []).map(publicClient), cursor: result.cursor || null }) }] };
  });

  server.registerTool("clintware_oauth_delete_client", {
    title: "Delete and revoke a Clintware OAuth client",
    description: "Delete an OAuth client and cascade-revoke its grants/tokens. Requires the client ID to be repeated as confirmation.",
    inputSchema: { client_id: z.string().min(8), confirm_client_id: z.string().min(8) },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, async ({ client_id, confirm_client_id }) => {
    if (client_id !== confirm_client_id) return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: "confirmation_mismatch" }) }] };
    await oauthApi(env).deleteClient(client_id);
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, client_id, revoked: true }) }] };
  });

  return server;
}

async function handleAdminMcp(request, env, ctx) {
  const expected = String(env.CONTROL_PLANE_MCP_TOKEN || "");
  if (!expected || !(await secureEq(bearer(request), expected))) {
    return json({ error: "unauthorized" }, 401, { "www-authenticate": "Bearer" });
  }
  const handler = createMcpHandler(() => createAdminMcpServer(env), {
    route: "/admin-mcp",
    allowedHostnames: ["auth.clintware.com"],
    allowedOriginHostnames: ["chatgpt.com", "chat.openai.com", "platform.openai.com", "clintware.com", "www.clintware.com"],
    responseMode: "auto",
  });
  return handler(request, env, ctx);
}

const defaultHandler = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({
        ok: true,
        service: "Clintware Identity Broker",
        version: VERSION,
        configured: oauthConfigured(env),
        google_configured: Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET),
        oauth_storage: Boolean(env.OAUTH_KV),
        admin_mcp: Boolean(env.CONTROL_PLANE_MCP_TOKEN),
        first_party_client: FIRST_PARTY_CLIENT.clientName,
        first_party_client_id: FIRST_PARTY_CLIENT_ID,
        first_party_client_model: "cimd",
        first_party_apps: Object.keys(FIRST_PARTY_APPS),
        issuer: AUTH_ORIGIN,
        resource: USERINFO_RESOURCE,
        time: new Date().toISOString(),
      });
    }
    if (url.pathname === "/admin-mcp") return handleAdminMcp(request, env, ctx);
    if (request.method === "GET" && url.pathname === "/client/clintware-web") {
      return json(firstPartyClientMetadata(), 200, {
        "cache-control": "public, max-age=300",
      });
    }

    const firstPartyMatch = url.pathname.match(/^\/client-config\/([a-z0-9_-]+)$/);
    if (request.method === "GET" && firstPartyMatch) {
      const config = await firstPartyClientConfig(env, firstPartyMatch[1]);
      return config ? json(config) : json({ error: "unknown_first_party_app" }, 404);
    }
    if (url.pathname === "/authorize" && request.method === "GET") return beginConsent(request, env);
    if (url.pathname === "/authorize" && request.method === "POST") return finishConsent(request, env);
    if (url.pathname === "/callback" && request.method === "GET") return finishGoogle(request, env);
    if (url.pathname === "/") {
      return json({
        service: "Clintware Identity Broker",
        issuer: AUTH_ORIGIN,
        userinfo: USERINFO_RESOURCE,
        scopes: SUPPORTED_SCOPES,
        first_party_client: FIRST_PARTY_CLIENT.clientName,
        first_party_client_id: FIRST_PARTY_CLIENT_ID,
        first_party_client_model: "cimd",
        first_party_apps: Object.keys(FIRST_PARTY_APPS),
        docs: "Clintware first-party products share one central public OAuth Client ID Metadata Document with exact redirect allowlists. External/service clients may still be managed through /admin-mcp.",
      });
    }
    return json({ error: "not_found" }, 404);
  },
};

const OAUTH_OPTIONS = {
  apiRoute: "/userinfo",
  apiHandler: userInfoHandler,
  defaultHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/oauth/token",
  scopesSupported: SUPPORTED_SCOPES,
  accessTokenTTL: 15 * 60,
  refreshTokenTTL: 30 * 24 * 60 * 60,
  resourceMetadata: {
    resource: USERINFO_RESOURCE,
    authorization_servers: [AUTH_ORIGIN],
    scopes_supported: SUPPORTED_SCOPES,
    resource_name: "Clintware Identity",
  },
  clientIdMetadataDocumentEnabled: true,
  allowImplicitFlow: false,
  allowPlainPKCE: false,
};

export const oauthProvider = new OAuthProvider(OAUTH_OPTIONS);
export default oauthProvider;
