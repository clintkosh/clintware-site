---
name: job-search-field-report-astro
description: Standalone workflow for rebuilding a recurring job-search field report from the exact time the last report was actually sent through the current time. Separates cumulative funnel totals from interval changes, reconciles live vs closed hiring processes, and defaults to draft-only output.
version: 1.0
---

# Job Search Field Report ASTRO

## Purpose

Use this skill when a person wants to maintain a recurring, evidence-based job-search update for themselves, family, mentors, coaches, or other supporters.

The report is not a generic status summary. It is a repeatable operating report with two distinct views:

1. **Cumulative search state** — the full funnel to date.
2. **Difference-period activity** — only what changed after the most recent report was actually sent.

The defining rule is simple:

`difference_window = (latest_sent_report_at, current_at]`

A draft never advances the baseline.

---

# 1. CONFIGURATION

Before the first run, define:

- `series_name` — e.g. `Job Search Field Report`
- `subject_prefix` — e.g. `Job Search '26 | Issue`
- `timezone` — the user's local IANA timezone
- `search_start_at` — the verified date/time the search began, if known
- `target_compensation` — optional
- `seed_sent_at` — optional only when no prior sent report exists
- `seed_issue_number` — optional only when no prior sent report exists
- `recipients` — optional, and never used to infer send authorization

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

Do not infer authorization from:

- urgency;
- recipients being known;
- prior sends;
- the report being complete;
- the user previously sending similar reports.

A sent report advances the next comparison baseline. A draft does not.

---

# 4. REPORT INFORMATION ARCHITECTURE

Use this as the default skeleton:

1. Hero / issue banner
2. Current date + audit-through-now line
3. Mission snapshot
4. Opening note / audience context
5. Headline
6. Actual search funnel — verified overall results
7. Conversion table
8. Market assessment — optional, sourced and dated
9. Search clock
10. External benchmark comparison — optional
11. Current standings — human-active / high-signal board
12. Deep dive — most important current storyline
13. What changed since the last **sent** update
14. New / advanced
15. Closed / no longer active
16. Newly applied / refreshed
17. Priority pending applications
18. Local / alternate track — optional
19. Skills / certifications / build proof — optional
20. Closed ledger
21. Bottom line
22. Source / method notes

Do not force empty sections. Preserve the function of the report rather than stale headings from an older issue.

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

Only include events inside:

`(last_update_sent_at, current_at]`

Examples:

- applications submitted;
- recruiter responses;
- interviews completed or scheduled;
- stage advancement;
- rejections / closures;
- follow-ups;
- referrals / introductions;
- compensation changes;
- certifications completed;
- portfolio/product/build work that materially strengthens the search;
- meaningful market information newly learned during the interval.

---

# 6. SOURCE-OF-TRUTH ORDER

Use the freshest evidence available:

1. Most recent sent report — baseline and prior state.
2. Email / recruiting communication — current process changes.
3. Application tracker — cumulative counts and deduplicated applications.
4. Calendar / interview notes / user-supplied files — status details.
5. Current public sources — labor-market or compensation context when included.
6. Prior report narrative — only where still valid.

Fresh evidence overrides stale narrative.

---

# 7. RECONCILIATION RULES

- Count each company-role process once wherever possible.
- Keep application actions separate from unique company-role applications.
- Treat unique-application counts as a conservative floor when reconciliation is incomplete.
- Do not inflate interview counts with duplicate invites, reschedules, follow-ups, or multiple messages from one process.
- `Reached interview / screen` requires a real screen, interview, panel, or booked first interview tied to a distinct process.
- `Completed live interview` requires an actual completed conversation.
- `Second round / panel` requires progression beyond the first substantive conversation.
- Closed, rejected, withdrawn, and filled roles do not belong on the live board.
- Uncertain statuses should be labeled `waiting`, `unverified`, or `stale-risk`, not active by assumption.

---

# 8. LIVE BOARD

The live board is a signal board, not a list of every application.

Include roles with meaningful current evidence such as:

- interview scheduled;
- interview completed with next step pending;
- recruiter or hiring-manager dialogue;
- referral or internal advocate;
- explicit backfill / role-creation discussion;
- formal client submission;
- another strong human signal without verified closure.

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

# 9. CLOSED LEDGER

Every rebuild must explicitly reconcile closed items.

Move a process out of the live board when there is verified evidence of:

