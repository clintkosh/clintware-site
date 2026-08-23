---
name: quillgeist
description: Use Quillgeist to compact long or repetitive AI prompt/context payloads while preserving high-signal evidence, estimate token reduction, and report aggregate Quillgeist compaction and token-savings impact.
---

# Quillgeist

Use this skill when the user wants to reduce prompt/context size, remove repetitive AI context, compact logs or transcripts before another model call, preserve critical execution evidence while reducing tokens, compare before/after token estimates, or inspect Quillgeist product impact.

Quillgeist is a local-first AI execution product. The public ChatGPT plugin version intentionally exposes only read-only tools. Do not imply that the catalog version can remotely execute actions on the user's Windows computer.

## Available app tools

### `quillgeist_compact_context`

Use for actual prompt/context compaction.

Suitable inputs include:

- long prompts;
- repetitive conversation context;
- terminal or application logs;
- transcripts;
- execution results;
- debugging context;
- material being prepared for another AI model.

The tool returns compacted text plus estimated raw tokens, estimated output tokens, estimated gross tokens removed, and reduction percentage.

### `quillgeist_product_impact`

Use when the user asks about Quillgeist-wide measured usage, compaction counts, prompt counts, estimated token savings, execution activity, or recent trends.

The returned metrics cover participating installations and API/MCP calls represented in Quillgeist aggregate telemetry. Treat fields marked estimated as estimates.

## Compaction rules

1. Preserve the user's actual objective, facts, constraints, output requirements, privacy requirements, and definition of done.
2. Preserve exact error messages, failure evidence, important file paths, exit codes, failed tests, and other high-signal technical evidence when present.
3. Remove repetition and low-signal context before removing unique relevant context.
4. Do not invent missing facts or silently change requirements.
5. If the source is already short enough or compaction produces no meaningful reduction, accept a pass-through result rather than forcing a rewrite.
6. When presenting savings, distinguish raw estimated tokens, estimated sent/output tokens, gross tokens removed, local overhead when applicable, and estimated net savings.
7. Do not convert estimated token savings into exact dollar savings unless authoritative provider pricing and billable usage dimensions are available for the relevant time period.

## Privacy and secrets

The public Quillgeist API/MCP service processes submitted text to produce the requested result. Quillgeist application telemetry is designed not to store the submitted prompt/context text for public compaction calls; aggregate measurements may be recorded.

Do not encourage users to send passwords, private keys, authentication tokens, or unrelated secrets. If a secret is clearly irrelevant to the requested transformation, omit or redact it before using the app when possible.

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
- "compactions" when combining eligible compaction activity across surfaces.

Never claim public metrics represent every Quillgeist installation if telemetry can be disabled or an installation has not reported.

## Public references

- Developer documentation: https://quillgeist.clintware.com/developers.html
- Privacy: https://quillgeist.clintware.com/privacy.html
- Terms: https://quillgeist.clintware.com/terms.html
- Product: https://quillgeist.clintware.com/
