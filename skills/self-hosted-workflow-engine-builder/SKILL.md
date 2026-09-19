---
name: self-hosted-workflow-engine-builder
description: Build an independent, self-hosted workflow automation engine with triggers, typed actions, branching, approvals, retries, schedules, encrypted credentials, execution history, and optional MCP or API adapters. Use when a team wants n8n-style orchestration without depending on a hosted workflow vendor.
license: MIT
version: 1.0.0
---

# Self-Hosted Workflow Engine Builder

Build a small, independent workflow engine that can grow into an n8n-style automation platform without copying another product's source code, branding, hosted service, or private infrastructure.

The goal is not to recreate every connector or visual editor on day one. The goal is to own the execution model and add capabilities only when real workflows require them.

## Core outcome

Transform:

```
trigger
+ workflow definition
+ scoped credentials
+ deterministic actions
+ optional AI reasoning
+ approval gates
```

into:

```
validated run
→ step execution
→ retries / waits / branches
→ human approval where required
→ durable state
→ auditable result
```

## Publication and ownership boundary

This skill is intentionally infrastructure-neutral.

A generated implementation must:

- use infrastructure, domains, repositories, accounts, and credentials owned or explicitly supplied by the person running it;
- never depend on the skill author's private servers, MCP endpoints, accounts, tokens, API keys, repositories, or identity providers;
- never contain a hidden callback, telemetry endpoint, maintenance key, default administrator credential, or author-controlled backdoor;
- never copy a real secret into source, examples, logs, generated documentation, or exported workflow definitions;
- use placeholders such as `YOUR_DOMAIN`, `YOUR_DATABASE_URL`, `YOUR_ENCRYPTION_KEY`, and `YOUR_PROVIDER_TOKEN` in reusable examples;
- keep secrets server-side and encrypted at rest;
- make all outbound network destinations explicit and reviewable;
- let the operator revoke each connector independently.

If a source project contains organization-specific infrastructure, sanitize it before publication. Architecture may be generalized. Private identifiers and access paths must not be.

## Independent implementation rule

Build from general workflow-engine concepts and documented public protocols. Do not copy another workflow product's proprietary or source-available code into a differently licensed project unless its license clearly permits that use.

A functional comparison such as "n8n-style orchestration" describes the category, not permission to duplicate implementation details.

## Recommended architecture

Start with six components:

```
API / MCP / UI
      │
      ▼
Workflow Registry
      │
      ▼
Execution Engine ─── Approval Queue
      │
      ├── Connector Registry
      ├── Scheduler / Webhooks
      ├── Retry + Delay Queue
      └── Event / Run Log
             │
             ▼
        Postgres / SQLite
```

For a single-node prototype, SQLite plus one worker process is enough.

For an always-on multi-worker deployment, prefer PostgreSQL plus a queue such as Redis, Postgres SKIP LOCKED, or a managed queue.

## Minimal data model

### Workflow

```json
{
  "id": "customer-renewal-watch",
  "version": 1,
  "enabled": true,
  "trigger": {
    "type": "schedule",
    "cron": "0 8 * * *"
  },
  "steps": [
    {
      "id": "load_accounts",
      "type": "action",
      "action": "crm.list_accounts"
    },
    {
      "id": "find_risk",
      "type": "condition",
      "expression": "input.days_to_renewal <= 90"
    },
    {
      "id": "approval",
      "type": "approval",
      "message": "Review customer-facing action"
    },
    {
      "id": "create_task",
      "type": "action",
      "action": "tasks.create"
    }
  ]
}
```

### Run

Store at minimum:

- run ID;
- workflow ID and version;
- trigger metadata;
- start/end timestamps;
- current step;
- status;
- retry count;
- redacted input snapshot;
- per-step result metadata;
- approval state;
- terminal error class.

### Credential reference

Workflow definitions should contain a reference:

```json
{
  "credential_ref": "crm-production"
}
```

They should never contain the credential value itself.

## Execution lifecycle

Use this state machine:

```
QUEUED
  ↓
RUNNING
  ├─→ WAITING
  ├─→ APPROVAL_REQUIRED
  ├─→ RETRY_SCHEDULED
  ├─→ FAILED
  └─→ SUCCEEDED
```

A run must be resumable from durable state. Do not require replaying every successful side effect after a restart.

## Step contract

Every executable action should implement the same basic interface:

```ts
type ActionContext = {
  runId: string
  workflowId: string
  stepId: string
  input: unknown
  credentials: CredentialResolver
  signal: AbortSignal
}

type ActionResult = {
  ok: boolean
  output?: unknown
  retryable?: boolean
  errorClass?: string
}
```

Keep provider-specific code behind action adapters.

The engine should understand `action: "email.send"`; the email adapter should understand the provider.

## Connector registry

Connectors should declare:

- action names;
- input schema;
- output schema;
- required credential type;
- whether the action is read-only or mutating;
- idempotency behavior;
- retry policy;
- network destinations;
- rate-limit hints.

Example:

```ts
registerAction({
  name: "http.request",
  mutating: false,
  credentialType: "optional",
  inputSchema: HttpRequestSchema,
  execute: httpRequestAction
})
```

Do not allow arbitrary shell execution as a default connector.

## Credential broker

Keep credential handling separate from workflow logic.

Required rules:

1. Store encrypted credential material server-side.
2. Derive or load the encryption key from runtime secret storage, never the database itself.
3. Resolve credentials only for the action currently executing.
4. Give each connector the minimum scope it requires.
5. Never return credential values through workflow APIs, MCP responses, logs, or browser state.
6. Support rotation and revocation without editing every workflow.
7. Record which credential reference was used, but not the secret value.

## Triggers

Implement in this order:

