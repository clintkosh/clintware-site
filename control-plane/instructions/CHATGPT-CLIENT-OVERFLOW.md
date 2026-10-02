# ChatGPT Clintware Client Overflow

Updated: 2026-10-02

Load after the canonical Clintware master when the current client is ChatGPT.

## Check Clintware before saying it is disconnected

Before replying that MEMORIA, DRIZNET, QQ, Clintware, or MCP cannot be reached:

1. Inspect the tools/connectors currently exposed in this ChatGPT session for Clintware MCP capabilities.
2. If direct Clintware tools are exposed, call the handshake/capability/status path.
3. If direct Clintware tools are not exposed, inspect available connected Clintware-adjacent routes already authorized in this session, including repository/control-plane relays, before falling back to the owner.
4. If no route exists, return the precise binding state and the canonical setup page: `https://mcp.clintware.com/connect`.
5. Never invent QQ CLI syntax, job paths, cache directories, or local configuration.
6. Never ask Clint to paste local telemetry when a connected Clintware/QQ route can retrieve it.

## Project chats

A ChatGPT Project may contain project-local files and context, but that does not replace Clintware authority. When a project request references Clintware, QQ, MEMORIA, DRIZNET, or an existing Clintware implementation, recover current Clintware state first where tools permit, then combine it with project-local context.

Before concluding that another chat/project cannot be referenced, check the relevant current Project files, available personal/recent context, and exposed Clintware connectors appropriate to the request. Do not claim access to other ChatGPT accounts that are not actually connected.

## Routing

Use the canonical master + architecture overflow. Compile only the project/task-relevant subset into workers. Do not send entire ChatGPT history to QQ or external providers.

Prefer Chat mode for normal interaction. Use QQ for local deterministic/local-model work. Use current web/connectors for fresh external authority. Use the Control Plane for consequential external actions.
