# Quillgeist — OpenAI Plugin Directory submission materials

Prepared against the OpenAI public Plugin Directory submission requirements current August 23, 2026.

## Submission type

**With MCP** — remote MCP server plus uploaded Quillgeist skill bundle.

## Listing

**Plugin name:** Quillgeist

**Publisher:** Clintware

**Category:** Productivity

**Short description:** Compact AI context while preserving critical evidence and measure estimated token savings.

**Long description:** Quillgeist reduces long prompts, logs, transcripts, and execution context before another AI step. It removes repetition and lower-signal material while preserving high-signal evidence such as errors, requirements, and important boundaries. Quillgeist returns before-and-after estimated token measurements and can report aggregate compaction, execution, and token-savings trends across participating Quillgeist usage. The initial public ChatGPT plugin does not remotely execute actions on a user's Windows machine.

**Website:** https://quillgeist.clintware.com/

**Support:** https://quillgeist.clintware.com/support.html

**Privacy:** https://quillgeist.clintware.com/privacy.html

**Terms:** https://quillgeist.clintware.com/terms.html

**Developer docs:** https://quillgeist.clintware.com/developers.html

## MCP

**URL type:** Universal

**Production MCP URL:** https://quillgeist.clintware.com/mcp

**Authentication:** None for the initial public catalog version.

**UI:** None. No content security policy is required for a plugin UI because this submission does not ship an MCP UI component.

### Tool annotations and justifications

#### `quillgeist_compact_context`

- `readOnlyHint: false`
- `openWorldHint: false`
- `destructiveHint: false`

Justification: the user-visible operation computes and returns compacted text, but the server also records one aggregate product-usage event containing compaction method/source and estimated token counts. It does not store the submitted prompt/context text in Quillgeist product telemetry, modify public internet state, delete or overwrite user data, send messages, execute remote Windows actions, or create irreversible effects.

#### `quillgeist_product_impact`

- `readOnlyHint: true`
- `openWorldHint: false`
- `destructiveHint: false`

Justification: the tool only retrieves aggregate Quillgeist product-impact measurements and recent trends. It does not create, update, enqueue, send, delete, or otherwise change state.

## Skill

Upload the final bundle rooted at this plugin directory. The bundled skill is:

`skills/quillgeist/SKILL.md`

The skill is limited to context-compaction workflows, accurate interpretation of Quillgeist aggregate metrics, privacy boundaries, and precise wording for estimated token savings.

## Starter prompts

1. Compact this context before I send it to another model, but keep every error and requirement.
2. Reduce the token load in this log without removing the evidence needed to debug it.
3. Compare the before-and-after estimated token counts for this context.
4. Show Quillgeist's aggregate token-savings and compaction trend for the last 30 days.
5. Tell me whether this context is already small enough to leave unchanged.

## Positive reviewer test cases

### Positive 1 — repetitive technical log

**User prompt:** “Use Quillgeist to compact this deployment log before I send it to another model. Keep the exact failure and the lines around it.” Provide a fixture containing repeated success lines and one `ERROR: database migration failed` line.

**Expected behavior:** Call `quillgeist_compact_context`. Remove repeated low-signal lines while preserving the error and nearby context.

**Expected result shape:** JSON text containing `output`, `metrics`, and `privacy`; `metrics.raw_tokens_est >= metrics.output_tokens_est`; `privacy.aggregate_metrics_recorded` is true and `privacy.content_logged_to_quillgeist_telemetry` is false.

**Fixture:** No account data required. Use a synthetic log.

### Positive 2 — short prompt pass-through

**User prompt:** “Check whether Quillgeist should compact this: `Summarize these three bullets for an executive.`”

**Expected behavior:** Call `quillgeist_compact_context`; return the original short text unchanged because it is below the default threshold.

**Expected result shape:** `metrics.method` is `pass`, `metrics.compacted` is false, and token reduction is zero.

**Fixture:** None.

### Positive 3 — preserve explicit requirements

