# Quillgeist — ChatGPT Plugin submission kit

Quillgeist is packaged for the current ChatGPT Plugin Directory model: a remote MCP app plus a reusable Quillgeist skill.

## Proposed listing

**Name:** Quillgeist

**Publisher:** Clintware

**Short description:** Compact long AI context while preserving critical evidence, estimate token reduction, and inspect Quillgeist-wide compaction and savings trends.

**Primary category:** Productivity / Developer Tools

**Product URL:** https://quillgeist.clintware.com/

**MCP URL:** https://quillgeist.clintware.com/mcp

**Developer docs:** https://quillgeist.clintware.com/developers.html

**Privacy:** https://quillgeist.clintware.com/privacy.html

**Terms:** https://quillgeist.clintware.com/terms.html

## Included app tools

### quillgeist_compact_context
Read-only. Compacts prompt/context/log/transcript text and returns the transformed text plus estimated token-reduction metrics. Submitted content is not written into Quillgeist product telemetry; aggregate compaction metrics are recorded.

### quillgeist_product_impact
Read-only. Returns aggregate usage, compaction, execution, estimated token savings, and trend metrics across participating Quillgeist telemetry plus public API/MCP calls.

## Included skill

`skills/quillgeist/SKILL.md`

The skill tells ChatGPT when to use Quillgeist, how to preserve high-signal evidence, how to describe estimates accurately, and what not to claim about the initial public catalog version.

## Starter prompts

1. Compact this context before I send it to another model, but keep every error and requirement.
2. Reduce the token load in this log without removing the evidence needed to debug it.
3. Compare the before/after estimated token counts for this context.
4. Show Quillgeist's aggregate token savings and compaction trend over the last 30 days.
5. Tell me whether this prompt is already small enough to leave unchanged.

## Review posture

The first catalog release is intentionally low-risk:

- no authentication required;
- no write actions;
- no remote Windows execution;
- no access to a user's Quillgeist Cloud account;
- no prompt text stored in Quillgeist application telemetry for public API/MCP compaction;
- aggregate metrics only for public product telemetry;
- bounded request/text sizes;
- explicit Privacy and Terms pages;
- token and savings metrics identified as estimates.

Future authenticated tools for a user's account or Windows node should be submitted as a materially expanded app capability with scoped OAuth/authorization, explicit action permissions, and a fresh privacy/security review.

## Submission checklist

- [x] Public HTTPS product domain
- [x] Public REST API
- [x] OpenAPI description
- [x] Remote MCP endpoint
- [x] Read-only MCP tool annotations
- [x] Privacy policy
- [x] Terms
- [x] Developer documentation
- [x] Agent Skills-format `SKILL.md`
- [x] CI checks for API/MCP files and live API routes
- [ ] Confirm production deployment is green
- [ ] Test `/mcp` in ChatGPT Developer Mode
- [ ] Complete OpenAI publisher/domain verification if requested
- [ ] Submit the app/plugin through the current OpenAI submission flow
- [ ] Complete OpenAI review and wait for directory approval

## Important

Repository publication does not itself publish a Plugin Directory listing. The final submission/review step occurs through OpenAI's current app/plugin submission experience and requires the publisher account to complete it.
