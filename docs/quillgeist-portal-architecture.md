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


## ALT SaaS portal prototype

A non-production alternate portal prototype lives at `/portal-alt.html`. It exists to iterate the human SaaS layer without changing the public local-only distribution boundary. It demonstrates the intended subscription surface: intent/routing preview, usage and savings, device/runtime health, workflow reuse, provider policy, evidence, team controls, and billing/connectors roadmap. Any seeded values are explicitly labeled demo data and are not customer traction or live account state.

The production gate remains unchanged: do not reconnect the retired Clintware-hosted public runtime merely to make the prototype interactive. Production authenticated portal work must use an explicitly authorized tenant/runtime boundary.
