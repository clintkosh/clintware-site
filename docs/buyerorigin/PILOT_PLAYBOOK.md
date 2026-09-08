# BuyerOrigin founding design-partner pilot

## Pilot identity

The initial tester is referred to only as `Pilot Merchant A`.  No identifying merchant information belongs in source control, public pages, screenshots, fixtures, analytics notes, or case-study language.

## Offer

Provide a 14-to-30-day founding design-partner pilot.  Public attribution is not required.  The merchant can stop after the browser-local audit without installing anything.

## First-test flow

1. Merchant opens Shopify Admin.
2. Merchant selects **Orders → Export**.
3. Merchant selects a limited date range.
4. Merchant uploads the unedited CSV to BuyerOrigin.
5. BuyerOrigin displays suspected same-coupon reuse, matched evidence, prior order, estimated leakage, and recommended action.
6. Merchant tests a current shopper in the local simulator and receives `Allow coupon` or `Reject coupon`.
7. Merchant marks each reviewed case as legitimate match, abuse, uncertain, or merchant override.
8. Only after the evidence is reviewed, offer installation of the dedicated custom-distribution Shopify pilot app.

## Default pilot policy

- Exact same coupon code, case-insensitive.
- 2 of 3 normalized identity signals.
- Email, phone, and shipping or billing address.
- 365-day lookback.
- Zero allowed previous uses.
- Reject the coupon only.
- Missing evidence fails open.
- Merchant override or allowlist always remains available.

## What to measure privately

- Orders analyzed.
- Coupon uses analyzed.
- Suspected reuse count.
- Merchant-confirmed abuse count.
- Legitimate shared-identity/household cases.
- Uncertain cases.
- Override rate.
- Estimated and merchant-confirmed leakage.
- Review time.
- Whether the merchant wants live enforcement after review.
- Whether the merchant would pay after the pilot.

Do not convert a flagged count into a fraud or revenue claim.  Merchant confirmation is required.

## Consent ledger

Record four independent yes/no permissions for the merchant:

| Consent | Meaning |
| --- | --- |
| Private testing | BuyerOrigin may process the merchant's data for the agreed private pilot. |
| Anonymous aggregate metrics | Non-identifying aggregate results may be used publicly. |
| Anonymous quotation | A non-identifying merchant quote may be used publicly. |
| Named case study | Merchant identity and approved details may be published. |

No higher level is implied by a lower level.  Named attribution requires separate written permission.

## Install gate

Do not ask Pilot Merchant A to install the Shopify app until the CSV audit has produced reviewable evidence and the merchant wants to test live coupon rejection.  At that point, use the dedicated custom-distribution pilot app registration rather than consuming the future public App Store app's irreversible distribution choice.
