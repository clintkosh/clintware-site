# an.clintware.com Production Audit — 2026-08-12

## Result

Status: PASS

Production URL: https://an.clintware.com
GA4 measurement ID: G-DCY144YM9P

The current production build passed the stable Chrome audit and the subsequent standards-based health-scoring/P1 end-to-end verification.

## Google Analytics coverage

Analytics covers all 10 main SPA routes:

- command
- accounts
- renewal
- playbooks
- cadence
- capacity
- finance
- intake
- kpis
- settings

It also covers all 7 account workspace tabs:

- summary
- stakeholders
- success
- technical
- meetings
- notes
- commercial

Production verification requires `/an/<route>` for every main route and `/an/account/<tab>` for every account tab. GA4 uses measurement ID `G-DCY144YM9P`. The gate also emits unlock, failed-unlock, gate-view, and logout events.

## Customer health model

Health is no longer a manually entered number. It is a transparent calculated 0–100 score. The recommended default weighting is:

- Adoption: 25%
- Value realization: 25%
- Relationship & engagement: 20%
- Technical / deployment: 15%
- Support / risk: 10%
- Success-plan execution: 5%

The six weights must total 100% and are adjustable in Settings. Healthy and Watch thresholds are also adjustable. Defaults are Healthy >= 80 and Watch >= 65.

### Signal logic

- **Adoption** uses the stored adoption score.
- **Value realization** uses documented value/ROI evidence.
- **Relationship & engagement** is 60% relationship-quality assessment, 25% meeting recency, and 15% executive coverage.
- **Technical / deployment** uses technical coverage/readiness.
- **Support / risk** starts from support confidence and subtracts the strongest active support-severity or customer-risk penalty.
- **Success-plan execution** uses average progress across success-plan objectives. If no success plan exists, the neutral demo default is 50.

Commercial readiness and renewal timing are deliberately separate from Health. They remain visible renewal/growth readiness signals rather than creating a circular health/renewal score.

Changing a health-model weight or threshold in Settings recalculates the portfolio. Changing underlying account signals also changes the calculated health score. Direct manual Health editing has been removed from the account form.

## P1 functional completion

Verified in the live production browser:

- account details editable; Adoption is editable while Health is calculated
- Risks: add, edit, remove
- Stakeholders: add, edit, remove
- Success Plan objectives: add, edit, remove
- Meetings: add, edit, remove
- Notes: add, edit, remove, with visible save confirmation
- Technical & Services: editable service owner, technical coverage, support confidence, severity, services utilization, integrations, and active modules
- Commercial & Value: editable ARR, renewal date, value evidence, relationship quality, commercial readiness, and Account Executive
- Meeting Brief and Print / Save PDF remain functional
- persistent Logout / lock behavior remains available throughout the CRM
- production Analytics remains present across every current route/tab
- no browser JavaScript errors were recorded in the P1 production verification

The live P1 verifier independently recalculates account Health from the configured formula and compares it to the stored score. It also changes health weights, verifies persistence/recalculation, resets the recommended model, and exercises each P1 CRUD workflow.

## What remains synthetic / prototype-only

These are prototype constraints, not dead UI:

1. **Customer data is synthetic.** The 20 companies, stakeholders, meetings, risks, notes, renewal dates, ARR values, adoption values, and other customer details are fictional sample data.
2. **Signal inputs are demo data.** The scoring logic is transparent and internally consistent, but inputs are not connected to Abnormal, Salesforce, product telemetry, Support, billing, or other production systems.
3. **The model is not statistically calibrated against Abnormal historical renewal/churn data.** Its structure follows Customer Success health-score practice and the enterprise CSM motion, but it is an independent interview prototype and must not be represented as Abnormal's internal scorecard.
4. **Persistence is browser-local.** CRM changes are stored in localStorage rather than a backend database and are not shared between users/devices.
5. **The password gate is demo-grade authentication.** Access state is browser sessionStorage/client-side rather than production identity/session infrastructure.
6. **Meeting briefs are generated from stored demo account data.** Generation, Copy Brief, and Print / Save PDF are real functionality, but their source data remains synthetic.

## P0 — Complete

- GA4 across every current route/tab
- persistent Logout / lock
- note persistence and visible save confirmation
- no placeholder/dead-state copy in the audited UI

## P1 — Complete

- standards-based, adjustable Customer Health calculation
- editable Technical & Services context
- editable Commercial & Value context
- Risk CRUD
- edit capability for Stakeholders, Success Plan objectives, Meetings, and Notes
- production browser tests covering formula correctness, Settings recalculation, CRUD workflows, and Analytics paths

## P2 — Only if converting the interview prototype into a real application

- backend datastore
- server-side/identity-provider authentication
- user identity, permissions, audit history, and multi-user concurrency
- authorized CRM/product/support integrations
- governed production signal definitions and source-of-truth ownership
- statistical calibration/validation of health thresholds and weights against real retention, renewal, expansion, and adoption outcomes

## Current conclusion

The current demo no longer contains a manually invented Health number or the P1 read-only gaps. Health is a configurable calculated score tied to visible account signals, while renewal/commercial readiness remains intentionally separate. The remaining synthetic aspects are data/integration/authentication/backend constraints appropriate to an independent interview prototype.
