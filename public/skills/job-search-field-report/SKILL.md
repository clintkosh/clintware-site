---
name: job-search-field-report-astro
description: Standalone workflow for recurring job-search reporting from the exact time the last report was actually sent through now. Separates cumulative totals from interval deltas, reconciles active vs closed state, audits application receipts, tracks search-channel traction separately from employer interviews, adds sourced market intelligence, and verifies saved email/rendering state before completion.
version: 1.4
---

# Job Search Field Report ASTRO

A portable, identity-scrubbed workflow for rebuilding recurring job-search field reports without arbitrary date windows, stale process carryover, duplicated funnel counts, or unverified delivery claims.

## Core rule

`difference_window = (latest_sent_report_at, current_at]`

A draft, preview, export, or unsent revision never advances the baseline. Only a confirmed sent report does.

## Operating views

1. **Delta since last sent report** — what changed in the exact interval.
2. **Cumulative search state** — the full funnel to date.
3. **Market-relative read** — the candidate's target segment, current outlook, and search performance relative to available evidence.
4. **Search-channel traction** — applications, referrals, cold/warm networking, recruiter/search-firm intros, and other routes into real conversations.
5. **Evidence state** — where each material status claim came from, how fresh it is, and whether it is verified, inferred, conflicting, or unverified.

## Action boundary

Default behavior is **DRAFT ONLY**. `update`, `rebuild`, `refresh`, `prepare`, `make the next issue`, or `draft` never authorize sending. Send only when the current instruction explicitly authorizes sending.

## Candidate context

Infer role family, seniority, industry, geography, work arrangement, compensation, and search start from current supplied evidence when possible. Relevant memory/context may fill gaps only when consistent with fresher evidence. Never invent missing personal facts.

# Source-of-truth order

Use the freshest available evidence in this order:

1. most recent **actually sent** report for baseline, prior totals, and prior stated state;
2. current recruiting/email evidence for application receipts, recruiter replies, interview scheduling, follow-ups, pauses, rejections, compensation, and process changes;
3. a current job/application tracker for normalized totals and deduplicated company-role counts;
4. user-supplied notes, screenshots, files, calendar evidence, or meeting/interview records;
5. current public sources for labor-market and benchmark sections;
6. older narrative or remembered context only when it remains consistent with current evidence.

Fresh direct evidence overrides stale report language. Do not silently preserve a remembered status after a newer source contradicts it.

# Evidence-state ledger

For every material claim that can change over time, retain enough state to audit it later when possible:

- `source` — the message, meeting, tracker row, file, calendar item, or public source supporting it;
- `observed_at` — when that evidence was observed or published;
- `confidence` — low / medium / high or an equivalent bounded scale;
- `verification_state` — verified / inferred / unverified / conflicting;
- `status` — active / paused / waiting / stale-risk / closed / unverified when applicable.

Conflict rules:

- prefer the freshest direct and authoritative source;
- preserve a conflict note when two credible sources disagree;
- do not average incompatible counts, dates, stages, or compensation values;
- do not turn inference into fact merely because it is plausible;
- if a state cannot be resolved, label it unverified instead of picking the more favorable interpretation.

# Default report map

1. Hero / issue banner
2. Exact audit-through-now line + comparison window
3. Mission / at-a-glance snapshot
4. Audience/gratitude note when appropriate
5. Headline / current read
6. **Since last sent report — exact delta snapshot**
7. Search-channel traction when meaningful
8. Verified cumulative funnel + conversion table
9. Market segment assessment
10. Overall job-market outlook
11. Market data table + visual comparisons
12. Search clock / duration comparison
13. Market-relative progress assessment
14. Active high-signal pipeline
15. Most important storyline / deep dive
16. Detailed changes since last sent update
17. New / advanced / paused / closed / pending
18. Skills, certifications, or build proof when relevant
19. Strategic adjustments / next focus
20. Closed-process history
21. Sources + method notes
22. Bottom-line summary

