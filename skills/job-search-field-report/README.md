# Job Search Field Report ASTRO

Identity-scrubbed, standalone workflow for recurring job-search field reports.

Core rule:

`difference_window = (latest_sent_report_at, current_at]`

Drafts do not advance the comparison clock.

Version 1.3 adds receipt-based application auditing, separate deduped company-role counts, network/search-channel traction that does not inflate employer-interview totals, required market tables/charts/search-clock visuals, anti-regression checks, and verified inline-banner handling.

The public version is provider-independent and contains no private names, employers, email addresses, personal search metrics, addresses, or private project details.

Public page: `/skills/job-search-field-report/`
