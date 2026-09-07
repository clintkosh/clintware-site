---
name: job-search-field-report-astro
description: Standalone workflow for rebuilding a recurring job-search report from the exact time the last report was actually sent through the current time. Separates cumulative funnel totals from interval changes, reconciles active vs closed hiring processes, adds sourced market-segment intelligence and market-relative progress assessment, and defaults to draft-only output.
version: 1.1
---

# Job Search Field Report ASTRO

## Purpose

Use this skill when a person wants to maintain a recurring, evidence-based job-search update for themselves, family, mentors, coaches, or other supporters.

The report is not a generic status summary. It is a repeatable operating report with three distinct views:

1. **Cumulative search state** — the full funnel to date.
2. **Difference-period activity** — only what changed after the most recent report was actually sent.
3. **Market-relative read** — what market the candidate is actually competing in, how that market currently looks, and how the candidate's progress compares with the best available evidence.

The defining time rule is:

`difference_window = (latest_sent_report_at, current_at]`

A draft never advances the baseline.

---

# 1. CONFIGURATION

Before the first run, define or infer from supplied context:

- `series_name` — e.g. `Job Search Field Report`
- `subject_prefix` — e.g. `Job Search '26 | Issue`
- `timezone` — the user's local IANA timezone
- `search_start_at` — verified date/time the search began, if known
- `target_roles` — one or more role families
- `target_seniority` — optional
- `target_industries` — optional
- `target_geography` — optional
- `work_arrangement` — remote / hybrid / onsite / mixed, when known
- `target_compensation` — optional
- `seed_sent_at` — optional only when no prior sent report exists
- `seed_issue_number` — optional only when no prior sent report exists
- `recipients` — optional, and never used to infer send authorization

When user-specific memory or prior context is available, it may be used to fill these fields only when it is relevant and consistent with the current request. Never invent missing personal facts. User-supplied current evidence overrides remembered or stale context.

If the system can search email, use the latest **actually sent** message matching the configured series as the baseline. If it cannot, require the user to supply the latest sent timestamp or a prior sent report.

---

# 2. HARD BASELINE RULE

At the beginning of every rebuild:

1. Find the most recent **actually sent** report in the configured series.
2. Read its sent timestamp and issue number.
3. Set:

   `last_update_sent_at = timestamp of most recent sent report`

   `current_at = current local datetime in configured timezone`

   `difference_window = (last_update_sent_at, current_at]`

4. If no prior sent report exists, use the configured seed values.
5. The next issue number is the latest sent issue number + 1.
6. A draft does **not** advance the baseline.
7. Never use upload time, file modified time, chat time, or a guessed interval as the boundary.
8. Use the real interval in the report title. Do not automatically call it a week, two weeks, or a month.

Examples:

- `Exact 6-Day Field Report`
- `9-Day Field Report`
- `Since Sep. 1 Field Report`

---

# 3. EXTERNAL-ACTION BOUNDARY

**Default behavior is DRAFT ONLY.**

Words such as `update`, `rebuild`, `refresh`, `prepare`, `make the next issue`, or `draft` mean prepare the report and, when supported, save it as a draft.

Never send unless the user's current instruction explicitly authorizes sending.

Do not infer authorization from urgency, known recipients, prior sends, report completeness, or prior patterns.

A sent report advances the next comparison baseline. A draft does not.

---

# 4. REPORT INFORMATION ARCHITECTURE

Use this as the default skeleton. Do not force empty sections.

1. Hero / issue masthead
2. Audit-through-now + exact comparison window
3. **At a glance** — 3–5 compact signals
4. Search profile / target market definition
5. Current read
6. Verified cumulative funnel
7. Funnel conversion table
8. **Market segment assessment**
9. **Overall job-market outlook**
10. **Market-relative progress assessment**
11. Search clock / velocity
12. Active pipeline — human-active / high-signal only
13. Deep dive — most important current storyline
14. What changed since the last **sent** update
15. New / advanced
16. Closed / no longer active
17. Newly applied / refreshed
18. Priority pending applications
19. Skills / certifications / build proof — optional
20. Strategic adjustments / next focus
21. Closed-process history
22. Sources + method notes
23. Bottom-line summary

