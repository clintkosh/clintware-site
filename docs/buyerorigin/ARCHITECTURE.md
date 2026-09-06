# BuyerOrigin architecture and Shopify path

## Current system

The public Cloudflare Worker serves a static interface, the decision engine, and synthetic sample data.  Merchant CSV content is read and analyzed in browser memory.  The current Worker has no order-data endpoint, database binding, or upload route.

`CSV -> browser parser -> normalized signals -> two-signal comparison -> explainable review queue -> local CSV export`

## Production Shopify path

The production design is a hybrid app:

1. Shopify Admin API and privacy-compliant webhooks provide permitted order and customer events to the hosted control plane.
2. The control plane computes compact eligibility state and merchant-readable reasons.
3. App-owned metafields carry the minimum decision state needed during discount execution.
4. A unified Shopify Discount Function reads Shopify input plus the precomputed state.
5. A high-confidence policy can deny the discount while allowing checkout to continue.
6. The merchant dashboard keeps monitor mode, allowlists, overrides, outcome review, and leakage reporting.

This avoids assuming ordinary Shopify stores can call BuyerOrigin in real time from a Function.  Shopify documents limited fetch-target network access and recommends pre-populating Function data through metafields or cart attributes.  Function input and metafield limits also require a compact risk pack.

## Production gates

Do not build live enforcement until all of these are true:

- Three design partners provide usable historical exports.
- The audit finds meaningful, manually reviewable leakage.
- Merchants accept the two-signal rule and override flow.
- Protected customer-data access requirements and mandatory privacy webhooks are designed and reviewed.
- The Discount Function input contract is tested against Shopify's current API version and resource limits.

## Primary technical sources

- Shopify Function APIs: https://shopify.dev/docs/api/functions/2026-01
- Shopify protected customer data: https://shopify.dev/docs/apps/launch/protected-customer-data
- Shopify App Store requirements: https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements
