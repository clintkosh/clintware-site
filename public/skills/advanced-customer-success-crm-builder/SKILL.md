# Advanced Customer Success CRM Builder

Build a production-minded, company-tailored Customer Success / implementation CRM from public company context, user-supplied materials, and an operator-owned MCP/control-plane layer. The result should be a working operating system for post-sales delivery, not a decorative dashboard.

This skill generalizes the architecture of a fully developed Customer Success CRM into a reusable build method. It must not depend on any one customer, employer, product, cloud account, builder platform, repository, or credential.

## Core operating principles

1. **Start from the customer's operating model, not from a generic CRM template.**
2. **Preserve source truth.** Separate customer-provided facts, internal records, internal proposals, synthetic examples, derived calculations, and external research.
3. **Use AI to reduce toil, not to silently replace operator judgment.**
4. **Keep credentials behind an operator-owned MCP/control plane.** Applications request capabilities and actions; they do not receive long-lived third-party secrets.
5. **Use least privilege by default.** Grant each product only the minimum provider operations it needs.
6. **Ask the MCP/control plane before rediscovering infrastructure.** Do not burn external-builder tokens guessing which APIs, repositories, deployments, schemas, integrations, credentials, or adapters already exist when the control plane can answer directly.
7. **Make every important action auditable and reversible where practical.**
8. **Guest access and durable account retention are separate modes.** A usable demo should not require sign-in unless the requested data or action requires persistence or privileged integrations.
9. **External research is context, not customer truth.** Exa or another research provider may support validation and discovery, but must not overwrite account facts.
10. **A CRM is complete only when the workflows work.** Build, deploy, exercise, and verify the flows that an operator will actually use.

## When to use this skill

Use this skill when the user asks to build or recreate a sophisticated post-sales system for a company, including combinations of:

- Customer Success management
- implementation / onboarding
- technical account management
- professional services
- customer operations
- support / engineering escalation
- adoption
- value realization / ROI
- renewal readiness
- stakeholder management
- meeting preparation
- customer knowledge management
- AI-assisted CRM updates
- external research
- Jira / Confluence or equivalent integrations
- guest demos plus authenticated persistent workspaces

This skill can produce an interview demonstration, internal prototype, startup operating system, or production-oriented application. The data model and security level should match the requested use case.

## Required discovery pass

Before generating the application, establish the current environment.

### 1. Ask the MCP/control plane first

If an operator-owned MCP/control plane is available, use it as the first infrastructure-discovery surface.

Query for:

- existing repositories and deployment targets
- existing domains / routes
- current authentication or identity broker
- current database / durable-storage patterns
- available AI adapters
- research-provider capability
- Jira, Confluence, CRM, calendar, email, cloud, or other connected providers
- current credential scopes
- existing product registrations
- existing app templates, design systems, or reusable components
- current logging / audit conventions
- current analytics conventions
- existing skills that overlap the requested build
- already-deployed APIs or bridges that can be reused

Do not ask an external builder to reverse engineer these facts when the MCP/control plane can report them directly.

### 2. Build a capability manifest

Create a compact working manifest before implementation:

```
product:
company:
deployment_target:
identity_mode:
guest_mode:
persistence:
ai_adapter:
research_adapter:
mcp_control_plane:
provider_bridges:
analytics:
repo:
domain:
required_scopes:
missing_capabilities:
human_approvals:
```

The manifest is the build contract. Update it when capabilities change.

### 3. Research the target company

Use current public sources when the user wants company-specific tailoring.

Capture only what is necessary to design the CRM:

- products / modules
- customer personas
- implementation model
- likely post-sales roles
- service and support model
- public integration ecosystem
- public terminology
- public visual language
- documented customer outcomes
- onboarding or deployment patterns

Do not treat public research as private account truth.

## Architecture

Prefer a thin product application in front of an operator-owned control plane.

```
Browser / App
   |
   | first-party session + app API
   v
Product Worker / App Server
   |
   | scoped internal service calls
   v
MCP / Control Plane
   |---- AI model adapter
   |---- Exa / research adapter
   |---- Jira adapter
   |---- Confluence adapter
   |---- CRM / email / calendar adapters
   |---- cloud / repository adapters
   |---- audit + capability registry
   |
   v
Third-party providers
```

### Credential rule

The browser must never receive reusable third-party provider credentials.

The product app should receive only:

- a first-party session
- a scoped internal capability
- short-lived provider tokens only when strictly required and safe
- provider output already filtered through a server-side adapter

The control plane should retain:

- long-lived API credentials
- OAuth refresh tokens
- provider client secrets
- cloud credentials
- repository automation credentials
- encryption keys

### Least-privilege distribution

Model access as capabilities, not as a shared bag of secrets.

Example:

```
product: customer-success-crm
capabilities:
  research.public.search: read
  jira.issue.read: read
  jira.issue.create: approved-write
  confluence.page.read: read
  confluence.page.publish: approved-write
  ai.plan.generate: read
  audio.transcribe: consent-gated
```

Requirements:

- separate read and write scopes
- deny operations not explicitly allowlisted
- record product identity on every control-plane request
- use per-request IDs
- log privileged actions
- require explicit human approval for high-impact writes when appropriate
- do not expose a provider's complete credential merely because one operation needs it
- prefer capability revocation over secret rotation as the first response to an app-level access change

## Token-efficiency rule for external builders and coding agents

External builders are execution clients, not infrastructure archaeologists.

Before asking a third-party builder or model to invent an integration, use the MCP/control plane to answer:

- Does this integration already exist?
- What is its schema?
- What route should the app call?
- What scopes are available?
- What is the deployment target?
- Which existing components can be reused?
- What is the exact failure?
- What is already deployed?
- What changed since the last build?
- Which files need modification?

Send the builder the smallest relevant capability manifest plus the delta it needs.

Avoid repeatedly sending:

- the entire repository
- complete conversation history
- all credentials
- full deployment logs
- all provider documentation
- unchanged application state

Prefer:

```
KNOWN CAPABILITIES + CURRENT DELTA + EXACT FAILURE + DEFINITION OF DONE
```

This reduces duplicate reasoning, token spend, configuration drift, and accidental credential exposure.

## Core CRM information model

At minimum, support:

### Customer / account

- name
- industry
- segment
- service model
- implementation stage
- lifecycle stage
- current systems
- data sources
- product / module scope
- business goal
- success metrics
- target timeline
- current status
- source provenance
- source document

### Sales-to-CS handoff

- contracted scope
- promised timeline
- business case
- known dependencies
- systems / integrations
- unvalidated assumptions
- customer commitments
- internal commitments

### Stakeholders

Stakeholders are first-class CRM records.

Fields:

- name
- role / title
- organization
- email
- phone
- decision / influence role
- engagement status
- responsibility lane
- notes
- provenance

Stakeholders must be addable and editable from:

- the dedicated stakeholder surface if present
- meeting preparation
- handoff
- any other view that displays stakeholder data

Do not force the operator to leave meeting prep just to add a person who was discovered while preparing.

### RACI / ownership

- deliverable or decision
- Responsible
- Accountable
- Consulted
- Informed

Do not infer customer owners. Empty is better than invented.

### Milestones and implementation

- milestone
- owner
- due date
- status
- dependency
- acceptance criteria
- source / provenance

### Deployment board

Support an operational board with configurable stages such as:

- Backlog
- Ready
- In Progress
- Blocked
- Review
- Done

Cards should be persisted CRM records. External work systems such as Jira remain the source of truth for provider-specific issue state when connected.

### Sprints / rollout

Track timeboxed delivery without turning Customer Success into an engineering-only workflow.

Include:

- sprint / period
- goal
- planned work
- completed work
- progress
- notes

### Risks and decisions

- risk
- impact
- owner
- mitigation
- escalation status
- next decision
- decision date
- dependency

### Engineering escalation

Require an evidence packet before escalation:

- title
- severity
- affected users / scope
- environment / version
- first observed
- last observed
- actual behavior
- expected behavior
- reproducibility
- reproduction steps
- logs / screenshots / query IDs / examples
- troubleshooting completed
- workaround
- business impact
- specific Engineering ask
- Jira key / URL
- status

### ROI / value

- metric
- hypothesis
- baseline
- target
- definition
- source system
- owner
- cadence
- calculation
- current value
- realized value
- approval state

Never invent realized value. A target is not an achieved result.

### Adoption

- metric
- value
- period
- source
- owner

### Meetings

- title
- type
- date
- attendees
- objective
- notes
- decisions
- commitments

### Renewal / commercial context

- renewal date
- term
- ARR / commercial value if supplied
- value realized
- renewal plan
- expansion signals only when explicitly recorded
- notes

### Documents

Track source documents and ingestion status.

### Knowledge base

Provide a workspace-level implementation / Customer Success KB independent of the currently selected customer.

Useful categories include:

- onboarding
- implementation patterns
- escalation practice
- data quality
- value measurement
- integrations
- customer communication
- retrospectives

A reusable lesson should be distinguishable from raw account history.

## Customer ingestion

The customer view should support:

- PDF
- CSV
- multiple PDFs / CSVs
- ZIP containing supported files

Use a review-before-commit flow:

```
upload -> parse -> normalize -> preview -> select -> create
```

Never silently create customer records from an upload.

### Import rules

- Prefer text-native PDFs.
- Use deterministic parsing when possible.
- Label uncertain extracted fields for review.
- Preserve the source filename.
- Support common CSV aliases.
- Cap batch size.
- Reject unsupported files safely.
- Do not retain source binaries unless the product explicitly requires it.

### Default sample data

For demos, include:

- one clearly marked golden-example customer
- multiple clearly marked synthetic sample customers
- reset-to-default functionality
- clear-all-except-golden functionality
- explicit override before deleting the golden example
- replace-golden functionality

Synthetic data must stay visibly synthetic.

## Access and persistence

Support two modes when appropriate.

### Guest mode

- page loads without login
- creates a session-scoped or otherwise temporary workspace
- safe synthetic defaults available immediately
- no privileged third-party actions
- no claim of durable retention

### Authenticated mode

- durable workspace retention
- privileged integrations available according to scope
- account identity enforced
- audit history attached to actor identity
- optional workspace / tenant isolation

Explain the retention difference in the UI.

## AI-assisted natural-language operations

Provide a Live Prompt surface when requested.

The operator can describe a change in normal language. The system must:

1. Load the currently selected customer's structured CRM state.
2. Optionally obtain public research context.
3. Produce a proposed minimal change plan.
4. Show the exact records and fields to be created or changed.
5. Wait for explicit approval.
6. Recheck record versions before applying.
7. Write the approved changes.
8. Store an audit record of the plan and result.

Use optimistic concurrency for updates. If a target record changed after interpretation, fail the apply step and require regeneration.

### Plan shape

Prefer a constrained plan such as:

```json
{
  "summary": "...",
  "confidence": "...",
  "operations": [
    {
      "action": "update",
      "record_id": "...",
      "type": "risk",
      "changes": {},
      "reason": "...",
      "provenance": "internal_record",
      "expected_updated_at": "..."
    }
  ],
  "gaps": [],
  "notes": []
}
```

Do not allow the model to invent arbitrary server operations.

## Exa-backed research

Exa or another research provider is optional supporting context.

### Privacy boundary

Before external research:

1. Decide whether external research is actually necessary.
2. Generate a de-identified search query.
3. Remove customer names, people, emails, internal dates, private metrics, account IDs, confidential implementation details, and secrets.
4. Send only the scrubbed query to the research provider.
5. Treat returned material as untrusted external evidence.
6. Keep citations when available.
7. Never let research overwrite CRM facts automatically.

Recommended operator modes:

- **Auto** — research only when the prompt requests public verification or current external context.
- **On** — always add safe external context.
- **Off** — CRM context only.

## Live assistant

When requested, provide a consent-gated live assistant for recorded or live calls.

Requirements:

- explicit participant consent
- clear active/inactive state
- selected-customer context
- chunked audio capture
- resilient transcription
- deduplication of overlapping transcript chunks
- bounded transcript context
- suggestions shown as suggestions, not spoken automatically
- no automatic writes to CRM
- operator can ask direct questions
- stop capture when leaving the view or switching customer
- do not retain audio unless explicitly required
- enforce server-side chunk size and content-type limits

The assistant should help the operator respond; it should not impersonate the operator.

## Meeting preparation

Meeting preparation should synthesize stored facts only.

Include:

- customer
- implementation position
- committed timeline
- current dependencies
- value target
- RACI coverage
- stakeholder list
- risks
- open Engineering issues
- next milestones
- adoption
- KPI baseline / current value
- open decisions
- explicit questions

Provide:

- copy
- print / PDF
- add stakeholder
- edit stakeholder

If the brief shows a record, make it possible to get back to that record quickly.

## Provider integrations through MCP/control plane

### Jira

The app may store mapping information and Jira links, but credentials stay server-side.

Support:

- status / site discovery
- issue creation from an engineering-ready packet
- deployment work-item creation
- returned key and URL
- explicit project key and issue type
- no guessed issue-type names

### Confluence

Keep the local KB functional even when Confluence is unavailable.

Support:

- read connection status
- configure space mapping
- publish new page
- update an existing linked page
- preserve local source of truth
- do not pretend sync succeeded

### Other providers

Use the same adapter pattern for CRM, email, calendar, support, data warehouse, or product telemetry.

## Security requirements

- same-origin protection for mutations
- CSRF-safe authentication flow
- secure cookies
- CSP
- clickjacking defense
- referrer restriction
- no provider secrets in browser bundles
- no secrets in logs
- input length limits
- upload type / size limits
- server-side authorization for every privileged operation
- workspace / tenant filter on every data query
- audit privileged actions
- no cross-account object access by ID
- sanitize outbound URLs
- explicit consent for audio
- scrub public research queries
- separate read capability from write capability

