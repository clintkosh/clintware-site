# LandThePlane

**Positioning:** **LandThePlane: And Hit the Ground Rolling.**  
**Status:** local-first alpha + YC fast-track product track  
**Public app:** `https://landtheplane.clintware.com/`  
**Product detail:** `https://www.clintware.com/tools/landtheplane/`

LandThePlane is a continuous career operating system. It starts before an interview by turning verified career evidence and a target role into role-specific preparation. After the user gets hired, the same system transitions into a ramp, workflow, and performance layer that learns the actual job from user-approved work signals and helps turn that context into repeatable personal workflows and verified evidence of impact.

## Product arc

`LAND → RAMP → OPERATE → IMPROVE → PROVE`

### Land

1. Ingest resume/accomplishment evidence plus a target role.
2. Extract role requirements without treating the job description as proof about the candidate.
3. Map requirements to verified accomplishment evidence.
4. Reuse evidence as one-sentence proof, a 30-second opening, a 45–75 second answer, a full STAR story, a panel talking point, and a closing bridge.
5. Record what was asked and what evidence was used.
6. Improve future coaching from candidate edits, interview history, outcomes, and recurring weak spots.

### Ramp

When the user accepts the job, the job description becomes version 0 of a living success plan:

- expected outcomes;
- responsibilities;
- stakeholders to identify;
- systems and products to learn;
- recurring cadences;
- likely 30/60/90-day milestones;
- unknowns to validate with the manager.

The job description is a starting hypothesis, not final truth. Email, meetings, manager feedback, and real work progressively replace assumptions.

### Operate

The product builds a private work graph from user-approved sources. Email is the primary growth channel after hire because it captures assignments, commitments, deadlines, stakeholders, decisions, recurring processes, terminology, feedback, and results. Meeting intelligence is the second major source.

Canonical work entities:

- `RoleExpectation`
- `Stakeholder`
- `Project`
- `Commitment`
- `Decision`
- `Workflow`
- `RecurringCadence`
- `Deliverable`
- `FeedbackItem`
- `KnowledgeItem`
- `SkillGap`
- `SuccessSignal`
- `EvidenceItem`

Each derived object retains source provenance, confidence, timestamp, and user-confirmation state.

### Improve

LandThePlane detects repeated work and helps the user deliberately build personal workflows:

- identify repeated requests and sequences;
- propose a checklist/template after repetition is observed;
- let the user edit or approve the workflow;
- learn from accepted/rejected suggestions and corrections;
- track which workflows save time or reduce mistakes;
- update workflows when responsibilities change;
- keep personal preferences distinct from company policy.

Example:

`customer escalation → gather account context → check prior decisions → identify owner → draft response → set follow-up → record outcome`

### Prove

The same system continuously accumulates verified evidence for:

- manager 1:1 preparation;
- weekly/monthly accomplishment summaries;
- performance reviews;
- promotion packets;
- resume updates;
- future interviews.

The loop closes because work done after hiring becomes verified evidence for the user's next internal or external opportunity.

## Working public alpha

The dedicated Cloudflare Worker currently serves a browser-local interview evidence mapper:

- paste resume/accomplishment text;
- paste a job description;
- select interview stage;
- extract a bounded set of likely role requirements;
- rank resume evidence against those requirements;
- show requirement → evidence coverage;
- create one-sentence answer shells;
- create STAR retrieval shells;
- surface evidence gaps;
- optionally save run-level statistics locally in the browser.

The current alpha does **not** upload or persist raw resume or job text.

## Target preparation surfaces

- requirement/evidence matrix;
- 30-second opening;
- likely questions by interview stage;
- one-sentence answers;
- 45–75 second answer cards;
- STAR story bank;
- proof gaps and safe bridges;
- interviewer questions;
- compensation/leveling preparation;
- one-page interview cockpit;
- post-interview debrief and next-round delta.

Preferred compression:

`POINT → PROOF → RESULT → ROLE LINK → STOP`

## Post-hire surfaces

- personalized 30/60/90-day ramp plan;
- stakeholder map;
- commitments and follow-up ledger;
- recurring-work detector;
- personal workflow builder;
- manager 1:1 brief;
- meeting-to-action conversion;
- feedback memory;
- role-expectation drift detection;
- weekly accomplishment capture;
- promotion/performance-review evidence pack;
- automatic evidence reuse in future interview prep.

## Email integration

Email is the primary post-hire information-growth channel, but ingestion must be permissioned and scoped.

Useful extracted signals include:

- direct requests and assignments;
- commitments made by the user;
- deadlines and follow-ups;
- stakeholder names and roles;
- project/product vocabulary;
- decisions and reversals;
- positive/negative feedback;
- process steps;
- recurring requests;
- success metrics;
- important document references.

