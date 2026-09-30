# Clintware venture evidence journal standard

Updated: 2026-09-30.

## Purpose

Every YC candidate and operational business idea gets the same evidence/progress contract at creation time. The contract exists before public metrics exist, but empty scaffolding stays quiet rather than rendering blank KPI cards.

The journal separates:

- **current proof** — what exists and can be inspected now;
- **measured progress** — instrumented counts or verified outcomes;
- **internal proof** — founder/Clintware dogfood and build evidence;
- **external traction** — outside repeat users, retention, paid intent, revenue, referrals, or other verified market behavior;
- **next evidence gate** — the next fact that would strengthen or falsify the thesis.

## UI contract

The first view has four jobs only:

1. current status;
2. meaningful change;
3. measured evidence;
4. next evidence gate.

Use progressive disclosure for history, implementation detail, and secondary metrics. Do not create a wall of equal-weight cards.

Rules:

- Hide metrics that do not exist yet.
- Never display zero as if it were traction when tracking has not started.
- Use compact rows/summary blocks for portfolio-wide views.
- Use cards only for genuinely comparable top-level metrics.
- Keep detailed history behind a disclosure control or dedicated journal.
- Preserve high contrast and mobile readability.
- Every metric must identify its source and whether it is measured, estimated, internal, or external.
- A product may have a background scaffold in the registry without a visible product-page module until evidence exists.
- Never infer user counts from aggregate runs.
- Never convert founder/internal use into external traction.

## Default registration

When a new venture or operational business idea is added:

1. assign a stable `id`;
2. register the canonical URL;
3. state the current proof;
4. state the next evidence gate;
5. choose `surface_mode`: `live` or `scaffold`;
6. define the metric source even when it is `not_yet_published`;
7. add a dedicated progress URL only when there is a useful surface to show;
8. update validation so unregistered startup-index entries fail CI.

The source registry is `public/data/venture-progress.json`.

## LandThePlane prep-run provenance

LandThePlane is the canonical **prep-run provenance/evidence ledger**, but it is not required to be the only generator.

A prep may originate from ChatGPT, the local InterviewPrepper app, LandThePlane web, interview-review analysis, or another authorized tool. The completed run should record privacy-safe metadata when an authorized durable route exists:

- opaque run ID;
- timestamp;
- generator source;
- interview stage;
- prep-standard/version identifiers;
- whether prior transcript/email/calendar evidence was incorporated;
- artifact types produced;
- verification/QA status;
- numeric coaching metrics that do not reveal private employer content;
- later outcome state when the user supplies it.

Raw recruiter messages, interview transcripts, compensation, company-confidential information, and private prep text do not belong in the public venture registry.

Until a private cross-channel ingestion store is active, the LandThePlane web alpha tracks prep statistics in browser-local storage and the public journal shows curated product milestones. Do not claim a ChatGPT/local-app prep was logged into LandThePlane unless a durable record was actually written.

## Canonical sequence

`IDEA -> REGISTER -> BUILD -> MEASURE -> LABEL EVIDENCE -> REVIEW TREND -> NEXT GATE -> REPEAT`
