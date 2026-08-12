# Clintware Blog Newsletter

This service turns the Clintware Blog into a confirmed-email mailing list.

## What it does

- The form at `/blog/` sends a subscription request to `newsletter.clintware.com`.
- A confirmation email is required before an address becomes eligible for updates.
- Confirmed subscribers receive one email for each changed `public/blog/<slug>/index.html` page after the public site deployment succeeds.
- Every notification includes a one-click unsubscribe header and an unsubscribe page.
- The Worker uses Cloudflare Durable Object SQLite storage for the subscriber registry and Resend only for outbound mail delivery.
- A notification is recorded by canonical post URL so rerunning the workflow does not intentionally send the same post twice.

## One-time production setup

1. In Resend, verify `clintware.com` and create an API key permitted to send from `hello@clintware.com`.
2. Deploy this Worker. Its Wrangler configuration creates the `newsletter.clintware.com` custom domain, which requires `clintware.com` to be an active Cloudflare zone with no pre-existing record for that hostname.
3. Set the Worker secrets without putting either value in Git:

   ```bash
   cd newsletter
   npx wrangler@4 secret put RESEND_API_KEY
   npx wrangler@4 secret put NEWSLETTER_PUBLISH_SECRET
   ```

4. Create the repository Actions secret `NEWSLETTER_PUBLISH_SECRET` using the exact same value as the Worker secret. The post-notification workflow uses it to authenticate to `/publish`.
5. Keep `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` available as existing repository Actions secrets so the `Deploy Clintware Blog Newsletter` workflow can deploy changes.

## Publishing a post

Publish the normal static-blog changes to `public/blog/<slug>/index.html` on `main`. After GitHub Pages deploys successfully, the deploy workflow extracts the title, description, and canonical URL, then invokes the protected Worker endpoint. Changes to only the blog index or RSS feed do not send a notification.

For a one-time retry, run the `Retry Clintware Blog Subscriber Notification` workflow manually and provide `public/blog/<slug>/index.html`. The Worker suppresses a URL that has already completed delivery.

## Local checks

```bash
cd newsletter
npm test
npm run check
```

The local integration test uses a mock Resend server and a local Wrangler Durable Object instance. It never sends external email.