The first screen should answer three questions quickly: **What changed? How is the market? How is this search performing relative to that market?**

---

# 5. CUMULATIVE TOTALS VS INTERVAL CHANGES

Never mix these two clocks.

## Cumulative totals

Recompute from the full search record whenever possible:

- total application actions;
- unique company-role applications;
- interview/screen-stage processes;
- completed live interviews;
- second-round/panel processes;
- final-stage processes when verified;
- offers;
- search duration.

## Difference-period activity

Only include events inside `(last_update_sent_at, current_at]`, including applications, recruiter responses, interviews, advancement, closures, follow-ups, referrals, compensation changes, relevant certifications, relevant build work, and materially new market information.

---

# 6. CANDIDATE SOURCE-OF-TRUTH ORDER

Use the freshest evidence available:

1. Most recent sent report — baseline and prior state.
2. Email / recruiting communication — current process changes.
3. Application tracker — cumulative counts and deduplicated applications.
4. Calendar / interview notes / user-supplied files — status details.
5. Relevant current user context or model memory — only when consistent and useful.
6. Prior report narrative — only where still valid.

Fresh direct evidence overrides stale narrative or remembered context.

---

# 7. MARKET SEGMENT CLASSIFICATION

Before judging the market, define the market actually being searched.

At minimum, classify:

- role family;
- seniority;
- industry / vertical when relevant;
- geography;
- remote / hybrid / onsite constraint;
- compensation band when known.

Example:

`Senior B2B SaaS post-sales · Customer Success / Implementation · US remote + Texas hybrid · $140K+ target`

If the search spans materially different lanes, assess them separately instead of averaging them into one vague market.

---

# 8. MARKET INTELLIGENCE PROTOCOL

When public web access is available, refresh market context on every substantive report rather than carrying old claims forward.

Use a layered evidence model:

## A. Official / primary sources — highest weight

Prefer current sources such as:

- U.S. Bureau of Labor Statistics Employment Situation;
- BLS JOLTS job openings / hires / quits / layoffs;
- Federal Reserve Beige Book, especially the candidate's region;
- BLS Occupational Employment and Wage Statistics or occupational projections when useful;
- state labor-market agencies when geography matters.

## B. Large labor-market platforms / industry data — second layer

When available, use current sources such as:

- LinkedIn Economic Graph / Workforce Report;
- Indeed Hiring Lab;
- CompTIA or other credible sector-specific hiring reports;
- reputable staffing / recruiting indexes where methodology is clear.

## C. Reddit and practitioner communities — qualitative layer

Reddit is especially useful for detecting what official statistics do not show well: interview length, ghosting, multi-round processes, compensation pressure, applicant crowding, and role-specific friction.

When available:

1. Search recent threads, usually the last 30–90 days.
2. Prioritize communities relevant to the target segment, e.g. role-specific subreddits plus broader job-search communities.
3. Prefer multiple independent threads rather than one dramatic post.
4. Summarize recurring themes, disagreement, and notable counterexamples.
5. Label Reddit evidence **anecdotal / community-reported**. Never turn upvotes, comments, or individual experiences into population statistics.
6. If Reddit sentiment materially conflicts with official data, show the conflict instead of forcing agreement.

A strong market section usually combines at least one current official source, one large-platform/industry source when available, and several recent community signals.

---

# 9. OVERALL JOB-MARKET OUTLOOK

Translate the evidence into a concise outlook band:

- **Favorable** — broad hiring momentum and relatively low friction.
- **Balanced** — meaningful opportunity with ordinary competition.
- **Selective** — hiring exists, but employers are cautious and candidate competition is elevated.
- **Tight** — hiring is weak or concentrated, cycles are long, and strong candidates face substantial friction.
- **Very tight** — severe contraction or unusually poor conversion across the target segment.

Always include:

- the band;
- the date assessed;
- 2–4 reasons;
- the most important counter-signal;
- confidence: `low`, `medium`, or `high`.

