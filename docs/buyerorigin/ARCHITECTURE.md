# BuyerOrigin architecture

## Current browser-local product

The public BuyerOrigin Worker serves the page, browser engine, browser application, and synthetic Shopify fixture.  Merchant CSV content is read with `FileReader` or pasted into the page and analyzed in browser memory.  The current audit route has no raw-order upload endpoint or database binding.

`Shopify Orders CSV -> native-header mapper -> order/line-item collapse -> normalized identity -> same-code comparison -> evidence + recommendation -> local export`

This keeps BuyerOrigin useful before any Shopify installation exists.

## Coupon decision contract

The default policy is exact same coupon code, case-insensitive, zero previous uses, 365-day lookback, and at least two matching signals from normalized email, phone, and shipping or billing address.  Missing evidence fails open.  A qualifying match can reject only the coupon.  The checkout itself is never blocked by BuyerOrigin policy.

## Shopify enforcement path

`buyerorigin-shopify/` contains the registration-independent enforcement contract and tests.  The target is Shopify Discount Function `cart.lines.discounts.generate.run` using `enteredDiscountCodes`.  The Function may return `enteredDiscountCodesReject` only for entries where Shopify supplies `rejectable: true`.

The actual Shopify extension UID, app registration, store installation, credentials, and protected-data approval cannot be generated safely in source control.  `shopify.extension.toml.example` therefore documents the target without fabricating a UID.

### Intended connected flow

1. Merchant authorizes BuyerOrigin for the minimum required Shopify scopes.
2. Permitted order webhooks and an initial bounded history sync feed the hosted control plane.
3. The control plane immediately derives pseudonymized identity keys and compact coupon-use state.
4. Raw fields are discarded as soon as they are no longer required for the configured workflow and retention rule.
5. The control plane maintains merchant policy, allowlists, review outcomes, and a compact decision state.
6. The Shopify Discount Function reads entered discount codes plus the smallest app-owned verdict/configuration state available to the Function.
7. Only rejectable codes with a high-confidence `reject_coupon` verdict are returned in `enteredDiscountCodesReject`.
8. Missing state, missing customer evidence, unsupported code state, or insufficient confidence returns no rejection operation.

## Hosted SaaS data model, planned

- `merchant`: tenant ID, plan, retention configuration, created/deleted timestamps.
- `store_connection`: merchant ID, Shopify shop ID/domain reference, encrypted token reference, granted scopes, sync status.
- `coupon_policy`: normalized code scope, match threshold, lookback, allowed previous uses, override rules.
- `coupon_use_state`: merchant ID, normalized coupon hash, pseudonymous identity keys, first/last use timestamps, count, minimal order reference.
- `review_item`: evidence reason codes, pseudonymous buyer key, prior order reference, recommendation, merchant outcome, override.
- `reporting_rollup`: aggregate counts and leakage estimates without raw customer fields.
- `billing_state`: provider IDs and plan state only when billing is implemented.

## Security boundaries

Tenant IDs must be present in every persisted key and authorization check.  Raw customer values should not be used as database indexes.  Identity lookup keys should be HMAC-based with a server-side secret and versioned key rotation rather than plain unsalted hashes.  Coupon codes should be normalized before comparison and can also be keyed with merchant-scoped HMAC values in persistent state.

## External blockers before live Shopify enforcement

- Shopify Partner or Dev Dashboard account access.
- Development store selected for validation.
- App registration and client credentials.
- Distribution choice for a dedicated custom-distribution pilot app.
- Shopify-generated Function extension UID.
- Required access scopes granted.
- Protected customer-data access and protected fields approval as applicable.
- App secrets and hosted callback URL.
- Installed app and active automatic app discount wired to the Function handle.
- A verified path for delivering the compact verdict state to the Function.

Do not commit merchant identifiers, credentials, access tokens, raw orders, or real coupon data.
