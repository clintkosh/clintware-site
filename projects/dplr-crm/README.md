# DPLR Technical Customer Engineering OS

Production target: `https://dplrcrm.clintware.com`

This project intentionally materializes the mature Doppel Technical Customer Engineering CRM core from `projects/dpl-crm` and replaces its presentation shell with an N7 Customer Value OS-style operational workspace.

## Why the materialized build

The backend and functional modules already contain tested customer ingestion, Durable Objects SQLite persistence, guest workspaces, optional Clintware SSO, AI + Exa research through the control plane, Jira/Confluence bridges, Live Prompt, Live Assist, RACI, Technical Services, investigations, engineering handoffs, customer reviews, KPI/value tracking, support-scale workflows, data controls, and audit/security boundaries.

DPLR keeps that functional core while creating a separate product identity, worker, durable-object namespace, domain, OAuth context, cookies, and workspace.

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

1. Materialized source validation + syntax checks + Wrangler dry run.
2. Live API/data/security/AI/Exa/OAuth contract tests on the production domain.
3. Real Chromium traversal of all modules, theme modes, guest CRUD, stakeholder CRUD, customer search, desktop layout, and mobile overflow.

Browser screenshots are retained as workflow artifacts.
