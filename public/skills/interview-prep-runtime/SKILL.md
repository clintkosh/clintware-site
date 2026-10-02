---
name: interview-prep-runtime
description: Enforce interview detection, stage-specific prep generation, mandatory dark-mode live artifacts, evidence refresh, and local standalone EXE Q&A/STAR updates. Use whenever a new or changed recruiting/interview stage is detected or considered.
---

# Interview Prep Runtime

This skill governs the trigger, refresh, packaging, and persistence steps around interview preparation. It supplements the evidence-first interview-prep methodology and exists specifically to prevent missed rounds, email-only scheduled calls, stale kits, light-mode artifacts, and skipped local-app updates.

## Mandatory trigger scan

Every run must use **both Calendar and Gmail**.

### Calendar

Calendar presence is sufficient to trigger a kit when the event reasonably identifies a recruiting or hiring-stage meeting. Do not require acceptance or a confirmation email. Include tentative, needsAction, pending, unconfirmed, or not-yet-accepted events.

Qualifying examples include recruiter screens, hiring-manager discussions, technical interviews, assignment/case reviews, panels, leadership/executive/final rounds, and hiring follow-ups.

### Gmail backstop

Gmail must be scanned even when Calendar returned results. A recruiting email can independently trigger or refresh prep when no calendar event exists.

Treat an email-only meeting as scheduled when a recruiter/interviewer proposes or confirms a specific time and the candidate clearly accepts or agrees, including by saying the time works, blocking it, providing a phone number, or otherwise confirming availability. Do not wait for an .ics file or Calendar entry.

Also maintain an active-watch state for unscheduled next-stage signals such as “move forward,” “next step,” “let’s set up time,” “send availability,” “schedule a call,” “panel,” “hiring manager,” “technical interview,” or equivalent language. Generic application receipts or automated review notices do not trigger a full kit by themselves.

Regression case: a specific recruiter phone time confirmed in email but absent from Calendar must still generate the full kit immediately.

## Deduplication

Deduplicate only the exact same interview instance.

A new calendar event ID is normally a new trigger. A new interviewer, stage, date, start time, duration, link/platform, agenda, evaluation format, panel composition, role scope, or hiring-manager assignment makes it a new qualifying instance.

Recruiter screen -> hiring manager -> technical -> assignment/case -> panel -> leadership/executive/final -> follow-up are separate rounds.

If only the timing changes and interviewer/stage/purpose remain the same, refresh the same stage-specific kit with corrected facts.

## Required next-round refresh

For each qualifying or materially changed interview:

1. Read the complete Calendar event when present.
2. Read the relevant Gmail recruiting thread whether or not Calendar contains an event.
3. Recover the latest company kit, resume, job description, prior interview transcript, Read AI report, recruiter/hiring-manager feedback, manager-review evidence, post-interview notes, and user corrections when available.
4. Prefer the newest high-confidence evidence. Prior-round transcripts are high-priority.
5. Build a fresh stage-specific full kit and one-page live cockpit.
6. Include “What Changed Since the Last Round,” stating what to emphasize, reduce, correct, promote, and retire.
7. Maintain exact truth boundaries between direct ownership, shared influence, supporting work, public facts, professional inference, and simulated wording.
8. Include the private ASTRO/reflection delivery lens when that workflow is enabled, but never use it as evidence or a hiring-probability claim.
9. Render and visually QA every page before delivery.
10. Extract newly anticipated questions and update the canonical local standalone interview-prep EXE Q&A/STAR bank when its source/build environment is accessible.
11. Register privacy-safe prep-run provenance in LandThePlane when an authorized durable route exists. Record the true generator source (for example `chatgpt`, `interviewprepper-local`, `landtheplane-web`, or `landtheplane-review`) rather than implying LandThePlane generated every prep.
12. The local standalone InterviewPrepper remains the canonical update target for its own Q&A/STAR bank. LandThePlane is the cross-channel prep evidence/provenance ledger.
13. Rebuild and verify the local EXE only when the actual build source/environment is available. Never claim a rebuild or verification that did not happen.

