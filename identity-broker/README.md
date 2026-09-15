# Clintware Identity Broker

Central OAuth 2.1 identity service for Clintware products at `https://auth.clintware.com`.

## Security model

- Google is an **upstream identity provider only**. Clintware requests `openid email profile`, validates the Google OIDC response with PKCE S256 + nonce + state, reads the profile once, and discards the Google access token.
- Clintware does **not** request Google offline access and does **not** retain a Google refresh token for sign-in.
- Clintware issues its own short-lived access tokens and rotating refresh tokens through Cloudflare's `@cloudflare/workers-oauth-provider`.
- A stable pseudonymous Clintware user ID is derived from Google's immutable `sub`, so the same Google account maps back to the same Clintware identity without making email the primary key.
- OAuth authorization transactions are encrypted before their short-lived KV storage and bound to the same browser with a `Secure`, `HttpOnly`, `SameSite=Lax`, `__Host-` cookie.
- Public user authorization is isolated from the privileged `mcp.clintware.com` Control Plane. A Google login never grants repository, deployment, DNS, or administrative MCP permissions.
- OAuth clients are first-party/admin-created only. Open Dynamic Client Registration is intentionally not enabled.

## Public endpoints

- Authorization: `https://auth.clintware.com/authorize`
- Token: `https://auth.clintware.com/oauth/token`
- Revocation: advertised by OAuth metadata and handled by the provider at the token endpoint
- Protected user profile: `https://auth.clintware.com/userinfo`
- Authorization metadata: `https://auth.clintware.com/.well-known/oauth-authorization-server`
- Protected-resource metadata: RFC 9728 discovery for the `/userinfo` resource
- Health: `https://auth.clintware.com/health`

Scopes are `identity`, `email`, and `profile`. `identity` is required for login.

## Admin MCP

The identity broker exposes `https://auth.clintware.com/admin-mcp`, protected by the existing `CONTROL_PLANE_MCP_TOKEN`. It does not accept Google-user tokens.

Tools:

- `clintware_oauth_status`
- `clintware_oauth_create_client`
- `clintware_oauth_list_clients`
- `clintware_oauth_delete_client`

Use `client_type=server` for normal Clintware web apps with a backend/BFF. The generated client secret belongs only in that service's secret store. Use `client_type=browser` only when a backend is genuinely unavailable; it receives no secret and PKCE S256 is mandatory.

## Google setup

Create one Google Cloud **Web application** OAuth client for the identity broker.

Authorized redirect URI:

`https://auth.clintware.com/callback`

Repository/Actions secrets required for deployment:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `CONTROL_PLANE_MCP_TOKEN` (already used by Clintware Control Plane)
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The deployment workflow creates/reuses a Workers KV namespace named `clintware-identity-oauth` and injects it as `OAUTH_KV`. The Cloudflare API token therefore needs **Workers Scripts** deployment rights, the normal custom-domain permissions, and **Workers KV Storage Write**.

## Registering a service

1. Connect an administrator MCP client to `https://auth.clintware.com/admin-mcp` with the Control Plane bearer token.
2. Call `clintware_oauth_create_client` with the service name, exact redirect URI(s), and `client_type=server` unless the app is browser-only.
3. Store the returned client ID and one-time client secret in that service's secret store.
4. Initiate an OAuth Authorization Code flow against `/authorize`, requesting the canonical resource `https://auth.clintware.com/userinfo` and scopes `identity email profile` as needed.
5. Use PKCE S256. Server/BFF clients should use PKCE too even though they also authenticate with a client secret.
6. Keep Clintware refresh tokens server-side. For browser apps, prefer an HttpOnly application session cookie/BFF rather than placing refresh tokens in `localStorage`.
7. Call `/userinfo` with the Clintware access token to obtain the stable `sub` and fields allowed by the granted scopes. Persist the `sub` as the service's external identity key; do not use email as the immutable key.

## Session permanence

"Permanent" means the user account identity remains stable, not that bearer credentials never expire. Access tokens are 15 minutes. Rotating refresh grants are 30 days. When a grant eventually expires or is revoked, signing in with the same Google account produces the same stable Clintware `sub` and reconnects the user's existing service account.

## Local validation

The committed `wrangler.jsonc` intentionally does not contain a KV namespace ID. Generate a deploy/dev config with:

```sh
node scripts/render-wrangler.mjs <32-char-kv-namespace-id>
npm run check
npx wrangler deploy --dry-run --config wrangler.generated.jsonc
```

Never commit `wrangler.generated.jsonc`, `.dev.vars`, Google credentials, OAuth client secrets, access tokens, or refresh tokens.
