# Quillgeist Web plugin bundle

This is Clintware's own live-web plugin surface: automation tools + curated skill + safety rules + OAuth install path.

- MCP: https://mcp.clintware.com/mcp
- OAuth issuer: https://mcp.clintware.com
- Local executor: Quillgeist Lite / qq
- Browser: persistent local Playwright profile
- Capabilities: live web search, public-page reading, governed multi-step automation, durable job/status evidence

A compatible MCP client connects to the MCP URL and follows OAuth discovery. Clintware already uses PKCE and central identity at auth.clintware.com, so the user authorizes in the browser rather than pasting a Control Plane API key.

The current alpha policy permits the Clintware owner/admin identity. Broad third-party distribution requires separate account/device isolation review rather than weakening this boundary.

This implementation does not wrap TinyFish or require a TinyFish credential. Search and browsing run through Clintware-owned code and the paired qq device. Provider/session credentials remain in their native browser or Clintware stores.


## Local-first execution skill

For ordinary ChatGPT work, use the companion `quillgeist-local-offload` skill to decide whether deterministic work, local services, local inference, builds, tests, or Windows execution should be handed to qq before consuming remote model time. The skill is latency-aware: local is preferred only when it meets the same quality bar and is competitive with the available authorized route.
