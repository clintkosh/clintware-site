# BuyerOrigin MVP specification

Status: browser-local audit working on branch `agent/buyerorigin-shopify-start` as of September 7, 2026.  Shopify checkout enforcement is not installed or deployed.

## Primary promise

**Stop the same buyer from using the same coupon again.**

BuyerOrigin audits historical coupon use and recommends `Allow coupon` or `Reject coupon`.  It never recommends blocking or denying the full checkout.

## Working input paths

1. Unedited Shopify Orders CSV.  Native Shopify headings such as `Name`, `Email`, `Phone`, `Created at`, `Total`, `Discount Code`, `Discount Amount`, and shipping or billing address columns are recognized automatically.
2. Compatible CSV paste or upload with `order_id`, `email`, `phone`, `address`, `discount_code`, `order_date`, `order_total`, and `discount_amount`.

Shopify line-item continuation rows are collapsed into a single order before analysis so order totals and coupon use are not counted once per line item.

## Default policy

- Coupon scope: exact same coupon code, case-insensitive.
- Identity threshold: 2 of 3 signals.
- Signals: normalized email, normalized phone, normalized shipping or billing address.
- Lookback: 365 days.
- Allowed previous uses: zero.
- Outcome on a qualifying prior use: `Reject coupon`.
- Checkout outcome: unchanged.  BuyerOrigin rejects only the coupon.
- Missing or insufficient identity evidence: fail open with `Allow coupon`.
- Merchant override: order IDs or coupon codes can be allowlisted while retaining the evidence in results.
- Optional stricter identity threshold: 3 of 3.

## Working outputs

Each audited order can include status, recommended action, matched evidence, prior order, prior qualifying use count, estimated leakage, and an explanatory note.  Merchants can export the review results as CSV.

The current-checkout simulator runs against the loaded history and returns `Allow coupon` or `Reject coupon`.  It is a local simulation and does not change Shopify checkout.

## Working versus simulated

### Working

- Browser-local Shopify Orders CSV parsing.
- Multi-line-item order deduplication.
- Same-code reuse analysis.
- 2-of-3 and optional 3-of-3 identity matching.
- 365-day lookback.
- Allowlist or merchant override.
- Evidence, prior-order, leakage, and recommendation output.
- Local CSV export.
- Current-checkout simulation.
- Worker `/healthz` and `/api/status` routes.

### Simulated or planned

- Installed Shopify app.
- Live Shopify Discount Function execution.
- Merchant accounts and store connections.
- Order webhook ingestion.
- Hosted compact coupon-use state.
- Review queues persisted across sessions.
- Billing.

## Acceptance criteria

Automated tests must cover exact same-code reuse, different-code allow behavior, 2-of-3 identity matching, optional 3-of-3 matching, lookback behavior, merchant overrides, Shopify-native CSV parsing, line-item deduplication, coupon-only rejection, non-rejectable Shopify codes, missing-customer fail-open behavior, worker routes, and public/mobile markers.

## Evidence boundary

A match is a merchant review signal, not a fraud accusation.  No deployment, merchant approval, traction, revenue, or Shopify installation should be inferred from a synthetic fixture or simulator result.
