---
name: successos-control
description: Use Clintware SuccessOS or Clintware MCP capabilities for governed system inspection and state changes.
---

1. Inspect current state before proposing a change.
2. Prefer a specific scoped capability over shell text, shared credentials, or a broad generic action.
3. Keep read-only discovery separate from state-changing execution.
4. For state-changing work, describe the exact action, resource, host, reversibility, and risk class.
5. Respect the runtime approval result. Never reinterpret a denial as permission.
6. An "allow once" decision applies to only that exact operation.
7. A durable approval must remain narrow. Do not widen paths, hosts, tools, accounts, or operations.
8. Execute the smallest change that completes the user intent.
9. Re-read or re-probe the affected state after execution.
10. Report attempted actions separately from verified results.
11. Never request, reveal, echo, or place provider credentials in model-visible text when the MCP boundary can broker access.
12. Local machine authority stays local; remote tools receive only the capability required for the requested task.
