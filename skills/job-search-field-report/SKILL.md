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

## Configuration

Define `series_name`, `subject_prefix`, `timezone`, optional `search_start_at`, optional `target_compensation`, optional seed sent timestamp/issue number, and optional recipients. Recipients never imply send authorization.

## Hard baseline rule

1. Find the most recent actually sent report in the configured series.
2. Read its sent timestamp and issue number.
3. Set `difference_window = (last_update_sent_at, current_at]`.
4. Use seed values only if no prior sent report exists.
5. A draft never advances the baseline.
6. Never use upload time, file modified time, chat time, or a guessed interval as the boundary.
7. Use the real interval in the report title.

## External-action boundary

Default behavior is **DRAFT ONLY**. Update/rebuild/refresh/prepare/draft does not authorize sending. Never send unless the user's current instruction explicitly authorizes sending. A sent report advances the next baseline; a draft does not.

## Default report map

1. Hero / issue banner
2. Current date + audit-through-now line
3. Mission snapshot
4. Opening note / audience context
5. Headline
6. Actual search funnel — verified overall results
7. Conversion table
8. Market assessment — optional
9. Search clock
10. External benchmark comparison — optional
11. Current standings — human-active / high-signal board
12. Deep dive — current storyline
13. What changed since the last sent update
14. New / advanced
15. Closed / no longer active
16. Newly applied / refreshed
17. Priority pending applications
18. Local / alternate track — optional
19. Skills / certifications / build proof — optional
20. Closed ledger
21. Bottom line
22. Source / method notes

## Cumulative totals vs interval changes

Recompute cumulative application actions, unique company-role applications, interview/screen processes, completed live interviews, second-round/panel processes, final-stage processes, offers, and search duration from the full record whenever possible.

Only include new applications, responses, interviews, advancement, closures, follow-ups, referrals, compensation changes, certifications, relevant build work, and newly learned market information in the difference section when they fall inside `(last_update_sent_at, current_at]`.

## Source order

1. Most recent sent report.
2. Recruiting email/communication.
3. Application tracker.
4. Calendar/interview notes/user files.
5. Current public sources for market context.
6. Prior narrative only where still valid.

Fresh evidence overrides stale narrative.

## Reconciliation

Count each company-role process once. Keep application actions separate from unique applications. Do not inflate interviews with duplicate invites/reschedules/messages. Closed/rejected/withdrawn/filled roles leave the live board. Uncertain status is labeled waiting/unverified/stale-risk.

## Live board

Include only meaningful current human signal: scheduled/recent interviews, recruiter/hiring-manager dialogue, referral/internal advocate, explicit backfill discussion, formal submission, or another strong current signal. Rank by current signal, not preference.

## Closed ledger

Move verified rejected, filled, withdrawn, superseded, or closed requisitions out of the live board while preserving useful learning or relationships.

## Compensation

Classify every value as **verified**, **estimated**, or **unknown / not yet verified**.

## Market / benchmark rules

Refresh official data, distinguish statistics from anecdotes, label proxies honestly, show source dates, and never turn forum/recruiter opinions into population statistics.

## Productive-work proof

Include portfolio, technical projects, AI workflows, certifications, demos, relevant consulting/volunteer work, role-related research, or other public-safe proof only when it strengthens the search story. Keep unrelated identities/projects separate unless explicitly included.

## Visual contract

For HTML output use email-safe tables, inline CSS, roughly 960–1040px max width, high contrast, compact typography, mobile-readable tables, restrained accents, an integrated banner, and no JavaScript dependency in the email itself.

Default sample palette: page `#07100a`, report `#0a120d`, panel `#101b13`, border `#35513a`, positive `#9bd34b`, emphasis `#f3c957`, info `#73c9d6`, closure `#e06c5f`, text `#f3f0df`.

## Default rebuild workflow

Resolve current local time → find latest sent report → parse issue/timestamp → establish exact window → audit recruiting activity → refresh cumulative totals → reconcile live/closed → refresh market data if used → identify relevant build proof → rebuild report → triple-check facts/counts/status → produce email-safe HTML → draft unless send is explicitly authorized → advance baseline only after confirmed send.

## Acceptance test

Verify the window comes from the latest sent report; cumulative totals are separate from interval changes; every delta falls inside the window; live roles have current signal; closed roles are removed; compensation is correctly labeled; market data is sourced; productive work is relevant; no unrelated/private identity leaked; HTML is mobile-readable; names/dates/organizations/roles/counts were checked; and output remains draft-only unless sending was explicitly authorized.

## Standalone input template

```yaml
series_name: "Job Search Field Report"
subject_prefix: "Job Search '26 | Issue"
timezone: "America/Chicago"
search_start_at: "2026-05-01T09:00:00-05:00"
seed_issue_number: 3
seed_sent_at: "2026-09-01T08:15:00-05:00"
target_compensation: "$140K+ preferred"
```

This skill does not require Clintware, a specific email provider, a specific ATS, or a specific tracker. Email, calendar, tracker, files, and web sources are optional adapters around the same core rules.
