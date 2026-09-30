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
- Source/ASTRO commit: `0e51b033bc62077064a2164703413a5dddda2130`.
- Repository validation on that commit: Brand/isolation **passed**; CRM analytics coverage **passed**.
- qq cache-refresh request: `driznet-anth-cache-refresh-20260930-1148`, task `repo-code-search`, target `DRIZNET`.
- GitHub relay run: `36747335289`.
- Dispatch outcome: **failed before queue/delivery**.  The Control Plane returned `Exceeded allowed rows read in Durable Objects free tier.`
- Therefore no local execution, deployment, or live-domain verification is claimed from this request.
- The relay is now hardened to treat this quota condition as non-retryable instead of spending four additional failed requests.


### Source validation after semantic-base correction
- Final source revision checked: `26f2792bdb8d7b88381d8ddac31bc89aaabb5120`.
- Dedicated Anthropic validation run: `36749254629` — **passed**.
- Materialization: passed.
- Dependency install: passed.
- Source/contract checks: passed.
- Wrangler dry run: passed.
- One-off semantic boundary: passed.
- Brand / Quillgeist isolation validation: `36749254681` — **passed**.
- CRM analytics coverage validation: `36749254673` — **passed**.
- The inherited source-company enrichment module is removed from the generated Anthropic build.
- The generated importer, sample-account model, workspace labels, and visible/runtime modules are now role-adaptive rather than source-company-derived.

### Current state
Source is persisted and ready for qq, but `anth.clintware.com` is **not yet claimed deployed or verified**.

Next verified execution sequence remains:
1. qq `repo-code-search` to refresh DRIZNET's dedicated source cache.
2. qq `crm-astro-build` with `Action=full`, `Project=anth-crm`.
3. qq `browser-work` against `https://anth.clintware.com`.
4. Public live-route verification and journal update with exact evidence.

## 2026-09-30 — CRM+Cover ASTRO

- Created reusable `ASTRO_CRM_COVER_SKILL.md`.
- Canonical base remains ASTRO; employer builds remain implementation references / overlays only.
- CRM+Cover packages a role-fit one-off CRM with distinct Why Company and Cover Letter artifacts.
- Added verified-only CRM link policy: source/CI status is not enough to put a public CRM URL into final application copy as a live proof point.
- Updated `quillgeist-lite/tools/crm_astro.py` so qq recognizes and validates the optional `application_bundle.profile = "crm+cover"` manifest profile and plans the paired writing / verification steps.
- Tracking issue: #115.

