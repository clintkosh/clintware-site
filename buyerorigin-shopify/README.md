# BuyerOrigin Shopify app

BuyerOrigin's Shopify app implements the live path behind the promise: **Stop the same buyer from using the same coupon again.**

The source includes the embedded React Router app, Shopify authentication/session storage, transient Shopify Orders CSV seeding, signed order webhooks, pseudonymous coupon-use storage, coupon policy records, automatic app discount creation/refresh, a Discount Function, uninstall handling, and Shopify privacy webhooks.

It is source-complete and CI-validated but **not installed or deployed**.  A real Shopify app registration, generated extension UID, development store, credentials, protected customer-data approval where required, hosted database/app URL, and merchant authorization remain external requirements.

## Local validation

```bash
npm install
npx prisma validate
npx prisma generate
npm test
npm run check
npm run typecheck
npm run build
```

Repository CI runs those checks plus the browser BuyerOrigin tests, Worker configuration dry-runs, and `git diff --check` before the branch can be treated as ready for Shopify registration work.

## Runtime flow

1. Merchant authorizes the app.
2. Merchant may seed a bounded Shopify Orders CSV.  Raw rows are parsed transiently and only pseudonymous coupon-use keys are persisted.
3. Merchant enters a coupon to protect.
4. BuyerOrigin creates an automatic app discount backed by `buyerorigin-discount-guard` and writes compact per-coupon state to its app-owned discount metafield.
5. New order webhooks update pseudonymous history and refresh enabled coupon guards.
6. At checkout the Discount Function compares current email, phone, and shipping/billing address against the compact state.
7. If the same entered coupon has a qualifying prior use, and Shopify marks the entered code rejectable, the Function returns `enteredDiscountCodesReject`.
8. Missing state/evidence, stale/out-of-lookback evidence, different codes, and non-rejectable codes fail open.

BuyerOrigin rejects the coupon only.  It never blocks checkout.

## External registration blocker

`shopify.extension.toml.example` deliberately contains no real extension UID.  Link/create the real Shopify app with Shopify CLI first so Shopify generates the UID.  Do not fabricate or copy one from another app.

See `../docs/buyerorigin/SHOPIFY_INTEGRATION.md` and `../docs/buyerorigin/DEPLOYMENT.md` for registration, protected-data, custom-distribution pilot, and installation steps.
