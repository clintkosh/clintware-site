# BuyerOrigin privacy and security

## Current MVP data boundary

- Order CSV content stays in browser memory.
- The MVP does not send order rows to the BuyerOrigin Worker.
- The MVP does not use a database, object storage, cookies, local storage, or session storage for order data.
- Closing or refreshing the page clears the working dataset.
- Export occurs only when the merchant clicks the export control.
- Google Analytics measures the page visit.  The audit engine does not include order fields in analytics events.

## Current matching boundary

- Only email, phone, and shipping address are normalized.
- A minimum of two matching signals is required.
- Device fingerprinting, IP reputation, payment fingerprints, cross-merchant identity, facial recognition, and data-broker enrichment are excluded.
- Results are eligibility-review signals, not fraud accusations.

## Production requirements

Before a connected Shopify pilot, BuyerOrigin must document and implement:

- Requested Shopify scopes and a field-level necessity map.
- Protected customer-data approval appropriate to required name, address, email, phone, and order fields.
- Mandatory customer-data request, deletion, and shop-redaction webhooks.
- Encryption in transit and at rest, secret isolation, retention periods, access logging, and incident response.
- Tenant isolation and authorization tests.
- A merchant-facing data-use notice and an end-customer appeal or correction path where applicable.
- A data-processing agreement and legal review for target jurisdictions.

Shopify states that protected customer-data requirements focus on data minimization, transparency, and security.  This document is a product control plan, not legal advice.