Do not use dramatic wording when evidence only supports a modest change.

---

# 10. MARKET-RELATIVE PROGRESS ASSESSMENT

The report should say not only what the candidate has done, but how that progress reads in context.

Calculate when data permits:

- `screen_rate = interview_or_screen_tracks / unique_applications`
- `live_interview_rate = completed_live_interviews / unique_applications`
- `panel_progression = second_round_or_panel / interview_or_screen_tracks`
- `final_stage_progression = final_stage / interview_or_screen_tracks`
- `offer_rate = offers / unique_applications`
- `active_signal_rate = currently_human_active_processes / unique_applications`
- interval velocity: applications, screens, interviews, advances, and closures per elapsed day/week

Compare against external benchmarks only when the denominator, role level, geography, and search type are sufficiently comparable.

### Default relative-position bands

Use one of these when a valid population percentile is unavailable:

- **Ahead of observed market**
- **Competitive with current market**
- **Mixed / bottlenecked**
- **Behind observed market**
- **Insufficient evidence**

Then identify **where** the funnel is strong or weak, for example:

- strong top-of-funnel response, weak late-stage close;
- low response rate but strong interview-to-panel conversion;
- strong referral performance, weak cold-application performance;
- healthy interview volume for a tight market, but search duration now exceeds the observed range.

Never invent a percentile, quartile, or “top X%” claim. Use one only when a credible, comparable benchmark actually supports it. Reddit anecdotes can inform the narrative but do not create a percentile.

---

# 11. RECONCILIATION RULES

- Count each company-role process once wherever possible.
- Keep application actions separate from unique company-role applications.
- Treat unique-application counts as a conservative floor when reconciliation is incomplete.
- Do not inflate interview counts with duplicate invites, reschedules, follow-ups, or multiple messages from one process.
- `Reached interview / screen` requires a real screen, interview, panel, or booked first interview tied to a distinct process.
- `Completed live interview` requires an actual completed conversation.
- `Second round / panel` requires progression beyond the first substantive conversation.
- Closed, rejected, withdrawn, and filled roles do not belong on the active board.
- Uncertain statuses should be labeled `waiting`, `unverified`, or `stale-risk`, not active by assumption.

---

# 12. ACTIVE PIPELINE

The active pipeline is a signal board, not a list of every application.

Include roles with meaningful current evidence such as scheduled/recent interviews, recruiter or hiring-manager dialogue, referral/internal advocate, explicit backfill or role-creation discussion, formal client submission, or another strong current human signal.

Prefer these fields:

- organization;
- role;
- location/work arrangement;
- compensation classification;
- current status;
- next action/date;
- concise fit/read.

Rank by current signal, not emotional preference or historical enthusiasm.

---

# 13. CLOSED-PROCESS HISTORY

Every rebuild must explicitly reconcile closed items.

Move a process out of the active board when there is verified evidence of rejection, role filled/closed, explicit no-go, withdrawal, superseded process, or no-longer-available requisition.

Preserve useful lessons, relationships, or reusable research, but never visually mix a closed process with active opportunities.

---

# 14. COMPENSATION CLASSIFICATION

Every compensation value must be one of:

- **verified** — directly stated by employer, recruiter, or posting;
- **estimated** — directional market estimate;
- **unknown / not yet verified**.

Never present an estimate as employer-confirmed compensation.

---

# 15. PRODUCTIVE-WORK PROOF

The report may include productive work completed during the search when it materially strengthens the candidate's story, including portfolio improvements, technical projects, AI workflows, certifications, demos, relevant consulting or volunteer work, research tied directly to target roles, and other public-safe proof of skill development.

Keep unrelated identities and personal projects out unless the user explicitly chooses to include them.

---

# 16. AUDIENCE / TONE

The report should be factual, fast to scan, and useful to its intended audience.

Preserve direct acknowledgment of the current outcome, evidence of movement or lack of movement, no fake optimism, no doom language, specific strategic adjustments, and a concise human close when appropriate.

Avoid generic motivational filler and gamified or childish labels.

---

