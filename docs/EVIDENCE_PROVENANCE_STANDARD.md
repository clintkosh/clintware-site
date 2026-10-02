# Evidence Provenance and Metric Integrity Standard

## Purpose

Prevent unsupported numbers, targets, percentages, financial figures, timelines, rates, counts, forecasts, ROI claims, and derived metrics from reaching an interview kit, CRM, presentation, PDF, DOCX, email, dashboard, case study, or other decision-facing artifact.

The Neuron7 regression case is the reference failure: an illustrative metric entered a case-study presentation without a valid source and was challenged live. Any equivalent unsupported metric is a release-blocking defect.

Canonical sequence:

`SOURCE -> CLAIM LEDGER -> AUTHORING -> SOURCE CHECK -> FINAL-ARTIFACT RECONCILIATION -> LOGIC/VISUAL REVIEW -> RELEASE`

## Scope

Apply this standard to all externally facing or decision-relevant Clintware deliverables, including:

- interview-prep PDFs, DOCX files, cockpit sheets, answer banks, and follow-up drafts;
- CRM/demo KPIs, health scores, forecasts, ROI panels, timelines, risk scores, sample data, and downloadable briefs;
- slide decks, case studies, executive summaries, charts, screenshots, and presentation notes;
- cover letters, application answers, emails, and recruiter/hiring-manager messages when they contain consequential quantitative claims;
- generated reports and exports from Clintware applications.

Structural numbers such as page numbers, section numbering, CSS dimensions, version identifiers, and code constants are outside the metric gate unless they become part of a substantive business claim.

## Claim classes

Every consequential numeric value must be one of:

1. **MEASURED** - observed result supported by an original source.
2. **TARGET** - stated goal or requirement; never present it as achieved.
3. **DERIVED** - calculated from sourced inputs with an explicit formula.
4. **ESTIMATE** - reasoned estimate with assumptions, bounds, and owner.
5. **SYNTHETIC** - fictional demo/scenario value with explicit scenario purpose and logic source.
6. **PUBLIC FACT** - current public company/industry fact from a named source.
7. **LOGISTICS** - interview date/time, duration, compensation range, or similar operational fact from the event/posting/thread.

No eighth class called "sounds plausible" exists.

## Mandatory claim ledger

Every deliverable family containing consequential numbers must maintain a machine-readable claim ledger, preferably `evidence-provenance.json`, or an equivalent structured object.

Minimum fields:

```json
{
  "id": "M001",
  "label": "Renewal improvement",
  "rendered_values": ["20%", "+20%"],
  "claim_class": "MEASURED",
  "scope": "Dedrone customer portfolio",
  "time_window": "candidate-tracked period",
  "source": {
    "kind": "candidate_evidence",
    "ref": "resume_or_review_identifier",
    "locator": "specific bullet / page / line / transcript turn / URL"
  },
  "formula": null,
  "inputs": [],
  "assumptions": [],
  "confidence": "high",
  "allowed_contexts": ["interview", "resume", "case-study"]
}
```

For **DERIVED** claims, `formula` and `inputs` are mandatory.

For **ESTIMATE** claims, assumptions and a visible estimate label are mandatory.

For **SYNTHETIC** claims:
- mark them visibly synthetic in the artifact;
- state the scenario purpose;
- provide the logic that produced the value or bounded range;
- never let synthetic progress imply a real customer result.

For **PUBLIC FACT** claims, use a current URL/source and access/publication date when useful.

## Triple-check release gate

### PASS 1 - Source and logic check

Before authoring is considered complete:

- every consequential number has a ledger entry;
- the value, unit, scope, time window, and claim class match the source;
- targets are not rewritten as results;
- portfolio-wide values are not rewritten as single-account values;
- shared influence is not rewritten as sole ownership;
- usable visibility is not rewritten as perfect data accuracy;
- estimates are labeled estimates;
- synthetic data is labeled synthetic;
- derived values recompute from cited inputs.

If a source cannot be located, remove the metric or replace it with a qualitative statement.

### PASS 2 - Final-artifact extraction reconciliation

After PDF/DOCX/PPTX/HTML/export generation:

1. Extract the final visible text.
2. Find consequential numeric tokens and quantitative phrases.
3. Reconcile each to a claim-ledger entry or an explicit non-claim allowlist.
4. Fail the release when an unmatched metric remains.
5. Re-run after every substantive edit, export, regeneration, or template transformation.

The final exported artifact, not merely the source draft, must pass.

### PASS 3 - Human logic and visual review

Inspect the rendered artifact and ask:

- Does the number mean what the source means?
- Is its denominator/base clear?
- Is the time period clear?
- Is the comparison direction correct?
- Could a target/estimate/synthetic value be mistaken for an achieved result?
- Does a chart axis, label, rounding choice, color, or annotation change the meaning?
- Does surrounding prose overclaim causation or ownership?
- Is the source map readable and correctly tied to the claim?

A syntactically matched number can still be logically wrong. Pass 3 catches that.

## Artifact-specific rules

