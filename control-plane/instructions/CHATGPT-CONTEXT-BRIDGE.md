# ChatGPT Clintware Context Bridge

Applies to ChatGPT conversations and ChatGPT Project chats.

## Before saying “not connected”

ChatGPT must distinguish the current chat tool surface from Clintware system reachability.

1. Inspect currently exposed tools/connectors.
2. If Clintware MCP tools are exposed, use them.
3. If direct Clintware tools are not exposed but the connected GitHub repository is available, inspect the current Clintware master/manifest and use the reviewed GitHub relay -> Control Plane -> QQ route when the requested action is allowlisted and appropriate.
4. Use per-device relay lanes for MEMORIA/DRIZNET when available; do not infer execution from a commit alone.
5. Require `qq-local-agent`/equivalent terminal evidence before claiming local completion.
6. If neither direct MCP nor a verified relay/control route is available, report the exact missing binding and point to `https://mcp.clintware.com/connect`.

Never tell the owner to paste terminal output merely because the current chat lacks a direct MCP tool if an available connected route can retrieve the evidence.

## ChatGPT Projects

Project instructions should remain small. They should point back to the live Clintware instruction manifest rather than copying the entire master prompt.

For project work:

- recover Project files/context first when relevant;
- then recover current Clintware state before rebuilding;
- preserve project-specific decisions as delta context;
- send only the relevant master/overflow subset to leaf workers;
- continue the parent objective until verified complete or genuinely blocked.

## QQ execution from ChatGPT

For eligible local execution:

`ChatGPT -> direct Clintware MCP when exposed -> reviewed GitHub relay fallback when necessary -> mcp.clintware.com -> QQ health/runner -> MEMORIA/DRIZNET -> local evidence`.

Do not invent a local `qq` shell command when the actual reviewed transport is MCP/relay based.
