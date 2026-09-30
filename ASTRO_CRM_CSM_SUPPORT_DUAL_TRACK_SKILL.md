# ASTRO CRM CSM + Support Dual-Track Skill

## Purpose

Build a role-specific customer operating system when the target opportunity spans both Customer Success and Support. This skill extends `ASTRO_CRM_ONE_OFF_SKILL.md` and `skills/advanced-customer-success-crm-builder/SKILL.md`; it does not replace either one.

Canonical lifecycle:

`VERIFY BOTH ROLES -> EXTRACT SHARED CUSTOMER JOURNEY -> DEFINE 12 OPERATING TRACKS -> REUSE MATURE CRM CORE -> LOCAL MATERIALIZE -> LOCAL VALIDATE -> DEPLOY -> LIVE VERIFY -> BROWSER VERIFY -> EVIDENCE -> STOP`

## Mandatory use

Use this ASTRO when a single candidate artifact needs to demonstrate credible ownership across both:
- Customer Success / account ownership / adoption / retention; and
- Support / escalation / service operations / support leadership.

If only one role family is in scope, use the normal CRM One Off ASTRO instead.

## Twelve-track contract

A dual-track build exposes exactly twelve launch tracks unless the user explicitly requests another count.

Default grouping is six CSM tracks and six Support tracks.

### CSM tracks
1. Portfolio & Health
2. Onboarding & Time-to-Value
3. Integrations & Go-Live
4. Adoption & Usage
5. Value / ROI & Executive Reviews
6. Retention / Expansion / Voice of Customer

### Support tracks
7. Support Command
8. SLA / CSAT / Response Metrics
9. Escalations & Save Strategies
10. Coverage & Handoffs
11. Help Center / AI / Shift Left
12. Product & Engineering Feedback

The labels may be tailored to the verified job description, but the count remains twelve and the grouping remains balanced 6 + 6 unless the user explicitly changes it.

Each track must:
- have a stable id;
- declare a role family;
- declare a destination surface;
- explain the operating objective;
- map to a real persisted workflow rather than a decorative page;
- remain selectable again after launch.

## Launch behavior

The first usable screen must offer the twelve tracks in two visibly separated groups. A returning user may restore the previous track preference, but a visible **Switch track** control must remain available.

Track selection and demo customer state are browser-local by default.  Customer/account records, KPIs, contacts, actions, notes, escalations, and meeting artifacts should use the same quota-independent browser workspace unless the manifest explicitly proves a need for shared or cross-device remote state.  Hosting the demo on Cloudflare does not justify a Durable Object.  Apply `docs/astro-local-first-persistence-standard.md`.

## Shared operating model

The system must make the handoff between CSM and Support explicit.

Default journey:

`HANDOFF -> ONBOARD -> INTEGRATE -> ADOPT -> MEASURE VALUE -> SUPPORT -> ESCALATE -> LEARN -> RETAIN`

Customer Success owns relationship continuity, adoption, value, risk, and commercial context unless the verified role says otherwise.

Support owns service execution, queue health, response/resolution quality, escalations, knowledge, and support operations unless the verified role says otherwise.

Shared surfaces must preserve a single customer context so that:
- Support can see customer impact and stakeholder context;
- CSM can see current incidents and service risk;
- Product/Engineering receives evidence-complete feedback;
- recurring work can graduate to knowledge, automation, or self-service.

## Local-first QQ execution contract

For repeated CRM construction, spend model tokens on judgment, role interpretation, and novel design only. Delegate deterministic work to Quillgeist Lite.

Preferred order:

1. PowerShell orchestrates reviewed local build steps.
2. Python validates manifests, track contracts, paths, and generated state.
3. Node/materializer scripts reuse the mature CRM source tree.
4. Existing C capability remains available for compiled helpers when a task materially benefits from it.
5. Local browser automation performs repeatable interaction tests.
6. Remote inference is used only when deterministic/local paths cannot meet the required quality.

Never expose the local-only `! <PowerShell>` escape through MCP. Remote execution remains limited to reviewed tasks in `quillgeist-lite/tasks.json`.

The canonical reviewed entry point is:

`crm-astro-build`

Supported actions should include at minimum:
- `describe`
- `validate`
- `plan`
- `materialize`
- `check`
- `deploy`
- `full`

A deployment action remains consequential and must respect the caller's approval boundary.

## Manifest contract

Each dual-track project keeps a machine-readable manifest containing:
- project id;
- company;
- product/artifact name;
- target domain;
- base project;
- role names;
- exactly twelve tracks;
- six `CSM` and six `Support` tracks;
- public-source references used to tailor the operating model;
- synthetic-data boundary;
- candidate-built / unofficial-product disclosure.

The local validator rejects:
- duplicate track ids;
- missing track destination;
- track counts other than twelve;
- unbalanced role families;
- non-HTTPS target domains;
- missing company/project identity.

## Reuse rule

Prefer the most mature verified CRM implementation as the base. Reuse:
- persistence;
- record APIs;
- security headers;
- import/export;
- account workspace;
- stakeholder and KPI CRUD;
- actions/notes;
- risk and escalation records;
- meeting prep;
- deployment workflow;
- browser-test utilities.

Tailor:
- role vocabulary;
- sample data;
- operating loop;
- track selector;
- support metrics;
- customer-success metrics;
- public-source links;
- company/domain identity.

Do not copy the target company's logo or imply the artifact is an official company product.

## Functional minimum

In addition to the CRM One Off requirements, a dual-track build must demonstrate:
- one CSM track from launch through a persisted customer action;
- one Support track from launch through a persisted escalation/action;
- a shared customer record visible from both role families;
- role-aware KPI examples;
- a visible role/track switcher;
- a downloadable current-state brief;
- desktop and mobile track selection.

## Evidence rule

Report separately:
- source persisted;
- local task registry updated;
- local materialization verified;
- local validation verified;
- deployment triggered;
- live route verified;
- browser interaction verified.

Never collapse these into “done” when only source code changed.

## STOP rule

Stop when all twelve tracks are reachable, both role families operate on the same customer context, the selected track is recoverable, the current-state brief downloads, persistence works, and the target role is convincingly demonstrated.

Do not add extra tracks merely to make the artifact look larger.
