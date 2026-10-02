# Quillgeist Local CloudMist

Local CloudMist is Quillgeist's owner-controlled local compute pool. It turns machines already available, such as MEMORIA and DRIZNET, into trackable execution nodes for deterministic automation, builds, local-model work, indexing, browser checks, and other reviewed Quillgeist tasks.

The design goal is low-cost local capacity with cloud-like routing semantics, not a requirement for ChatGPT Work or hosted compute.

## Core rule

Work is optional.

LOCAL REQUEST -> QUILGEIST -> CLOUDMIST ROUTER -> HEALTHY LOCAL NODE -> REVIEWED TASK -> RESULT EVIDENCE

Hosted tools remain escalation paths for fresh authority, provider-native actions, or capabilities that a local node cannot satisfy.

## Node contract

Every enrolled node has a durable node id and advertises its label/hostname, CPU/RAM/GPU inventory, reviewed task capabilities, resource classes, worker cap, local-AI availability, health, heartbeat, roles, and optional queue/load hints. No inbound port is required; nodes keep the existing outbound Quillgeist/Control Plane connection.

## Routing and failover

A job declares its required capability and resource class. CloudMist rejects stale/unhealthy nodes and nodes missing the capability, respects affinity, prefers lower queue/load, and returns an ordered candidate list. Failover occurs only after delivery/execution evidence says the selected node cannot continue. Queued, delivered, executing, passed, and verified remain distinct states, and duplicate execution protections remain mandatory.

MEMORIA is expected to be the heavier AI/data/build node when healthy. DRIZNET is expected to be a secondary general/build/browser node when healthy. These are affinities rather than hard-coded identities.

## Onboarding wizard

After Quillgeist is installed on a new machine:

    run cloud-mist-onboard Label=NODE-NAME Roles=general,build,ai

The wizard verifies the maintained runtime, inventories CPU/RAM/GPU/local AI/tasks, chooses or accepts a worker cap, creates the durable node identity/config, writes a heartbeat, captures worker-pool and local-AI evidence when available, and writes an onboarding report. It does not expose reusable provider credentials or create an arbitrary remote shell.

## Product scaling

Adding another owner-controlled machine is an enrollment problem, not an architecture rewrite. Future pool metadata can include affinity groups, storage locality, cost/power hints, drain state, replicated model endpoints, cache locality, and scheduled failover tests.

## CRM factory relationship

The shared CRM factory is a CloudMist workload:

JOB SCAN -> TENANT INGEST -> LOCAL BUILD/ENRICHMENT -> LOCAL CHECK -> ONE SHARED STATIC DEPLOYMENT

Daily CRM creation must not create one Cloudflare Worker, Pages project, repository, or DNS record per job. High-value roles can be promoted to richer tenant data or, only when justified, a bespoke ASTRO build.
