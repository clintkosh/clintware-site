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
11. The official LandThePlane web product is **not** the canonical update target for this workflow unless the user explicitly changes that instruction.
12. Rebuild and verify the local EXE only when the actual build source/environment is available. Never claim a rebuild or verification that did not happen.

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
- 18-25 interviewer-specific likely questions with test, best evidence, tailored answer, result/metric, role relevance, STOP, and likely probes;
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
5. ownership/evidence attribution is intact;
6. PDF/DOCX/cockpit rendering and visual QA passed;
7. the local-EXE Q&A/STAR update step was executed when the build source was available, or explicitly marked not executable when it was not.

Canonical sequence:

`CALENDAR + GMAIL -> QUALIFY / DEDUPE -> FRESH STAGE KIT -> DARK COCKPIT -> PRIVATE ASTRO LENS -> TRANSCRIPT / EVIDENCE DELTA -> RENDER + QA -> DELIVERY -> LOCAL EXE Q&A / STAR UPDATE -> REBUILD + VERIFY WHEN ACCESSIBLE`
