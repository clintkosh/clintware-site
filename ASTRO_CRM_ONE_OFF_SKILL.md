# ASTRO CRM One Off Skill

## Purpose

Build a one-off, company- and role-specific CRM/application operating demo that proves how the operator would actually run the job.

This ASTRO exists because the recurring failure mode is a polished but mostly static CRM that looks like a generic product demo instead of useful evidence.

A CRM One Off is successful only when a reviewer can click into an account and see a believable working operating motion.

Canonical lifecycle:

`RECOVER PRIOR PATTERNS -> VERIFY ROLE + COMPANY -> EXTRACT ROLE MISSION -> DEFINE OPERATING LOOP -> REUSE STRONGEST BASE -> STRIP IRRELEVANT FEATURES -> BUILD WORKING ACCOUNT WORKSPACE -> SEED SYNTHETIC DATA -> VERIFY PERSISTENCE -> GENERATE REAL MEETING BRIEF PDF -> DEPLOY -> LIVE VERIFY -> INTERACTIVE BROWSER TEST -> EVIDENCE -> STOP`

## When this ASTRO is mandatory

Apply this ASTRO before building or materially changing any:

- job-application CRM
- company-specific Customer Success demo
- implementation / post-sales operating demo
- TAM / support / professional-services customer workspace
- role-specific CRM prototype modeled after a prior Clintware CRM
- one-off interview or hiring-manager operating-system demonstration

If the user says any equivalent of:

- "make one like Doppel"
- "spin up a CRM for this role"
- "use the strongest CRM pattern"
- "tailor the CRM to this company"
- "make this smaller and sharper"
- "show how I would operate the role"

this ASTRO overrides the tendency to copy the full advanced CRM feature set.

## Core rule

**The one-off CRM should be exactly as broad and deep as the target role warrants.**

A compact CRM is correct for a narrow role.  A large, deeply featured CRM is equally correct when the verified position spans multiple operating motions, systems, stakeholders, integrations, delivery functions, or leadership responsibilities.

The governing question is not "How small can this be?" or "How many features can we add?"  It is:

**Does each significant surface materially map to something this role is expected to own, influence, inspect, coordinate, or communicate?**

Reject unjustified functionality, not size.

Before coding, reduce the public job description and current company context to one operating loop.

Example:

`PORTFOLIO -> PLATFORM HEALTH -> ADOPTION / UTILIZATION -> ESCALATION -> DELIVERY HANDOFF -> EXECUTIVE BRIEF`

The loop changes by role. The principle does not.

Every visible surface must support that loop.

If a feature does not materially prove the target role, remove it or leave it out.

## Canonical adaptive-base rule

The ASTRO is the conceptual base.  A prior company build is never the conceptual base.

- Treat the one-off ASTRO plus the reusable Customer Success CRM architecture as the durable source of truth for how a role-specific build should be shaped.
- Prior company implementations such as DPLR/Doppel, CXponent, SimSpace, Neuron7, Boom, or later builds are reference implementations only.  Reuse their strongest infrastructure when useful, but never inherit their company identity, terminology, operating assumptions, visual language, sample data, or feature scope by default.
- Choose the strongest current implementation base at build time according to persistence, security, deployment, testing, and component maturity.  That implementation choice is an execution detail, not the product model.
- Express the new company's role mission, operating loop, tracks, terminology, synthetic data, visual treatment, and acceptance criteria through an adaptable manifest/overlay or equivalent delta.
- Strip source-company semantics before adding target-company semantics.  A successful build should be able to change its implementation reference later without changing the role-specific operating model.
- In manifests, distinguish the conceptual base from the implementation reference when useful, for example `base_project: adaptive-astro-one-off` and `implementation_reference: dplr-crm`.
- New reusable lessons belong back in ASTRO or the generic advanced CRM skill rather than being trapped inside a company-specific fork.

This rule prevents the reusable system from slowly becoming "the Doppel template" or any other employer-specific template.



## Current implementation-reference default

When the current verified repository still shows `dplr-crm` as the strongest mature browser-local CRM foundation, prefer it as the implementation reference for new Customer Success / CS Operations / Implementation / Professional Services / TAM / Support application CRMs.

