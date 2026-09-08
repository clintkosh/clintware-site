# BuyerOrigin working versus planned boundary

Last reviewed: September 7, 2026.

## Working in the repository

- Browser-local audit UI served by `buyerorigin-worker`.
- Unedited Shopify Orders CSV recognition.
- Generic compatible CSV upload or paste.
- Shopify multi-line-item continuation-row collapse.
- Case-insensitive exact same-coupon matching.
- Default 2-of-3 normalized email, phone, and shipping/billing address matching.
- Optional 3-of-3 identity policy.
- 365-day lookback and zero allowed previous uses by default.
- Missing-evidence fail-open behavior.
- Merchant order/coupon allowlist overrides.
- Matched evidence, prior order, prior-use count, estimated leakage, and recommended action.
- CSV result export.
- Current-checkout simulator returning `Allow coupon` or `Reject coupon`.
- Worker health/status routes.
- Shopify rejection-policy contract that emits `enteredDiscountCodesReject` only for codes marked `rejectable` by Shopify.
- Shopify rejection-policy unit tests.

## Implemented as a scaffold, not live

- Discount Function input GraphQL for `enteredDiscountCodes` plus app-owned compact verdict state.
- Extension target configuration example for `cart.lines.discounts.generate.run`.
- Custom-distribution pilot installation procedure.
- Hosted SaaS architecture and privacy model.

These parts still require a real Shopify app registration, Shopify-generated extension UID/schema/types, state plumbing, credentials, approvals, installation, and Shopify CLI validation before they are live.

## Planned

- Merchant authentication/accounts.
- Store connections and encrypted token storage.
- Initial bounded order sync.
- Signed order webhook ingestion.
- Pseudonymized compact coupon-use state.
- Durable review queues and override history.
- Reporting dashboards.
- Billing.
- Public Shopify App Store version using a separate public-distribution app registration.

## Claims that must not be made without evidence

Do not claim that BuyerOrigin is installed, deployed, approved by Shopify, used in production, preventing live coupon abuse, generating revenue, recovering merchant revenue, or validated by a merchant unless repository/deployment evidence and merchant permission support the claim.

Do not publish Pilot Merchant A's identity or infer public consent from private testing.
