# BuyerOrigin privacy and security model

## Browser-local audit

Merchant CSV rows are read and analyzed in browser memory.  The public audit route has no raw-order upload endpoint and does not persist order rows.  Results leave the browser only when the merchant explicitly exports them.

## Installed Shopify app

The installed app's optional historical seed accepts a bounded Shopify Orders CSV as multipart form data, parses it transiently, and persists only store-scoped pseudonymous coupon-use keys plus minimal order reference, use timestamp, and discount amount.  Raw email, phone, address, and CSV rows are not written to the BuyerOrigin database.

Signed Shopify order webhooks follow the same model.  Identity values are normalized transiently and converted to store-scoped keyed tokens before persistence.

The server derives the store state key from `BUYERORIGIN_MASTER_KEY` using HMAC-SHA256.  The master key remains in the hosting secret manager.  Checkout Function state receives only a derived store-scoped pseudonymization key and pseudonymous prior-use records because ordinary Discount Functions cannot depend on a BuyerOrigin network request at checkout.  Treat the app-owned discount metafield as configuration, not secret storage.

## Persistent data

- Shopify session/token data required for the authorized app session.
- Shop identifier.
- Coupon policy and automatic discount reference.
- Pseudonymous coupon, email, phone, and address tokens.
- Minimal order reference, use date, and optional discount amount.
- Review/override records when that UI is enabled later.

No cross-merchant identity graph is created.

## Retention and deletion

- Raw CSV/webhook identity values: transient only for normalization and pseudonymization.
- Coupon-use evidence: retain for the configured lookback plus a small operational grace period, then prune in production operations.
- Uninstall: sessions are deleted immediately and merchant state is marked uninstalled pending Shopify's required shop-redact event/retention rule.
- Customer redact: matching pseudonymous email/phone/order records are deleted and enabled Function state is refreshed.
- Shop redact: merchant state and sessions are deleted.

## Access control

- Authenticate merchant admin routes through Shopify.
- Verify webhooks through Shopify's app framework before handling payloads.
- Store client secret, master key, and production database credentials outside Git.
- Enforce merchant ID on every persisted policy/use query.
- Keep scopes at `read_orders,write_discounts` unless an implemented feature proves another scope is necessary.
- Do not log raw identity values or raw webhook payloads.

## Protected Shopify customer data

Order data plus email, phone, name, and address can be protected customer data/fields.  The production pilot must obtain whatever protected-data approval Shopify requires for the selected distribution and requested fields before relying on them outside development testing.

## Pilot Merchant A confidentiality

Only `Pilot Merchant A` may appear in committed materials.  No company name, domain, industry, products, location, employees, real coupon codes, customer/order data, identifying screenshots, identifying quotes, or identifying results may be committed or published.

Private testing, anonymous aggregate metrics, anonymous quotation, and named case study are four independent consent levels.  Public attribution requires separate written permission.
