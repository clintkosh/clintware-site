# BuyerOrigin working versus planned boundary

Last reviewed: September 15, 2026.

## Working in source

- Browser-local online audit with Shopify-native CSV parsing and line-item deduplication.
- Same-code, case-insensitive policy with 2-of-3 default identity matching, 365-day lookback, zero previous uses, overrides, evidence, export, leakage estimate, and current-checkout simulator.
- Shopify React Router app structure with authenticated admin routes and Prisma session storage.
- Transient Shopify Orders CSV seed path that persists pseudonymous coupon-use keys rather than raw rows.
- Signed order webhook ingestion into pseudonymous coupon-use state.
- Per-coupon policy persistence.
- Automatic app discount create/update path using the Function handle.
- Compact per-coupon checkout state stored on the automatic discount.
- Discount Function current-shopper comparison using checkout email, phone, delivery/billing address, local date, and entered coupon code.
- Native `enteredDiscountCodesReject` output only when Shopify marks the code rejectable.
- Fail-open behavior for missing or insufficient evidence.
- App uninstall, scopes-update, customer-data-request, customer-redact, and shop-redact webhook handlers.
- Automated browser, Shopify CSV, pseudonymization, Function, rejectable-code, lookback, and fail-open tests.

## Not live until external Shopify setup occurs

- Real Shopify app registration/client ID and secret.
- Shopify-generated Function extension UID/schema linkage.
- Development store installation.
- Protected customer-data/field approval where required.
- Production app URL and persistent production database.
- Merchant authorization.
- Selection of the irreversible Custom distribution method for the dedicated pilot registration.
- Live automatic discount/Function activation in a merchant store.

## Planned after pilot proof

- Durable merchant review queue UI and override history.
- Reporting dashboards and aggregate metrics.
- Billing.
- Public App Store registration, review, listing, and multi-merchant operations using a separate app registration.

## Claims boundary

Do not claim BuyerOrigin is installed, deployed, approved by Shopify, preventing live abuse, generating revenue, or validated by a merchant until external evidence supports the statement.  Pilot Merchant A remains anonymous unless separate written named-case-study permission exists.
