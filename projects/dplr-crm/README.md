# DPLR Technical Customer Engineering OS

Production: `https://dplcrm.clintware.com`

This project intentionally materializes the mature Doppel Technical Customer Engineering CRM core from `projects/dpl-crm` and replaces its presentation shell with an N7 Customer Value OS-style operational workspace.

## Purpose

DPLR is a candidate operating prototype for the Technical Customer Engineer role. It is designed to demonstrate advanced investigation, supported Technical Services, evidence-quality specialist handoffs, customer call preparation, and the conversion of repeated technical work into Support playbooks, automation, self-service, or Product signal.

It is not an official Doppel product and does not claim access to private Doppel customer configuration.

## No-login demo boundary

DPLR deliberately has no interactive SSO sign-in. The candidate/demo workspace is anonymous and browser-persistent for up to 180 days unless site data is cleared. Export/import provides portability.

The production build disables `/auth/login`, `/auth/callback`, and `/auth/logout`, does not advertise an OAuth app in `/health`, and removes the external identity origin from the form-action policy. Provider credentials for AI/Exa and other server-side adapters remain behind the Clintware control plane.

Provider write operations that require a trusted identity remain unavailable to the anonymous demo rather than weakening authorization.

## Default dataset

The resettable workspace contains ten curated accounts:

- one protected synthetic golden scenario
- three public Doppel customer references, limited to Doppel-published facts and explicitly separated from proposed discovery
- six clearly synthetic enterprise scenarios covering e-commerce, healthcare, Web3, banking, manufacturing, and SaaS

Every curated sample contains usable preparation data such as stakeholders or proposed stakeholder roles, a technical review, milestones, actions, adoption/scale measures, a work item, call preparation, and an approved demo playbook. Synthetic accounts also carry realistic incidents, dependencies, risks, and Engineering handoff examples where appropriate. Public-reference accounts never fabricate private incidents or architecture.

## Call preparation and ramp library

The preparation workspace includes:

- a 15-minute evidence-first prep flow
- issue-specific cards for SSO/identity, APIs/webhooks, SIEM/data flows, product behavior, reporting/metrics, and custom architecture
- a shared technical glossary spanning identity, APIs, webhooks, SIEM normalization, evidence, incident response, and Support graduation
- official Doppel product videos and integration guides
- official Okta identity training
- official Splunk getting-started material
- official Postman API troubleshooting material
- Atlassian incident-management guidance
- printable preparation output with the same vocabulary, evidence gates, and training links

## UI model

The shell follows the operating model used by `n7crm.clintware.com`:

- compact sticky application header
- portfolio first, not a marketing landing page
- breadcrumb/action context bar
- left grouped workspace navigation
- focused central working area
- right customer context rail
- explicit previous/next navigation
- light-first visual system with dark/system modes
- restrained Doppel-derived blue/lime/cyan accents

The retired `doppel-brand.css` and `doppel-polish.js` presentation layer is not shipped by this application.

## Functional core

The materialized backend retains tested customer ingestion, Durable Objects SQLite persistence, anonymous browser workspaces, AI + Exa research through the control plane, Live Prompt, Live Assist, RACI, Technical Services, investigations, Engineering handoffs, customer reviews, KPI/value tracking, Support-scale workflows, data controls, and audit/security boundaries.

## Build

```bash
node projects/dplr-crm/scripts/materialize.mjs
cd .build/dplr-crm
npm install
npm run check
npx wrangler deploy --dry-run
```

## Production gates

`.github/workflows/deploy-dplr-crm.yml` enforces three independent layers:

1. Materialized source validation, syntax checks, no-login build assertions, vocabulary/training assertions, and Wrangler dry run.
2. Live API/data/security/AI/Exa/no-login tests, including dataset richness and public-vs-synthetic provenance boundaries.
3. Real Chromium traversal of all modules, theme modes, preparation/training content, rich default scenarios, guest CRUD, stakeholder CRUD, customer search, desktop layout, and mobile overflow.

Browser screenshots are retained as workflow artifacts.