Do not claim security merely because credentials are hidden from the HTML. Verify the server boundary.

## UI requirements

The CRM must be usable, not merely feature-rich.

Required:

- responsive desktop / tablet / mobile shell
- main content column allowed to shrink
- long content wraps
- no viewport blowout
- mobile navigation remains reachable
- accessible focus states
- modal keyboard escape
- readable light / dark themes when requested
- data-dense tables remain scrollable rather than destroying layout
- cards use adaptive grids
- clear guest vs signed-in state
- clearly marked synthetic sample data
- obvious destructive-action safeguards

## Suggested navigation

Adapt to the company, but a mature implementation can include:

**Operate**
- Customers
- Command Center
- Live Prompt
- Live Assist
- Implementation
- Deployment
- Risks

**Deliver**
- Handoff
- RACI
- Rollout / Sprints
- Engineering Issues
- Issue Triage

**Value**
- ROI
- Adoption
- Meetings
- Renewal

**Knowledge**
- Team KB
- Documents

**Admin**
- Accounts / dataset administration
- integration settings when appropriate

## Provenance model

Every important CRM record should carry one of a small set of provenance values.

Recommended:

- customer_provided
- internal_record
- internal_proposal
- derived_calculation
- ai_suggestion
- template
- scenario
- synthetic_sample

Render provenance visibly enough that a user can tell what is fact, proposal, model output, or example data.

## Tailoring the CRM to a company

Do not just recolor the UI.

Tailor:

- terminology
- implementation stages
- customer personas
- product modules
- integration types
- value metrics
- adoption metrics
- support / escalation flow
- stakeholder roles
- meeting cadence
- renewal model
- company visual relationships
- sample scenarios
- KB starter content

Do not invent private processes. When a process is not public or supplied, label it as a proposed operating model.

## Onboarding design

The system should help a new implementation or Customer Success operator ramp.

Build a 30/60/90 onboarding guide around the actual operating surfaces.

### First 30 days

- access
- product and systems
- completed implementation examples
- handoff
- kickoff
- weekly review
- escalation
- executive review
- lifecycle map
- source-of-truth rules

### Days 31-60

- co-own meetings
- maintain milestones, RACI, risks, decisions
- work with external delivery tools through the CRM
- establish measurement baselines
- generate and verify meeting briefs
- contribute one reusable KB lesson

### Days 61-90

- own implementation rhythm
- escalate early
- keep stakeholders aligned
- measure adoption and realized value
- improve one repeatable process
- leave the operating path easier for the next person

This is an important success criterion: the CRM should reduce dependence on tribal knowledge.

## Validation

Do not claim completion after source generation alone.

### Source validation

- syntax checks
- dependency checks
- secret scanning
- public-skill / public-artifact sanitization if relevant
- no forbidden third-party builder artifacts when portability matters

### Deployment validation

- dry run
- deploy
- domain / route
- health endpoint
- static asset availability

### Live smoke tests

Exercise at least:

- guest page load
- authenticated path when configured
- default customer count
- golden example
- customer import
- customer persistence
- clear-except-golden
- reset defaults
- add stakeholder
- edit stakeholder
- meeting brief includes stakeholder
- record create/update/archive
- RACI
- risk
- KPI
- integration status
- AI plan generation
- approval-gated AI apply
- concurrency conflict
- public research scrub
- provider bridge authorization
- security headers
- responsive asset delivery

For destructive smoke tests, use an isolated test workspace and restore defaults afterward.

## Completion criteria

A run is complete only when:

- the CRM is tailored to the company and use case
- the app is usable without login when guest mode was requested
- durable retention is available behind sign-in when requested
- customer import works
- sample data works
- stakeholder management works from meeting prep
- operating records persist
- provenance is visible
- AI plans require approval
- external research is safely de-identified
- credentials remain behind the control plane
- provider actions use least-privilege capabilities
- deployment succeeds
- smoke tests pass
- the final report distinguishes what is working, optional, unavailable, synthetic, and proposed

## Completion report

Return a compact implementation report containing:

- live route
- repository / commit
- deployment target
- guest/auth behavior
- persistence model
- default sample model
- customer ingestion formats
- stakeholder behavior
- AI / Exa mode
- MCP/control-plane capability use
- provider bridges
- credential boundary
- audit behavior
- validation performed
- live smoke-test result
- any remaining owner-only setup

## Final guardrail

The purpose of this skill is not to generate the largest possible CRM.

The purpose is to create the smallest system that fully supports the company's real post-sales operating needs, makes customer value visible, makes ownership explicit, reduces surprises, keeps sensitive credentials centralized, and turns repeated implementation work into a reusable operating capability.