1. manual;
2. webhook;
3. schedule / cron;
4. event bus;
5. provider-specific push event;
6. polling only when push events are unavailable.

Normalize every trigger into one internal run-envelope shape.

## Conditions and branching

Do not use `eval`.

Use a small expression language, JSON Logic, CEL, or a bounded operator set such as:

- equals / not equals;
- greater / less than;
- contains;
- exists;
- AND / OR / NOT.

Keep branch decisions deterministic and log the evaluated inputs.

## Human approval

Approval should be a first-class state, not a fake delay.

An approval record should contain:

- run ID;
- step ID;
- reason;
- requested action;
- redacted preview;
- expiration;
- approver identity where authentication exists;
- approve / reject decision;
- timestamp.

Destructive, financial, externally visible, or high-impact actions can require approval by policy even when the workflow author omitted an approval node.

## Retries and idempotency

Classify errors:

- validation failure: do not retry;
- authentication failure: pause and request credential repair;
- rate limit: retry after provider delay;
- transient network/server failure: exponential backoff;
- permanent provider rejection: fail;
- unknown side-effect state: require reconciliation before replay.

Every mutating connector should accept or derive an idempotency key where the provider supports one.

A useful key is:

```
workflow_id + run_id + step_id + attempt_group
```

## Scheduling and waiting

Persist wake-up time before returning control.

Never rely on an in-memory timer for a wait that must survive process restart.

## Webhook safety

For inbound webhooks:

- verify signatures when the provider supports them;
- reject oversized bodies;
- rate limit;
- timestamp-check signed requests;
- deduplicate provider event IDs;
- store only necessary event data;
- return quickly and queue longer work.

## Outbound HTTP safety

A generic HTTP action can become an SSRF primitive.

Default protections should include:

- deny link-local and private network ranges unless explicitly enabled;
- deny cloud metadata endpoints;
- resolve DNS carefully;
- cap redirects;
- cap response size;
- set timeouts;
- allow destination allowlists for sensitive deployments.

## AI steps

Treat AI as one action type, not as the workflow engine itself.

Good AI uses:

- classification where probabilistic output is acceptable;
- synthesis;
- extraction from variable text;
- drafting;
- tool planning with bounded permissions.

Prefer deterministic code for:

- date math;
- thresholds;
- routing tables;
- schema validation;
- arithmetic;
- deduplication;
- permissions;
- retry logic.

Persist the model/provider/version and a privacy-safe usage record when AI is used.

## Optional MCP adapter

MCP can be one interface to the engine, but it is not required.

If implemented:

- authenticate every client;
- scope each client to explicit workflows, actions, or projects;
- enforce scope server-side on every tool call;
- return capabilities, not underlying provider credentials;
- keep connector secrets behind the server boundary;
- make client credentials revocable;
- never treat possession of a public skill file as authorization.

A reusable skill or README must never contain a live MCP credential.

## Minimal API

A practical first version can expose:

```
POST /workflows
GET  /workflows/:id
POST /workflows/:id/run
GET  /runs/:id
POST /runs/:id/approve
POST /runs/:id/reject
POST /webhooks/:workflow/:trigger
```

Add editing, schedules, credentials, and connector management as the product grows.

## Reference execution loop

```ts
async function executeRun(run) {
  while (run.nextStep) {
    const step = await loadStep(run)

    if (step.type === "approval") {
      await persistApprovalRequired(run, step)
      return
    }

    if (step.type === "condition") {
      run.nextStep = evaluateCondition(step, run.context)
      await saveRun(run)
      continue
    }

    const action = registry.get(step.action)
    const input = resolveBindings(step.input, run.context)
    const result = await action.execute(makeContext(run, step, input))

    await persistStepResult(run, step, redact(result))

    if (!result.ok) {
      if (result.retryable) {
        await scheduleRetry(run, step)
        return
      }
      await failRun(run, result.errorClass)
      return
    }

    run.context.steps[step.id] = result.output
    run.nextStep = step.next
    await saveRun(run)
  }

  await completeRun(run)
}
```

## Build order

### Phase 1: useful core

Implement:

- workflow JSON validation;
- manual runs;
- action registry;
- durable run history;
- HTTP/webhook action;
- schedule trigger;
- retry/backoff;
- credential references;
- basic approval gate.

### Phase 2: operational reliability

Add:

- worker queue;
- idempotency;
- concurrency controls;
- dead-letter handling;
- rate-limit management;
- replay/reconciliation tools;
- metrics and tracing;
- encrypted credential management.

### Phase 3: product surface

Add only after the engine works:

- visual workflow editor;
- connector catalog;
- workflow templates;
- run debugger;
- version diff;
- reusable subflows.

The visual editor should serialize to the same workflow definition the API uses. The UI must not become the source of truth.

## Definition of done

A first production-capable version is complete when it can:

- persist and validate workflows;
- accept at least manual, webhook, and scheduled triggers;
- execute typed connector actions;
- pause and resume for approval;
- survive process restarts;
- retry transient failures safely;
- prevent duplicate side effects;
- keep credentials out of workflow documents and logs;
- show an auditable run history;
- restrict connector/network access by policy;
- export workflows without secrets;
- run without depending on infrastructure controlled by the skill author.

## Sanitization check before sharing

Before publishing a reusable workflow-engine skill, template, or repository, search it for:

- private domains and internal hostnames;
- personal or organization email addresses not intended for publication;
- access tokens and token prefixes;
- API keys;
- cookies and session IDs;
- OAuth client secrets;
- private repository identifiers;
- cloud account or tenant IDs;
- private IP addresses;
- real credential names that reveal private infrastructure;
- hard-coded callback URLs controlled by the author.

Replace them with neutral placeholders and verify the published artifact works using infrastructure supplied by the new operator.