The durable product database should be the structured work graph, not a permanent copy of the user's mailbox. Derived objects retain provenance and obey user retention/deletion settings.

## Meeting intelligence / Read AI

Read AI or another meeting source can feed the same graph:

- action items → `Commitment` candidates;
- topics / chapter summaries → `KnowledgeItem` and `Project` context;
- key questions → unresolved work or `SkillGap` candidates;
- participants → `Stakeholder` context;
- transcripts → decisions, ownership, feedback, and process detail;
- meeting metrics → optional communication-coaching signals, kept separate from factual evidence.

Prefer summaries, action items, and topics by default. Full transcripts should be retrieved only when the user enables that depth or a specific workflow requires it.

## Longitudinal coaching

The compounding asset is a user-owned career graph that spans job search and employment. Suggested entities include:

- `CandidateProfile`
- `EvidenceItem`
- `TargetRole`
- `RoleRequirement`
- `InterviewRound`
- `Outcome`
- `RoleExpectation`
- `Stakeholder`
- `Project`
- `Commitment`
- `Workflow`
- `FeedbackItem`
- `SuccessSignal`
- `CoachingMetric`

Useful trends include answer length, evidence specificity, quantified results, role coverage, recurring work, workflow effectiveness, unresolved commitments, feedback themes, and evidence growth over time.

## Storage

### Local mode

- raw resume/job text can remain in-browser for the current alpha session;
- persistence is opt-in;
- a future standalone desktop build can retain the evidence/work graph locally;
- export/import should use a documented portable format.

### SaaS mode

Optional cloud sync should add account-scoped projects, encrypted transport, retention/deletion controls, export, tenant isolation, clear model-processing disclosure, and the same canonical model as local mode.

## Authentication and connected data

Google sign-in is not required for the interview-prep MVP. Post-hire email learning makes Gmail integration strategically important, but sign-in and mailbox access must remain separate permission decisions. Do not request Gmail, Drive, Calendar, or Contacts scopes merely for authentication.

Connected data should be opt-in by source and revocable. The product should extract the minimum structured work context needed rather than treating connected accounts as unlimited raw data stores.

## Demo and legal boundaries

- Public demos use synthetic, licensed, or explicitly approved resumes/listings/work data.
- Do not expose real candidate resumes, interview transcripts, recruiter emails, compensation details, employer-confidential material, or private work correspondence in public demos.
- Keep the product user-side: preparation, ramp, personal productivity, reflection, workflow building, and user-owned analytics.
- Do not position it as an employer hiring-decision or employee-ranking system.
- Add deletion, export, retention, subprocessors, and data-processing terms before paid SaaS cloud storage launches.

## Name feasibility

`LandThePlane` remains a working product name, not an exclusive trademark claim. Keep the product rename-safe until formal clearance is complete.

## YC executive review

**Recommendation: #2 product track, now a materially stronger challenger to Quillgeist. Do not replace the flagship solely on thesis; let repeated external use decide.**

The post-hire extension materially improves the economics because the product no longer has to lose the user when it succeeds. It turns an episodic interview-prep product into a persistent career/workflow product.

| Dimension | Score | Reason |
| --- | ---: | --- |
| Problem clarity | 9/10 | Land the job, then ramp and perform faster. |
| Founder-use loop | 10/10 | Interviewing and future ramping create real dogfood. |
| MVP speed | 9/10 | Interview evidence mapper already ships; post-hire graph can layer on incrementally. |
| Competition | 5/10 | Interview coaching is crowded, but the interview-to-work continuity is less commoditized. |
| Differentiation potential | 9/10 | Persistent evidence/work graph + workflow learning creates a broader wedge. |
| Retention potential | 9/10 | Success no longer causes immediate churn; the product gains a reason to stay installed. |
| Monetization | 8/10 | Active-search, onboarding/ramp, ongoing career OS, and premium coaching surfaces. |
| Defensibility | 8/10 | Longitudinal user-owned work/evidence graph compounds over years. |
| Privacy posture | 7/10 | Local-first architecture helps, but email/meeting integrations raise the bar materially. |
| YC readiness now | 8/10 | Stronger lifecycle and retention thesis; still needs external repeat-use proof. |

## Flagship promotion gate

Promote above Quillgeist when behavior proves the continuous lifecycle:

- external candidates complete role-specific prep;
- users return for additional rounds;
- at least some users transition from interview mode into post-hire ramp mode;
- connected work context measurably improves their personal workflows;
- users continue using LandThePlane after the first 30/60/90 days;
- evidence gathered on the job is reused in reviews, promotions, or future searches;
- users pay or create strong unsolicited referral pull.

## Core product thesis

**The durable moat is not interview question generation. It is a user-owned career graph that starts with prior accomplishments, grows through interviews, becomes a living work graph after hire, and continuously turns work into better workflows and verified evidence.**