# 17. EMAIL-SAFE VISUAL CONTRACT

When HTML output is appropriate, use a polished **tech briefing / modern newsletter** feel without copying any specific newsletter brand.

General traits that are allowed:

- compact masthead;
- strong information hierarchy;
- short section summaries;
- small category labels;
- clean metric cards;
- one primary accent plus restrained status colors;
- generous whitespace;
- fast-scanning source notes.

Do **not** copy another newsletter's logo, exact color combination, typography, signature wording, icon system, or section structure.

For email output:

- use table-based email-safe layout;
- inline CSS;
- maximum content width around 760–900 px for a digest-like read;
- high contrast;
- compact, readable typography;
- mobile-safe stacking;
- no dependency on external JavaScript.

Recommended original palette:

- page: `#f3f6fa`
- masthead: `#0b1220`
- report surface: `#ffffff`
- panel: `#f7f9fc`
- border: `#dbe3ec`
- primary accent: `#19b8c9`
- secondary accent: `#ff7a59`
- positive: `#13795b`
- information: `#315d85`
- closure/risk: `#b4473d`
- ink: `#111827`
- muted: `#64748b`

The design may evolve. The evidence hierarchy, time-boundary logic, and market-relative assessment are the important parts.

---

# 18. DEFAULT REBUILD WORKFLOW

1. Resolve current local datetime.
2. Find the latest actually sent report in the configured series.
3. Parse its issue number and sent timestamp.
4. Establish the exact difference window.
5. Audit recruiting communication from that timestamp through current time.
6. Refresh cumulative totals from the best current tracker/source.
7. Reconcile active vs closed processes.
8. Infer/confirm the target market segment from current user context.
9. Refresh official labor-market data.
10. Refresh relevant platform/industry data when available.
11. Search recent Reddit/practitioner discussions for role-specific qualitative signals.
12. Assess overall market outlook with date + confidence.
13. Calculate the candidate's funnel conversion and velocity.
14. Assess market-relative progress without inventing unsupported percentiles.
15. Identify relevant productive-work proof from the interval.
16. Build the report using the section map.
17. Triple-check names, organizations, roles, dates, compensation labels, counts, calculations, source dates, and active-vs-closed status.
18. Produce email-safe HTML when requested.
19. Save as a draft unless sending is explicitly authorized.
20. Advance the baseline only after an actual send is confirmed.

---

# 19. ACCEPTANCE TEST

Before completion, verify:

- comparison window comes from the latest actually sent report;
- cumulative totals are separated from interval changes;
- every delta event is inside the exact window;
- active opportunities have current signal;
- closed opportunities are removed from the active board;
- compensation labels are accurate;
- target market segment is explicitly defined;
- official market data is current and dated when web access exists;
- Reddit/community evidence is recent, relevant, and clearly labeled anecdotal;
- overall market outlook includes reasons, counter-signal, date, and confidence;
- market-relative progress is based on actual candidate funnel data;
- no unsupported percentile or benchmark claim appears;
- remembered context never overrides fresh supplied evidence;
- productive-work proof is relevant;
- no unrelated identity or private information leaked into the report;
- HTML is readable on mobile and does not look childish or gamified;
- output remains draft-only unless the user explicitly authorized send.

If any item fails, repair it before completion.

---

# 20. STANDALONE INPUT TEMPLATE

```yaml
series_name: "Job Search Field Report"
subject_prefix: "Job Search '26 | Issue"
timezone: "America/Chicago"
search_start_at: "2026-05-01T09:00:00-05:00"
target_roles:
  - "Senior Customer Success Manager"
  - "Implementation Lead"
target_seniority: "Senior / Lead"
target_geography: "United States"
work_arrangement: "Remote + selected hybrid"
seed_issue_number: 3
seed_sent_at: "2026-09-01T08:15:00-05:00"
target_compensation: "$140K+ preferred"
```

Then provide, connect, or make available the sources used for reconciliation.

This skill does not require Clintware, a specific email provider, a specific ATS, or a specific job tracker. Email, calendar, tracker, files, model context, and web research are optional adapters around the same core rules.
