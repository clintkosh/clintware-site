# NMA Customer Solutions Operating System — Build Log

Date: 2026-09-30  
Live URL: https://nma.clintware.com  
Repository: `clintkosh/clintware-site`  
Final source commit: `eddba9fe446a53009ac1ff1e878c6554f136349c`  
Final deployment run: `36758149682`  
Final verification job: `110033565562`  
Cloud deployment version: `79d5ab56-5c68-4c9f-b345-dc9d0ab1eb28`

## Outcome

Implemented a role-specific Noma AI Security Customer Operating System as a thin adaptive layer over the current ASTRO CRM foundation. The deployed candidate artifact uses public role/platform context and explicitly synthetic enterprise data. It is marked `noindex,nofollow,noarchive` and does not represent a real Noma customer, private process, or official product.

## Operating model implemented

The application maps nine Customer Solutions motions into working CRM surfaces:

1. Strategic Customer Leadership
2. AI Estate & Security Discovery
3. AI Security & Governance Program
4. Deployment & Technical Operationalization
5. Adoption, Outcomes & Value
6. Retention & Expansion
7. Cross-functional Execution
8. CISO / GRC Executive Review
9. Customer Insight & Product Signal

Operating loop: `ALIGN → DISCOVER → PRIORITIZE → DEPLOY → ADOPT → PROVE → EXPAND → SIGNAL`.

## Synthetic portfolio

Golden account: `Northstar Bank (Synthetic)`.

Additional synthetic accounts:
- Harbor Financial Group
- Aster Health Systems
- Vector Commerce
- Forge Industrial
- Summit SaaS
- Northwind Technology Services

The golden account includes GenAI/RAG/agent/MCP discovery, identity and tool governance, integrations, measurable outcome contracts, risk register, stakeholders, actions, cross-functional issues, executive review, meeting prep, RACI, and operating guidance.

## qq execution record

Preferred execution path was attempted first:

`ChatGPT → Clintware control plane → qq → DRIZNET`

Dispatch request: `driznet-nma-crm-full-20260930-1234`  
Task: `crm-astro-build`  
Dispatch workflow run: `36754291383`  
Dispatch job: `110020465474`

Result: the control-plane Durable Object free-tier row-read quota was exhausted before delivery to DRIZNET. The request was therefore dispatched but not delivered and not executed locally.

Execution accounting for this build:
- qq dispatched: **1**
- qq delivered to DRIZNET: **0**
- qq executed: **0**
- qq verification passes: **0**

No local-execution or token-savings credit is assigned to qq for this run.

## Recovery path

After the local path was blocked, the existing authorized repository/Cloud deployment path was used. Recovery remained deterministic: materialize the current ASTRO base, apply the NMA manifest/overlay, run syntax and role-logic checks, perform a deployment dry run, deploy, then exercise the live system with real Chrome.

Recovery milestones:

- Run `36754932242`: source/logic/dry-run/deploy passed; live state was blocked by exhausted database-row quota.
- Run `36755980928`: source/logic passed; Cloud deployment correctly rejected removal of the prior state class without an explicit lifecycle migration.
- Run `36756631466`: explicit retirement migration added; browser-local persistence introduced; live contract reached the deployed site. A shell pipefail false-negative was identified and repaired.
- Run `36756969154`: source, deploy, and live HTTP passed; the browser dependency install was superseded by a newer run.
- Run `36757471728`: full live browser workflow reached the end; only an unattributed browser 404 console warning failed the final blanket console gate.
- Final run `36758149682`: embedded favicon added and browser verifier changed to attribute actual HTTP failures. All layers passed.

## Runtime architecture adjustment

Because server-side database row reads were the infrastructure blocker, the candidate demo persistence layer was deliberately moved into browser `localStorage` under `nma.crm.local.v2`.

The deployed Worker now handles the custom domain, static assets, health contract, and a server API boundary. The normal CRM state path is browser-local and therefore performs **0 server-side database row operations per demo session**.

Tradeoff: state is persistent in that browser but is not a shared multi-user server tenant. This is intentional for the candidate demo and is surfaced in the application.

## Final verification evidence

Final workflow: `36758149682`  
Final job: `110033565562`  
Conclusion: **success**

Passed gates:
- adaptive ASTRO materialization
- JavaScript syntax checks
- NMA role-logic checks
- synthetic-data boundary checks
- source-company semantic scrub
- responsive/mobile checks
- quota-independent runtime checks
- Wrangler dry run
- custom-domain deployment
- live health/static/runtime contract
- real Chrome application load
- seven-account synthetic portfolio
- golden-account record coverage
- create → reload → persist → patch → delete CRUD flow
- browser-local persistence
- eight-slide in-app presentation
- CISO brief PDF download
- 390×844 mobile overflow check
- browser page/console/HTTP fault gate

Final browser verifier output:

```json
{
  "ok": true,
  "title": "Noma AI Security Customer Operating System · Clintware",
  "accounts": 7,
  "goldenRecords": 34,
  "presentationSlides": 8,
  "pdfBytes": 2996,
  "browserLocalBytes": 81066,
  "databaseRowsPerDemoSession": 0,
  "mobileOverflow": false,
  "errors": [],
  "badResponses": []
}
```

Verification marker:

`NMA_VERIFIED=source+role-logic+quota-independent-runtime+do-retirement+dry-run+deploy+live-http+browser-crud+browser-persistence+hosted-chrome+presentation+pdf+mobile`


## 2026-10-01 — Multi-stage populated portfolio update

The synthetic portfolio was expanded so the product demonstrates an operating flow already in motion rather than a set of similarly seeded accounts.

Deployed source for this update: `e780299d364b047108eb0b163f62d867060f53e8`  
Verification workflow: `36873979087`  
Verification job: `110408573511`  
Cloud deployment version: `1762b3ba-2089-4220-bd2a-c046a936b5dd`