## Mandatory conceptual bridge / experience-evolution pass

Apply this analysis to **every plausible interviewer question**, especially high-probability questions and any question involving a product category, technical domain, operating model, leadership scope, or apparent resume gap.

Do not stop at surface keyword matching. Determine whether the candidate has earlier, adjacent, predecessor, or differently named experience that maps to the modern concept being tested.

For each question, evaluate:

1. **What is really being tested?** Identify the underlying capability, problem, judgment, or operating pattern rather than only the literal wording.
2. **Direct evidence.** Find the strongest explicit resume/transcript/professional proof.
3. **Adjacent or predecessor evidence.** Look for earlier work that solved the same underlying problem under older terminology, technology, product categories, job titles, or organizational models.
4. **Best conceptual bridge.** When useful, build: `EARLIER PROBLEM/WORK -> INTERMEDIATE EVOLUTION -> TARGET ROLE/COMPANY CONCEPT -> WHY IT MATTERS NOW`.
5. **Overclaim boundary.** State what the candidate did directly versus what is adjacent, inferred, learned, or newly understood. Never convert adjacency into false direct ownership.
6. **Shortest natural answer.** Turn the bridge into a concise spoken answer that makes the connection obvious without sounding academic or overexplained.

Preferred bridge patterns include, when supported by evidence:

- discovery -> control -> context/risk;
- traditional sensitive-data scanning/discovery -> DLP policy/control -> DSPM data-centric classification, access, exposure, movement, and risk;
- Support -> Customer Success -> CS Operations / operating-system ownership;
- manual workflow -> automation -> governed orchestration;
- point tooling -> platform / integrated operating model;
- tactical execution -> repeatable process -> scalable operating system;
- reactive escalation -> health/risk signals -> proactive prevention;
- implementation/onboarding -> adoption -> renewal/expansion outcomes.

The sensitive-data example is a model for reasoning, not a claim template: traditional drive/repository scanning can legitimately bridge to DLP and then to DSPM as an evolution of the same core sensitive-data problem, but the candidate must not claim prior DSPM ownership unless direct evidence supports it.

For high-probability questions, the answer card should include, when useful:

- **TEST** — what the interviewer is evaluating;
- **DIRECT PROOF** — strongest explicit evidence;
- **BRIDGE** — adjacent/predecessor experience and the modern connection;
- **TRUTH LINE** — exact overclaim boundary;
- **SPOKEN ANSWER** — the compressed natural answer;
- **STOP** — where to end unless probed.

Do not force a bridge when one does not exist. Classify it honestly as adjacent evidence or a gap and use the normal gap-bridge method.

Use prior interview transcripts as a feedback loop. Promote conceptual bridges that clearly resonated or unlocked stronger follow-up discussion. Shorten, reframe, or retire bridges that confused the interviewer or required too much explanation.


## Mandatory adaptive self-introduction standard

Do not prepare or coach a fixed memorized elevator pitch. The candidate should know the evidence and structure, not a word-for-word script.

For every interview round, generate self-introduction variants from the current role, company, interviewer/stage, likely audience priorities, available time, and newest evidence.

Required structure:

**PRESENT -> PAST PROOF -> FUTURE / ROLE LINK -> STOP**

1. **Present / value proposition**
   - Lead with who the candidate is professionally now and the distinctive value they create.
   - Use one memorable operating identity or leadership pattern, not a generic title.
   - Make the opening answer the audience's implicit question: "Why is this person relevant to what I need?"

2. **Past / credibility**
   - Use only 1-2 highly relevant proof points.
   - Prefer outcomes, scope, metrics, operating patterns, and ownership over job-title chronology.
   - Do not recite the resume.
   - If tenure or a transition is mentioned, immediately answer "so what?" by stating the capability, perspective, relationship network, or result it created.

3. **Future / audience connection**
   - End with one forward-looking sentence connecting the candidate's evidence to what this team, interviewer, or role is trying to accomplish.
   - Make the future connection specific enough to show audience awareness without pretending to know undocumented internal priorities.

