# Customer Success Command Center Builder

Build a private, interview-ready Customer Success CRM / command-center demo for a target company from public company context plus any user-supplied interview/job context.

## Product boundary: metrics, records, and workflows only

By default, generated CRMs are measurement and record systems, not recommendation engines.

Do not add or regenerate these unless the user explicitly overrides this rule in the current request:

- signal recommenders or free-text classifiers
- keyword-based pattern guessing
- sentiment analysis
- next-best-action engines
- inferred playbook selection
- inferred renewal, growth, expansion, or upsell suggestions
- AI-generated account strategy
- automatic action assignment from prose input
- controls that claim to detect meaning or intent from notes, meetings, emails, or other free text

Free-text notes and meeting records are storage/display/search inputs only. Do not analyze them to produce advice.

Allowed derived behavior is limited to transparent calculations from explicit structured fields, including sums, averages, ratios, percentages, deltas, durations, dates, counts, disclosed weighted health scores, disclosed threshold/status bands, deterministic SLA/lifecycle comparisons, completion percentages, renewal-day calculations, factual rollups, and meeting briefs assembled from stored data.

If a status such as `Healthy`, `Watch`, or `At risk` is displayed, publish the exact formula/threshold that produces it. A calculated flag may state the value and breached threshold, but it must not invent the action to take.

Static playbooks are allowed as reference checklists. They must not be automatically selected, ranked, or recommended from customer text or inferred patterns.

## Non-blocking omission policy

This boundary is a feature-level guard, not a project-level kill switch.

If a proposed, generated, inherited, or optional feature violates the product boundary:

1. Omit or skip that feature/version.
2. Continue building, validating, and deploying all unrelated requested CRM functionality.
3. Do not fail the whole project merely because that optional feature was attempted or found.
4. Do not spend time searching for a replacement recommendation/classification feature unless the user explicitly asks for one.
5. Do not broaden the task into investigating why that optional feature might have been useful.
6. If safe automatic removal is possible, remove only the isolated optional feature. Do not delete shared application code or unrelated functionality to enforce the guard.
7. If the feature cannot be safely isolated automatically, leave it for the next source edit, report it as a non-blocking cleanup item, and continue the rest of the build.
8. Only treat the overall project as failed when a core requested function cannot be completed or the build itself is unusable.

Completion reports may say an optional disallowed feature was skipped. They should not characterize the entire CRM as failed because of it.

## Required outputs

Every run must produce these unless the user explicitly opts out:

1. Self-contained interactive CRM/CSM command-center web app.
2. Neutral password gate before company-specific content.
3. Secure supplied or generated password.
4. Matching PDF CSM field guide.
5. Privacy-conscious analytics for access and meaningful CRM use.
6. Persistent light/dark mode inside the unlocked CRM.
7. Rich account workspaces with expected CSM records.
8. Completion summary with route, password, `demo_id`, formulas/thresholds, files, validation, skipped optional features if any, and remaining owner-only deployment steps.

## Required account workspace

Include fields relevant to the target SaaS model, such as account name, industry, segment, ARR/value, lifecycle stage, contract start/end dates, renewal date/days remaining, structured health inputs and calculated health, adoption/usage/telemetry/coverage metrics, outcome-evidence metrics, stakeholder/champion coverage, support/escalation records, success-plan objectives/owners/proof/progress, product/module entitlements, integrations, technical-owner context, internal owners, meeting history, account notes, and customer employee/stakeholder directory.

### Required record-entry controls

Every account workspace must support by default:

1. **Add account note** — timestamp, factual note text, history display, edit/delete where practical.
2. **Add meeting log** — date, meeting type/title, attendees, factual notes/decisions/measurements/commitments, chronological history, edit/delete where practical.
3. **Add employee / stakeholder** — name, role/title, relationship/status, responsibility/stakeholder lane, stakeholder-map display, edit/delete where practical.