- rejection;
- role filled/closed;
- explicit no-go;
- withdrawal;
- superseded process;
- no-longer-available requisition when live verification matters.

Preserve useful lessons, relationships, or reusable research, but never visually mix a closed process with active opportunities.

---

# 10. COMPENSATION CLASSIFICATION

Every compensation value must be one of:

- **verified** — directly stated by employer, recruiter, or posting;
- **estimated** — directional market estimate;
- **unknown / not yet verified**.

Never present an estimate as employer-confirmed compensation.

---

# 11. MARKET / BENCHMARK RULES

When market context is included:

- refresh official data rather than blindly carrying old figures;
- distinguish official statistics from anecdotes;
- label broad proxies honestly;
- show source dates;
- never convert recruiter opinions, forum posts, or personal estimates into population statistics;
- do not invent precision when data is unavailable.

---

# 12. PRODUCTIVE-WORK PROOF

The report may include productive work completed during the search when it materially strengthens the candidate's story.

Examples:

- portfolio improvements;
- technical projects;
- AI workflows;
- certifications;
- demos;
- relevant consulting or volunteer work;
- research tied directly to target roles;
- public-safe proof of skill development.

Keep unrelated identities and personal projects out unless the user explicitly chooses to include them.

---

# 13. AUDIENCE / TONE

The report should be factual, readable, and useful to its intended audience.

Preserve:

- direct acknowledgment of the current outcome;
- evidence of movement or lack of movement;
- no fake optimism;
- no doom language;
- specific strategic adjustments;
- a concise human close when appropriate.

Avoid generic motivational filler.

---

# 14. EMAIL-SAFE VISUAL CONTRACT

When HTML output is appropriate:

- use table-based email-safe layout;
- inline CSS;
- maximum content width around 960–1040 px;
- high contrast;
- compact typography;
- readable tables on mobile;
- restrained accent colors;
- banner integrated with the report rather than attached as unrelated decoration;
- no dependency on external JavaScript for the email itself.

A standalone sample may use this default palette:

- page: `#07100a`
- report surface: `#0a120d`
- panel: `#101b13`
- border: `#35513a`
- positive/action: `#9bd34b`
- emphasis: `#f3c957`
- information: `#73c9d6`
- closure/risk: `#e06c5f`
- text: `#f3f0df`

The design may change. The information architecture and time-boundary logic are the important parts.

---

# 15. DEFAULT REBUILD WORKFLOW

1. Resolve current local datetime.
2. Find the latest actually sent report in the configured series.
3. Parse its issue number and sent timestamp.
4. Establish the exact difference window.
5. Audit recruiting communication from that timestamp through current time.
6. Refresh cumulative totals from the best current tracker/source.
7. Reconcile live vs closed processes.
8. Refresh market/benchmark data if included.
9. Identify relevant productive-work proof from the interval.
10. Build the report using the section map.
11. Triple-check names, organizations, roles, dates, compensation labels, counts, calculations, and live-vs-closed status.
12. Produce email-safe HTML when requested.
13. Save as a draft unless sending is explicitly authorized.
14. Advance the baseline only after an actual send is confirmed.

---

# 16. ACCEPTANCE TEST

Before completion, verify:

- comparison window comes from the latest actually sent report;
- cumulative totals are separated from interval changes;
- every delta event is inside the exact window;
- live opportunities have current signal;
- closed opportunities are removed from the live board;
- compensation labels are accurate;
- market data is sourced and dated;
- anecdotes are identified as anecdotes;
- productive-work proof is relevant;
- no unrelated identity or private information leaked into the report;
- HTML is readable on mobile;
- important names, dates, organizations, roles, counts, and calculations were checked;
- output remains draft-only unless the user explicitly authorized send.

If any item fails, repair it before completion.

---

# 17. STANDALONE INPUT TEMPLATE

A user can start the skill with data in this shape:

```yaml
series_name: "Job Search Field Report"
subject_prefix: "Job Search '26 | Issue"
timezone: "America/Chicago"
search_start_at: "2026-05-01T09:00:00-05:00"
seed_issue_number: 3
seed_sent_at: "2026-09-01T08:15:00-05:00"
target_compensation: "$140K+ preferred"
```

Then provide or connect the sources used for reconciliation.

This skill does not require Clintware, a specific email provider, a specific ATS, or a specific job tracker. Email, calendar, tracker, files, and web sources are optional adapters around the same core rules.
