# Job Search Field Report ASTRO

A standalone, identity-scrubbed workflow for rebuilding recurring job-search field reports from the exact time the last report was actually sent through now.

## Core idea

Use the timestamp of the latest **actually sent** report as the beginning of the next difference window. Drafts do not advance the clock.

`difference_window = (latest_sent_report_at, current_at]`

## What v1.3 adds

- exact front-of-report previous → current → delta reconciliation;
- receipt-based application auditing when trackers undercount submission volume;
- separate deduped company-role totals so email receipts do not create fake uniqueness;
- search-channel traction for referrals, cold/warm networking, recruiters, search firms, and executive/founder intros without inflating employer-interview totals;
- sourced market outlook using official data, credible platform/industry data, and clearly labeled recent Reddit/community evidence;
- email-safe market tables and charts rather than prose-only market summaries;
- anti-regression checks so later edits do not silently remove previously approved sections or visuals;
- verified Gmail inline-banner handling;
- draft-only action boundaries.

## Included

- `SKILL.md` — full workflow specification
- `GPT_INSTRUCTIONS.md` — condensed execution instructions
- `examples/sample-report.html` — fictional sample output using dummy companies and metrics

## Portability

The workflow is provider-independent. It can be used with any email/calendar/tracker stack, or manually with supplied files. Gmail-specific banner verification applies only when Gmail is the output system. The sample HTML is static and requires no framework, JavaScript, database, account, or proprietary runtime.

## Privacy

The public skill is identity-scrubbed. Never import private names, employers, email addresses, personal metrics, addresses, or private project details from another user's report.