The manifest should state:

```json
{
  "base_project": "adaptive-astro-one-off",
  "implementation_reference": "dplr-crm",
  "persistence_mode": "browser-local",
  "remote_state_required": false,
  "durable_objects_required": false
}
```

This is an implementation default, not a conceptual-template rule.  Re-evaluate it when a later generic foundation is demonstrably stronger.

For CRM+Cover local-factory builds, inherit the application quality gates from `ASTRO_CRM_COVER_SKILL.md`.  In particular, an unsupported metric is a release-blocking defect, not a cosmetic copy issue.

## Paired application profile: CRM+Cover

When the application also includes a Why Company / Why Us field and/or a cover-letter field, use `ASTRO_CRM_COVER_SKILL.md` as the application-package wrapper around this CRM ASTRO.

The CRM remains the operating proof-of-work.  The written artifacts remain separate:
- Why Company explains company-specific motivation and trajectory.
- Cover Letter maps the candidate's evidence to the role and may reference the CRM as proof.
- The CRM demonstrates how the role would actually be operated.

A public CRM link may enter final application copy only after the exact route has been live and interactively verified.

## Required discovery sequence

1. Recover the strongest relevant prior CRM implementation and the user's corrections to it.
2. Inspect the current repository and live deployment before modifying anything.
3. Verify the current job posting and company context from current public sources.
4. Extract:
   - role mission
   - post-sales / implementation lifecycle
   - key customer personas
   - important technical systems
   - explicit KPIs / outcomes
   - escalation / handoff expectations
   - executive communication expectations
   - any commercial / adoption / renewal responsibilities
5. Separate:
   - PUBLIC FACT
   - USER FACT
   - SYNTHETIC DEMO DATA
   - PROPOSED OPERATING MODEL
6. Decide the minimum operating surfaces before implementation.
7. Reuse the strongest existing persistence, security, deployment, and test foundation where practical.
8. Do not inherit unrelated features merely because the source CRM has them.

## Default surface pattern

Start with this compact pattern and remove or rename surfaces when the role does not need them:

1. **Portfolio**
2. **Account Workspace**
3. **Primary Operational Health Surface**
4. **Adoption / Utilization / Value**
5. **Escalation + Technical / Delivery Handoff**
6. **Meeting Brief**
7. **Executive Brief**
8. **Why This Build** only when the app is explicitly an application artifact

Do not split one operating concept across multiple pages simply to create more navigation.

Do not add Jira, Confluence, RACI, ingestion, live AI, call recording, sprints, deployment boards, or other advanced modules unless the role actually benefits from them.

## Functional minimum

A one-off CRM is not complete unless the following are real, persisted workflows.

### 1. Account workspace

Every account must have a usable working surface, not just a row in a portfolio table.

At minimum support:

- account name
- industry / terrain
- lifecycle / stage
- current priority
- health / risk
- next action

The operator must be able to select an account and work it.

### 2. Key contacts are first-class records

Do not stop at a single sponsor name.

A convincing demo account should normally include at least three synthetic stakeholder roles when relevant:

- executive sponsor / value owner
- technical or platform owner
- operational champion / service owner

Stakeholder fields:

- name
- title / role
- organization
- decision or influence role
- engagement status
- email
- phone
- notes
- provenance

The user must be able to add contacts.

Where meeting prep shows stakeholders, provide a direct path to add or edit them rather than forcing navigation away.

### 3. KPIs / success criteria

Every substantive demo account should normally include at least three role-relevant KPIs.

Each KPI should support:

- metric name
- current value
- target
- owner
- cadence
- source
- definition
- last updated when useful

KPIs must be updateable. Static KPI cards are insufficient.

Use role-relevant measures. Examples may include:

- platform health
- adoption
- license utilization
- critical CI ownership
- incident aging
- milestone completion
- value evidence
- renewal readiness

Do not invent realized business outcomes.

### 4. Actions and notes

The account needs execution state.

Support:

- action
- owner
- due date
- status
- completion
- account note / context

Actions must persist and be completable.

### 5. Operational evidence

Use the target role's real operating vocabulary.

For ServiceNow-oriented work this can include:

