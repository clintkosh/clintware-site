# VidCRM Persistence Decision

**Reviewed:** 2026-09-30  
**Tracking:** Jira KAN-10  
**Default standard:** `docs/astro-local-first-persistence-standard.md`

## Decision

VidCRM is an explicit **remote-state-required** exception to the browser-local demo default.

This is not because it is hosted on Cloudflare.  It is because the current product workflow has server-authoritative capabilities that a browser-only store cannot safely replace:

- external document ingestion;
- external call/transcript ingestion;
- server-side AI analysis;
- a human approval/rejection queue for proposed knowledge and account-context changes;
- centralized audit history;
- control-plane research/event calls;
- a password-protected shared workspace whose state must survive browser/device changes.

## Current persistence

The current implementation uses a Cloudflare Durable Object class, `CrmHub`, as the authoritative state store.

## Required follow-up

Remote state is justified.  Durable Objects themselves are **not automatically justified forever**.

Before scaling VidCRM, compare the existing Durable Object against D1 or another intentional store using:

- write serialization/concurrency requirements;
- ingestion volume;
- object/document size;
- audit/query needs;
- expected read patterns;
- free/paid quota behavior;
- backup/export requirements;
- failure isolation.

Until that review is complete, do not migrate VidCRM to browser-local storage because doing so would break external ingestion and centralized human-review semantics.

## Manifest-equivalent classification

```json
{
  "persistence_mode": "remote-required",
  "remote_state_required": true,
  "durable_objects_required": false,
  "remote_state_reason": "External ingestion, server-side AI processing, centralized approval/audit state, and cross-browser shared workspace require authoritative server persistence.",
  "durable_object_status": "current implementation pending storage-tier review"
}
```

The `durable_objects_required` value is intentionally false here: remote persistence is required, but the architecture has not established that Durable Objects are uniquely required over D1 or another server-side store.
