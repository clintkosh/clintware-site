# Koalendar -> ClintCal cutover

The objective is to retire the paid/external scheduling dependency without breaking the existing `meet.clintware.com` entry point.

## 1. Runtime

- [ ] Run `bootstrap.ps1` on the production host.
- [ ] Configure PostgreSQL with backups.
- [ ] Generate strong application/authentication secrets.
- [ ] Set the public Cal.diy URL to `https://meet.clintware.com` using the upstream-supported environment configuration.
- [ ] Enable TLS and put the app behind the Clintware reverse proxy/Cloudflare edge.

## 2. Calendar integration

- [ ] Enable Google Calendar API in the Clintware Google Cloud project.
- [ ] Create OAuth credentials for the production hostname.
- [ ] Add the exact callback URI required by the pinned Cal.diy release.
- [ ] Connect Clinton's scheduling calendar through the Cal.diy UI.
- [ ] Verify busy events block availability.
- [ ] Verify new bookings create Google Calendar events.
- [ ] Verify Google Meet links are created for meeting types configured to use Meet.

## 3. Recreate the current booking experience

- [ ] Create the Clintware meeting type(s) currently represented in Koalendar.
- [ ] Recreate working hours and timezone (`America/Chicago`).
- [ ] Recreate minimum notice, booking horizon, buffers, and daily limits.
- [ ] Recreate intake questions.
- [ ] Recreate confirmation text and email behavior.
- [ ] Apply Clintware branding and remove unrelated upstream-facing presentation from the public booking surface where allowed by the MIT license.

## 4. MCP

- [ ] In ClintCal, create a dedicated API key for the MCP adapter.
- [ ] Set `CLINTCAL_API_BASE_URL=https://meet.clintware.com/v2`.
- [ ] Set `CLINTCAL_API_KEY` in the MCP server's secret store, never source control.
- [ ] Set `CLINTCAL_API_VERSION` to the API version validated against the pinned upstream release.
- [ ] Build and run `clintcal/mcp`.
- [ ] Test `list_meeting_types`, `get_availability`, `create_booking`, `reschedule_booking`, and `cancel_booking`.

## 5. Production smoke tests

Use at least two different browsers/devices and one non-Central timezone.

- [ ] Correct timezone conversion.
- [ ] DST boundary behaves correctly.
- [ ] Existing busy calendar event removes a slot.
- [ ] Booking succeeds once.
- [ ] Two simultaneous attempts cannot both consume the same slot.
- [ ] Confirmation email arrives.
- [ ] Calendar invite arrives.
- [ ] Google Meet URL is valid when enabled.
- [ ] Reschedule updates calendar state and notifications.
- [ ] Cancellation updates calendar state and notifications.
- [ ] Invalid/expired cancellation links fail safely.
- [ ] Public endpoints are rate-limited/protected at the edge as appropriate.
- [ ] Database restore procedure has been tested.

## 6. Cutover

Only after every production smoke-test gate passes:

1. Lower DNS TTL in advance if needed.
2. Point `meet.clintware.com` at the ClintCal production origin/reverse proxy.
3. Verify TLS and the booking flow through the public hostname.
4. Leave Koalendar configured but unadvertised for a short rollback window.
5. Remove the Koalendar redirect/fallback after ClintCal has completed real bookings successfully.
6. Export any Koalendar information that must be retained.
7. Cancel the Koalendar subscription.

## Rollback

If a production booking, notification, OAuth, or availability failure appears during cutover, restore the previous `meet.clintware.com` target immediately. Do not attempt an in-place production repair while visitors are being offered unreliable slots.
