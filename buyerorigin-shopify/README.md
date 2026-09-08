# BuyerOrigin Shopify pilot integration

This directory contains the Shopify-specific enforcement contract for BuyerOrigin.  It is **not** evidence that a Shopify app has been installed or deployed.

## Enforcement rule

BuyerOrigin's Shopify path uses the current Discount Function target `cart.lines.discounts.generate.run`.  A previously used entered coupon is rejected with Shopify's native `enteredDiscountCodesReject` operation only when:

- Shopify includes the code in `enteredDiscountCodes`.
- Shopify marks that code `rejectable: true`.
- BuyerOrigin's compact verdict says `reject_coupon`.
- The verdict contains at least the configured identity confidence threshold.
- No merchant override has already converted the verdict to allow.

Everything else fails open with `{ operations: [] }`.

The customer message is intentionally short: `This coupon is not available for this order.`

BuyerOrigin rejects the coupon only.  There is no checkout-block operation in the policy module.

## Files

- `src/rejection-policy.js`: registration-independent rejection output contract.
- `test/rejection-policy.test.mjs`: rejectable-only, fail-open, coupon-only tests.
- `extensions/buyerorigin-discount-guard/src/cart_lines_discounts_generate_run.graphql`: intended Function input query.
- `extensions/buyerorigin-discount-guard/shopify.extension.toml.example`: target metadata with the Shopify-generated UID deliberately omitted.

## Local checks

```bash
npm test
npm run check
```

## Registration blocker

A runnable Shopify Function extension must be generated or linked to a real Shopify app registration using Shopify CLI.  Shopify assigns the extension UID and generates the schema/types/build scaffold.  Do not fabricate those values or copy an example UID into this repository.

See `../docs/buyerorigin/SHOPIFY_INTEGRATION.md` for the exact Partner/Dev account, store, app registration, scopes, protected-data approval, secrets, automatic discount, distribution, and installation steps still required.

## Distribution boundary

Use a dedicated custom-distribution app registration for Pilot Merchant A.  Keep a future public App Store registration separate because Shopify distribution method selection cannot be changed after it is selected.