The first screen should answer: **What changed? How is the market? How is this search performing relative to it?**

# Exact delta snapshot

The delta snapshot belongs **before** cumulative funnel totals.

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

Also show difference-window event counts when useful, such as newly scheduled interviews, completed interviews, major process advances, verified closures, referrals, network-led booked conversations, relevant certifications/proof, and exact elapsed time.

Rules:

- compare only against the most recent **sent** report, never a draft;
- preserve conservative-floor labels;
- do not subtract unlike definitions;
- event counts are not automatically cumulative funnel increments;
- keep the later detailed `What changed` section because the front delta is numeric while the later section explains events.

# Application-receipt audit

Email/ATS confirmation messages can be strong evidence that an application was submitted when trackers undercount volume.

When auditing the difference window:

- search direct confirmation language such as `thanks for applying`, `thank you for applying`, `application received`, `we received your application`, `application confirmation`, and equivalent ATS wording;
- count a confirmation as an **application action** only when it clearly corresponds to a submitted application in the interval;
- exclude rejection/status-only mail, security/verification codes, incomplete-application reminders, job alerts, recruiter marketing, and known duplicate acknowledgements;
- do not assume every receipt is a distinct company-role application;
- keep receipt-confirmed application actions separate from deduplicated unique company-role applications;
- when receipts have not been fully normalized, preserve the unique count as a conservative floor;
- document the audit method and material exclusions when it changes totals.

# Funnel math

When data permits, calculate:

- `screen_rate = interview_or_screen_tracks / unique_applications`
- `live_interview_rate = completed_live_interviews / unique_applications`
- `panel_progression = second_round_or_panel / interview_or_screen_tracks`
- `final_stage_progression = final_stage / interview_or_screen_tracks`
- `offer_rate = offers / unique_applications`
- `active_signal_rate = current_human_active_processes / unique_applications`
- interval velocity for applications, screens, interviews, advances, closures, and meaningful network introductions.

Never mix cumulative totals with interval-only activity.

# Reconciliation rules

- Count each company-role process once wherever possible.
- Keep application actions separate from unique applications.
- Do not inflate interview counts with duplicate invites, reschedules, follow-ups, or multiple messages from one process.
- `Reached interview / screen` requires a real screen/interview/panel or booked first interview tied to a distinct company-role process.
- `Completed live interview` requires an actual completed conversation.
- `Second round / panel` requires progression beyond the first substantive conversation.
- Closed/rejected/withdrawn/filled roles leave the active board.
- Explicit pauses are **PAUSED**, not active by assumption.
- Uncertain state is `waiting`, `unverified`, or `stale-risk`, not active by assumption.

# Network-led / search-channel traction

Track meaningful search-channel results without inflating employer interview totals.

Examples include a cold connection that becomes a real recruiter/founder/executive conversation, an employee referral, a search-firm intro, a warm hiring-leader introduction, or an exploratory conversation that may create later employer opportunities.

Rules:

- keep network/search-firm intros separate from employer interviews until tied to a specific company-role process;
- record channel, conversion event, date, and next step;
- show channel yield only when the inputs are sufficiently complete;
- if an intro later becomes a specific employer process, reconcile it into the normal funnel without double-counting the original intro.

# Market intelligence protocol

Refresh market context on every substantive report when current web access exists.

## Official / primary sources — highest weight

Prefer current BLS Employment Situation, BLS JOLTS, Federal Reserve Beige Book, BLS occupational data/projections, and relevant state labor-market sources.

## Platform / industry sources

When available, use LinkedIn Economic Graph / Workforce Report, Indeed Hiring Lab, CompTIA, or other credible sector-specific hiring data with clear methodology.

## Practitioner/community evidence

Use recent practitioner/community discussions for signals official data often misses, such as hiring-cycle length, ghosting, interview-round inflation, compensation pressure, applicant crowding, and role-specific friction.

