# LandThePlane post-hire and career-pivot expansion

## Canonical positioning

**LandThePlane: And Hit the Ground Rolling.**

LandThePlane does not end when the candidate gets hired. The same evidence and role model transitions into a personal ramp, workflow, performance, and career-pivot system.

## Product arc

`LAND → RAMP → OPERATE → IMPROVE → PROVE → PIVOT`

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

### 6. Pivot

LandThePlane should use the accumulated career/work graph to identify plausible roles the user may not think to search for manually.

The goal is not to recommend random jobs from title similarity. It should reason from demonstrated capability, transferable work patterns, preferred work style, learning velocity, recurring strengths, prior outcomes, and verified evidence.

For every suggested pivot, show:

- **Why this role fits:** which evidence, workflows, and strengths transfer.
- **What is non-obvious about the fit:** why a human scanning only job titles might miss it.
- **Transferable evidence:** specific accomplishments that map to the new role.
- **Skill distance:** what is already proven versus what must be learned.
- **Credibility gaps:** certifications, tools, domain knowledge, or portfolio proof that would make the pivot believable.
- **Ramp plan:** a practical 30/60/90-day learning and proof-building path before or after the move.
- **Bridge language:** truthful ways to explain the pivot in a resume, recruiter screen, or interview.
- **Confidence:** evidence-backed fit score rather than a generic recommendation.

Example:

A Customer Success leader with strong technical discovery, workflow design, implementation ownership, security context, and measurable adoption outcomes might be a credible candidate for roles such as solutions consulting, AI adoption, value consulting, customer engineering, technical program management, or product operations even if their prior job titles do not contain those labels.

The same ramp engine used after a new hire should work before a pivot: identify the target-role knowledge graph, compare it with the user's current graph, then build the shortest credible path from present evidence to target-role readiness.

## Career-discovery engine

Suggested inputs:

- verified evidence graph;
- current and past job descriptions;
- work graph from email/meetings;
- explicit user preferences and constraints;
- skills the user enjoys versus merely performs;
- manager/peer feedback;
- demonstrated learning velocity;
- compensation/location/work-style constraints;
- user-approved assessments.

Suggested outputs:

- adjacent-role shortlist;
- unconventional-role shortlist;
- internal-mobility opportunities;
- skill-distance matrix;
- 30/60/90 pivot-ramp plan;
- evidence gaps to close;
- portfolio/project recommendations;
- role-specific resume and interview preparation once the user chooses a path.

The system should always expose the evidence behind a recommendation so the user can reject incorrect inferences.

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

The durable moat is not interview question generation. It is a user-owned career graph that starts with prior accomplishments, grows through interviews, becomes a living work graph after hire, improves personal workflows, proves impact, and can reveal credible next roles that ordinary title-based career planning may miss.
