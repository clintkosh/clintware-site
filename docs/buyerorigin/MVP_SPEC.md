# BuyerOrigin MVP specification

Status: working audit MVP as of September 6, 2026.

## Merchant job

Show a merchant which limited-offer redemptions may come from a buyer who already used the offer, without treating one changed or shared identifier as proof of abuse.

## Input

Required CSV columns:

| Column | Purpose |
| --- | --- |
| `order_id` | Stable merchant review reference |
| `email` | Email normalization and alias matching |
| `phone` | Digit-normalized phone matching |
| `address` | Conservative shipping-address normalization |
| `discount_code` | Identifies an offer redemption |
| `order_date` | Orders comparisons chronologically |
| `order_total` | Context for the merchant |
| `discount_amount` | Estimated leakage calculation |

Optional `is_new_customer_offer` values of `false`, `no`, or `0` exclude an ordinary promotion from repeat-new-customer analysis.

## Decision rule

An order is flagged only when two or more non-empty normalized signals match an earlier limited-offer redemption.  Current reason codes are `EMAIL_ALIAS_MATCH`, `PHONE_MATCH`, and `ADDRESS_MATCH`.

The rule is intentionally conservative.  One signal never triggers a flag.  A flag creates a review recommendation, not a statement that fraud occurred.

## Merchant controls

- Monitor mode sends flagged records to review.
- Enforcement simulation changes the recommendation to deny the discount.
- Allowlisted order IDs remain visible and are labeled as merchant overrides.
- CSV export creates a portable review record.

## Acceptance criteria

- Safe sample data produces two flags and $43.00 estimated leakage.
- A single matching signal remains clear.
- An allowlist override removes the record from flagged totals without deleting its evidence.
- No result can recommend denying checkout.
- Invalid CSV input returns a specific missing-column error.

## MVP boundary

This proves the audit workflow and explainable decision contract.  It does not prove real-time Shopify integration, merchant demand, willingness to pay, or production accuracy.
