# CRM One Off

Use this internal skill for fast, role-specific Customer Success / implementation / TAM / support operating demos.

## Mandatory dependency

Read and apply `/ASTRO_CRM_ONE_OFF_SKILL.md` before implementation.

If the one-off is public-facing under Clintware, also apply `/ASTRO_WEBSITE_SKILL.md` and `/AGENTS.md`.

## Default job

Turn a current job/company context into the smallest working CRM that proves the role.

Default workflow:

`ROLE + COMPANY -> OPERATING LOOP -> REUSE FOUNDATION -> STRIP BLOAT -> WORKING ACCOUNT WORKSPACE -> STAKEHOLDERS -> KPIS -> ACTIONS -> MEETING BRIEF -> REAL PDF -> SAFE MIGRATION -> DEPLOY -> INTERACTIVE VERIFY`

## Default build contract

Unless the role clearly requires otherwise, include:

- Portfolio
- Account Workspace
- one primary role-specific health / delivery surface
- adoption / utilization / value surface
- escalation + technical / delivery handoff
- Meeting Brief
- Executive Brief
- application rationale only when it helps the hiring artifact

Each account should normally have:

- at least 3 synthetic contacts with different decision roles
- at least 3 editable KPIs
- at least 1 open action
- at least 1 risk / operational issue
- meeting-prep context
- clearly labeled synthetic provenance

## Hard defaults

- working beats decorative
- persistent beats mocked
- current role facts beat generic CRM assumptions
- proposed workflow is labeled proposed
- synthetic data is labeled synthetic
- no target-company logo cloning
- no live-tenant claim without a live tenant
- no generic giant CRM by default
- no fake PDF
- no destructive seed upgrade
- no completion claim without browser verification

## Reuse priority

Prefer, in order:

1. strongest verified existing CRM persistence/security/deployment base
2. target-role-specific operating model
3. minimal UI overlay
4. deterministic functionality
5. optional integrations only when needed

Do not duplicate infrastructure that is already working.

## Testing minimum

The final browser smoke must create data and download a PDF, not merely render the page.

Required test journey:

`PORTFOLIO -> SELECT ACCOUNT -> ADD CONTACT -> VERIFY PERSISTENCE -> UPDATE KPI -> ACTION -> MEETING BRIEF -> DOWNLOAD VALID PDF -> ESCALATION/HANDOFF -> DESKTOP + MOBILE EVIDENCE`

## Done

"Done" means the ASTRO rejection checklist passes.

If a test catches a defect, repair the defect. Do not redefine success downward.
