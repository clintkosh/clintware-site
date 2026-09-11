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
- hero/banner first inside the dark wrapper.

If no actual target-client/mobile preview is available, say static safeguards passed. Do not claim verified client rendering.

## Future Gmail delivery rule

Current alpha is browser-local and does not send Gmail. When connected Gmail drafting is introduced, require provider readback after create/update. Inline hero images must be verified as real inline MIME parts with `Content-Disposition: inline`, `Content-ID`, and matching stored `cid:` HTML. Re-run both MIME and mobile-dark checks after every draft update.

## Privacy and product truth

- Keep connected sources opt-in and minimally scoped.
- Do not expose private candidate, recruiter, employer, compensation, transcript, or work data in public demos.
- Keep current alpha capability separate from roadmap capability.
- Never claim connected Gmail delivery, server-side storage, or provider rendering checks until they actually exist and are verified.
