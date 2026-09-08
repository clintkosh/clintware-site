# BuyerOrigin deployment instructions

## Browser-local audit

The working online product is the `buyerorigin-worker` Cloudflare Worker.  Existing Wrangler configuration and repository deployment workflow should remain the source of truth for its domains and account binding.

Before deploying the worker:

```bash
cd buyerorigin-worker
npm test
npm run check
```

Then run the repository-level validation and site build from the repository root:

```bash
node scripts/validate-product-worker-contract.mjs
python build_site.py

git diff --check
```

Only deploy through the repository's established Cloudflare/GitHub workflow when its existing credentials are available and the branch has passed validation.  Deployment of the browser audit does not install the Shopify app.

## Shopify pilot app

Do not deploy or release the Shopify Function from source alone.  The following external steps are required first:

1. Access the Shopify account that will own the BuyerOrigin pilot app.
2. Select/create the development store used for validation.
3. Register the dedicated BuyerOrigin pilot app.
4. Use the current Shopify CLI to generate the Discount Function so Shopify creates the actual extension UID and generated schema/types.
5. Merge the repository input query and rejection contract into the generated extension.
6. Configure real app URLs, redirect/callback URLs, and secrets outside Git.
7. Request the minimum Admin API scopes and protected customer fields needed by the implemented ingestion path.
8. Implement and test signed webhooks and compact verdict-state delivery.
9. Run Shopify Function tests/replays on the development store.
10. Create the automatic app discount that references the Function handle.
11. Verify non-rejectable codes and missing evidence fail open.
12. Verify a qualifying synthetic reuse rejects only the entered coupon.
13. Only then select **Custom distribution** on the dedicated pilot app and generate the install link for Pilot Merchant A.

The custom-distribution choice is intentionally delayed because Shopify does not allow an app's distribution method to be changed after selection.  Use a separate future app registration for public App Store distribution.

## Required environment secrets, planned connected app

Names can be aligned to the generated Shopify app/framework, but the connected service will need equivalents of:

- Shopify client ID.
- Shopify client secret.
- Application base URL.
- Session/token encryption secret.
- HMAC/pseudonymization secret and key version.
- Database connection secret.
- Billing/provider secrets when billing exists.

Never commit these values.  Do not include Pilot Merchant A's domain in example configuration committed to the repository.

## Rollback

The browser-local audit is read-only with respect to merchant systems.  Roll back a bad browser deployment through the existing GitHub/Cloudflare deployment history.

For the Shopify pilot, disable or remove the automatic app discount/Function activation before touching historical data state.  BuyerOrigin's policy must always fail open if its compact state is unavailable.
