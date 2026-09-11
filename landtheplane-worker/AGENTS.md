# LandThePlane Agent Guardrails

These rules apply inside `landtheplane-worker/` and extend the repository-level `AGENTS.md`.

## Preserve the product thesis

LandThePlane is a candidate-owned career evidence / work evidence system. Do not reduce it to generic interview-question generation or generic status-email generation.

The same evidence graph should support interview preparation, recurring job-search briefs, offer/landing transitions, post-hire ramping, work capture, performance proof, and future-search reuse.

## Brief Builder / Job Search Field Report ASTRO

Before materially changing Brief Builder behavior:

1. Read `BRIEF_BUILDER.md`.
2. Read the canonical standalone skill at `../skills/job-search-field-report/SKILL.md`.
3. Preserve the exact-sent-baseline rule for recurring search reports.
4. Preserve cumulative-vs-interval separation, application-action-vs-unique-process separation, and network-vs-employer-interview separation.
5. Reconcile active, paused, waiting, stale-risk, closed, and unverified state before rendering.
6. Keep material claims provenance-aware: source, observed time, confidence, verification state, and current status when applicable.
7. Fresh direct evidence overrides stale summaries. Conflicting credible evidence remains visible rather than being silently smoothed over.
8. Compensation remains verified, estimated, or unknown.
9. Preserve anti-regression behavior: a new fix may not silently remove still-valid sections, visuals, evidence, or prior safeguards.

## Accuracy and write-verification rule

Use this sequence for consequential generated artifacts:

`SOURCE AUDIT → RECONCILE STATE → CALCULATE → RENDER → STATIC QA → STORED/DELIVERY READBACK WHEN AVAILABLE`

Do not claim that an artifact, write, deployment, email, render, or verification succeeded unless the relevant stored/served representation proves it.

If a stored artifact is updated after verification, prior acceptance is invalid. Re-read and re-verify the new stored form.

## Email rendering rule

Email-targeted dark output must use structural safeguards rather than depending on global CSS or media queries alone:

- email-safe tables;
- dark HTML `bgcolor` on critical layers;
- inline `background-color:...!important`;
- same-color `linear-gradient(...)!important` locks;
- explicit high-contrast text colors;
- no transparent critical panels;
- responsive sizing that remains usable if media queries are ignored;
- hero/banner first inside the dark wrapper when a hero is present.

If no actual target-client/mobile preview is available, say static safeguards passed. Do not claim verified client rendering.

## Current Gmail OAuth MVP rule

LandThePlane now has a live browser-direct Gmail OAuth MVP.

Current capability:

- Google OAuth token flow runs in the user's browser;
- Gmail API requests run from the browser directly to Google;
- the Cloudflare Worker does not proxy or persist raw Gmail messages;
- Gmail evidence scanning reads message metadata/snippets needed for job-search classification;
- imported evidence remains subject to ASTRO deduplication/reconciliation before it becomes a cumulative funnel count;
- Gmail draft creation is supported;
- every created draft must be read back from Gmail and pass the stored-marker and mobile-dark structural checks before it is called verified;
- autonomous sending is not enabled;
- access tokens remain in page memory and are not intentionally persisted by LandThePlane.

The live public MVP currently supports a tester BYO Google OAuth client ID when the shared Clintware client is not configured. Broad production use through one Clintware OAuth client remains gated by Google restricted-scope verification.

If profile/hero images are later added to Gmail drafts, inline images must be verified as real inline MIME parts with `Content-Disposition: inline`, `Content-ID`, and matching stored `cid:` HTML after every draft mutation. Do not claim CID verification when no inline image is present.

## Privacy and product truth

- Keep connected sources opt-in and minimally scoped.
- Do not expose private candidate, recruiter, employer, compensation, transcript, or work data in public demos.
- Keep current alpha capability separate from roadmap capability.
- Never claim autonomous Gmail sending, server-side mailbox storage, a production-wide shared Google OAuth client, or physical Gmail-mobile visual verification until those capabilities actually exist and are verified.
