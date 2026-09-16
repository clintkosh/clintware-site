# ClintCal

ClintCal is the Clintware-owned scheduling service intended to replace the external Koalendar booking flow at `https://meet.clintware.com`.

It is a branded/self-hosted distribution around the MIT-licensed Cal.diy scheduling engine plus a Clintware MCP adapter for agent-driven scheduling.

## What this repository layer owns

- A reproducible Cal.diy upstream pin instead of tracking `main` blindly.
- Clintware deployment/bootstrap conventions.
- The Clintware MCP scheduling adapter.
- Migration and cutover procedures for `meet.clintware.com`.
- Clintware branding/overlay changes added over time.

The full upstream Cal.diy source is not duplicated inside `clintware-site`; `bootstrap.ps1` checks out the reviewed upstream commit into a runtime directory and applies Clintware overlays. This keeps attribution and upstream updates auditable.

## Prepare the runtime

From PowerShell:

```powershell
cd clintcal
./bootstrap.ps1
```

Then configure `runtime/.env` using Cal.diy's upstream environment template. Do not commit real secrets.

Production dependencies include:

- PostgreSQL
- Cal.diy authentication secrets
- Google Calendar API/OAuth credentials
- Email delivery credentials
- TLS/reverse proxy for `meet.clintware.com`

Google Calendar should be connected through OAuth. Never store a Google password in ClintCal.

## Clintware MCP adapter

The MCP adapter is intentionally separate from the public booking UI. It talks to ClintCal API v2 using a dedicated API key so AI clients never receive Google OAuth credentials or database credentials.

Available tools:

- `list_meeting_types`
- `get_availability`
- `create_booking`
- `reschedule_booking`
- `cancel_booking`

Configure from `clintcal/.env.example`, then:

```powershell
cd mcp
npm install
npm run build
npm start
```

For local clients the first transport is stdio. A remote Streamable HTTP transport should only be added after authentication and authorization are defined for the public endpoint.

## Intended production flow

```text
Visitor / Agent
      |
      v
meet.clintware.com
      |
      +--> ClintCal (Cal.diy scheduling engine)
      |        |
      |        +--> PostgreSQL
      |        +--> Google Calendar / Google Meet via OAuth
      |        +--> Email provider
      |
      +--> Clintware MCP adapter (authenticated agent use)
```

## Do not cut over Koalendar yet

Koalendar remains the production fallback until all gates in `MIGRATION.md` pass. In particular, do not redirect `meet.clintware.com` to ClintCal until Google OAuth, email, database backup, timezone/DST checks, concurrent-booking checks, cancellation, and rescheduling have been tested against the production hostname.

## License and upstream

See `UPSTREAM.md`. Cal.diy-derived code remains subject to its MIT license and attribution requirements.
