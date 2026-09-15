# BuyerOrigin YC qualification and evidence gaps

Status: current number-one Winter 2027 YC validation track as of September 7, 2026.

## One-line pitch

**BuyerOrigin helps merchants stop the same buyer from using the same coupon again.**

The initial Shopify wedge is intentionally narrower than a generalized fraud or identity platform.  BuyerOrigin compares permitted buyer signals, requires multiple matches, explains the prior-use evidence, and rejects only the coupon rather than the checkout.

## Why it remains #1

- The browser-local product works before installation.
- A merchant can test it from an ordinary Shopify Orders CSV in minutes.
- The economic unit is concrete: historical coupon reuse and estimated discount leakage.
- The default policy is conservative and reviewable: same code, 2 of 3 identity signals, 365 days, zero previous uses, fail open on missing evidence.
- Shopify now provides an official Discount Function rejection operation that can reject entered discount codes without blocking the checkout.
- The next evidence is external merchant review, not more speculative feature breadth.

## Current repository evidence

- Native Shopify Orders CSV parsing.
- Multi-line-item order collapse.
- Case-insensitive same-code comparison.
- 2-of-3 and optional 3-of-3 identity policy tests.
- Lookback, merchant override, and missing-evidence fail-open tests.
- Matched evidence, prior order, estimated leakage, export, and current-checkout simulation.
- Shopify rejectable-only coupon rejection contract and tests.
- Architecture, privacy/security, installation, anonymous design-partner, deployment, and working-versus-planned documentation.
- Public site consistently presents BuyerOrigin first.

## Evidence gaps

BuyerOrigin does **not** yet have repository-supported proof of:

- Shopify installation on a merchant store.
- Live production coupon rejection.
- Protected customer-data approval.
- Merchant-confirmed abuse or recovered leakage.
- Paid usage, revenue, or willingness-to-pay evidence.
- False-positive/override rates on real merchant data.
- Repeat merchant usage or retention.
- Public case-study permission.

These gaps must remain explicit in YC materials until actual evidence exists.

## Keep-primary trigger

BuyerOrigin should stay the primary YC pitch if the next validation period produces merchant-confirmed economic value and a credible path to payment.  Strong signals include:

- Pilot Merchant A completes a bounded CSV audit and review.
- The merchant confirms at least some suspected reuse as policy abuse rather than legitimate shared identity.
- Review burden and override rate are acceptable.
- The merchant asks to test the private Shopify enforcement path.
- The merchant provides a concrete willingness-to-pay signal after the 14-to-30-day pilot.

Additional merchants strengthen the case, but the first priority is learning from the simplest private pilot rather than manufacturing a larger funnel before the workflow is validated.

## YC claim discipline

Do not convert synthetic test results into traction.  Do not describe suspected reuse as confirmed fraud.  Do not claim the Shopify app is installed or deployed until installation/deployment evidence exists.  Do not identify Pilot Merchant A without separate written named-case-study permission.

## Current venture order

1. BuyerOrigin.
2. Quillgeist.
3. RenewNudge.
4. ShoulderSoldier.
5. LandThePlane as supporting proof, not a competing primary startup pitch.
