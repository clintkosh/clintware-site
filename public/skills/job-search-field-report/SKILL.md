---
name: job-search-field-report-astro
description: Standalone workflow for recurring job-search reporting from the exact time the last report was actually sent through now. Separates cumulative totals from interval deltas, reconciles active vs closed processes, adds sourced market intelligence and market-relative progress, and verifies email rendering before a draft is considered complete.
version: 1.2
---

# Job Search Field Report ASTRO

## Core rule

`difference_window = (latest_sent_report_at, current_at]`

A draft never advances the baseline. Only a confirmed sent report does.

## Operating views

1. **Delta since last sent report** — what changed in the exact interval.
2. **Cumulative search state** — full funnel to date.
3. **Market-relative read** — target segment, current outlook, and how the funnel compares with available evidence.

## Action boundary

Default behavior is **DRAFT ONLY**. `update`, `rebuild`, `refresh`, `prepare`, `make the next issue`, or `draft` never authorize sending. Send only when the current instruction explicitly says to send.

## Candidate context

Infer role family, seniority, industry, geography, work arrangement, compensation, and search start from current supplied evidence when possible. Relevant model memory/context may fill gaps only when consistent with fresh evidence. Never invent missing personal facts.

## Default report map

1. Hero / issue banner
2. Exact audit-through-now line + comparison window
3. Mission / at-a-glance snapshot
4. Thank-you / audience note when appropriate
5. Headline / current read
6. **Since last sent report — exact delta snapshot**
7. Verified cumulative funnel + conversion table
8. Market segment assessment
9. Overall job-market outlook
10. Search clock / duration comparison
11. Market-relative progress assessment
12. Active high-signal pipeline
13. Most important storyline / deep dive
14. Detailed changes since last sent update
15. New / advanced / closed / pending
16. Skills, certifications, or build proof when relevant
17. Strategic adjustments / next focus
18. Closed-process history
19. Sources + method notes
20. Bottom-line summary

The first screen should answer: **What changed? How is the market? How is this search performing relative to it?**

# Exact delta snapshot

The delta snapshot belongs **before** cumulative funnel totals. It should make movement obvious without forcing the reader to subtract old numbers mentally.

Use a compact table with:

- metric;
- previous sent issue value;
- current value;
- exact delta;
- short interpretation.

Compare, when available:

- application actions;
- unique company-role applications;
- reached interview / screen;
- completed live interviews;
- reached second round / panel;
- final-stage processes;
- offers.

Also show difference-window event counts when useful:

- newly scheduled interviews;
- interviews completed in the interval;
- major process advances;
- verified closures;
- referrals / introductions;
- relevant certifications / proof completed;
- exact elapsed time since the last sent report.

Rules:

- Compare only against the most recent **sent** report, never a draft.
- If a value is a conservative floor, label the delta as a floor too.
- Do not subtract unlike definitions. Normalize both sides first or mark the delta unavailable.
- Event counts are not automatically cumulative funnel increments.
- Keep the later detailed `What changed` section. The front delta is numeric; the later section explains the events.

# Funnel math

When data permits, calculate:

- `screen_rate = interview_or_screen_tracks / unique_applications`
- `live_interview_rate = completed_live_interviews / unique_applications`
- `panel_progression = second_round_or_panel / interview_or_screen_tracks`
- `final_stage_progression = final_stage / interview_or_screen_tracks`
- `offer_rate = offers / unique_applications`
- `active_signal_rate = current_human_active_processes / unique_applications`
- interval velocity for applications, screens, interviews, advances, and closures.

Never mix cumulative totals with interval-only activity.

# Reconciliation rules

- Count each company-role process once wherever possible.
- Keep application actions separate from unique applications.
- Do not inflate interview counts with duplicate invites, reschedules, follow-ups, or multiple messages from one process.
- `Reached interview / screen` requires a real screen/interview/panel or booked first interview tied to a distinct process.
- `Completed live interview` requires an actual completed conversation.
- `Second round / panel` requires progression beyond the first substantive conversation.
- Closed/rejected/withdrawn/filled roles leave the active board.
- Uncertain status is `waiting`, `unverified`, or `stale-risk`, not active by assumption.

# Market intelligence protocol

Refresh market context on every substantive report when web access exists.

## Official / primary sources — highest weight

Prefer current BLS Employment Situation, BLS JOLTS, Federal Reserve Beige Book, BLS occupational data/projections, and relevant state labor-market sources.

## Platform / industry sources

When available, use LinkedIn Economic Graph / Workforce Report, Indeed Hiring Lab, CompTIA, or other credible sector-specific hiring data with clear methodology.

## Reddit / practitioner communities

Use Reddit deliberately for signals official data often misses: hiring-cycle length, ghosting, interview-round inflation, compensation pressure, applicant crowding, and role-specific friction.