- incident
- problem
- change
- CMDB / CSDM
- release readiness
- Success Plays
- entitlements / license utilization
- Architect / delivery handoff

For another company, substitute the actual public product and operating model.

Do not invent private internal processes.

### 6. Meeting preparation

Meeting prep must be generated from stored account state.

At minimum support:

- meeting type
- meeting date
- objective
- selectable attendees from account contacts
- account snapshot
- KPI / target summary
- open actions
- current risks
- relevant escalation context
- decisions / questions
- proposed agenda

Missing data must remain visibly missing. Never fill gaps with invented facts.

### 7. Real downloadable PDF

"Print this page" is not the default definition of done.

The CRM must generate an actual downloadable PDF or an equivalent explicitly requested artifact.

The PDF must be derived from the current account state.

Verification must confirm:

- file download occurs
- file is non-trivial in size
- file begins with a valid `%PDF` signature
- briefing content reflects the selected account

When practical, save the generated prep record back to account history.

## Synthetic-data rule

Application demos must use clearly marked synthetic data unless the user supplies authorized real data.

Required:

- visible synthetic-data labeling
- fictional customer accounts
- fictional stakeholder identities
- fictional incidents / metrics where examples are needed
- no private target-company customer information
- no implication of a live tenant when none exists
- no implication that a proposed workflow is the target company's actual private process

Use public company terminology only to make the operating model credible.

## Default populated-demo rule

A tailored CRM must **look and behave like an operating system already in motion**, not like a freshly installed empty shell.

Unless the user explicitly requests an empty template, every new one-off CRM must ship with a coherent synthetic portfolio that demonstrates the lifecycle and the relationships between records.

Default seed contract:

- normally at least **5 synthetic accounts**, or enough accounts to cover the role's meaningful lifecycle
- normally at least **4 distinct lifecycle stages** across the portfolio; use more when the role spans more stages
- at least **3 stakeholder roles per substantive account**
- at least **3 role-relevant KPIs per substantive account**
- at least **2 actions per substantive account**, with mixed statuses across the portfolio
- at least **1 material risk or operational issue per substantive account**
- meeting-prep context derived from that account's current state
- different health, progress, priority, ownership, evidence, and next-action states across accounts
- dates, statuses, owners, dependencies, metrics, and next actions must tell one internally consistent story

Do not clone one generic record bundle across every account. Seed data must show motion such as:

`DISCOVERY -> DESIGN / GOVERN -> IMPLEMENT / DEPLOY -> ADOPT / OPERATE -> PROVE VALUE -> RENEW / EXPAND`

Use role-appropriate stages rather than these exact labels when needed.

The portfolio should visibly include a mix of:
- early-stage accounts where discovery/evidence is incomplete;
- in-flight accounts with implementation work, dependencies, and risk;
- mature accounts with measurable adoption/value evidence;
- at least one account where an escalation or blocker changes the operating plan when the role warrants it;
- at least one account where renewal, expansion, executive review, or next-phase planning is credible when the role owns that motion.

Synthetic progress must be plausible. A mature account should not simultaneously show untouched discovery, zero adoption, completed expansion, and no explanation. Metrics, risks, actions, meetings, and account stage must agree with each other.

This is a **functional default**, not presentation filler. Browser acceptance should verify account-stage variety, record depth, mixed status state, and at least one complete cross-surface flow.

## Visual-tailoring rule

Match the target company's **format, density, editorial feel, and public visual relationships** when useful.

Do not create trademark confusion.

Default rules:

- do not copy the target company's logo into a candidate-built demo unless explicitly authorized
- do not present the demo as an official target-company product
- do not copy private or proprietary assets
- use the company's public vocabulary and general visual feel, not a counterfeit interface
- keep the candidate-built / synthetic boundary visible
- keep the page `noindex, nofollow` for application demos unless the user explicitly changes that

For Clintware-owned public surfaces, also apply `ASTRO_WEBSITE_SKILL.md` and `BRAND_STANDARDS.md`.

## Persistence rule

Buttons that appear to save must really save.

Do not ship:

- fake edit controls
- fake toggles
- fake "generate" buttons
- state that disappears unexpectedly
- hard-coded updates masquerading as persistence

