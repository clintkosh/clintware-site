# Job Search Field Report ASTRO

A standalone, identity-scrubbed version of the recurring job-search field-report workflow.

## Core idea

Use the timestamp of the latest **actually sent** report as the beginning of the next difference window. Drafts do not advance the clock.

`difference_window = (latest_sent_report_at, current_at]`

## Included

- `SKILL.md` — full workflow specification
- `examples/sample-report.html` — fictional sample output using dummy companies and metrics

## Portability

The workflow is provider-independent. It can be used with any email/calendar/tracker stack, or manually with supplied files. The sample HTML is static and requires no framework, JavaScript, database, account, or proprietary runtime.
