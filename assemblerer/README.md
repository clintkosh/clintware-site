# Assemblerer MVP

Assemblerer is Clintware's company-control-plane MVP. It is intentionally not a generic AI cofounder chat experience.

## Product wedge

The first release proves five behaviors:

1. A founder brief becomes a structured operating system, not a conversational transcript.
2. Every task receives an explicit authority ceiling.
3. Work is routed local-first or cloud-first based on sensitivity, complexity, and founder preference.
4. A task is not "done" until it has a defined proof artifact.
5. The MVP can execute only reversible local simulation. External execution stays review-gated until adapters are added.

## MVP architecture

- Static browser application
- No API keys
- No third-party model required
- `localStorage` persistence with graceful fallback
- Deterministic company ID
- Generated functional agent roster
- Prioritized execution queue
- Founder authority contract
- Local-vs-cloud route selection
- Portable Company Manifest JSON export (`clintware.assemblerer/company-manifest@0.1`)
- Safe local action simulator + proof trail

## Planned adapters

The browser MVP is the control plane. Later adapters can connect:

- AgentBridge / PowerShell
- Python, JavaScript, C/C++, React project runners
- MCP servers
- CanIRunLocalAI for machine-fit model selection
- Local inference runtimes
- Hosted frontier models
- GitHub
- CRM / Customer Success / sales systems
- Local scheduled tasks
- Cloudflare Workers / SaaS control hub

## QA contract

The release must pass:

- HTML parse / required-control checks
- JavaScript syntax validation
- Deterministic logic tests for ID, focus classification, routing, roles, and queue generation
- Authority check proving the MVP cannot auto-run A0/A1 work
- No secret/API-key fields or hard-coded provider credentials
- Main Clintware production validator
- Deployment workflow verification of both the Clintware page and `assemblerer.clintware.com`
