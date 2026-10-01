# NMA CRM — Savings Report

Date: 2026-10-01  
Live URL: https://nma.clintware.com

## Measured savings

### Server-side database usage

Normal candidate-demo CRM state now persists in browser `localStorage`, so the live health and browser acceptance contracts report:

- Server-side database row operations per normal demo session: **0**
- Browser-local workspace measured during current final acceptance: **121,747 bytes**

This removes the database-row quota dependency that blocked the earlier server-backed NMA demo path. Static asset and Worker requests still exist; this report does not claim zero hosting/network usage.

### LLM usage in implementation pipeline

The final validation/deployment path was deterministic repository automation plus real-browser testing. No LLM API was invoked inside the materialize, syntax-check, role-logic, deployment, HTTP, CRUD, PDF, or responsive-test pipeline.

### qq accounting

qq was preferred and dispatched first, but the control-plane row-read quota failed before delivery to DRIZNET.

- qq dispatches: **1**
- qq deliveries: **0**
- qq local executions: **0**
- qq-attributed token savings: **0**

No hypothetical qq savings are reported as actual savings.

## Structural efficiency

The NMA system remains an adaptive one-off layer over the current ASTRO CRM foundation rather than a separately maintained full CRM fork. NMA-specific work is concentrated in its manifest, synthetic dataset, role overlay, local persistence adapter, tests, and deployment contract. This reuses the established CRM shell and limits duplicated implementation surface.

No fabricated dollar value or unmeasured token percentage is assigned to that reuse.

## Cost/reliability tradeoff

The browser-local persistence change is appropriate for this candidate demonstration because it:

- keeps the live system functional when the server database row quota is unavailable;
- preserves CRUD and reload persistence in the visitor's browser;
- reduces normal demo database-row consumption to zero;
- avoids spending provider/LLM resources on runtime health checks.

Current limitation: browser-local state is not synchronized between browsers/users and is not intended to be presented as a shared production customer database.


## 2026-10-01 populated-seed update

The larger seeded portfolio intentionally increases browser-local demo state from the earlier 81,066-byte measurement to **121,747 bytes** while retaining **0 server-side database row operations per normal demo session**.

The additional state is functional demonstration data rather than duplicated decoration: six lifecycle phases, stage-specific contacts, KPI evidence, risks/issues, actions, adoption state, meetings, and call-prep context.

### QQ accounting for this update

QQ was used for deterministic source synchronization on MEMORIA:

- request: `memoria-nma-repo-sync-20261001-0909`
- local job: `53dfbd0b-2844-49ea-8ff1-e28ba667a6ba`
- status: **passed**
- confirmation: `qq-local-agent` over `websocket-event`
- observed result: MEMORIA refreshed its maintained repository cache to current `origin/main` and found `SAMPLE_SEED_VERSION=2`.

An earlier local CRM build returned a pass against stale source and is excluded from final validation/savings credit. A later request containing `RepoRoot` was rejected by the bounded remote allowlist before execution and likewise receives no execution credit.

The final application verification used deterministic CI/browser checks and did not invoke an LLM inside materialization, role-logic validation, deployment, CRUD, persistence, PDF, lifecycle-depth, or responsive testing.