Follow `docs/astro-local-first-persistence-standard.md`.

For one-off demos, **browser-local persistence is the default**, not merely an acceptable fallback.  Prefer `localStorage` for ordinary structured CRM state and IndexedDB when the browser-local dataset is larger or file-oriented.  Use an in-memory fallback if browser persistence is unavailable.

Hosting and persistence are separate decisions.  A demo may remain hosted on Cloudflare Pages or a stateless Cloudflare Worker without any Durable Object or server database.

Remote persistence is allowed only when the requested workflow materially requires cross-device retention, shared multi-user state, server-authoritative audit history, background/webhook processing, or another capability that cannot be satisfied locally.  The manifest must explicitly declare the remote-state requirement and reason.

Do not inherit Durable Objects merely because the implementation reference uses them.  A browser-local or stateless build must generate no required `durable_objects` binding and must stay usable when Durable Objects are unavailable.

## Seed and migration rule

A seed-version bump is not a migration.

This is a permanent lesson from the Norseman build.

When built-in demo accounts already exist, a new seed version must explicitly handle prior records.

Default safe behavior:

1. Preserve user-created and user-edited records.
2. Refresh only records whose provenance is known to be replaceable, such as:
   - `synthetic_sample`
   - `template`
   - `scenario`
3. Never wipe `internal_record`, `customer_provided`, or other user-owned records merely to update sample data.
4. Use stable record keys where possible to avoid duplicate seeded records.
5. Verify migration against an already-existing workspace, not only a clean workspace.
6. Destructive reset remains a separate explicit action.

A deployment that silently discards user-entered contacts, KPI updates, notes, or actions is a failed deployment.

## Reuse rule

Reuse infrastructure, not irrelevant UI.

Prefer inheriting:

- Worker / app server pattern
- persistence
- same-origin mutation protection
- security headers
- deployment workflow
- domain binding
- analytics conventions
- test utilities
- record APIs
- migration helpers

Do not automatically inherit:

- every page
- every integration
- every record type
- every admin panel
- every AI surface
- every knowledge surface

The user should not have to correct scope after every build.  The agent must justify breadth against the role: remove irrelevant functionality, but retain or add substantial depth when the position genuinely requires it.

## Browser-safety rule

Avoid front-end identifiers that collide with browser globals or DOM globals.

The Norseman `top()` collision is a regression case.

Requirements:

- prefer scoped/module-local names
- run syntax validation
- run the app in a real browser
- capture page errors
- capture failed requests
- fail the build on runtime JavaScript errors

Passing `node --check` is not enough.

## Test-selector rule

Use stable, accessible, exact selectors for browser smoke tests.

Prefer:

- role + exact accessible name
- stable data attributes when role/name is not unique

Avoid ambiguous broad text selectors when the same words can appear in navigation, headings, and content.

The "Meeting Brief" strict-mode collision is a regression case.

Do not weaken a functional test merely to make CI green. Fix stale assertions or the implementation.

## Validation sequence

Do not call the CRM complete after source generation.

### Gate A — source

Verify:

- syntax
- imports / dependencies
- prohibited secrets
- expected build-contract strings
- no accidental target-company logo/assets when prohibited
- no stale references to the source CRM identity
- no browser-global naming hazards where detectable

### Gate B — deployment

Verify:

- build/materialization
- dry run
- Worker/app deployment
- custom domain or route attachment
- health endpoint
- expected security headers
- `noindex` behavior for application demos

### Gate C — live data

Verify against the deployed app:

- expected account count / samples
- account selection
- stakeholder depth
- KPI depth
- persistence mode
- seed migration behavior
- expected record types

### Gate D — interactive browser

Exercise real workflows, not just page load.

At minimum:

1. open the portfolio
2. select an account
3. open Account Workspace
4. add a contact
5. verify it persisted
6. update a KPI
7. add or complete an action
8. open Meeting Brief
9. select / verify attendees
10. generate the brief
11. download the PDF
12. verify the downloaded PDF signature and size
13. visit the escalation / handoff surface
14. capture desktop evidence
15. capture mobile evidence

Use an isolated browser/test workspace when possible so smoke-test records do not pollute the user's primary demo state.

