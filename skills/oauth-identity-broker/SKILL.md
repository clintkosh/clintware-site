---
name: oauth-identity-broker
description: Design, register, integrate, and audit public-user OAuth/OIDC login through a central identity broker without exposing upstream provider credentials or privileged infrastructure capabilities.
---

# OAuth Identity Broker

Use this skill when a product needs public account login, OAuth client registration, a stable cross-login identity, token/session design, or authentication troubleshooting.

## Infrastructure-neutral boundary

This skill must work with infrastructure owned by the operator using it.

Use placeholders such as:

- \`IDENTITY_DOMAIN\`
- \`CONTROL_PLANE_DOMAIN\`
- \`SERVICE_DOMAIN\`
- \`YOUR_OAUTH_PROVIDER\`
- \`YOUR_CLIENT_ID\`
- \`YOUR_SECRET_STORE\`

Do not include the skill author's domains, account names, client IDs, tokens, repositories, private endpoints, or credential names.

Possession of this skill is never authorization to any identity service, MCP server, control plane, repository, or cloud account.

## Architecture invariant

The public identity broker and the privileged infrastructure control plane are separate trust domains.

Never make a public-user login token valid for privileged infrastructure tools.

Canonical flow:

\`\`\`
SERVICE
→ IDENTITY BROKER AUTHORIZE
→ EXPLICIT CONSENT
→ UPSTREAM OIDC
→ VALIDATE PKCE + STATE + NONCE
→ BROKER TOKEN
→ USERINFO
→ LOCAL SERVICE SESSION
\`\`\`

## Source of identity

Use the upstream OIDC \`sub\` as the immutable upstream subject, then expose a stable pseudonymous broker \`sub\` to downstream products.

Do not use email as the immutable user key. Email can change.

For sign-in only:

- request only the minimum identity scopes, commonly \`openid email profile\`;
- do not request offline access unless a product feature genuinely needs background delegated access;
- do not retain upstream access tokens after the callback when they are not needed;
- never store or request the user's provider password.

Delegated access to mail, calendar, files, or other provider data is a separate capability from login. Store delegated grants separately from identity-session state.

## OAuth protocol rules

- Use Authorization Code flow.
- PKCE must use S256.
- Browser/public clients must use PKCE. Confidential server/BFF clients should use PKCE too.
- Use transaction-specific high-entropy \`state\` and OIDC \`nonce\`.
- Bind authorization state to the initiating browser and expire it quickly.
- Redirect URIs are exact allowlists. Do not use wildcard callbacks.
- Production redirect URIs use HTTPS. Loopback HTTP is acceptable only for local native/development clients.
- Do not use implicit flow.
- Do not expose unrestricted Dynamic Client Registration unless that is an intentional product feature protected by strong administrative policy.
- Use standards-based revocation and rotating refresh tokens.

## Browser and session rules

Prefer a backend-for-frontend for web products.

- Keep OAuth client secrets server-side.
- Keep refresh tokens server-side whenever possible.
- Give browsers a service-owned \`Secure\`, \`HttpOnly\`, appropriate \`SameSite\` session cookie instead of a long-lived bearer token in \`localStorage\`.
- Keep cookies host-bound unless a carefully reviewed cross-subdomain design requires otherwise.
- Never put access tokens, refresh tokens, authorization codes, client secrets, or upstream-provider tokens in URLs, analytics, telemetry, source control, reusable skills, chat transcripts, or application logs.

## Broker scopes

A simple broker can begin with:

- \`identity\` — stable pseudonymous subject;
- \`email\` — verified email when needed;
- \`profile\` — display name and profile image when needed.

Request the minimum scopes each service requires.

## Registering a service

Create first-party clients through an authenticated administrative surface owned by the operator.

Default to a confidential server client for a website with a backend/BFF. Use a browser/public client only when there is genuinely no confidential server component.

Every registration should include:

- service name;
- exact redirect URIs;
- client type;
- HTTPS client/home URL where applicable;
- explicit scopes/audiences.

A generated confidential client secret should be shown once and moved directly into the service's secret store.

## Permanence model

Account permanence and credential permanence are different.

Identity can remain stable across reauthentication while access tokens remain short lived and refresh grants remain finite and rotating. A revoked or expired grant should cause reauthentication, not creation of a new user identity.

Never implement "remember me" with a never-expiring bearer token.

## Multi-service expansion

When a product exposes its own protected API or MCP resource, give that resource a distinct canonical audience and least-privilege scopes.

Prefer private service-to-service networking or bindings when available.

Do not create one multi-audience bearer token that silently works across unrelated services.

## Privileged control-plane separation

If the operator also runs an MCP or infrastructure control plane:

- give MCP clients separate revocable credentials;
- scope each client to explicit products/resources;
- never accept public identity tokens as infrastructure credentials;
- keep underlying cloud/provider credentials server-side;
- enforce authorization on every tool call;
- never put a privileged MCP key inside a reusable skill.

## Security review checklist

Before calling an integration complete, verify:

1. Production callback is an exact HTTPS URI owned by the operator.
2. Provider client ID/secret are stored only in the intended runtime secret store.
3. Offline access is absent for login-only flows.
4. PKCE S256, state, nonce, short transaction TTL, and same-browser binding are active.
5. The user sees the requesting client and requested scopes before authorization.
6. Redirect URI validation is exact.
7. Confidential client secrets are never browser-exposed.
8. Refresh tokens are not stored in browser local storage.
9. Email is not the immutable account key.
10. Public identity/delegated-access tokens cannot authenticate to privileged infrastructure tooling.
11. Access and refresh tokens can be revoked.
12. Logs and telemetry contain no credentials.
13. Deleting a client revokes or invalidates its grants/tokens as designed.
14. Health/status endpoints expose configuration state only, never secrets.
15. Exported skills and templates contain only placeholders, not operator-specific private access paths.

## Incident response

If a service client secret is exposed:

1. revoke or disable the client;
2. create or rotate the replacement credential;
3. update the service secret store;
4. require reauthorization where needed;
5. review relevant audit logs without copying leaked credentials into reports.

If the upstream OAuth provider secret is exposed, rotate it at the provider and in the runtime secret store. In-flight authorization transactions may fail and should restart. Stable broker account identities should remain unchanged.