- prefer multiple relevant independent discussions;
- label community evidence **anecdotal / community-reported**;
- never convert individual posts, upvotes, or comments into population statistics;
- show meaningful conflicts between community experience and official data instead of hiding them.

# Overall market outlook

Use one evidence-backed band: **Favorable, Balanced, Selective, Tight, Very tight**. Include assessment date, 2–4 reasons, the strongest counter-signal, and confidence (`low`, `medium`, `high`).

# Market visualization contract

For a full report, keep the market analytical rather than prose-only.

Include when data exists:

1. **Market data table** — latest value, prior/change, and relevance to the actual target segment.
2. **At least two compact email-safe visual comparisons** built with HTML tables/cells rather than scripts.
3. **Search-clock chart** — current search duration vs current official median/mean duration and any clearly labeled anecdotal reference used in the narrative.

Use live HTML text/numbers so values remain auditable. Bar length is illustrative unless an explicit scale is stated.

# Market-relative progress

If no valid population percentile exists, use one of:

- **Ahead of observed market**
- **Competitive with current market**
- **Mixed / bottlenecked**
- **Behind observed market**
- **Insufficient evidence**

Never invent a percentile, quartile, benchmark, or `top X%` claim.

# Compensation

Classify every compensation figure as **verified**, **estimated**, or **unknown / not yet verified**.

# Productive-work proof

Include certifications, portfolio work, technical projects, AI workflows, demos, relevant consulting/volunteer work, or other proof only when it materially strengthens the search story. Keep unrelated identities/projects out unless the user explicitly chooses to include them.

# Anti-regression rule

A new instruction normally **adds to or updates** the latest approved report. It does not authorize silently dropping previously approved sections, charts, tables, proof points, or visual treatments unless they are stale, factually superseded, or explicitly removed.

Before saving a replacement, compare it against:

1. the most recent actually sent report;
2. the most recent current/user-approved draft;
3. same-day/intermediate updates that introduced new facts, sections, charts, or corrections.

Carry forward all still-valid improvements.

# Visual contract

Use a polished adult tech-briefing / field-report aesthetic. Avoid childish, gamified, badge-heavy, cartoon, or generic SaaS styling unless explicitly requested.

For email output:

- table-based email-safe HTML;
- inline CSS;
- strong information hierarchy;
- compact metric cards, tables, and visual comparisons;
- high contrast;
- no external JavaScript;
- hero/banner as the first meaningful visual inside the report wrapper;
- critical mobile readability must not depend only on media queries.

A prior user-specific theme may be preserved only for that user's private report. Public/shared outputs remain identity-scrubbed and generic.

# Mobile dark-mode reliability contract

A report that looks dark locally/desktop but becomes bright, washed out, or low-contrast on a mobile mail client fails acceptance.

For every critical structural layer where applicable — body/wrapper, outer container, section cells, cards/panels, table headers, metric blocks, footer — use all practical layers of protection:

1. HTML `bgcolor` with the intended dark color.
2. Inline `background-color:#HEX!important`.
3. A same-color inline gradient lock such as `background-image:linear-gradient(#07100a,#07100a)!important`.
4. Explicit high-contrast text color on the element or immediate child.
5. No transparent/default-white structural background for critical panels.
6. Dark `color-scheme` / `supported-color-schemes` metadata where supported, but never as the only protection.
7. Responsive `width:100%`, sensible `max-width`, and image `height:auto`.
8. Critical usability that survives if media queries are ignored.

Before completion, inspect the **saved/stored HTML**, not merely the local source, and confirm these structural locks remain present.

If a real target-client/mobile preview is available, inspect it. If no real mobile preview is available, say static mobile-hardening checks passed; do not claim actual Gmail-mobile rendering was visually verified.

# Inline banner reliability contract

When Gmail is the delivery system, the report is not complete until the saved Gmail draft proves the hero/banner is a real inline MIME image.

Do **not** reference a local filename with `cid:` and merely attach the file.