### Interview kits

Every substantive metric in an answer card must resolve to the ledger. Include a compact **Evidence / Metric Source Map** in the full kit. The one-page cockpit may omit visible source IDs only when each displayed metric unambiguously resolves to the source map.

If a number is challenged live and the source cannot be recalled:

`DO NOT DEFEND THE NUMBER -> STATE THE SOURCE BOUNDARY -> RETURN TO THE VERIFIED OUTCOME`

### CRM / application demos

Every KPI record must carry provenance fields such as:
- `source_id`
- `claim_class`
- `definition`
- `source`
- `last_updated`
- `synthetic` when applicable.

A KPI card without provenance is incomplete.

Synthetic account metrics must be internally coherent with lifecycle stage, actions, risks, and meeting context.

### Presentations / case studies

Every quantitative slide needs either:
- direct source IDs in notes/appendix; or
- a source table mapping the exact displayed value and phrase to the ledger.

Derived ROI must show formula and sourced inputs. Illustrative math must say **ILLUSTRATIVE** on the slide, not only in speaker notes.

### Emails / external messages

Before send/draft finalization, reconcile:
- recipient(s);
- company and role;
- interview date/time/time zone;
- names/titles;
- metrics;
- links;
- attachments;
- claims about what was discussed or promised.

Never let a model-generated metric, meeting fact, or attachment claim bypass provenance review merely because the prose sounds natural.

## One-line company / position challenge

Every interview/application package must define one concise problem statement:

`COMPANY / TEAM NEEDS <OUTCOME> BUT <CONSTRAINT / FAILURE MODE>; THIS ROLE EXISTS TO <OWNERSHIP / CHANGE>.`

Before the interview, label it **ROLE PROBLEM HYPOTHESIS** and source it from the job description, company material, recruiter thread, or prior transcript.

During the interview, actively listen for the interviewer's own version of the problem. Afterward classify the hypothesis:

- **MATCHED** - interviewer substantially confirmed it;
- **MODIFIED** - core problem is right but scope/priority changed;
- **DISPROVEN** - evidence showed a different primary problem;
- **UNCONFIRMED** - not enough evidence yet.

The newest confirmed wording becomes a high-priority input to the next-round kit and role-specific CRM.

## Interviewer decision / operating profile

Do not diagnose personality or invent motives.

Build an evidence-based profile from:
- role and seniority;
- stage;
- public professional background;
- recruiter guidance;
- prior transcript behavior;
- observable follow-up patterns;
- documented responsibilities.

Include:
- what this interviewer is responsible for deciding;
- evidence they appear to prioritize;
- likely evaluation themes;
- observable communication/decision patterns when supported;
- what to emphasize;
- what to avoid;
- confidence level and source for each inference.

## Operational org map

Every stage-specific kit should map the role around the interviewer when enough evidence exists.

Default model:

```text
                     EXEC / FUNCTION LEADER
                              |
                              v
                    HIRING MANAGER / OWNER
                         /            \
                        v              v
             TARGET ROLE -------- PEER / PARTNER
                |   \                 |
                |    \                v
                |     +-------- PRODUCT / ENG
                v
          CUSTOMER / USER
                |
                v
       OUTCOME / KPI / RISK
```

Use solid edges for verified relationships and explicitly labeled dotted/inferred edges for professional inference. Never fabricate reporting lines.

The map should answer:
- who gives the role inputs;
- who depends on its outputs;
- where escalation goes;
- who owns commercial/customer/product decisions;
- where the interviewer sits relative to the role;
- where failure creates friction.

## Role-specific technical refresher

When a role is technical, generate a concise current refresher from authoritative sources relevant to that role.

Prefer:
1. current vendor documentation;
2. standards/RFCs;
3. OWASP/NIST/CISA or equivalent primary security guidance;
4. cloud/provider documentation;
5. reputable technical references.

For each relevant topic include:
- core mental model;
- common failure modes;
- diagnostic sequence;
- evidence to collect before escalation;
- terminology traps;
- current best-practice reminders;
- source links;
- exact boundary between candidate experience and refresher knowledge.

Example API troubleshooting rail:

```text
SCOPE / IMPACT
   -> REQUEST CONTRACT
   -> AUTHN / AUTHZ
   -> ENDPOINT + METHOD
   -> HEADERS + PAYLOAD / SCHEMA
   -> STATUS + BODY
   -> RATE LIMIT / RETRY
   -> PAGINATION / STATE
   -> WEBHOOK / CALLBACK
   -> NETWORK / TLS / DNS
   -> LOGS + CORRELATION ID
   -> MINIMAL REPRO
   -> OWNER / ESCALATION
```

The refresher is preparation, not evidence that the candidate previously owned every technology described.

## Fail-closed rule

If provenance is ambiguous, the artifact is not ready.

Safe options:
- locate the original source;
- downgrade the statement to a sourced qualitative claim;
- label it explicitly as target/estimate/synthetic;
- remove it.

Never preserve an unsupported metric merely because it is persuasive.
