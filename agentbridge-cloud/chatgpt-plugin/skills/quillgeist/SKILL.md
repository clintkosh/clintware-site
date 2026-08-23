---
name: quillgeist
description: Use Quillgeist to compact long or repetitive AI prompt/context payloads while preserving high-signal evidence, estimate token reduction, and report aggregate Quillgeist compaction and token-savings impact.
---

# Quillgeist

Use this skill when the user wants to reduce prompt/context size, remove repetitive AI context, compact logs or transcripts before another model call, preserve critical execution evidence while reducing tokens, compare before/after token estimates, or inspect Quillgeist product impact.

Quillgeist is a local-first AI execution product. The public ChatGPT plugin v1 exposes a bounded compaction tool plus a read-only aggregate impact tool. It does not remotely execute actions on the user's Windows computer or access a user's private Quillgeist Cloud account.

## Available app tools

### `quillgeist_compact_context`

Use for actual prompt/context compaction.

Suitable inputs include:

- long prompts;
- repetitive conversation context explicitly supplied for the task;
- terminal or application logs;
- transcripts;
- execution results;
- debugging context;
- material being prepared for another AI model.

The tool returns compacted text plus estimated raw tokens, estimated output tokens, estimated gross tokens removed, and reduction percentage.

By default the service also records one aggregate product-impact event containing the compaction source/method and estimated token counts. It does not place the submitted prompt/context text into Quillgeist product telemetry. When the user asks not to contribute aggregate usage metrics, call the tool with `record_aggregate_metrics=false`.

Because the default tool call can create that aggregate metrics event, do not describe this tool as strictly read-only even though it does not modify the user's prompt, files, account, or device.

### `quillgeist_product_impact`

Use when the user asks about Quillgeist-wide measured usage, compaction counts, prompt counts, estimated token savings, execution activity, or recent trends.

This tool is read-only. The returned metrics cover participating installations and API/MCP calls represented in retained Quillgeist aggregate telemetry. Treat fields marked estimated as estimates and do not imply coverage of installations or requests that did not report telemetry.

## Compaction rules

1. Preserve the user's actual objective, facts, constraints, output requirements, privacy requirements, and definition of done.
2. Preserve exact error messages, failure evidence, important file paths, exit codes, failed tests, and other high-signal technical evidence when present.
3. Remove repetition and low-signal context before removing unique relevant context.
4. Do not invent missing facts or silently change requirements.
5. If the source is already short enough or compaction produces no meaningful reduction, accept a pass-through result rather than forcing a rewrite.
6. When presenting savings, distinguish raw estimated tokens, estimated sent/output tokens, gross tokens removed, local overhead when applicable, and estimated net savings.
7. Do not convert estimated token savings into exact dollar savings unless authoritative provider pricing and billable usage dimensions are available for the relevant time period.
8. Do not claim that compaction preserved information that is not visible in the returned output.

## Privacy and restricted data

The public Quillgeist API/MCP service processes only the task-specific text explicitly supplied to the tool. Quillgeist product telemetry is designed not to store the submitted prompt/context text for public compaction calls.

Do not send or ask the user to send restricted data to the public Quillgeist plugin, including:

- passwords;
- API keys, access tokens, authentication secrets, private keys, or MFA/OTP codes;
- payment-card data;
- protected health information;
- government identifiers such as Social Security numbers;
- unrelated personal data or secrets not needed for the compaction task.

If restricted data is present, do not attempt to work around the server-side rejection. Ask the user to remove or redact it first. If the user explicitly requests no aggregate telemetry for a compaction, set `record_aggregate_metrics=false`.

Quillgeist's own aggregate product-impact telemetry is retained for up to 730 days. Infrastructure providers may separately process ordinary request/security metadata as described in the public privacy policy.

## When to use Quillgeist automatically

Use Quillgeist when the user's goal would materially benefit from reducing a large context payload before another AI/model step. Examples:

- "Compact this before I send it to Claude."
- "Cut the token load without losing the errors."
- "Clean this huge log for another model."
- "Make this context cheaper but preserve everything needed to solve the bug."
- "How much did Quillgeist save?"
- "Show Quillgeist's 30-day token-savings trend."

Do not invoke compaction merely because a message is verbose when the user is asking for a normal answer and no downstream context optimization is useful.

## Claims and reporting

Use precise wording:

- "estimated tokens saved" for approximation-based token metrics;
- "aggregate participating usage" for product-wide statistics;
- "execution runs" only for actual Quillgeist node execution;
- "API/MCP compactions" for public compaction calls;
- "compactions" when combining eligible compaction activity across surfaces;
- "retained aggregate telemetry" when discussing totals that are subject to the 730-day product-metrics retention window.

Never claim public metrics represent every Quillgeist installation or every request if telemetry can be disabled, opted out, or an installation has not reported.

## Unsupported public-plugin actions

Do not claim the public catalog plugin can:

- run PowerShell or local commands on the user's computer;
- modify, delete, or organize local files;
- pair or control a user's Quillgeist Node;
- save provider credentials;
- retrieve private account telemetry;
- send messages or perform purchases.

Those capabilities are outside the public plugin v1 tool surface.

## Public references

- Developer documentation: https://quillgeist.clintware.com/developers.html
- Privacy: https://quillgeist.clintware.com/privacy.html
- Terms: https://quillgeist.clintware.com/terms.html
- Support: https://quillgeist.clintware.com/support.html
- Product: https://quillgeist.clintware.com/
