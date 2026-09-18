# Universal LLM Routing Through Clintware

Use this contract for any external AI client that can call MCP or HTTPS tools.

## Connection

- MCP endpoint: `https://mcp.clintware.com/mcp`
- Control Plane API: `https://mcp.clintware.com/api/v1`
- Authentication: a scoped Clintware MCP client credential in `Authorization: Bearer <credential>` or `x-api-key: <credential>`
- Never give the client a GitHub, Cloudflare, deployment, DNS, or other provider credential.
- GitHub identity selection happens server-side from the product manifest's `repo.identity`.

## Universal routing instruction

Give the following instruction to an LLM after its Clintware MCP connection is configured:

> Use the Clintware Control Plane at mcp.clintware.com as the authority boundary for this project. Start by calling `clintware_client_handshake` and, when a project/product is known, `clintware_product_manifest`. Do not ask me to switch GitHub accounts or expose GitHub/Cloudflare credentials. Resolve repository ownership, account identity, allowed paths, workflows, DNS names, and infrastructure permissions through the Control Plane. Use capability discovery/request tools for actions. If work is being continued by another model or handed back to ChatGPT, create a compact `clintware-handoff/v1` packet with `clintware_handoff_put`; return the handoff ID to me. Never put API keys, access tokens, cookies, passwords, private keys, or raw secret values in a handoff. Reuse existing project context and artifacts instead of re-fetching or re-sending the same data when possible.

## Handoff packet

The Control Plane accepts these fields:

```json
{
  "from_client": "claude|gemini|grok|perplexity|chatgpt|other",
  "target_client": "chatgpt|any",
  "product": "registered-product-slug",
  "project": "human-readable project name",
  "objective": "What is being accomplished",
  "context_summary": "Only the context required to continue",
  "repository": {
    "identity": "clintkosh|codefeddy|future-alias",
    "owner": "github-owner",
    "name": "repository-name",
    "branch": "working-branch"
  },
  "decisions": ["Decisions already made"],
  "constraints": ["Requirements that must remain true"],
  "changed_files": ["path/to/file"],
  "artifacts": ["URLs, PR numbers, deploy IDs, or artifact references"],
  "next_actions": ["Concrete next actions"],
  "notes": "Optional compact notes"
}
```

Handoffs are intentionally compact and expire from the active handoff index after seven days.

## Receiving work in another model

When the user provides a Clintware handoff ID, retrieve it with `clintware_handoff_get`, treat its explicit decisions and constraints as continuation context, then verify live repository/control-plane state before making writes.

A model must not infer that it has access to an account merely because another model did. The Control Plane determines current capability and credential availability at execution time.

## GitHub identity convention

A manifest identity maps to a Worker secret automatically:

- `clintkosh` -> `GITHUB_TOKEN_CLINTKOSH`
- `codefeddy` -> `GITHUB_TOKEN_CODEFEDDY`
- `acme-labs` -> `GITHUB_TOKEN_ACME_LABS`

Add future identities with `control-plane/add-github-identity.ps1`; no Control Plane source-code change is required.
