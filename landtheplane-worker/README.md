# LandThePlane

**Positioning:** **LandThePlane: And Hit the Ground Rolling.**  
**Status:** local-first alpha + browser-direct Gmail OAuth MVP + YC fast-track product track  
**Public app:** `https://landtheplane.clintware.com/`  
**Product detail:** `https://www.clintware.com/tools/landtheplane/`

LandThePlane is a continuous career operating system. It starts before an interview by turning verified career evidence and a target role into role-specific preparation. The same system can now bring source evidence from the user's own Gmail into the job-search layer, generate ASTRO-style status briefs, and create a Gmail draft that is read back and verified before LandThePlane calls the write successful. After the user gets hired, the same evidence model transitions into ramp, workflow, and performance use cases.

## Product arc

`SEARCH → LAND → RAMP → OPERATE → IMPROVE → PROVE`

### Search

1. Ingest resume/accomplishment evidence plus a target role.
2. Extract role requirements without treating the job description as proof about the candidate.
3. Map requirements to verified accomplishment evidence.
4. Connect Gmail when the user explicitly chooses to and scan job-search messages for application, interview/next-step, pause, closure, and networking signals.
5. Keep Gmail message evidence separate from canonical company-role counts until ASTRO reconciliation/deduplication is complete.
6. Generate role-specific prep and recurring ASTRO-style briefs from the reconciled evidence.
7. Create a Gmail draft when requested and read the stored draft back before labeling the write verified.
8. Keep final sending user-controlled.

### Land

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

The product can build a private work graph from user-approved sources. Email is the first connected-data wedge because it captures assignments, commitments, deadlines, stakeholders, decisions, recurring processes, terminology, feedback, and results. Meeting intelligence is the second major source.

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
- `EvidenceObservation`
- `SourceReference`
- `VerificationState`

Each derived object should retain source provenance, confidence, timestamp, and user-confirmation state.

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

The dedicated Cloudflare Worker currently serves:

### Interview evidence mapper

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

### ASTRO Brief Builder

- local profile setup and optional image;
- search/interview/offer/onboarding/30-60-90/career brief types;
- structured opportunity/work rows;
- themed HTML preview/export;
- issue numbering and local metadata history;
- ASTRO evidence/reconciliation rules.

### Gmail OAuth MVP

- browser-direct Google OAuth;
- `gmail.readonly` evidence scanning;
- `gmail.compose` draft creation;
- deterministic evidence classification for application/interview/pause/closure/network signals;
- import into the existing Brief Builder;
- post-create Gmail draft readback;
- stored ASTRO marker verification;
- stored dark-background/gradient-lock verification;
- final sending left to the user.

The Worker does **not** proxy or intentionally persist the user's Gmail access token or raw Gmail mailbox content. The OAuth access token is held in browser memory for the active page session.

### Current OAuth launch mode

The code supports a shared Clintware Google OAuth client through the `GOOGLE_OAUTH_CLIENT_ID` Worker binding. That production-wide client is **not configured yet**.

Until the shared client is configured and completes the applicable Google restricted-scope verification, the live public app exposes a **tester BYO Google OAuth client ID** fallback. This allows design partners/testers to exercise the complete browser-direct Gmail flow using their own Google Cloud OAuth client.

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

Email is now both a working search-evidence source and the primary planned post-hire information-growth channel.

### Current search-mode Gmail behavior

- connection is opt-in;
- Gmail API calls go directly from the browser to Google;
- message metadata/snippets needed by the classifier are processed in the browser session;
- Gmail evidence is marked as source-verified but is not automatically a unique employer process;
- the user explicitly imports selected/reconciled evidence into the Brief Builder;
- draft creation is explicit;
- created drafts are read back from Gmail and structurally verified;
- autonomous sending is not enabled.

### Planned post-hire extraction

Useful structured signals include:

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

### Local/browser mode

- raw resume/job text can remain in-browser for the current alpha session;
- profile/local history persistence is opt-in;
- Gmail access tokens remain in active page memory and are not intentionally persisted;
- Gmail raw mailbox content is not mirrored into the Cloudflare Worker;
- export/import should use a documented portable format.

### SaaS mode

Optional cloud sync should add account-scoped projects, encrypted transport, retention/deletion controls, export, tenant isolation, clear model-processing disclosure, and the same canonical model as local mode.

## Authentication and connected data

Google authentication and Gmail authorization remain separate concepts. LandThePlane should never request Gmail, Drive, Calendar, or Contacts scopes merely to sign a user into the product.

Current Gmail access is feature-specific and opt-in. Future Drive, Calendar, Contacts, and meeting integrations should be independently permissioned and revocable.

The product should extract the minimum structured career/work context needed rather than treating connected accounts as unlimited raw data stores.

## Demo and legal boundaries

- Public demos use synthetic, licensed, or explicitly approved resumes/listings/work data.
- Do not expose real candidate resumes, interview transcripts, recruiter emails, compensation details, employer-confidential material, or private work correspondence in public demos.
- Keep the product user-side: preparation, ramp, personal productivity, reflection, workflow building, and user-owned analytics.
- Do not position it as an employer hiring-decision or employee-ranking system.
- Add deletion, export, retention, subprocessors, and data-processing terms before paid SaaS cloud storage launches.
- Production use of the shared Clintware Gmail OAuth client must satisfy Google's applicable restricted-scope verification requirements.

## Name feasibility

`LandThePlane` remains a working product name, not an exclusive trademark claim. Keep the product rename-safe until formal clearance is complete.

## YC executive review

**Recommendation: #2 product track, now a materially stronger challenger to Quillgeist. Do not replace the flagship solely on thesis; let repeated external use decide.**

The post-hire extension materially improves the economics because the product no longer has to lose the user when it succeeds. It turns an episodic interview-prep product into a persistent career/workflow product.

| Dimension | Score | Reason |
| --- | ---: | --- |
| Problem clarity | 9/10 | Land the job, then ramp and perform faster. |
| Founder-use loop | 10/10 | Interviewing and future ramping create real dogfood. |
| MVP speed | 9/10 | Interview evidence mapper, ASTRO briefs, and browser-direct Gmail wedge already ship. |
| Competition | 5/10 | Interview coaching is crowded, but the interview-to-work continuity is less commoditized. |
| Differentiation potential | 9/10 | Persistent evidence/work graph + workflow learning creates a broader wedge. |
| Retention potential | 9/10 | Success no longer causes immediate churn; the product gains a reason to stay installed. |
| Monetization | 8/10 | Active-search, onboarding/ramp, ongoing career OS, and premium coaching surfaces. |
| Defensibility | 8/10 | Longitudinal user-owned work/evidence graph compounds over years. |
| Privacy posture | 8/10 | Browser-direct Gmail reduces server custody, while future connected sources still raise the operational bar. |
| YC readiness now | 8/10 | Stronger lifecycle and retention thesis; still needs external repeat-use proof. |

## Flagship promotion gate

Promote above Quillgeist when behavior proves the continuous lifecycle:

- external candidates complete role-specific prep;
- users return for additional rounds;
- testers successfully connect their own Gmail and reuse source evidence;
- at least some users transition from interview mode into post-hire ramp mode;
- connected work context measurably improves their personal workflows;
- users continue using LandThePlane after the first 30/60/90 days;
- evidence gathered on the job is reused in reviews, promotions, or future searches;
- users pay or create strong unsolicited referral pull.

## Core product thesis

**The durable moat is not interview question generation. It is a user-owned career graph that starts with prior accomplishments, grows through connected search evidence and interviews, becomes a living work graph after hire, and continuously turns work into better workflows and verified evidence.**