`localStorage` is acceptable for an interview/demo prototype when clearly labeled as a demo mechanism, not an enterprise system-of-record architecture. Do not analyze newly entered records to infer sentiment, risk, next action, expansion opportunity, or customer intent.

## Privacy gate

Before unlock, do not visibly reveal the target company name, logo, product names, customer names, or identifying copy. Prefer a neutral hostname/codename and add `noindex,nofollow,noarchive,nosnippet`. Prefer server-side or edge authentication when available; otherwise classify a static client-side gate as a lightweight presentation gate.

## Password generation

If no password is supplied, generate a cryptographically secure 20-character password with uppercase, lowercase, digits, and safe symbols from `!@#$%^&*_-+=`, avoiding quotes, backslashes, and backticks. Reveal it only in the completion message, not on the pre-login page.

## Analytics

Reuse an existing first-party analytics property when available. Give each demo a neutral `demo_id`. Useful events include `crm_gate_view`, `crm_unlock_success`, `crm_unlock_failed`, `crm_guide_open`, `crm_account_open`, `crm_account_workspace_open`, `crm_filter_use`, `crm_theme_toggle`, `crm_session_engaged`, `crm_account_note_add`, `crm_meeting_log_add`, `crm_stakeholder_add`, and `crm_meeting_brief_generate`.

Never send company names, recipient data, passwords, free-text notes, meeting text, stakeholder names, or other identifying/private values as analytics parameters.

## Company research and theming

Research the target company's current public website before designing. Match color relationships, light/dark balance, spacing, density, radius, typography, navigation, buttons, and hierarchy without copying proprietary source, artwork, or redistributing proprietary fonts. Use a verified public font only when safe; otherwise use a close fallback and disclose it.

## Light/dark mode

Every CRM must include a compact persistent light/dark toggle after unlock. Default to the mode that best matches the current company site. Persist the choice in `localStorage`, update all major surfaces together, preserve readable contrast, and track only the neutral `theme` value when analytics are enabled.

## Metrics and health

Health must be reproducible and explainable. Prefer a weighted score from explicit structured fields such as adoption, outcome realization, stakeholder strength, technical coverage, support confidence/burden, and commercial timing. Display the formula, input values, weights, final score, status thresholds, and breached thresholds. Do not turn the score into an automatically generated recommendation.

## Meeting brief

A meeting brief may assemble only stored/calculated facts: metrics, threshold flags, account objective, stakeholder list, success-plan goals/progress, meeting history, account notes, and manually recorded actions/commitments. It must not invent recommended discussion, next-best action, strategy, expansion idea, or inferred customer intent.

## Static playbooks

Generate static reference/checklist content mapped to the company/product model. No automatic selection, ranking, or recommendation based on customer text is allowed by default.

## PDF field guide

Generate a PDF guide in the same visual theme explaining navigation, exact health formula and thresholds, company-specific structured outcome metrics, account workspace and record-entry workflows, onboarding/TTV measurement milestones, QBR/EBR evidence and meeting records, post-sales ownership, renewal measurement, static playbooks/checklists, and a 60-second interview demo path. State clearly that free-text pattern guessing and generated recommendations are excluded by default. Visually inspect the PDF before completion.

## Validation

Verify the neutral gate, password failure/success, analytics where implemented, light/dark persistence, navigation, filters, account workspace, add-note persistence, add-meeting persistence, add-stakeholder persistence, edit/delete where implemented, exact health calculation, exact threshold flags, factual-only meeting briefs, static playbooks, and responsive layout.

If prohibited optional recommendation/classification functionality appears without a current explicit user override, skip/remove that optional feature where safe and continue validation of the rest of the project. Record it as a skipped or cleanup item rather than failing the entire build.

## Completion message

Return a compact report with what was built, route, password, theme, `demo_id`, tracked events, published formula/thresholds, account write controls, skipped optional features if any, PDF link/path, repository/commit, validation result, and exact remaining owner-only steps.