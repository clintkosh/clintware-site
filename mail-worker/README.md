# Clintware Mail

Clintware Mail is a Clintware-owned webmail application designed to run on the Cloudflare free tier at low usage.

## Architecture

- Web UI/API: Cloudflare Worker at `https://mail.clintware.com`
- Identity: `https://auth.clintware.com`
- Mailbox storage: SQLite-backed Durable Object
- Inbound transport: Cloudflare Email Routing -> `clintware-mail` Worker
- Safety copy: inbound messages are also forwarded to `clint.kosh@gmail.com` while the new mailbox is proving itself
- Outbound transport: shared `clintware-blog-newsletter` mail service, currently Gmail API
- Future outbound transport: replaceable SMTP/self-hosted adapter without changing the webmail application

The Google delegated credentials remain in the shared Clintware mail service. The webmail Worker receives only the internal service authentication secret.

## OAuth

Clintware Mail uses the single central first-party OAuth client named `Clintware Web`. The Identity Broker returns Mail's exact callback through `/client-config/mail`:

- central client shared by first-party Clintware products
- Mail redirect: `https://mail.clintware.com/callback`
- scopes: `identity email profile`
- PKCE: S256
- no product-level client secret

The Worker performs the authorization flow server-side, creates a random host-bound HttpOnly application session, and discards Clintware OAuth tokens after identity validation.

Only email addresses listed by `MAIL_ALLOWED_EMAILS` or `MAIL_OWNER_EMAIL` may create a mailbox session.

## Inbound routing

The deployment workflow attempts to replace the existing literal `clint@clintware.com` forwarding rule with an Email Routing Worker action targeting `clintware-mail`.

If none of the existing Cloudflare credentials has Email Routing Rules write access, deployment remains successful and the routing rule is left unchanged. This prevents a mail outage.

The Worker forwards a safety copy after storing each inbound message. Remove `FORWARD_COPY_TO` only after the Clintware inbox has been validated in production.

## Free-tier design

No VM, static public IP, SMTP port 25, Vercel runtime, Lovable runtime, or paid SMTP relay is required for this version.

The implementation uses Cloudflare Workers and SQLite-backed Durable Objects. Outbound Internet delivery uses the existing Google account through the Gmail API until a self-hosted transport is introduced.

## Validation

```sh
npm --prefix mail-worker run check
```

Health:

```text
https://mail.clintware.com/health
```


## Routing ownership

The primary `clint@clintware.com` address is intentionally excluded from the generic forwarding-alias workflow. It is owned by the Clintware Mail Email Worker route. Support and legacy aliases may continue forwarding independently.