## Evidence rule

Never report:

- "live"
- "working"
- "deployed"
- "saved"
- "PDF generated"
- "mobile verified"
- "migration preserved data"

unless that exact state was verified.

Separate:

- source changed
- build passed
- deployed
- live API verified
- interactive browser verified

## Positioning rule for application demos

The demo should communicate:

**"I understood the operating problem deeply enough to model how I would work it."**

Do not position it as:

**"I built your company a replacement CRM."**

Use the demo as evidence of thinking and operating design.

The actual employer's systems and processes remain the source of truth.

## Default completion report

Return only verified facts:

- live route
- repository / final commit
- deployment run
- operating loop
- working surfaces
- persistence behavior
- sample-data boundary
- stakeholder behavior
- KPI behavior
- meeting-brief / PDF behavior
- migration behavior
- interactive smoke-test result
- known limitations

Do not pad the completion report with unverified implementation claims.

## Lessons permanently encoded from the Norseman build

These are not optional suggestions.

1. A static dashboard is a failure even if it looks polished.
2. A one-off CRM needs a real account workspace.
3. Key contacts need names, roles, decision context, and persistence.
4. A single sponsor is insufficient for a believable post-sales operating model.
5. KPIs need current values, targets, ownership, cadence, and editability.
6. Actions and notes must be operational, not decorative.
7. Meeting prep must consume current workspace state.
8. A briefing "PDF" must actually download as a valid PDF.
9. The app should be scope-fit: compact when the role is narrow, or as broad/deep as the role requires.  Size itself is neither a virtue nor a defect.
10. Target-company visual feel is useful; target-company logo cloning is not.
11. Public research is not private account truth.
12. Synthetic data must be unmistakably synthetic.
13. Browser runtime failures can survive source syntax checks; real browser testing is mandatory.
14. Browser-global collisions must be treated as a known front-end risk.
15. Seed schema changes must migrate existing workspaces safely.
16. User-created records must survive synthetic-data refreshes.
17. Smoke tests must exercise the workflows the reviewer will click.
18. Exact/accessible selectors are preferred over ambiguous text matches.
19. A stale test assertion should be corrected; a meaningful functional assertion should not be removed.
20. Do not declare completion until deployment, live data, and interactive behavior all pass.
21. When a defect appears, fix the defective layer instead of weakening the definition of done.
22. Stop adding features only when additional functionality no longer maps to a verified responsibility, workflow, decision, stakeholder need, or useful proof point for the target role.

## ASTRO rejection checklist

Reject the build as incomplete if any are true:

- the CRM is mostly static;
- selecting an account does not open a working account surface;
- account contacts cannot be created or persisted;
- demo accounts lack believable stakeholder coverage;
- KPIs are decorative and cannot be updated;
- actions cannot be added or completed;
- meeting prep is detached from current account state;
- the PDF button does not generate a real downloadable PDF;
- the UI inherited large irrelevant modules from another CRM;
- the app copies a target-company logo without authorization;
- synthetic and real data boundaries are unclear;
- a seed upgrade can overwrite user-created records;
- the app only works on a clean database but not an existing workspace;
- runtime JavaScript errors are not tested in a browser;
- smoke tests only check page load;
- tests were weakened to hide a defect;
- mobile behavior is unverified;
- the custom domain / live route was not actually verified;
- the final report claims outcomes that were not observed.

If any rejection condition is true, the CRM One Off is not done.

## STOP rule

After the target role's operating model works, migration is safe, required artifacts work, and interactive smoke tests pass, evaluate scope one final time.

**STOP only when every remaining candidate feature lacks a credible mapping to the position.**

Do not expand the app merely because the reusable CRM foundation contains more features.  But do not artificially keep it small when the role itself is broad.

A large CRM is appropriate when its breadth reflects verified responsibilities such as multi-account ownership, implementation, support, CS Operations, analytics, renewals, executive reporting, delivery coordination, Jira / Confluence workflows, AI-assisted operations, or other role-relevant functions.

Every added surface must be justified by a role requirement, user instruction, observed usability gap, or failed verification.

## Evidence-provenance and metric-integrity gate

