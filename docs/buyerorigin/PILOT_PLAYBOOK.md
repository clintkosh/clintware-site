# BuyerOrigin design-partner pilot playbook

## Qualification gate

Recruit three Shopify merchants that use a limited new-customer or welcome offer.  A useful design partner should have either at least 10 suspicious redemptions per month or a plausible $250 or more in monthly promotion leakage, plus willingness to consider $39 to $99 per month if the review is useful.

## Pilot sequence

### Days 1 to 7

- Ask for a limited, date-bounded CSV export rather than store credentials.
- Run BuyerOrigin locally in monitor mode.
- Review every flagged row with the merchant.
- Record confirmed abuse, legitimate household/shared-address use, uncertainty, and allowlist decisions.

### Days 8 to 21

- Refine normalization only from repeated merchant evidence.
- Measure review time, confirmed leakage, false positives, false negatives found manually, and override rate.
- Do not add device or IP signals unless the basic workflow fails and a privacy review supports the need.

### Days 22 to 30

- Present a leakage and accuracy readout.
- Ask for a paid continuation at $39 to $99 per month.
- Obtain permission separately before using an anonymized result as public proof.
- Decide whether to build the connected Shopify monitor.

## Continue criteria

Continue when all three merchants complete a review, at least two report meaningful recoverable value, the review burden is acceptable, and at least one agrees to pay.  Pause or narrow the idea when merchants rank the problem low, evidence quality remains poor, or false positives cannot be controlled with the two-signal and override model.

## Pilot outputs

- Anonymized order count and offer-redemption count.
- Flagged count and manually confirmed count.
- Estimated and confirmed leakage.
- False-positive and override rates.
- Time to review.
- Exact willingness-to-pay response.
