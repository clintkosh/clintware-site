# ASTRO SUPER 3 TEAM CUSTOM SYNERGY SYSTEM

## Purpose

Build a role-specific operating system for three cooperating customer-facing teams that must share one customer journey without collapsing their distinct ownership boundaries.

Canonical team pattern:

`RELATIONSHIP / SUCCESS OWNER <-> TECHNICAL OWNER <-> PARTNER / SERVICE ECOSYSTEM`

Default labels may be CSM / TAM / Partner, but the skill is reusable for other three-team combinations.

The system is not a job-ad page and not a replacement for every source system. It is a synchronized decision layer that projects the customer-relevant state from CRM/account context, support/cases, service entitlements, implementation/services, product/technical telemetry, risk, adoption, meetings, and evidence.

## Core problem statement

`CUSTOMER NEEDS ONE COHERENT OUTCOME, BUT OWNERSHIP CROSSES THREE TEAMS AND MULTIPLE SOURCE SYSTEMS; THE SYSTEM EXISTS TO PRESERVE CONTEXT, MAKE RESPONSIBILITY EXPLICIT, ACCEPT HANDOFFS, AND TURN RECURRING FRICTION INTO SCALE.`

## Required architecture

Every build must provide:

1. **One shared customer object** - outcome, lifecycle, motion, owners, stakeholders, next decision, risks, commitments, source boundaries.
2. **Three team lenses** - each team gets a focused track selector without creating a second copy of customer truth.
3. **Shared journey** - work is ordered by customer lifecycle and decision, not only by ticket queue.
4. **Coverage / ownership map** - who owns relationship, technical depth, service entitlement, break-fix, implementation/services, product decisions, and escalation.
5. **Handoff contract** - from, to, issue/service type, customer impact, evidence, what has been tried, exact owner ask, acceptance state, closure condition.
6. **Technical work** - integrations, APIs, configuration, diagnostics, product-depth work, specialist escalation evidence.
7. **Customer-value layer** - adoption and outcome evidence, never invented ROI or unsupported expansion dollars.
8. **Risk / escalation layer** - impact, evidence, owner, next decision, next customer update.
9. **Recurring-theme loop** - repeated cases can become documentation, diagnostics, training, automation, service packaging, pricing, or Product input.
10. **Meeting / review layer** - briefs are generated from the same state used to operate the account.
11. **Training center** - role-specific onboarding for each of the three teams using the same ownership model and sample journeys.
12. **Evidence / provenance layer** - metric class, original source, synthetic boundary, formula/assumptions, build evidence, and final-artifact QA.

## Team-lens rule

A team lens is a view over shared state, not its own silo.

Example:

```text
                        ONE CUSTOMER STATE
                               |
             +-----------------+-----------------+
             |                 |                 |
             v                 v                 v
            CSM               TAM             PARTNER
        outcome/risk      technical depth    service lane
        adoption          integrations       entitlement
        executive         troubleshooting    handoffs
        commercial        product feedback   baseline/services
             \                 |                 /
              \________________|________________/
                               v
                       ONE CUSTOMER JOURNEY
```

Changing the lens may change navigation, defaults, language, recommended next actions, and training, but must not fork customer identity, decisions, or evidence.

## Source-system projection pattern

Use source systems as authoritative inputs where appropriate:

`SOURCE -> NORMALIZED CUSTOMER SIGNAL -> OWNER / ROUTING -> ACTION -> OUTCOME -> FEEDBACK LOOP`

Label each projected source as one of:
- verified public/internal source;
- adjacent public example;
- representative category;
- synthetic demo source.

Never infer a private internal stack from a public job posting.

## Handoff acceptance invariant

A transfer is not complete when the sending team removes itself from a queue.

A transfer is complete when the receiver:
- receives customer/problem context;
- receives evidence already gathered;
- understands entitlement/service boundary when relevant;
- accepts ownership or names the exact missing prerequisite;
- records the next action and customer-update expectation.

Default rail:

