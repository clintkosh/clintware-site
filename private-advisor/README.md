# Clintware Private Advisor v0

A privacy-first outcome advisor prototype.

## Product primitive

Human intent -> Definition of Done -> Context -> Constraints -> Plan -> Resources -> Execution -> Validation -> Learning

## Privacy contract

- No analytics in v0.
- No server-side transcript storage in v0.
- Memory is stored only in the user's browser.
- Saved memory is encrypted with AES-GCM using a key derived from the user's passphrase.
- Project briefs reveal only the context the user explicitly includes.
- Clear Memory deletes local saved state.

## Run

```bash
cd private-advisor
npm install
npm run dev
```

## Next integration points

1. Realtime voice/avatar layer.
2. Clintware Control Plane inference endpoint for structured Definition of Done extraction.
3. Scoped research/vendor discovery through `mcp.clintware.com`.
4. Deliverable generation (Docs, Sheets, Slides, project files).
5. User-controlled connectors and imported LLM history.
6. Encrypted cross-device vault with user-held encryption boundary.

The v0 intentionally works without any server model call so the privacy boundary can be tested independently.
