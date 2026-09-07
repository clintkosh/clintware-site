---
name: job-search-field-report-astro
description: Standalone workflow for recurring job-search reporting from the exact time the last report was actually sent through now. Separates cumulative totals from interval changes, reconciles active vs closed processes, adds sourced market-segment intelligence and market-relative progress assessment, and defaults to draft-only output.
version: 1.1
---

# Job Search Field Report ASTRO

## Core rule

`difference_window = (latest_sent_report_at, current_at]`

A draft never advances the baseline. Only a confirmed sent report does.

## Three views

1. **Cumulative search state** — full funnel to date.
2. **Difference-period activity** — only what changed after the last actually sent report.
3. **Market-relative read** — target market, current outlook, and how the candidate's funnel compares with the best available evidence.

## External-action boundary

Default behavior is **DRAFT ONLY**. Words such as update, rebuild, refresh, prepare, or draft do not authorize sending. Never send unless the user's current instruction explicitly authorizes it.

## Candidate context

Infer target roles, seniority, industry, geography, work arrangement, compensation, and search start from current supplied evidence when possible. Relevant model memory/context may fill gaps only when consistent with the current request. Fresh direct evidence overrides remembered or stale context. Never invent missing personal facts.

## Default report map

1. Issue masthead + exact audit window
2. At a glance
3. Search profile / target market
4. Current read
5. Verified cumulative funnel + conversion rates
6. Market segment assessment
7. Overall job-market outlook
8. Market-relative progress assessment
9. Search clock / velocity
10. Active high-signal pipeline
11. Most important storyline
12. Changes since last sent update
13. New / advanced / closed / pending
14. Skills, certifications, or build proof when relevant
15. Strategic adjustments / next focus
16. Closed-process history
17. Sources + method notes
18. Bottom-line summary

The first screen should quickly answer: **What changed? How is the market? How is this search performing relative to it?**

## Funnel math

When data permits, calculate:

- `screen_rate = interview_or_screen_tracks / unique_applications`
- `live_interview_rate = completed_live_interviews / unique_applications`
- `panel_progression = second_round_or_panel / interview_or_screen_tracks`
- `final_stage_progression = final_stage / interview_or_screen_tracks`
- `offer_rate = offers / unique_applications`
- `active_signal_rate = current_human_active_processes / unique_applications`
- interval velocity for applications, screens, interviews, advances, and closures

Keep cumulative totals separate from interval-only changes.

## Market segment classification

Define the market actually being searched: role family, seniority, industry/vertical, geography, remote/hybrid/onsite constraint, and compensation band when known. If the search spans materially different lanes, assess those lanes separately.

## Market intelligence protocol

Refresh market context on every substantive report when web access is available.

### Highest-weight official sources

Prefer current BLS Employment Situation, BLS JOLTS, Federal Reserve Beige Book, BLS occupational data/projections, and relevant state labor-market sources.

### Large-platform / industry sources

When available, use LinkedIn Economic Graph / Workforce Report, Indeed Hiring Lab, CompTIA, or other credible sector-specific hiring data with clear methodology.

### Reddit / practitioner communities

Reddit should be a deliberate qualitative layer, especially for signals official data misses: hiring-cycle length, ghosting, multi-round interviews, compensation pressure, applicant crowding, and role-specific friction.

- Search recent threads, usually the last 30–90 days.
- Prioritize role-specific communities plus broader job-search communities.
- Prefer multiple independent threads over one dramatic example.
- Summarize recurring themes, disagreements, and counterexamples.
- Label Reddit evidence **anecdotal / community-reported**.
- Never turn upvotes, comments, or individual searches into population statistics.
- If community sentiment conflicts with official data, show the conflict rather than forcing agreement.

A strong market section normally combines at least one current official source, one platform/industry source when available, and several recent community signals.

## Overall market outlook

Use one evidence-backed band: **Favorable, Balanced, Selective, Tight, Very tight**. Include the assessment date, 2–4 reasons, the strongest counter-signal, and confidence (`low`, `medium`, `high`).

## Market-relative progress

Compare candidate funnel performance only with genuinely comparable external evidence. If a valid population percentile is not available, use one of:

- **Ahead of observed market**
- **Competitive with current market**
- **Mixed / bottlenecked**
- **Behind observed market**
- **Insufficient evidence**

Explain where the funnel is strong or weak. Never invent a percentile, quartile, or “top X%” claim. Reddit anecdotes may inform the narrative but cannot create a percentile.

## Reconciliation

Count each company-role process once. Keep application actions separate from unique applications. Do not inflate interview counts with duplicate invites, reschedules, follow-ups, or multiple messages from one process. Closed/rejected/withdrawn/filled roles leave the active board. Uncertain status is labeled waiting, unverified, or stale-risk.

## Compensation

Classify every value as **verified**, **estimated**, or **unknown / not yet verified**.

## Visual contract

Use a polished **tech briefing / modern newsletter** aesthetic without copying any specific newsletter brand. Allowed traits: compact masthead, clear hierarchy, short summaries, small section labels, clean metrics, generous whitespace, one primary accent, and restrained status colors.

Do not copy another newsletter's logo, exact palette, typography, signature wording, icon system, or section structure. Avoid childish, gamified, military, or achievement-style theming.

Recommended original palette: page `#f3f6fa`, masthead `#0b1220`, surface `#ffffff`, panel `#f7f9fc`, border `#dbe3ec`, primary accent `#19b8c9`, secondary accent `#ff7a59`, positive `#13795b`, info `#315d85`, risk `#b4473d`, ink `#111827`, muted `#64748b`.

For email output use table-based layout, inline CSS, roughly 760–900px max width, mobile-safe stacking, high contrast, and no external JavaScript dependency.

## Default rebuild workflow

Resolve current time → find latest sent report → establish exact window → audit recruiting activity → refresh cumulative totals → reconcile active/closed → define target segment → refresh official market data → refresh platform/industry data → review recent Reddit/practitioner signals → assess market outlook → calculate funnel conversion/velocity → assess market-relative progress → identify relevant build proof → build report → triple-check facts, counts, sources, and status → produce email-safe HTML → draft unless send is explicitly authorized → advance baseline only after confirmed send.

## Acceptance test

Verify the exact sent-report window; clean cumulative vs interval separation; current active/closed reconciliation; truthful compensation labels; explicit target market; current official sources; Reddit clearly labeled anecdotal; dated market outlook with confidence; actual funnel math; no unsupported percentile; fresh evidence overriding stale memory; relevant productive-work proof only; mobile-readable non-childish HTML; and draft-only output unless sending was explicitly authorized.
