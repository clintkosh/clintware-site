# CRM One Off

Use this internal skill for fast, role-specific Customer Success / implementation / TAM / support operating demos.

## Mandatory dependency

Read and apply `/ASTRO_CRM_ONE_OFF_SKILL.md` before implementation.

If the one-off is public-facing under Clintware, also apply `/ASTRO_WEBSITE_SKILL.md` and `/AGENTS.md`.

## Default job

Turn a current job/company context into a working CRM whose breadth and depth match the verified scope of the role.

Default workflow:

`ROLE + COMPANY -> RESPONSIBILITY MAP -> OPERATING LOOP(S) -> REUSE FOUNDATION -> REMOVE IRRELEVANT FEATURES -> ADD ROLE-JUSTIFIED DEPTH -> WORKING ACCOUNT WORKSPACE -> ROLE-RELEVANT OPERATIONS -> MEETING BRIEF / REQUIRED ARTIFACTS -> SAFE MIGRATION -> DEPLOY -> INTERACTIVE VERIFY`

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

The seeded portfolio must look like work is already moving through the system. Unless explicitly asked for an empty template, seed multiple accounts across materially different lifecycle stages.

Default portfolio contract:
- normally 5+ synthetic accounts or enough to span the role's lifecycle
- normally 4+ distinct lifecycle stages
- materially different health, progress, priority, evidence, risk, and next-action state across accounts
- at least one early-stage account, one in-flight implementation/operational account, and one mature value/renewal/expansion account when those motions exist

Each substantive account should normally have:
- at least 3 synthetic contacts with different decision roles
- at least 3 editable KPIs with coherent baseline/current/target state
- at least 2 actions; use mixed statuses across the portfolio
- at least 1 risk / operational issue
- stage-appropriate meeting-prep context
- clearly labeled synthetic provenance

Do not stamp the same generic record pack onto every account. Data across contacts, KPIs, risks, issues, actions, meetings, stage, and next action must form a coherent story.

## Scope-fit default

Do not optimize for "small" or "large."

Build the amount of system the position justifies.  A broad Director, CS Ops, Implementation, Support, TAM, Professional Services, or multi-system role may warrant a large CRM with many coordinated surfaces.  A narrower individual-contributor role may not.

For every major module, be able to answer: **Which verified responsibility or operating decision does this help demonstrate?**

If there is a strong answer, keep it.  If there is not, remove it.

## Hard defaults

- working beats decorative
- persistent beats mocked
- current role facts beat generic CRM assumptions
- proposed workflow is labeled proposed
- synthetic data is labeled synthetic
- no target-company logo cloning
- no live-tenant claim without a live tenant
- no arbitrary size target: a large CRM is correct when the role warrants it; irrelevant functionality is not
- no fake PDF
- no destructive seed upgrade
- no uniform empty-shell seed set when a populated demo is expected
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
