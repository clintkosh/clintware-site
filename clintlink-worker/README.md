# ClintLink

Clintware URL shortener and protected-link service.

## Public surfaces

- `https://www.clintware.com/link/` — dashboard, creator, public click summaries, and password-only access.
- `https://link.clintware.com/<slug>` — short URL.
- `https://link.clintware.com/<slug>/info` — link summary and click count.
- `POST https://link.clintware.com/password` — password-only protected-link access.
- `POST https://link.clintware.com/api/links` — authenticated link creation API.
- `GET https://link.clintware.com/api/summary` — public summaries, or all active links with admin authorization.

## Security

Protected-link passwords are never stored in plaintext.

Two independent values are stored:

1. PBKDF2-SHA256 hash with a random per-link salt for password verification.
2. HMAC-SHA256 lookup key using `PASSWORD_PEPPER` so the dashboard can accept a password without also requiring the short-link slug.

A protected-link password must therefore be unique across active ClintLinks. Passwords are POSTed, never placed in the URL.

Set these Worker secrets:

```bash
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put PASSWORD_PEPPER
```

Use a high-entropy random value for both. Do not reuse the same value.

## D1 setup

Create the D1 database and apply the schema:

```bash
npx wrangler d1 create clintlink
npx wrangler d1 execute clintlink --file=./schema.sql --remote
```

Add the returned database ID to `wrangler.jsonc`:

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "clintlink",
    "database_id": "<D1_DATABASE_ID>"
  }
]
```

## Route

Deploy the Worker, then bind `link.clintware.com` as its custom domain.

```bash
npx wrangler deploy
```

## Analytics

The dashboard and password/info pages initialize the existing Clintware GA4 property `G-DCY144YM9P`.

Redirect click counts are authoritative in D1 because a direct redirect does not leave a page loaded long enough for browser-side GA to be reliable. Each successful redirect increments `links.click_count` and writes a lightweight click event containing timestamp, country, referrer hostname, and user agent. No raw IP address is stored.

## Abuse controls

Before opening creation to unauthenticated users, add Cloudflare rate limiting / Turnstile. The current creation endpoint requires `ADMIN_TOKEN`.

For password routes, configure a Cloudflare rate-limit rule on POST requests to `link.clintware.com/*` to reduce brute-force attempts.
