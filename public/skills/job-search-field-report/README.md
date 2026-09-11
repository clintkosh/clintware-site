# Job Search Field Report ASTRO

A standalone, identity-scrubbed workflow for rebuilding recurring job-search field reports from the exact time the last report was actually sent through now.

## Core idea

Use the timestamp of the latest **actually sent** report as the beginning of the next difference window. Drafts, previews, and unsent exports do not advance the clock.

`difference_window = (latest_sent_report_at, current_at]`

## What v1.4 adds

- an evidence-state ledger for source, observation time, confidence, verification state, and current status;
- explicit conflict handling so fresher direct evidence overrides stale summaries while unresolved credible conflicts remain visible;
- active / paused / waiting / stale-risk / closed / unverified state reconciliation;
- a post-write readback rule: consequential saved updates must be re-read and re-verified when the provider exposes stored state;
- mobile dark-mode hardening with structural `bgcolor`, inline dark backgrounds, same-color gradient locks, explicit high-contrast text, and no dependence on media queries for critical readability;
- a stricter Gmail inline-image rule that repeats CID/MIME verification after every draft mutation;
- a clear distinction between static mobile-hardening QA and actual target-client visual verification;
- current-model-agnostic reasoning guidance instead of tying quality to a stale model name.

v1.4 preserves the v1.3 functionality: exact front-of-report deltas, receipt-based application auditing, deduplicated company-role totals, separate search-channel traction, sourced market analysis, email-safe tables/charts, anti-regression checks, verified Gmail inline-banner handling, and draft-only action boundaries.

## Included

- `SKILL.md` — full workflow specification
- `GPT_INSTRUCTIONS.md` — condensed execution instructions
- `examples/sample-report.html` — fictional sample output using dummy companies and metrics

## LandThePlane

This standalone skill is also the portable reporting contract used by the LandThePlane Brief Builder. LandThePlane keeps the broader candidate-owned career evidence graph; this skill defines the reusable search-report reconciliation, rendering, and verification rules.

The current LandThePlane public alpha builds/previews/exports briefs browser-locally. Connected Gmail delivery is roadmap functionality, so the Gmail readback rules are a future delivery acceptance gate rather than a claim about current alpha capability.

## Portability

The workflow is provider-independent. It can be used with any email/calendar/tracker stack, or manually with supplied files. Gmail-specific MIME verification applies only when Gmail is the output system. The sample HTML is static and requires no framework, database, account, or proprietary runtime.

## Privacy

The public skill is identity-scrubbed. Never import private names, employers, email addresses, personal metrics, addresses, or private project details from another user's report.