Known working pattern:

1. Build the full email-safe HTML first.
2. Embed the banner as `data:image/png;base64,...` or the correct image MIME data URI.
3. Create the Gmail draft without separately attaching that same banner file.
4. Let Gmail rewrite the data URI into a generated CID and inline MIME part.
5. Re-read the saved draft.
6. Verify `inline_images` is non-empty, the image MIME/byte size is plausible, raw MIME contains `Content-Disposition: inline` and `Content-ID`, and stored HTML references the matching generated `cid:`.
7. `has_attachment:false` can be correct when the banner is genuinely inline.
8. If the banner exists only as a normal attachment and `inline_images` is empty, the draft fails acceptance.

# Post-write readback rule

A successful local render or API write response is not, by itself, proof that the final stored representation retained the intended content.

After **every** consequential create/update of a stored report or draft when readback is available:

1. Re-read the stored artifact.
2. Re-check critical evidence state and counts.
3. Re-check anti-regression sections/visuals.
4. Re-check saved dark-mode structural locks.
5. For Gmail, re-check `inline_images`, `Content-Disposition: inline`, `Content-ID`, and matching stored `cid:` because the provider may generate a new CID after an update.

Any post-verification update invalidates the prior acceptance result until the new stored version passes again.

# Model / reasoning quality floor

This workflow is reconciliation-heavy, not a low-effort formatting task.

Use a strong current reasoning-capable model/configuration when available. If controls are unavailable, use a deliberate multi-pass sequence rather than relying on one-pass generation.

Canonical sequence:

`SOURCE AUDIT → STATE RECONCILIATION → CALCULATIONS → REPORT BUILD → STATIC QA → STORED/DELIVERY READBACK → ACCEPTANCE TEST`

# Default rebuild workflow

Resolve current time → find latest sent report → establish exact window → audit recruiting activity → audit application receipts when useful → refresh cumulative totals → reconcile active/paused/waiting/closed state → reconcile search-channel traction separately → build evidence-state ledger for material claims → calculate front delta snapshot → define target segment → refresh current market data → build market tables/visuals/search clock → calculate funnel conversion/velocity → assess market-relative progress → identify relevant productive-work proof → compare against prior approved/intermediate versions for regressions → render email-safe report → apply mobile dark-mode hardening → create/update draft when requested → re-read stored artifact → verify inline banner MIME when Gmail is used → re-check stored dark-mode/evidence state → keep draft-only unless sending is explicitly authorized → advance baseline only after confirmed send.

# Acceptance test

Before completion verify all applicable conditions:

- latest **sent** report defines the interval;
- the interval label is truthful;
- front delta snapshot appears before cumulative totals;
- previous → current → delta math is accurate;
- cumulative and interval metrics are separate;
- application receipts exclude obvious non-submission and duplicate mail;
- receipt-confirmed actions are not confused with deduped unique company-role totals;
- network/search-firm intros are not miscounted as employer interviews;
- active/paused/waiting/stale-risk/closed state is current;
- material claims retain source/freshness/verification state where practical;
- unresolved credible conflicts are labeled instead of hidden;
- compensation labels are truthful;
- target market is defined;
- market sources are current, dated, and appropriately weighted;
- anecdotal evidence is labeled anecdotal;
- no unsupported percentile exists;
- fresh evidence overrides stale memory;
- prior approved sections/charts have not silently disappeared;
- HTML is adult, readable, specific, and mobile-safe;
- critical dark surfaces retain `bgcolor`, inline background color, gradient locks, and explicit text colors in the stored HTML;
- any claim of actual mobile-client verification is backed by an actual client preview;
- when Gmail is used, the saved draft contains a real inline banner MIME part with matching CID;
- after any stored-artifact update, readback/verification was repeated;
- output remains draft-only unless sending was explicitly authorized.

Do not import private names, employers, metrics, addresses, personal project details, or identifying facts from another user/private report into the public skill or sample.