`CONTEXT -> EVIDENCE -> OWNER ASK -> ACCEPT / MISSING PREREQUISITE -> CUSTOMER UPDATE -> CLOSURE CONDITION`

## Values-by-design pattern

When a target company publishes cultural values, map values to workflow behavior rather than decorative slogans.

For the reference implementation:
- **TRUST** -> source-backed claims, explicit ownership, evidence before escalation.
- **THINK BIG** -> repeated friction becomes durable system improvement.
- **MUTUAL RESPECT** -> clean contextual handoffs and no customer ping-pong.
- **CUSTOMER SUCCESS** -> customer-defined outcome and adoption state anchor decisions.

Every value label must point to a feature or operating behavior.

## Evidence and metric integrity

Inherit `docs/EVIDENCE_PROVENANCE_STANDARD.md` without exception.

Every consequential numeric value is MEASURED, TARGET, DERIVED, ESTIMATE, SYNTHETIC, PUBLIC FACT, or LOGISTICS.

No source = no metric.

Synthetic customer metrics must be visibly synthetic and internally coherent with lifecycle stage, actions, risks, and journey state.

Internal build-efficiency evidence must never be confused with customer traction.

Modeled token savings may be shown only with their assumptions and explicit statement that they are not provider billing telemetry. Do not convert them into financial savings unless actual cost telemetry exists.

## Local-first / QQ execution pattern

The preferred build split is:

`MODEL DESIGNS THE DELTA -> QQ / LOCAL TOOLS MATERIALIZE + CHECK -> AUTHORIZED DEPLOYMENT -> BROWSER VERIFICATION -> COMPACT EVIDENCE RETURN`

Use `crm-astro-build` when the project provides:
- a valid ASTRO manifest;
- `projects/<project>/scripts/materialize.mjs`;
- generated `.build/<project>` output;
- `npm run check`;
- browser-local/stateless persistence unless remote state is genuinely required.

Use local BitNet/Ollama only for bounded reasoning work that meets the quality bar. Do not use a local model to fabricate fresh public facts or consequential claims.

When the current chat runtime cannot invoke QQ, use the repository/GitHub deployment fallback and state that the build is excluded from QQ savings totals.

## UI defaults

- Neutral operator-product presentation by default.
- No job-ad hero copy in the primary workspace.
- High-contrast, dense-but-readable operator UI.
- Team Lens dropdown.
- Track dropdown filtered by team lens.
- Motion and account selectors when the role spans multiple motions.
- Browser-local persistence for candidate/demo state.
- Export/import backup.
- Mobile no-overflow gate.
- No login required unless remote persistence is explicitly required.
- `noindex,nofollow,noarchive` for candidate proof-of-work unless deliberately published as a product.

## Training deliverables

Every Super 3 build should create or expose:
- CSM/relationship-owner training;
- TAM/technical-owner training;
- Partner/service-ecosystem training;
- guided system walkthrough;
- printable/PDF-friendly versions;
- shared glossary and ownership model.

Training must teach how to operate the shared system, not merely describe product features.

## QA / release gate

Before calling a Super 3 system complete:

1. Validate manifest and role/problem hypothesis.
2. Validate source/provenance ledger.
3. Run source checks.
4. Deploy only through authorized credentials.
5. Verify live health endpoint.
6. Browser-test all three team lenses and track filtering.
7. Create/edit a local record and verify persistence after reload.
8. Exercise at least one handoff acceptance.
9. Exercise at least one training-progress mutation.
10. Verify training and walkthrough routes.
11. Verify mobile width has no horizontal overflow.
12. Confirm synthetic/customer/build evidence boundaries are visually explicit.
13. Triple-check exported PDFs/slides/documents separately under the artifact QA rules.

## Reference implementation

`projects/blstrsync-crm`

Domain: `blstrsync.clintware.com`

Reference problem: synchronize CSM, TAM, and partner-service work across partner-sourced and directly sold enterprise customer motions without customer ping-pong, metric overclaiming, or duplicated customer truth.
