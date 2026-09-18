# Vanish Fluid System — Customer Technical Ramp

Clintware-owned Cloudflare Worker demo for a living Customer Success / technical implementation system.

## Current working surface

- **Account Context** — customer mission, customer-stated outcomes kept separate from internal value hypotheses, stakeholder map, communication preferences, environment, risks, constraints, open questions.
- **Pre-Call Ramp** — 5-minute account/technical ramp using prior call scores, observed gaps, prerequisites, customer-safe troubleshooting rail, and CSM competence.
- **Technical Ramp** — environment advisories with evidence tiers, known-good internal patterns, and research through the Clintware Control Plane.
- **Post-Call Learn** — transcript ingestion, automatic Workers AI grading, KEEP/PROMOTE/SHORTEN/RETIRE lessons, and human-reviewed proposed updates.
- **Knowledge Intake** — central document dump, AI-generated KB/runbook/context candidates, source lineage, confidence, dedupe, and approval gating.
- **Shared Knowledge** — gap cards, reusable micro-training, competence map, and an Evolution Engine that proposes rather than silently changes production behavior.

## Knowledge intelligence + folder crawler

The system now turns customer/service material into reusable operational knowledge, inspired by the useful service-resolution pattern of connecting manuals, cases, notes, prior fixes, and expert knowledge rather than treating a KB as static document search.

Authenticated workspace users may paste source material into **Knowledge Intake**. A local-first crawler in `vidcrm-agent/` can recursively scan a designated central folder, extract Office/PDF/text content locally, hash/dedupe it, and POST normalized evidence to:

`POST /api/knowledge/ingest/external`

The Worker uses AI to propose KB articles, runbooks, troubleshooting flows, implementation guidance, FAQs, micro-training, risks, constraints, open questions, success criteria, failure modes, and verification checks. All candidates retain source lineage/confidence and require human approval before becoming durable shared knowledge or account context.

Approved knowledge automatically becomes available to the **Pre-Call Ramp**, **Technical Ramp**, and **Shared Knowledge** layers. The design goal is compounding service intelligence: every useful document, case, call, workaround, or proven resolution can improve the next customer interaction without silently rewriting production truth.

## Call capture

Authenticated users may paste/ingest calls from the UI. External meeting adapters may POST normalized Read AI / calendar-linked / future meeting-source data to:

`POST /api/ingest/external`

with `Authorization: Bearer $VIDCRM_INGEST_TOKEN`.

If a transcript is supplied, Workers AI grades seven dimensions and proposes facts, risks, next actions, technical gaps, known-good configuration candidates, runbook candidates, and micro-training. Durable changes still require human approval.

## Environment advisory evidence policy

- **Tier A:** authoritative standards and vendor documentation.
- **Tier B:** internally verified implementation history / known-good configurations.
- **Tier C:** practitioner/community discussion.
- **Emerging Practice:** notable practitioner traction that is not yet standard guidance. It must be labeled, researched, and reviewed before recommendation.

The system never auto-applies environment changes based on community sentiment.

## Control Plane

The Worker binds to `clintware-control-plane` as `CONTROL_PLANE` and calls its research/event APIs. This keeps external research providers and credentials out of browser JavaScript and out of this repository.

## Persistence

A Durable Object (`CrmHub`) stores account state, call history, proposals, knowledge, competence, and audit records. All durable post-call learning is review-gated.

## Required secrets

Provision in Cloudflare; never commit them:

- `VIDCRM_DEMO_PASSWORD_SHA256` — SHA-256 of the demo password.
- `VIDCRM_SESSION_SECRET` — random high-entropy HMAC signing secret.
- `VIDCRM_INGEST_TOKEN` — bearer token used by trusted meeting-ingestion automation.

The plaintext demo password must never be stored in GitHub or returned to the browser.

## Deployment target

`https://vidcrmdemo.clintware.com`

Run:

```bash
npm install
npm run check
npx wrangler deploy --dry-run
npm run deploy
```

## Design invariant

This is part of the existing fluid Customer Success system, not a disconnected app. The operating loop is:

`CUSTOMER CONTEXT → PRE-CALL RAMP → LIVE USE → CALL GRADE → PROPOSED LEARNING → HUMAN REVIEW → SHARED KNOWLEDGE → BETTER NEXT RAMP`
