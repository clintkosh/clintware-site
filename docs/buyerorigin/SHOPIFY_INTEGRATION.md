# BuyerOrigin Shopify integration and installation guide

Status: the Shopify application and Function logic are implemented in source.  No Shopify installation, deployment, protected-data approval, merchant authorization, or production Function activation is claimed.

## Implemented architecture

BuyerOrigin uses Shopify's React Router app architecture plus Discount Function API `2026-01` target `cart.lines.discounts.generate.run`.

The app stores only merchant configuration and pseudonymous coupon-use evidence for normal operation.  A bounded Shopify Orders CSV can be seeded transiently after installation.  New order webhooks update the same compact state.

For each protected coupon, the app creates an automatic app discount using Function handle `buyerorigin-discount-guard`.  Its app-owned discount metafield contains compact per-coupon state.  The Function receives the current entered code, Shopify's `rejectable` flag, checkout email/phone, delivery or billing address, and shop-local date.  It compares the current shopper to qualifying prior uses and returns `enteredDiscountCodesReject` only when the default policy is met.

The default remains exact same code, case-insensitive, 2 of 3 identity signals, 365-day lookback, zero previous uses, fail open, and coupon-only rejection.

## Data flow

`bounded CSV seed or signed order webhook -> normalize transiently -> store pseudonymous keys -> build per-coupon compact state -> automatic discount metafield -> Discount Function -> Allow coupon or enteredDiscountCodesReject`

No Function network call to BuyerOrigin is required at checkout.

## Exact external values still required

1. Shopify Partner/Dev account owning the dedicated pilot app.
2. Development store used for validation.
3. Real app registration and Shopify-generated client ID.
4. App client secret stored outside Git.
5. Production HTTPS application URL and auth callback URLs.
6. Minimum required scopes.  Current source uses `read_orders,write_discounts`.
7. Protected customer-data/field approval for order/email/phone/address use when Shopify requires it outside development testing.
8. Shopify-generated Function extension UID and generated schema/types linkage.
9. `BUYERORIGIN_MASTER_KEY`, generated randomly and stored only in the hosting secret manager.
10. Persistent production database.
11. Explicit merchant installation authorization.
12. Automatic app discount creation in the installed store.

## Register and validate the pilot app

1. Create or select the dedicated BuyerOrigin pilot app in the Shopify Dev/Partner workflow.
2. From `buyerorigin-shopify`, run Shopify CLI's app configuration/link workflow against that registration.
3. Generate or link a Discount Function extension so Shopify assigns the extension UID.  Preserve handle `buyerorigin-discount-guard` and merge the repository Function query/code into the generated extension rather than inventing a UID.
4. Replace the example app config with the CLI-linked real configuration outside any credential-bearing commit.
5. Configure the hosted app URL, callbacks, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, scopes, `BUYERORIGIN_MASTER_KEY`, and database.
6. Request only the protected fields actually used.
7. Run `npm install`, `npx prisma validate`, `npx prisma generate`, `npm test`, `npm run check`, `npm run typecheck`, and `npm run build`.
8. Run `shopify app dev` against the development store and install there.
9. Upload a synthetic Shopify Orders CSV, enable one synthetic coupon, and verify an eligible reuse rejects only the coupon.
10. Verify a different code, non-rejectable code, insufficient evidence, and out-of-lookback use all fail open.
11. Verify order/update and Shopify privacy webhooks.
12. Only after development-store proof and required approvals should the dedicated pilot registration select **Custom distribution** and generate the private install link for Pilot Merchant A.

## Distribution boundary

The custom-distribution pilot registration is dedicated to Pilot Merchant A.  Keep the future public App Store version in a separate app registration because Shopify distribution method choice is not treated as reversible.

## Security note on Function state

The Function needs enough deterministic material to reproduce pseudonymous checkout keys without a network call.  The compact discount state therefore carries a store-scoped pseudonymization key derived from the server master key.  Treat the discount metafield as app configuration, not as a secret vault.  The server master key never enters Shopify.  Raw customer values are not placed in the compact state.
