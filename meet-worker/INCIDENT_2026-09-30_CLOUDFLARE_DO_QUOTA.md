# ClintCal Incident: Cloudflare Durable Objects Free-Tier Quota

**Date:** 2026-09-30  
**Status:** Mitigation deployed; production E2E in progress  
**Vendor:** Cloudflare  
**Account / scope:** Clintware Cloudflare account hosting Workers and Durable Objects  
**Affected resource:** Durable Objects SQLite row-read quota on the free tier  
**Not affected:** Google/Gmail quota, Google Calendar quota, GitHub quota, ChatGPT/OpenAI quota

## User-visible symptom

The scheduler could display live Google Calendar availability, but submitting a booking could fail with:

> The request could not be completed.

Health diagnostics also reported storage errors.

## Root cause

The original booking flow treated a Cloudflare Durable Object as a required serialized booking store. The Clintware Cloudflare account exhausted the Durable Objects free-tier row-read allowance. That made required reserve/link/manage operations fail even though the delegated Google Calendar connection was healthy.

The issue was amplified because Calendar incident/recovery bookkeeping also attempted to write through the same Durable Object.

## Immediate mitigation implemented

- Keep the organizer and explicit calendar pinned to **clint.kosh@gmail.com**.
- Use Google Calendar directly for availability.
- Use Google Calendar event creation as the authoritative booking write.
- Store ClintCal management metadata in Google Calendar private extended properties.
- Resolve manage links from Google Calendar rather than requiring Durable Object reads.
- Reschedule through Google Calendar event update.
- Cancel through Google Calendar event deletion.
- Make confirmation mail non-blocking for the core reservation.
- Make scheduler health depend on the live Calendar path, not Durable Object health.
- Make Durable Objects optional/degraded rather than a hard dependency.
- Update CI to run a live book → manage → reschedule → cancel test against the calendar-first path.

## Permanent corrective plan

### P0 — Restore reliable booking
- [x] Decouple availability from Durable Objects.
- [x] Decouple book/manage/reschedule/cancel from Durable Objects.
- [x] Pin the expected Google account and calendar explicitly.
- [x] Add deployment guard against delegated-account drift.
- [x] Change health checks to reflect the actual production source of truth.
- [ ] Production E2E passes after deployment.

### P1 — Prevent another Cloudflare quota incident
- Audit all remaining Durable Object reads and alarms.
- Remove broad scans and unnecessary health/status reads.
- Measure reads per user action and per scheduled alarm.
- Add quota-budget telemetry and alert thresholds before exhaustion.
- Keep high-frequency diagnostic polling away from Durable Object storage.

### P2 — Decide the durable-state tier intentionally
After usage is measured, choose one:
1. Keep Durable Objects only where serialization is genuinely required and move to a paid allowance if justified.
2. Move auxiliary/non-serialized scheduler state to a lower-cost Cloudflare primitive such as KV or D1 where appropriate.
3. Keep Google Calendar as booking truth and use Cloudflare storage only for optional analytics, reminders, or caches.

No storage product should again be a single point of failure for creating a Google Calendar/Meet booking.

### P3 — Business email identity
Set up **clint@clintware.com** separately from scheduling. Until the Google Workspace identity is fully functional and verified, ClintCal remains on **clint.kosh@gmail.com**. Mail routing changes must not alter the production Calendar identity.

## Verification requirements

A fix is not considered complete until all of the following pass:

1. Live availability returns Google-filtered slots.
2. A booking creates a Google Calendar event.
3. A Google Meet link is created.
4. The guest receives the Google Calendar invitation.
5. The manage URL resolves without Durable Object storage.
6. Reschedule updates the Google event.
7. Cancel removes/cancels the Google event.
8. No test booking remains afterward.
9. Production health stays green even when Durable Objects are quota-degraded.

- Final live scheduler verification trigger: pending.