Apply `docs/EVIDENCE_PROVENANCE_STANDARD.md` to every one-off CRM.

This is part of the functional definition of done, not optional documentation.

Required defaults:

1. Every KPI record carries `source_id`, `claim_class`, `definition`, `source`, `last_updated`, and `synthetic` when applicable.
2. Synthetic seed values default to `claim_class: SYNTHETIC` and must include a scenario-purpose / logic source. Never imply they are target-company results.
3. Public company/product numbers used in the UI must map to a current public source.
4. Candidate metrics used in application/Why-this-build surfaces must map to candidate evidence.
5. Derived values must preserve formula and source inputs.
6. Generated CRM PDFs and exports must pass final-artifact metric reconciliation, not only source-code review.
7. A KPI or chart with no resolvable provenance is a failed build.
8. The role/problem hypothesis used to shape the CRM must be explicit in the internal manifest/evidence layer even when it is not rendered as marketing copy.
9. Capture an operational org map that explains how the role receives work, hands off work, escalates, collaborates, and delivers outcomes.
10. When the role is technical, include a source-backed technical refresher / operating knowledge surface only when it helps the actual workflow. Keep that knowledge separate from candidate experience claims.

### Operator-workspace presentation rule

A candidate CRM should look like a real operator workspace, not a job advertisement.

When the user asks for company-reflective presentation without explicit target branding:
- mirror only public visual relationships such as density, contrast, accent behavior, spacing, and interaction patterns;
- do not copy logos or proprietary assets;
- allow a neutral product/workspace name instead of the target company or role title;
- avoid job-description prose in the primary UI;
- put role mapping, disclosure, and application rationale behind an unobtrusive "About / Why this system" surface rather than making them the dashboard hero.

## Multi-owner coverage and source-system projection pattern

When a verified role spans two or more ownership motions, do not force all work into a single generic account-owner field.

Examples include:
- CSM + TAM;
- CSM + Solutions Engineer;
- Partner account manager + vendor technical owner;
- Support + Professional Services;
- Implementation + long-term Customer Success;
- named account ownership plus pooled/recovery coverage.

For these roles, add a first-class **Coverage / Assignment** surface when it materially helps the role.

Default fields:
- account / queue / segment;
- motion (direct, partner, pooled, named, recovery, implementation, etc.);
- relationship owner;
- technical / delivery owner;
- service or entitlement lane;
- current boundary / responsibility;
- next action;
- escalation destination;
- source / provenance.

The purpose is to prevent "the customer experiences the org chart" failure mode.

### Source-system projection rule

A tailored CRM is usually an operating layer across source systems, not a replacement for them.

When useful, model the role-relevant flow as:

`SOURCE SYSTEM -> NORMALIZED SIGNAL -> OWNERSHIP / ROUTING -> ACTION -> CUSTOMER OUTCOME -> FEEDBACK LOOP`

For every projected source, label whether it is:
- explicitly named in the verified role;
- named in adjacent public company material;
- a representative category (for example "CRM / Account System");
- synthetic/demo-only.

Never claim a private internal stack from adjacent evidence.

### Reusable routing pattern

For tiered technical post-sales work, prefer a visible routing decision model:

`ACCOUNT / COMMERCIAL -> BASELINE BREAK-FIX -> PAID IMPLEMENTATION / SERVICES -> DEEP PRODUCT OWNERSHIP -> PRODUCT / ENGINEERING`

Keep one accountable customer-facing owner even when internal ownership changes.

### Custom operator-workspace default

When a user asks for a proof-of-work system that reflects the target company's public design without looking like a job advertisement:

- use a neutral functional workspace name;
- keep the company and role out of the primary visible UI when requested;
- keep the target mapping in internal manifest/application artifacts;
- preserve synthetic-data and candidate-built disclosure without turning the dashboard into marketing copy;
- reflect public density, contrast, accent hierarchy, spacing, and interaction patterns rather than copying logos or proprietary assets;
- default to dark/high-contrast only when it fits the requested/operator context, otherwise follow the target/public product relationship.

This pattern should be reusable through `public_presentation`, `coverage_model`, `system_map`, `routing_rules`, and role-specific technical refresher fields rather than hard-coded into one company implementation.
