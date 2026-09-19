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

1. Create the canonical Clintware Google Cloud Web OAuth client.
2. Add both authorized redirect URIs: `https://auth.clintware.com/callback` and `http://127.0.0.1:53682/`.
3. Enable Gmail API for the project.
4. Run `newsletter/scripts/setup-gmail-oauth.ps1`. It stores `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and the separate `GOOGLE_DELEGATED_REFRESH_TOKEN` as repository secrets, then deploys the Identity Broker, mail Worker, and ClintCal.
5. Keep `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` available as existing repository Actions secrets.

The Google OAuth client credentials are shared across Clintware first-party integrations. The delegated refresh token is not a login credential and never authenticates to the privileged MCP Control Plane.

## Publishing a post

Publish the normal static-blog changes to `public/blog/<slug>/index.html` on `main`. After GitHub Pages deploys successfully, the deploy workflow extracts the title, description, and canonical URL, then invokes the protected Worker endpoint. Changes to only the blog index or RSS feed do not send a notification.

For a one-time retry, run the `Retry Clintware Blog Subscriber Notification` workflow manually and provide `public/blog/<slug>/index.html`. The Worker suppresses a URL that has already completed delivery.

## Local checks

```bash
cd newsletter
npm test
npm run check
```

The integration tests mock Google OAuth/Gmail endpoints and local storage. They never send external email.

## Shared mail service

The newsletter Worker also exposes the authenticated internal mail boundary used by Clintware services such as ClintCal. The internal endpoint remains protected by `INTERNAL_MAIL_SECRET`; product Workers do not receive or store Google delegated credentials directly.
