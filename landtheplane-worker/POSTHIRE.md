# LandThePlane post-hire product expansion

## Canonical positioning

**LandThePlane: Land the job. Hit the ground rolling.**

LandThePlane does not end when the candidate gets hired. The same evidence and role model transitions into a personal ramp, workflow, and performance system.

## Product arc

`LAND → RAMP → OPERATE → IMPROVE → PROVE`

### 1. Land

- resume and accomplishment evidence
- target role and interview stage
- requirement/evidence mapping
- answer compression and STAR retrieval
- interview history and debrief

### 2. Ramp

On acceptance/start date, convert the job description from interview context into an initial success hypothesis:

- expected outcomes
- responsibilities
- tools and systems to learn
- stakeholders to identify
- recurring cadences
- likely first-30/60/90-day milestones
- unknowns that must be validated with the manager

The job description is never treated as final truth. Email, meetings, manager feedback, and actual work progressively replace assumptions.

### 3. Operate

Build a private work graph from user-approved sources. Email is the primary growth source because it captures assignments, commitments, stakeholders, deadlines, decisions, recurring processes, terminology, and feedback. Meeting intelligence is the second major source.

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

Each extracted item retains provenance, confidence, timestamp, and user-confirmation state.

### 4. Improve

LandThePlane helps the user turn repeated work into personal workflows:

- identify repeated requests and sequences;
- propose checklists/templates only after repetition is observed;
- let the user edit or approve the workflow;
- track which workflows save time or reduce mistakes;
- update workflows as responsibilities change;
- distinguish personal working preferences from company policy.

Example:

`customer escalation email → gather account context → check prior decisions → identify owner → draft response → create follow-up → record outcome`

The system learns from the user's edits, accepted/rejected suggestions, explicit feedback, and observed corrections.

### 5. Prove

The same system continuously accumulates verified evidence for:

- manager 1:1 preparation;
- weekly/monthly accomplishment summaries;
- promotion packets;
- performance reviews;
- resume updates;
- future interview preparation.

This closes the loop: work performed after hiring becomes verified evidence for the next internal or external opportunity.

## Email integration

Email is the primary information-growth channel after hire, but ingestion is permissioned and scoped.

Desired extracted signals:

- direct requests / assignments;
- commitments made by the user;
- due dates and follow-ups;
- stakeholder names and roles;
- project/product vocabulary;
- decisions and reversals;
- positive/negative feedback;
- process steps;
- recurring requests;
- success metrics;
- important attachment/document references.

The product should store structured work objects rather than treating a raw mailbox as the permanent product database. Every derived object should keep source provenance and obey user retention/deletion controls.

## Meeting intelligence

Read AI or equivalent meeting sources can feed:

- action items → commitments;
- topics / chapter summaries → knowledge and project context;
- key questions → unresolved work or skill gaps;
- participants → stakeholder context;
- transcripts → decisions, ownership, feedback, and process detail;
- meeting metrics → optional communication-coaching signals kept separate from factual work evidence.

Prefer summary/action-item/topic ingestion by default. Retrieve full transcripts only when enabled by the user or required by a specific workflow.

## Product thesis

The durable moat is not interview question generation. It is a user-owned career graph that starts with prior accomplishments, grows through interviews, becomes a living work graph after hire, and continuously turns work into better workflows and verified evidence.
