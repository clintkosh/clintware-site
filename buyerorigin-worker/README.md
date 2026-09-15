# BuyerOrigin browser-local SaaS MVP

**Primary promise:** Stop the same buyer from using the same coupon again.

BuyerOrigin works online without a Shopify installation.  A merchant can export Orders from Shopify, upload the unedited CSV, review suspected same-coupon reuse, test a current shopper locally, and export the results.  Raw order rows stay in browser memory by default.

## What works now

- Recognizes native Shopify Orders CSV headings automatically.
- Collapses Shopify multi-line-item continuation rows into one order.
- Accepts compatible CSV upload or paste as an alternative.
- Normalizes email, phone, and shipping or billing address evidence.
- Uses exact same coupon code, case-insensitive, as the default scope.
- Requires 2 of 3 identity signals by default; optional 3 of 3 is supported.
- Uses a 365-day lookback and zero allowed previous uses by default.
- Fails open when fewer identity signals are present than the policy requires.
- Shows matched evidence, prior order, prior qualifying use count, estimated leakage, and recommended action.
- Supports merchant order/coupon allowlist overrides.
- Exports results as CSV.
- Includes a current-checkout simulator returning `Allow coupon` or `Reject coupon`.
- Never recommends blocking the checkout.  The only rejection action is the coupon.
- Serves `/healthz` and `/api/status` truth/status routes.

## What remains simulated or external

- Installed Shopify application.
- Live Shopify Discount Function execution.
- Merchant accounts and store connections.
- Order webhook ingestion and compact hosted coupon-use state.
- Persistent review queues/reporting.
- Billing.

The Shopify rejection contract is implemented separately in `../buyerorigin-shopify/`, but it still requires actual Shopify registration, generated extension UID/schema, protected-data approval as applicable, credentials, installation, and state plumbing.

## Run checks

```bash
npm test
npm run check
```

From the repository root also run:

```bash
node scripts/validate-product-worker-contract.mjs
python build_site.py
git diff --check
```

## Routes

- `/` browser-local Shopify CSV audit and simulator.
- `/healthz` health contract.
- `/api/status` working-versus-installed status.
- `/engine.js` browser-local decision engine.
- `/app.js` browser interface behavior.
- `/sample.csv` synthetic Shopify-style fixture.

## Documentation

- [MVP specification](../docs/buyerorigin/MVP_SPEC.md)
- [Architecture](../docs/buyerorigin/ARCHITECTURE.md)
- [Shopify integration](../docs/buyerorigin/SHOPIFY_INTEGRATION.md)
- [Privacy and security](../docs/buyerorigin/PRIVACY_SECURITY.md)
- [Anonymous design-partner protocol](../docs/buyerorigin/DESIGN_PARTNER_PROTOCOL.md)
- [Pilot playbook](../docs/buyerorigin/PILOT_PLAYBOOK.md)
- [Deployment](../docs/buyerorigin/DEPLOYMENT.md)
- [Working versus planned](../docs/buyerorigin/WORKING_VS_PLANNED.md)
- [YC qualification](../docs/buyerorigin/YC_QUALIFICATION.md)