4. **STOP**
   - End after the role link. Let the interviewer pull for detail.
   - Do not append extra chronology, a second thesis, another metric, or a project inventory unless asked.

Audience adaptation is mandatory:
- recruiter: role fit, scope, motivation, clarity;
- hiring manager: operating value, judgment, outcomes, ownership;
- technical/product partner: credible bridge, cross-functional translation, implementation/adoption implications;
- executive: business outcome, scale, tradeoffs, leverage;
- panel: one shared headline that remains legible across functions.

Self-introduction failure modes to flag in prep and transcript review:
- memorized or over-rehearsed wording;
- chronology before value;
- generic identity such as "I'm a CSM" without differentiation;
- making the introduction entirely about the candidate rather than the audience's need;
- multiple competing professional identities in the first answer;
- long setup before proof;
- proof without result;
- result without role relevance;
- missing future-facing close;
- continuing after the answer is complete;
- introducing tools/projects before establishing the human or business capability they prove.

Generate at least:
- a 20-30 second recruiter/opening version;
- a 45-60 second hiring-manager version;
- an executive-compressed version.

These are frameworks and talking rails, not scripts to memorize. Preserve natural language and allow wording to vary live.

## Mandatory dark-mode artifact contract

Dark mode is the default and required presentation for all live interview-prep artifacts unless the user explicitly requests otherwise.

This applies to:

- full PDF;
- editable DOCX;
- one-page cockpit/master view;
- branded emergency-master email or HTML prep surface.

Required design behavior:

- dark page and card backgrounds throughout;
- high-contrast text and headings;
- large, readable hierarchy;
- short visual blocks and generous spacing;
- POINT -> PROOF -> RESULT -> RELEVANCE -> STOP as the live answer rail;
- highly visible STOP cues;
- recovery language for blanking, interruption, branching, and over-answering;
- no accidental white/light pages;
- no tiny-font compression to force content onto a page.

A file is not releasable until every PDF and DOCX page is rendered and visually checked for clipping, overlap, broken tables, unreadable glyphs, weak contrast, tiny fonts, and light-mode regressions.

## Full-kit minimums

When evidence supports the depth, a full stage kit should include:

- one-page live cockpit/master view;
- corrected meeting facts and hiring-stage flow;
- What Changed Since the Last Round;
- company/product intelligence and role snapshot;
- interviewer operating profile with verified fact separated from professional inference;
- opening and positioning versions;
- 18-25 interviewer-specific likely questions with test, direct proof, conceptual bridge when useful, truth line, tailored answer, result/metric, role relevance, STOP, and likely probes;
- 10-12 strong STAR/STAR-like stories with competency retrieval map and truth-line guardrails;
- technical drills appropriate to the role;
- vulnerability/objection map and counters;
- compensation guidance when relevant;
- 10-15 ranked questions for the candidate to ask when stage/time supports them;
- 30/60/90 when appropriate;
- transcript-specific lessons;
- live behavior and recovery rules;
- readiness checklist, closing, and follow-up draft.

Do not invent detail merely to hit a count. If evidence is insufficient, state the limitation.

## Release gate

Before saying a new-round scan found nothing, confirm both:

1. no qualifying or materially changed Calendar event exists; and
2. no Gmail recruiting thread contains a newly scheduled, time-proposed-and-accepted, or next-stage signal requiring immediate prep or active watch.

Before saying a kit is complete, confirm:

1. it is genuinely dark mode throughout;
2. meeting facts and timezone are correct;
3. the newest stage/interviewer/transcript/email evidence was incorporated;
4. every major answer has a STOP point;
5. every plausible high-value question was checked for a useful conceptual/experience-evolution bridge;
6. no conceptual bridge overstates direct ownership or experience;
7. ownership/evidence attribution is intact;
8. PDF/DOCX/cockpit rendering and visual QA passed;
9. prep-run provenance was durably logged when an authorized LandThePlane route was available, or explicitly marked unlogged when it was not;
10. the local-EXE Q&A/STAR update step was executed when the build source was available, or explicitly marked not executable when it was not.

