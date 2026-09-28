# CPL Customer Success Operating System

Production target: `https://cpl.clintware.com`

This is a candidate-built Customer Success operating prototype tailored to the public Compyl Director of Customer Success role. It is not an official Compyl product and does not use Compyl's logo.

## Purpose

The application demonstrates a zero-to-one Customer Success operating model rather than a decorative dashboard. It turns the role requirements into working surfaces for:

- portfolio segmentation and coverage
- account health scoring
- onboarding and time-to-value
- adoption and value realization
- GRR / NRR / churn / expansion visibility
- renewal forecasting
- executive escalations
- Voice of Customer to Product
- playbooks and operating cadence
- first-team hiring and capacity planning
- tooling architecture
- approval-gated recommendations

The default data is entirely synthetic and visibly labeled as simulation data.

## Architecture

The build reuses the mature `projects/dpl-crm` Worker + Durable Objects SQLite foundation and replaces its role/domain presentation with a Compyl-specific Customer Success layer.

- guest/no-login demo
- 180-day browser-persistent synthetic workspace
- Durable Objects SQLite records and audit trail
- same-origin mutation protection
- control-plane binding retained for optional approved AI/research capability
- no reusable provider credentials in the browser
- noindex / nofollow response policy
- resettable synthetic portfolio
- responsive application UI
- embedded scrollable application narrative
- no target-company logo assets

## Provenance

Public Compyl product and role research informs terminology and the proposed operating model. It is not treated as private customer data. Every built-in account is fictional.

## Build

```bash
node projects/cpl-cs-os/scripts/materialize.mjs
cd .build/cpl-cs-os
npm install --no-audit --no-fund
npm run check
npx wrangler deploy --dry-run
```

## Verification contract

The deployment workflow validates source, Worker dry-run, live API/state/security behavior, the custom domain binding, the synthetic data contract, and Chromium desktop/mobile traversal.
