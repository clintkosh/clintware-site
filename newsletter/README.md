# Clintware Blog Newsletter

This service turns the Clintware Blog into a confirmed-email mailing list.

## What it does

- The form at `/blog/` sends a subscription request to `newsletter.clintware.com`.
- A confirmation email is required before an address becomes eligible for updates.
- Confirmed subscribers receive one email for each changed `public/blog/<slug>/index.html` page after the public site deployment succeeds.
- Every notification includes a one-click unsubscribe header and an unsubscribe page.
- The Worker uses Cloudflare Durable Object SQLite storage for the subscriber registry and a provider-neutral mail transport. Production currently uses the Gmail API through the canonical Clintware Google OAuth client; SMTP is the planned self-hosted transport.
- A notification is recorded by canonical post URL so rerunning the workflow does not intentionally send the same post twice.

## One-time production setup

1. Create the canonical Clintware Google Cloud Web OAuth client and keep `https://auth.clintware.com/callback` registered.
2. Enable Gmail API for the project.
3. Deploy the Clintware Identity Broker with its canonical Google client secret.
4. Open `https://auth.clintware.com/delegated/google/start` and approve the delegated Gmail/Calendar scopes once, or run `newsletter/scripts/setup-gmail-oauth.ps1`.
5. The Identity Broker stores the delegated refresh grant encrypted in its KV namespace. The newsletter Worker receives only a derived bridge credential and requests short-lived Google access tokens through the `AUTH_BROKER` service binding.
6. Keep `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` available as existing repository Actions secrets.

The delegated Google refresh grant no longer needs to be copied into a GitHub Actions secret for the newsletter. Product Workers never receive the long-lived Google refresh token; they receive only short-lived access through the broker boundary.

## Publishing a post

Publish the normal static-blog changes to `public/blog/<slug>/index.html` on `main`. After GitHub Pages deploys successfully, the deploy workflow extracts the title, description, and canonical URL, then invokes the protected Worker endpoint. Changes to only the blog index or RSS feed do not send a notification.

For a one-time retry, run the `Retry Clintware Blog Subscriber Notification` workflow manually and provide `public/blog/<slug>/index.html`. The Worker suppresses a URL that has already completed delivery.

## Local checks

```bash
cd newsletter
npm test
npm run check
```

The integration tests mock the delegated Google broker, Gmail delivery, and local storage. They never send external email.

## Shared mail service

The newsletter Worker also exposes the authenticated internal mail boundary used by Clintware services such as ClintCal. The internal endpoint remains protected by `INTERNAL_MAIL_SECRET`; product Workers do not receive or store Google delegated credentials directly.
