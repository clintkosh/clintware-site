# Quillgeist portal / control-plane architecture

Decision date: 2026-09-30

## Decision

Use the **Quillgeist web portal as the human-facing SaaS product** and use MCP/API as the machine-facing capability and orchestration layer beneath it.

Do not treat raw MCP alone as the customer product. MCP is the protocol boundary. The portal is where a person should understand value, usage, policy, savings, workflows, team state, billing, and evidence.

## Product layers

```text
AI clients / models
        |
     MCP / API
        |
Quillgeist service/control plane
        |
  -----------------------------
  |                           |
web portal                local runtime
human SaaS                execution authority
  |                           |
usage, savings            permissions
workflow library          local state
policy/admin              deterministic tasks
team controls             verification
billing                   rollback/evidence
```

### Local runtime

The runtime remains user-owned and locally authoritative for eligible execution. It owns local permission decisions, reviewed deterministic tasks, local private state where appropriate, execution and verification, and compact evidence returned to models.

### MCP/API

MCP/API is the model-independent interoperability layer. It exposes scoped capabilities, brokers approved requests, keeps credentials behind the control plane, returns bounded evidence, and supports multiple model providers without making one provider the system of record.

It is not the whole customer-facing SaaS surface.

### Web portal

The portal is the missing human product layer.

Public surface:
- product explanation;
- live privacy-safe progress journal;
- aggregate efficiency telemetry;
- clearly labeled internal proof vs. external traction.

Future authenticated Pro/Team surface:
- personal usage and savings;
- device/runtime health;
- provider routing and model usage;
- saved rules and workflow library;
- cross-device synchronization;
- team policies and audit;
- billing/subscription;
- external connectors.

## Progress journal

Canonical public surface: `https://quillgeist.clintware.com/progress.html`.

The journal has two evidence streams:
1. Automatic daily telemetry from the privacy-safe aggregate product metrics store.
2. Curated milestones for verified build/test/product events.

Evidence labels are mandatory:
- Measured
- Estimated
- Internal proof
- External traction

Aggregate usage must never be represented as unique users. Founder/internal activity must not be described as customer traction.

## YC implication

This architecture sharpens the company story:

> The local runtime owns execution and policy. MCP makes it model-independent. The portal turns the runtime into a recurring SaaS relationship with visible savings, workflow reuse, team governance, and accumulated operating context.

That is a clearer subscription business than selling an MCP endpoint by itself.

The immediate validation gate remains external:
- repeat outside users;
- cross-provider reuse;
- measurable reduction in repeated instruction/context;
- paid conversion or strong paid intent.

Internal efficiency evidence supports the technical claim but does not replace external traction.


## Browser-local SaaS workspace

Canonical browser workspace: `https://quillgeist.clintware.com/app`.

The public workspace is a separate human SaaS surface while preserving the local-only distribution boundary. It stores configuration in the browser and connects directly from that browser to an explicitly selected Quillgeist local/self-host gateway.

Current working behavior includes:
- live model discovery through the local OpenAI-compatible gateway;
- independently selectable primary/synthesis model;
- independently selectable model per sub-search branch;
- dependency-free sub-search fan-out with `Promise.all`;
- bounded branch outputs joined into final synthesis;
- browser-local gateway URL/key/policy persistence;
- local execution ledger and timing/model-use evidence;
- local gateway CORS/private-network support for the canonical Quillgeist domains;
- deterministic routing preview and self-host `/api/v1/route` capability for policy compilation.

The public Clintware distribution host does not expose account pairing, shared execution, `/api/v1/compact`, `/api/v1/route`, or MCP execution. Those remain retired there. A customer/user activates runtime capability only through a local or explicitly self-hosted boundary they control.

A future shared Pro/Team tenant may add authenticated server-authoritative state, but it must be deliberately enabled behind a verified tenant boundary rather than reusing the retired public runtime.

`/portal-alt.html` remains a non-production visual prototype only and is not the canonical SaaS workspace.
