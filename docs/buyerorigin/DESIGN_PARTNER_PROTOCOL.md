# BuyerOrigin anonymous design-partner protocol

## Required merchant label

The first merchant is `Pilot Merchant A` in every committed note, fixture, issue, pull request, screenshot annotation, report, and public artifact.

Never commit or publish its real company name, domain, industry, products, location, employees, coupon codes, customer/order data, identifying screenshots, identifying quotes, or results that could reasonably identify it.

## Consent levels

Consent is granular.  Record each level independently.

1. **Private testing**.  BuyerOrigin may process data supplied for the private pilot under the agreed workflow.
2. **Anonymous aggregate metrics**.  Clintware may publish non-identifying aggregate measurements approved by the merchant.
3. **Anonymous quotation**.  Clintware may publish an approved quotation that does not identify the merchant.
4. **Named case study**.  Clintware may identify the merchant and publish only the details separately approved in writing.

No consent level implies the next.  Public attribution always requires separate written permission.

## Repository hygiene

- Use only synthetic fixtures.
- Do not copy raw merchant exports into Git, issues, PRs, CI artifacts, screenshots, or test recordings.
- Keep pilot notes outside the public repository unless they are already anonymized to this protocol.
- Do not encode identifying details into hashes, filenames, branch names, fixture IDs, or comments.
- Before merging a pilot-related change, search the diff for merchant names, domains, coupon codes, email addresses, phone numbers, street addresses, and screenshots.

## Review outcomes

For each suspected reuse case, the merchant should classify the outcome as one of:

- Confirmed policy abuse.
- Legitimate match/shared identity.
- Uncertain.
- Merchant override/allowlist.

Public-facing metrics must distinguish algorithmic flags from merchant-confirmed outcomes.  A flagged order is not automatically abuse, fraud, recovered revenue, or prevented loss.

## Pilot closeout

At the end of the 14-to-30-day pilot, record privately:

- Whether the merchant wants the private Shopify app installed.
- Whether the default policy should change.
- Whether review burden is acceptable.
- Confirmed versus estimated leakage.
- Willingness to pay and preferred pricing structure.
- Which consent levels remain approved.

If the merchant declines public evidence, retain no public attribution and continue to use only `Pilot Merchant A` internally where necessary.