Canonical sequence:

`CALENDAR + GMAIL -> QUALIFY / DEDUPE -> FRESH STAGE KIT -> QUESTION TEST -> DIRECT PROOF -> CONCEPTUAL BRIDGE / TRUTH LINE -> DARK COCKPIT -> PRIVATE ASTRO LENS -> TRANSCRIPT / EVIDENCE DELTA -> RENDER + QA -> DELIVERY -> LANDTHEPLANE PROVENANCE -> LOCAL EXE Q&A / STAR UPDATE -> REBUILD + VERIFY WHEN ACCESSIBLE`

## Evidence provenance, role-problem, interviewer-profile, org-map, and refresher gate

Apply `docs/EVIDENCE_PROVENANCE_STANDARD.md` to every interview kit.

### Metric / claim integrity

Before a kit is releasable:

1. Build or refresh a claim ledger for every consequential numeric value used in the kit.
2. Classify each value as MEASURED, TARGET, DERIVED, ESTIMATE, SYNTHETIC, PUBLIC FACT, or LOGISTICS.
3. Preserve scope, time window, ownership, and source location.
4. Render the final PDF/DOCX/cockpit, extract the final visible text, and reconcile consequential numbers against the ledger.
5. Perform a separate human logic/visual review so a syntactically matched value cannot still misrepresent the source.
6. If provenance is unclear, remove the number, relabel it appropriately, or return to the original source. Never defend an orphan metric.

The Neuron7 case-study metric regression is a release-blocking regression case.

### One-line role problem hypothesis and interview match

Every stage kit must contain one concise statement:

`COMPANY / TEAM NEEDS <OUTCOME> BUT <CONSTRAINT / FAILURE MODE>; THIS ROLE EXISTS TO <OWNERSHIP / CHANGE>.`

Label it **ROLE PROBLEM HYPOTHESIS** before direct confirmation. Source it from the job description, public company context, recruiter thread, and prior transcripts.

During the interview, listen for the interviewer's own definition of the problem. Afterward classify the hypothesis as MATCHED, MODIFIED, DISPROVEN, or UNCONFIRMED and carry the newest wording into the next round.

### Interviewer decision / operating profile

For every known interviewer, add an evidence-based profile with:
- verified role and stage;
- what the interviewer is responsible for deciding;
- likely evaluation themes supported by role/stage/background/transcript evidence;
- observable communication or follow-up patterns when supported;
- what to emphasize and avoid;
- confidence and source boundary.

Do not diagnose personality, intelligence, motives, or private traits. Use professional operating evidence only.

### Operational org map

Map the role around the interviewer when enough evidence exists. Show verified versus inferred links explicitly.

At minimum map:
- hiring manager / functional owner;
- target role;
- CSM / Sales / Support / Product / Engineering / Services peers as relevant;
- customer/user stakeholders;
- escalation path;
- commercial / product / customer decision ownership;
- where the interviewer sits relative to the role;
- where failure creates friction.

Prefer an ASCII live-use map in the cockpit when it improves retrieval.

### Role-specific technical refresher

For technical roles, retrieve current authoritative technical guidance relevant to the role. Prefer vendor docs, RFCs/standards, OWASP/NIST/CISA, cloud/provider docs, then reputable technical references.

For each topic include:
- mental model;
- common failure modes;
- diagnostic sequence;
- evidence to collect before escalation;
- terminology traps;
- current best practices;
- source links;
- candidate experience boundary.

Example API rail:

`SCOPE -> CONTRACT -> AUTHN/AUTHZ -> ENDPOINT/METHOD -> HEADERS/PAYLOAD -> STATUS/BODY -> RATE/RETRY -> PAGINATION/STATE -> WEBHOOK/CALLBACK -> NETWORK/TLS/DNS -> LOGS/CORRELATION ID -> MINIMAL REPRO -> OWNER/ESCALATION`

The refresher is preparation, not evidence that the candidate previously owned every technology described.
