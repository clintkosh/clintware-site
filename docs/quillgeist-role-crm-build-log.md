# Quillgeist Role-CRM Build Log

This is the durable execution journal for role-specific CRM proof-of-work builds.  Entries distinguish design, source persistence, qq dispatch, local execution, deployment, and verification.

## 2026-09-30 — Anthropic / Customer Success Manager, GSI

### Intent
Build a concise candidate operating system for the public Anthropic Customer Success Manager, GSI role at `anth.clintware.com`.

### Role-derived operating loop
`ALIGN → ACTIVATE → SCALE → PROVE → EXPAND → ENABLE → SIGNAL`

Public role requirements used for scope:
- strategic GSI relationships and success planning;
- Claude API, Claude for Enterprise, and Claude Code product-fit guidance;
- consumption-based and seat-based usage planning;
- underutilization and optimization;
- ROI / value evidence;
- new use cases and lines of business;
- Train-the-Trainer / Center of Excellence / organizational enablement;
- QBRs and lifecycle ownership;
- scalable portfolio playbooks;
- clean customer signal to Product / Research / GTM.

### Architecture decision
ASTRO is the conceptual base.  Prior company implementations are execution references only.  This build declares `base_project: adaptive-astro-one-off` and `implementation_reference: dplr-crm`.

### Source state
Planned/persisted source:
- `projects/anth-crm/manifest.json`
- `projects/anth-crm/scripts/materialize.mjs`
- `projects/anth-crm/scripts/anth-data.mjs`
- `projects/anth-crm/src/sample-customers.js`
- `projects/anth-crm/public/index.html`
- `projects/anth-crm/public/anth-ui.css`
- `projects/anth-crm/public/anth-track.js`

Synthetic-data boundary is explicit.  No real Anthropic customer data is used.

### Execution evidence
Pending qq dispatch at the time this entry is created.  Update only from local-agent or live-domain verification evidence.
