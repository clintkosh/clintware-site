# Mind to Form

Mind to Form is an intent-to-physical-product compiler with a mandatory Definition-of-Done agreement gate.

## Current public alpha

The browser alpha supports adaptive vetting of the initial idea, an explicit Definition-of-Done approval step, a structured first engineering draft, local parametric preview, and local export. The public application does not contain a Clintware Control Plane credential.

## Internal orchestration

Connected actions use the private Clintware Flow runtime behind the authenticated Control Plane.

Seeded workflow:

```
idea received
→ Definition of Done
→ explicit approval
→ approved event
→ future scoped engineering / validation / RFQ / purchasing adapters
```

The workflow is named `definition-of-done` under the `mindtoform` product scope.

Provider credentials stay server-side. An external MCP client receives only its revocable Control Plane client key and must be allowlisted for the `mindtoform` product.

The current public browser gate remains authoritative for the alpha. Flow is the orchestration layer for connected capabilities as they are added.

## Local validation

```bash
node --check src/index.js
npx wrangler deploy --dry-run
```

Canonical product domain: `https://mindtoform.clintware.com/`.
