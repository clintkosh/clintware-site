# ChatGPT to qq fallback dispatch

When a ChatGPT Work session has the GitHub connector but no installed Clintware MCP plugin, use the existing `Dispatch Quillgeist Lite Task` workflow as a scoped relay:

1. Update `quillgeist-lite/dispatch/request.json` on `main` with a unique `request_id`, an ID from the relay allowlist, validated string arguments, and a bounded objective.
2. The path-scoped push triggers `.github/workflows/quillgeist-lite-dispatch.yml`. The Action uses its server-side `CONTROL_PLANE_MCP_TOKEN` secret to queue the job at Clintware. Never put credentials in the request.
3. Read the workflow's job log for `JOB_ID`, `delivery.delivered`, `FINAL_STATUS`, and output. A queued or delivered job is not a passed job.
4. For a failed job, inspect the log and dispatch a different allowlisted task only when the local runtime can execute it.

Verified 2026-09-26: request `chatgpt-qq-bridge-check-20260926-0036` queued `clintware-doctor` as job `d151b9c1-a889-4dba-b6fa-15a45b96e7fb`; `delivery.delivered=1`; final status failed because MEMORIA lacked `%LOCALAPPDATA%\Clintware\QuillgeistLite\tasks.json`. Restore the local packaged task registry before relying on task execution. Do not report this bridge as a native ChatGPT MCP connection.

For native tools in ChatGPT Work, separately install the personal OAuth MCP connection at `https://mcp.clintware.com/mcp` when that account exposes plugin creation.