### Lifecycle spread

The live portfolio now includes six explicit operating phases:

- Harbor Financial Group — `discover` — Discovery · estate mapping
- Aster Health Systems — `govern` — Governance design · evidence mapping
- Forge Industrial — `test` — Pre-production testing · release gates
- Vector Commerce — `protect` — Runtime protection · SOC operationalization
- Summit SaaS — `prove` — Adoption + value proof · MCP governance
- Northwind Technology Services — `expand` — Renewal + expansion · multi-practice rollout

Each of those accounts passed a live browser depth gate with **3 stakeholders, 3 KPIs, 3 actions, 3 combined risk/issue records, and at least 1 meeting**, plus stage-specific adoption/evidence and call-prep context.

Action state is intentionally varied across the live portfolio. Verified statuses include:

`In Progress · Scheduled · Planned · Complete · Blocked · Ready for Decision`

The portfolio surface now exposes stage, progress, health, and next action so a reviewer can see the lifecycle spread without opening every account.

### Data-coherence rule

Seeded data is intentionally stage-aware. KPIs, risks, actions, meetings, priorities, owners, dates, and next actions are written to agree with the account's current lifecycle stage. The same generic record pack is no longer stamped across every account.

### Safe seed migration

Browser-local seed schema advanced to version 3. Built-in `synthetic_sample`, `template`, and `scenario` records may refresh when the seed changes, while user-created records are preserved. A seeded record that a user edits is promoted to user-owned `internal_record` provenance unless provenance is explicitly supplied, preventing future seed refreshes from silently replacing that work.

### Permanent ASTRO default

The same requirement was persisted into the reusable CRM build system:

- `ASTRO_CRM_ONE_OFF_SKILL.md`
- `skills/crm-one-off/SKILL.md`
- `quillgeist-lite/tools/crm_astro.py`
- `quillgeist-lite/tasks/crm-astro-build.ps1`

Unless an empty template is explicitly requested, one-off CRM builds now default to a populated, multi-account, multi-stage synthetic portfolio with stakeholder, KPI, action, risk/issue, meeting, mixed-status, and flow-coherence requirements.

### QQ / MEMORIA evidence for this update

The first `crm-astro-build` execution on MEMORIA returned a valid local-agent pass but was later proven to have used stale source revision `7af9dce34d1b212f732b4e91642fb95ad3cffcdd`; it is therefore **not** counted as final validation of this update.

A deterministic `repo-code-search` recovery then refreshed MEMORIA's maintained repository cache to current `origin/main` and confirmed `SAMPLE_SEED_VERSION=2` in the NMA project.

Refresh request: `memoria-nma-repo-sync-20261001-0909`  
Local job: `53dfbd0b-2844-49ea-8ff1-e28ba667a6ba`  
Result: **passed**  
Confirmation source: `qq-local-agent`  
Transport: `websocket-event`

A later attempt to force `RepoRoot` through remote dispatch was rejected before local execution because `RepoRoot` is intentionally not in the remote `crm-astro-build` allowlist. No execution credit is assigned to that rejected request.

### Final live acceptance

Final browser verifier:

```json
{
  "ok": true,
  "accounts": 7,
  "lifecyclePhases": ["discover","govern","test","protect","prove","expand"],
  "actionStatusVariety": ["In Progress","Scheduled","Planned","Complete","Blocked","Ready for Decision"],
  "goldenRecords": 34,
  "presentationSlides": 8,
  "pdfBytes": 2996,
  "browserLocalBytes": 121747,
  "databaseRowsPerDemoSession": 0,
  "mobileOverflow": false,
  "errors": [],
  "badResponses": []
}
```

Verification marker:

`NMA_VERIFIED=source+role-logic+multi-stage-seed-depth+quota-independent-runtime+do-retirement+dry-run+deploy+live-http+browser-crud+browser-persistence+hosted-chrome+presentation+pdf+mobile`


## Final closure — 2026-10-01 09:19 CT

The canonical QQ/control-plane publication path was repaired without widening the remote execution boundary. The control plane now validates the registry-driven allowlist and explicitly tests that remote `crm-astro-build` remains limited to `Action`, `Project`, and `SkipInstall`.

Final local CRM build:

- request: `memoria-nma-final-seed-verify-20261001-0917`
- MEMORIA job: `349eb03a-d357-4c37-8264-84588614252a`
- status: **passed**
- duration: **9,687 ms**
- confirmation source: `qq-local-agent`
- confirmation transport: `websocket-event`
- source fetched for execution: `b909a151f03695804a4aa40aad79f57323e70817`
- `synthetic_data_default`: **true**
- seed contract: **7 accounts / 6 lifecycle stages / 3 contacts / 3 KPIs / 3 actions per account**, plus risk, cross-functional issue, mixed-status, meeting-context, and flow-coherence requirements
- logic checks: `stageDiversity=true`, `denseFlowData=true`, `seedMigration=true`
- deployment result: local checks passed and returned the expected **server-authorized deployment handoff**

The in-app execution-evidence slide was then corrected to reflect this current MEMORIA pass rather than the original blocked attempt.

Final deployed source: `ba57bac63907c0c147fac6c43ba83423d594cd68`  
Final workflow: `36875338878`  
Final job: `110413204539`  
Final Cloud deployment version: `e686eff6-ecfe-4501-9a12-4c9e2465e105`  
Conclusion: **success**

Final live browser acceptance again confirmed all six lifecycle phases, the per-account depth gate, six distinct action statuses, 34 golden-account records, 8 presentation slides, a 2,996-byte generated PDF, 121,747 bytes of browser-local workspace state, zero normal demo database-row operations, no mobile overflow, no browser errors, and no bad HTTP responses.
