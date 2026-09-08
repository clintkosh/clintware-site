# BuyerOrigin privacy and security model

## Current browser-local boundary

- Merchant CSV rows are read and analyzed in browser memory.
- The BuyerOrigin audit route has no raw-order upload endpoint.
- Order rows are not written to cookies, local storage, session storage, object storage, or a BuyerOrigin database by the audit UI.
- Refreshing or closing the page clears the working dataset.
- Results leave the browser only when the merchant explicitly exports them.
- Synthetic fixtures are the only customer-like data permitted in the repository.

## Data minimization for the hosted path

The hosted product should ingest only fields required to establish policy eligibility and merchant review.  Raw email, phone, and address values should be normalized transiently, converted to pseudonymous lookup keys, then discarded as soon as the configured workflow permits.

Preferred persistent representation:

- Merchant-scoped tenant ID.
- HMAC-based normalized email key.
- HMAC-based normalized phone key.
- HMAC-based normalized address key.
- HMAC-based normalized coupon-code key when the raw code is not required for display.
- Minimal Shopify order reference needed for merchant evidence review.
- First/last qualifying use time and compact use count.
- Reason codes and merchant override outcome.

Use keyed HMAC pseudonymization rather than a plain unsalted hash because common emails, phone numbers, addresses, and coupon codes are vulnerable to dictionary attacks.  Keep the HMAC secret outside the database, version keys for rotation, and never log raw identity values.

## Retention and deletion

- Default raw webhook payload retention target: zero after successful derivation, unless a short retry/dead-letter interval is operationally required and explicitly documented.
- Compact coupon-use state retention: policy lookback plus a small operational grace period, configurable by merchant and legal requirements.
- Review evidence: retain only as long as the merchant needs the review/audit record.
- Store disconnect: revoke tokens and stop ingestion immediately.
- Merchant deletion: delete tenant state, pseudonymous keys, review records, and derived reporting data within the documented deletion window.
- Shopify privacy requests and shop redaction must be handled through the required compliance webhooks before production distribution.

## Access control

- Encrypt tokens and secrets at rest using a managed secret or key service.
- Enforce tenant isolation on every query and write.
- Separate service credentials from merchant sessions.
- Use least-privilege Shopify scopes.
- Require authenticated merchant access for hosted review queues and policy changes.
- Audit administrative access and policy/override changes.
- Never expose pseudonymous cross-merchant identifiers or build a cross-merchant identity graph.

## Protected Shopify customer data

Email, phone, name, and address fields are protected customer data.  Access to protected fields must be requested and approved in Shopify's Partner or Dev Dashboard as applicable before BuyerOrigin depends on those fields in a connected production app.  The app must document why each requested field is necessary and satisfy Shopify's protected-customer-data requirements.

## Pilot Merchant A confidentiality

Only `Pilot Merchant A` may appear in committed materials.  Do not commit or publish its company name, domain, industry, products, location, employees, coupon codes, customer/order data, identifying screenshots, identifying quotes, or identifying results.

Public evidence permissions are separate:

1. Private product testing.
2. Anonymous aggregate metrics.
3. Anonymous quotation.
4. Named case study.

Each level requires its own explicit consent.  Named attribution requires separate written permission.
