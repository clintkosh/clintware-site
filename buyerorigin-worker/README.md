# BuyerOrigin audit MVP

BuyerOrigin is a browser-local merchant audit for repeated limited-offer promotion use.  It is the first working wedge for Clintware's commerce identity and promotion-eligibility product track.

## What works now

- Loads a Shopify-style CSV export by file selection or paste.
- Normalizes Gmail aliases, phone numbers, and shipping addresses.
- Requires at least two matching buyer signals before flagging an order.
- Produces reason codes and identifies the prior matched redemption.
- Supports monitor mode, an enforcement simulation, and merchant allowlist overrides.
- Estimates promotion leakage from flagged discount amounts.
- Exports the merchant review queue as CSV.
- Performs all order-data analysis in browser memory.  The CSV is not uploaded or stored.

## What is not shipped

- Shopify installation, OAuth, billing, or protected customer-data access.
- A Shopify Discount Function or live discount denial.
- Hosted merchant accounts, dashboards, cross-store identity, or device fingerprinting.
- A proven false-positive rate, paid pilot, or merchant ROI claim.

The enforcement simulation means `deny the discount`, never `deny checkout`.

## Run checks

```bash
node --test test/*.test.mjs
node --check src/index.js
node --check src/browser-engine.js
node --check src/browser-app.js
```

## Routes

- `/` working local audit
- `/healthz` version and capability status
- `/engine.js` browser-local decision engine
- `/app.js` browser interface behavior
- `/sample.csv` synthetic test data

## Documentation

- [MVP specification](../docs/buyerorigin/MVP_SPEC.md)
- [Architecture and Shopify path](../docs/buyerorigin/ARCHITECTURE.md)
- [Privacy and security](../docs/buyerorigin/PRIVACY_SECURITY.md)
- [Pilot playbook](../docs/buyerorigin/PILOT_PLAYBOOK.md)
- [YC qualification](../docs/buyerorigin/YC_QUALIFICATION.md)
