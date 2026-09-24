---
name: quillgeist-web
description: Use Quillgeist Web when the user needs live web search, page reading, or bounded multi-step browser automation through the authenticated Clintware control plane and a paired qq browser.
---

# Quillgeist Web

Quillgeist Web combines semantic MCP tools, curated operating instructions, OAuth/PKCE connection, durable job evidence, and the persistent Playwright browser managed by qq.

## Connection

Use https://mcp.clintware.com/mcp. Compatible clients should follow OAuth discovery and browser authorization. Do not ask the user to paste a Clintware Control Plane API key. The current alpha OAuth policy is owner/admin scoped; do not describe it as public multi-user remote control.

## Tool selection

Use `clintware_quillgeist_web_search` for discovery. It queues live browser search without a separate search-provider API key.

Use `clintware_quillgeist_web_read` when the URL is known and the task needs page text, headings, or links.

Use `clintware_quillgeist_browser_run` only for interaction or multi-step browser work.

Each tool returns a durable job ID. Call `clintware_quillgeist_lite_job` until the job reaches `passed` or `failed`. Never report a queued job as completed.

## Supported steps

Up to 100 reviewed steps: `goto/open/navigate`, `fill`, `type`, `click`, `select`, `check`, `uncheck`, `press`, `wait`, `wait_for`, `back`, `reload`, `inspect`, `extract`, `screenshot`, `search`, and `read`.

Do not invent arbitrary JavaScript or remote shell steps.

## Safety

Prefer search/read over interaction when sufficient.

Remote calls keep private-network access disabled. Do not target localhost, RFC1918/private networks, link-local addresses, metadata endpoints, router/admin interfaces, or another non-public network target.

Never put passwords, passcodes, MFA/OTP values, payment-card numbers, API keys, OAuth tokens, private keys, or similar credentials in a browser plan. The local agent rejects credential-like fields. If authentication is required, the user uses `web login <url>` locally; the browser session persists without sending credentials through MCP.

Set `approved=true` only when the user explicitly authorized the consequential action in the current request. Purchases, payments, transfers, destructive changes, publishing, authorization, signing, bookings, or user-management actions otherwise stop before the final consequential control.

Do not bypass CAPTCHA, anti-bot controls, access restrictions, paywalls, or authorization boundaries. Downloads are disabled; upload/download needs a separately reviewed capability.

## Local qq commands

`web setup`, `web search <query>`, `web read <url>`, `web login <url>`, `web inspect <url>`, and `web run <json>`.

The local-only qq shell escape remains separate and is never exposed through this plugin.