- Search recent threads, usually the last 30–90 days.
- Prefer multiple relevant independent threads.
- Label Reddit evidence **anecdotal / community-reported**.
- Never convert individual posts, upvotes, or comments into population statistics.
- If community sentiment conflicts with official data, show the conflict.

A strong market section normally combines at least one current official source, one platform/industry source when available, and several recent community signals.

# Overall market outlook

Use one evidence-backed band: **Favorable, Balanced, Selective, Tight, Very tight**. Include assessment date, 2–4 reasons, strongest counter-signal, and confidence (`low`, `medium`, `high`).

# Market-relative progress

If no valid population percentile exists, use one of:

- **Ahead of observed market**
- **Competitive with current market**
- **Mixed / bottlenecked**
- **Behind observed market**
- **Insufficient evidence**

Explain where the funnel is strong or weak. Never invent a percentile, quartile, benchmark, or `top X%` claim. Reddit anecdotes may inform the narrative but cannot create a percentile.

# Compensation

Classify every compensation figure as **verified**, **estimated**, or **unknown / not yet verified**.

# Productive-work proof

Include certifications, portfolio work, technical projects, AI workflows, demos, relevant consulting/volunteer work, or other proof only when it materially strengthens the search story. Keep unrelated identities/projects out unless the user explicitly chooses to include them.

# Visual contract

Use a polished adult tech-briefing / field-report aesthetic. Avoid childish, gamified, military, achievement-badge, or cartoon styling unless explicitly requested.

For email output:

- table-based email-safe HTML;
- inline CSS;
- strong information hierarchy;
- compact metric cards and comparison tables;
- high contrast;
- mobile-safe layout;
- no external JavaScript.

A prior user-specific theme may be preserved only for that user's private report. Public/shared outputs must remain identity-scrubbed and generic.

# Inline banner reliability contract

A report is **not complete** until the saved Gmail draft proves the hero/banner is a real inline MIME image.

## Known broken pattern

Do not use:

`<img src="cid:local-banner-filename.png">`

and then merely attach that file. Gmail may store it as `Content-Disposition: attachment`, leaving `inline_images` empty and the CID broken.

## Known working pattern

1. Build the full email-safe HTML first.
2. Embed the banner in the HTML as `data:image/png;base64,...` (or the correct image MIME type).
3. Create the Gmail draft from that HTML / HTML file **without separately attaching the same banner**.
4. Gmail should rewrite the data URI into a generated CID and create an inline image MIME part.
5. Re-read the saved draft before completion.
6. Verify:
   - `inline_images` is non-empty;
   - the banner has the expected MIME type and plausible byte size;
   - raw MIME contains `Content-Disposition: inline`;
   - raw MIME contains `Content-ID`;
   - the HTML `<img>` source has been rewritten to a matching `cid:<generated-id>`.
7. `has_attachment: false` can be correct when the banner is genuinely inline.
8. If the banner appears only under `attachments` and `inline_images` is empty, the draft **fails** acceptance. Rebuild it.
9. If editing a draft may strip the inline MIME part, create a replacement draft from verified HTML instead. Verify the replacement before removing the superseded draft.

Never say the banner is fixed based only on source HTML. Verify the saved Gmail MIME state.

# Model / reasoning quality floor

This workflow is reconciliation-heavy, not a low-effort formatting task.

- When model/reasoning controls are available, use **Medium reasoning or higher**.
- Prefer a **GPT-5.5-class or newer** capable reasoning model; use the strongest current equivalent available when model names change.
- If controls are unavailable, compensate with a deliberate multi-pass process: source audit → reconciliation → calculations → draft → MIME/render verification → acceptance test.

# Default rebuild workflow

Resolve current time → find latest sent report → establish exact window → audit recruiting activity → refresh cumulative totals → reconcile active/closed → calculate front delta snapshot → define target segment → refresh official market data → refresh platform/industry data → review recent Reddit/practitioner signals → assess market outlook → calculate funnel conversion/velocity → assess market-relative progress → identify relevant build proof → build report → triple-check facts/counts/status/sources → create email-safe HTML → create draft → verify real inline banner MIME → draft only unless send is explicitly authorized → advance baseline only after confirmed send.

# Acceptance test

Before completion verify all of the following:

- latest **sent** report defines the interval;
- front delta snapshot appears before cumulative totals;
- previous → current → delta math is accurate;
- cumulative and interval metrics are clearly separated;
- active/closed reconciliation is current;
- compensation labels are truthful;
- target market is defined;
- official sources are current and dated;
- Reddit is recent, relevant, and labeled anecdotal;
- market outlook includes reasons, counter-signal, date, and confidence;
- no unsupported percentile exists;
- fresh evidence overrides stale memory;
- HTML is adult, readable, and mobile-safe;
- saved Gmail draft shows a real inline banner MIME part;
- output remains draft-only unless sending was explicitly authorized.

Do not import private names, employers, metrics, addresses, or project details from another user or sample.
