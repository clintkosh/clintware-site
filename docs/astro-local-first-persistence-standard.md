# Astro Local-First Persistence Standard

**Tracking:** CWS-10 (Jira provider alias: KAN-10)  
**Effective:** 2026-09-30  
**Default:** Browser-local or stateless. Remote persistence is an explicit capability decision.

## Core rule

Hosting and persistence are separate decisions.

A Clintware site, interview artifact, portfolio demo, CRM proof-of-work, or other single-user Astro-style application may be hosted on Cloudflare Pages, Cloudflare Workers static assets, or another static host without requiring a database or Cloudflare Durable Object.

For these artifacts, default state is:

```
STATIC / STATELESS HOST
        |
        v
BROWSER APPLICATION
        |
        +-- localStorage / IndexedDB
        +-- in-memory fallback
        +-- export / import when useful
```

The application must remain functional when Durable Objects are unavailable.

## Persistence decision matrix

| Need | Default |
| --- | --- |
| Static content only | Stateless hosting |
| Theme, filters, selected tabs | localStorage |
| Single-user demo CRM records | localStorage or IndexedDB |
| Larger browser-local datasets/files | IndexedDB |
| Temporary state that need not survive reload | in-memory |
| Exportable candidate/demo workspace | Browser-local + JSON/PDF export |
| Secret-bearing provider action | Scoped server/control-plane call, not browser credentials |
| Cross-device user account state | Remote persistence, explicitly justified |
| Multiple users editing shared state | Remote authoritative store |
| Webhooks/background jobs/scheduled processing | Server state as required |
| Strong serialization/coordination | Durable Object only when that property is actually needed |

## Durable Object rule

Do not add a Durable Object merely because the product is hosted on Cloudflare or because a prior reference implementation used one.

A Durable Object is allowed only when all are true:

1. A concrete feature requires server-authoritative shared state, serialization, coordination, or another DO-specific property.
2. The manifest sets `remote_state_required: true`.
3. The manifest sets `persistence_mode: "remote-required"`.
4. The manifest gives a non-empty `remote_state_reason`.
5. If a Durable Object is specifically required, `durable_objects_required: true` is explicit.
6. The dependency has a quota/failure plan and cannot silently make an otherwise local demo unavailable.

Remote state does not automatically mean Durable Objects. Evaluate KV, D1, R2, an existing application database, Google Calendar/provider source-of-truth, or another intentional store according to access pattern.

## Default CRM manifest

```json
{
  "persistence_mode": "browser-local",
  "remote_state_required": false,
  "durable_objects_required": false,
  "persistence_reason": "Single-browser demo state does not require shared server-authoritative storage."
}
```

## Browser-local behavior

For browser-local demos:

- mutations must really persist across reloads when localStorage/IndexedDB is available;
- provide an in-memory fallback when browser storage is unavailable;
- clearly label persistence as browser-local;
- never claim cross-device retention;
- preserve user-created records during sample-data refresh;
- provide export/import when loss of browser state would be costly;
- do not send CRM data to a server merely to make a Save button work;
- privileged third-party credentials remain behind scoped server/control-plane capabilities if those integrations are enabled.

## Hosting rule

The preferred deployment order for a demo is:

1. Static host / Cloudflare Pages when no server behavior is needed.
2. Static assets behind a stateless Worker when custom headers, health, routing, or small server endpoints are useful.
3. Server application with a non-DO store when remote state is truly required and another store fits better.
4. Durable Objects only when their coordination/serialization model is specifically justified.

Using Cloudflare for DNS, Pages, Workers, CDN, or custom domains does not imply use of Durable Objects.

## Verification

A browser-local build is not complete until verification shows:

- generated `wrangler.jsonc` contains no required `durable_objects` binding;
- health reports browser-local/stateless storage and zero required database rows per demo session;
- create/edit/archive state survives a reload in the same browser;
- the app still loads and saves when remote persistence is unavailable;
- sample reset does not destroy user-owned data except through an explicit destructive action;
- any real provider integration fails clearly when disconnected rather than silently switching CRM persistence to a server database.

## Exceptions

Production applications that genuinely need shared user accounts, collaboration, webhooks, background jobs, server-side secrets, centralized audit history, or cross-device state may use remote persistence. The exception belongs in the product manifest and architecture notes. It is not inherited from a demo reference implementation.

## Incident origin

This standard was formalized after the 2026-09-30 Cloudflare Durable Objects free-tier row-read quota incident that broke a scheduler path even though its external source of truth remained healthy. The platform correction is to avoid making optional cloud state a single point of failure for functions that can operate without it.
