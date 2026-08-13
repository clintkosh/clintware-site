# an.clintware.com Production Audit — 2026-08-12

## Result

Status: PASS

Production URL: https://an.clintware.com
GA4 measurement ID: G-DCY144YM9P

The final stable Chrome audit completed successfully after the note-save confirmation patch was deployed.

## Google Analytics coverage

The live audit discovered and exercised all 10 main SPA routes:

- command
- accounts
- renewal
- playbooks
- cadence
- capacity
- finance
- intake
- kpis
- settings

It also exercised all 7 account workspace tabs:

- summary
- stakeholders
- success
- technical
- meetings
- notes
- commercial

Result: 23 SPA page_view events were observed, with zero missing route/tab page views. The global GA4 config for G-DCY144YM9P was present. The login gate also emits its own gate/unlock/logout events.

## Functional audit

Verified in the live production browser:

- persistent Logout control remains visible across every main route and account tab
- account workspace opens from the account list
- Add Note persists to the active account
- Add Note now shows a visible `Note saved` confirmation only after stored note data actually changes
- Add Stakeholder control is present
- Add Success Plan objective control is present
- Log Meeting control is present
- Meeting Brief control is present
- no browser JavaScript errors were recorded during the audit
- no `coming soon`, `not implemented`, `placeholder`, `lorem ipsum`, `dummy`, `todo`, or `fake` UI markers were found

The audit heuristic flagged account-name buttons and navigation/tab labels as "suspicious" only because their behavior is implemented through delegated data attributes rather than conventional href/id patterns. They are real navigation/open-account controls, not dead UI.

## What is still synthetic / prototype-only

These are not broken controls, but they are intentionally not production integrations:

1. **All customer data is synthetic.** The 20 companies, stakeholders, meetings, risks, notes, renewal dates, ARR values, adoption values, and other customer details are fictional sample data.
2. **Health and readiness metrics are deterministic demo calculations.** They are not connected to Abnormal, Salesforce, support systems, telemetry, billing, or product usage APIs.
3. **Persistence is browser-local.** CRM changes are stored in localStorage in the current browser, not in a backend database and not shared between users/devices.
4. **The password gate is a private-demo lock, not production authentication.** Access state is sessionStorage/client-side and is intended only for interview/demo review.
5. **Technical & Services and Commercial are primarily operating-context views.** They contain meaningful seeded context but are more read-only than the Stakeholders, Success Plan, Meetings, Notes, and account-detail workflows.
6. **Meeting briefs are generated from the stored demo account model.** The generation is real and deterministic, including Print / Save PDF, but the underlying source data remains synthetic.

## Cleanup / hardening plan

### P0 — Done

- GA4 installed and verified across every current route/tab.
- Persistent Logout / lock behavior verified everywhere.
- Add Note save persistence verified.
- Visible save confirmation added and tied to actual persisted note changes.
- No placeholder or dead-state copy detected.

### P1 — Recommended before presenting as a stronger "working CRM"

- Make Technical & Services explicitly editable or label it clearly as read-only operating context.
- Make Commercial explicitly editable or label it clearly as read-only renewal/growth context.
- Add browser tests that exercise add/edit/remove for every mutable account record type, not just presence checks.
- Add an automated control-inventory regression that fails when a new visible action is added without a tested effect.

### P2 — Only if moving beyond an interview prototype

- Replace localStorage with a backend datastore.
- Replace the client-side password gate with server-side authentication/session handling.
- Add user identity, permissions, audit history, and multi-user concurrency.
- Connect real CRM/product/support sources only with authorized APIs or integrations.
- Replace synthetic scoring inputs with governed production data and documented scoring definitions.

## Current conclusion

There are no known dead buttons, placeholder features, or missing GA route/tab events in the current live production audit. The remaining "fake" elements are the intentionally synthetic dataset, deterministic demo metrics, browser-local persistence, demo-grade authentication, and read-only operating-context sections. Those should be described as prototype constraints rather than represented as live Abnormal integrations.
