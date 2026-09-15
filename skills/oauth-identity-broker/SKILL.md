---
name: oauth-identity-broker
description: Design, register, integrate, and audit public-user OAuth login for Clintware services through the central Google-backed Clintware Identity Broker without exposing Google credentials or privileged Control Plane capabilities.
---

# Clintware OAuth Identity Broker

Use this skill whenever a Clintware product needs public account login, OAuth client registration, a stable cross-login identity, token/session design, or authentication troubleshooting.

## Architecture invariant

`auth.clintware.com` is the public identity boundary. `mcp.clintware.com` is the privileged infrastructure Control Plane.

Never make a Google-authenticated public user token valid for privileged Control Plane tools. Public identity and infrastructure administration are different trust domains even when both are operated by Clintware.

Canonical flow:

`SERVICE -> CLINTWARE AUTHORIZE -> EXPLICIT CLINTWARE CONSENT -> GOOGLE OIDC -> VALIDATE PKCE + STATE + NONCE -> CLINTWARE TOKEN -> SERVICE USERINFO -> LOCAL SERVICE SESSION`

## Source of identity

Use Google's OIDC `sub` as the upstream immutable subject, then expose the broker's stable pseudonymous Clintware `sub` to products.

Do not use email as the immutable user key. Email can change.

For sign-in only:

- request `openid email profile` upstream;
- do not request Google `access_type=offline`;
- do not retain Google access tokens after the callback;
- do not retain a Google refresh token;
- never store or request a Google password.

Only add Google API scopes or offline access when a specific product feature truly needs to act on a user's Google data while the user is absent. Treat that as a separate delegated-access capability, not as part of login.

## OAuth protocol rules

- Use Authorization Code flow.
- PKCE must be S256. Never enable plain PKCE.
- Browser/public clients are required to use PKCE. Confidential server/BFF clients should use PKCE too.
- Use transaction-specific high-entropy `state` and OIDC `nonce`.
- Bind authorization state to the same browser and expire it quickly.
- Redirect URIs are exact allowlists. No wildcard callback URLs.
- Production redirect URIs use HTTPS. Loopback HTTP is allowed only for local native/development clients.
- Do not enable implicit flow.
- Do not enable open Dynamic Client Registration for ordinary Clintware services. Create first-party clients through the authenticated Identity Admin MCP.
- Use the provider's revocation endpoint and rotating refresh tokens rather than inventing token invalidation logic.

## Browser and session rules

Prefer a backend-for-frontend for web products.

- Keep OAuth client secrets only on servers.
- Keep refresh tokens server-side whenever possible.
- Give browsers a service-owned `Secure`, `HttpOnly`, appropriate `SameSite` session cookie instead of a long-lived bearer token in `localStorage`.
- Do not create a parent-domain `.clintware.com` authentication cookie shared by all products. Keep cookies host-bound and exchange authorization through redirects.
- Never put access tokens, refresh tokens, authorization codes, client secrets, or Google tokens in URLs, analytics, telemetry, source control, chat, or application logs.

## Clintware scopes

The broker's base identity resource is `https://auth.clintware.com/userinfo`.

Supported scopes:

- `identity` — stable Clintware `sub`; required for login.
- `email` — verified email.
- `profile` — display name and profile image.

Request the minimum scopes the product needs. A product that only needs an account key should request only `identity`.

## Registering a Clintware service

Use the authenticated Identity Admin MCP endpoint `https://auth.clintware.com/admin-mcp` and `clintware_oauth_create_client`.

Default to `client_type=server` for a website with any backend/BFF. Use `browser` only when there is genuinely no confidential server component.

Every client registration must have:

- a clear service name;
- exact redirect URIs;
- the correct client type;
- an HTTPS client/home URL when supplied.

A generated confidential client secret is displayed once. Move it directly into the service's secret store.

## Permanence model

Account permanence and credential permanence are different.

Clintware identity is stable across reauthentication because the same Google subject maps to the same pseudonymous Clintware `sub`. Access tokens remain short lived. Refresh grants remain finite and rotating. A revoked or expired grant causes reauthentication, not creation of a new user identity.

Never solve "remember me" by issuing never-expiring bearer tokens.

## Multi-service expansion

The base `/userinfo` audience is appropriate for common Clintware sign-in.

When a product needs its own protected APIs or MCP resources, give that resource a distinct canonical OAuth audience and least-privilege scopes. Prefer Cloudflare private Service Bindings for cross-Worker token validation rather than a public introspection endpoint. Do not create one multi-audience bearer token that silently works across unrelated services.

## Security review checklist

Before calling an integration complete, verify all of the following:

1. Google callback is exactly `https://auth.clintware.com/callback` in production.
2. Google client ID/secret are stored only as Worker/repository secrets.
3. Google offline access is absent for login-only flows.
4. PKCE S256, state, nonce, short transaction TTL, and same-browser binding are active.
5. The user sees the requesting Clintware client and scopes before authorization.
6. Redirect URI is exact and HTTPS.
7. Service client secret is never browser-exposed.
8. Refresh token is not stored in `localStorage`.
9. Email is not the immutable account key.
10. Public identity tokens cannot authenticate to `mcp.clintware.com` infrastructure tools.
11. OAuth access and refresh tokens can be revoked.
12. Logs and telemetry contain no credentials.
13. Deleting an OAuth client cascades revocation of its grants/tokens.
14. Health/status endpoints expose configuration booleans only, never secrets.

## Incident response

If a service client secret is exposed:

1. delete/revoke that OAuth client;
2. register a replacement client;
3. rotate the service secret;
4. require reauthorization for affected grants;
5. review logs for attempted misuse without copying leaked credentials into the incident record.

If the Google OAuth client secret is exposed, rotate it in Google and the Worker secret immediately. Existing in-flight authorization transactions may fail and should simply restart. Clintware-issued account identities remain stable.