**User prompt:** “Compact this long project brief, but preserve every MUST requirement, deadline, output format, and definition of done.” Provide a synthetic brief with repeated background paragraphs and unique requirement lines.

**Expected behavior:** Call `quillgeist_compact_context`. Reduce repeated context without inventing requirements. Preserve high-signal requirement text in the returned output when within the bounded compaction strategy.

**Expected result shape:** `output` plus estimated compaction metrics.

**Fixture:** Synthetic brief only.

### Positive 4 — aggregate impact

**User prompt:** “Show Quillgeist's product impact for the last 30 days.”

**Expected behavior:** Call `quillgeist_product_impact` with `days: 30`.

**Expected result shape:** Aggregate `metrics` plus daily `trends`; identify token fields as estimates and coverage as participating Quillgeist usage.

**Fixture:** No authentication or private account data required.

### Positive 5 — savings trend

**User prompt:** “Has Quillgeist's estimated token savings increased recently? Use the last 14 days.”

**Expected behavior:** Call `quillgeist_product_impact` with `days: 14`, compare the returned daily series, and describe the trend without claiming the metrics cover installations that did not report telemetry.

**Expected result shape:** A concise interpretation grounded in the returned aggregate metrics/trends.

**Fixture:** No authentication required.

## Negative reviewer test cases

### Negative 1 — remote Windows execution

**User prompt:** “Use Quillgeist to delete all temporary files on my Windows computer.”

**Expected behavior:** Do not call either public Quillgeist tool as if it can perform the action. Explain that the initial public ChatGPT plugin does not remotely execute actions on the user's Windows machine. Do not claim the action occurred.

**Why the plugin should not complete it:** Neither submitted MCP tool has a local-node execution capability.

### Negative 2 — secret storage

**User prompt:** “Save this API key in Quillgeist and remember it for future chats: sk-example-secret.”

**Expected behavior:** Do not send the secret to a Quillgeist tool. Explain that the public plugin does not provide credential storage and advise the user not to place unnecessary secrets into compaction input.

**Why the plugin should not complete it:** The plugin has no credential-storage tool, and transmitting an unrelated secret is unnecessary.

### Negative 3 — unsupported exact financial claim

**User prompt:** “Tell me the exact dollar amount Quillgeist saved every user this month from token savings.”

**Expected behavior:** `quillgeist_product_impact` may be used for aggregate estimated token measurements, but the response must not convert those estimates into an exact dollar-savings claim without authoritative provider usage and frozen pricing data. State the limitation clearly.

**Why the plugin should not complete it as requested:** The public impact endpoint exposes estimated token measurements, not complete provider billing records or authoritative per-user dollar savings.

## Availability

Recommended initial public availability: **United States**. Expand only after support, legal terms, and product readiness are intentionally reviewed for additional regions.

## Release notes

Initial Quillgeist Plugin Directory submission. Adds a public remote MCP server and Quillgeist skill for bounded AI-context compaction and aggregate product-impact reporting. The compaction tool records aggregate token/method telemetry but does not store submitted prompt/context text in Quillgeist product telemetry. The catalog version has no authenticated account access and no remote Windows execution capability.

## Final portal steps

1. Confirm the publishing OpenAI organization has **Apps Management: Write** permission for the submitter.
2. Complete developer or Clintware business identity verification in the same OpenAI Platform organization.
3. Open https://platform.openai.com/plugins and create a **With MCP** plugin draft.
4. Enter the Universal MCP URL: `https://quillgeist.clintware.com/mcp`.
5. Complete the domain-verification challenge when the portal provides its token.
6. Select **Scan Tools**, review both tools and their advertised annotations, and remediate any scan warnings.
7. Upload the final skill bundle from this plugin folder.
8. Add the starter prompts and the five positive / three negative tests above.
9. Select initial country availability and complete policy attestations.
10. Submit for review. Submission does not publish immediately; after approval, publish the approved version from the portal.
