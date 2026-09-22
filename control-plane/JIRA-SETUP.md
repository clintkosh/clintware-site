# Jira access through the Clintware Control Plane

Jira is integrated as a server-side Clintware capability. QuillGeist Lite ("qq") can initiate authorization and authorized MCP clients can use Jira tools, but neither qq nor an external model receives the Atlassian access token, refresh token, or client secret.

## Architecture

```text
authorized MCP client / qq
        |
        v
mcp.clintware.com
  client + product scope
  quillgeist-lite Jira capability
  audit
        |
        +--> Atlassian OAuth 2.0 (3LO)
        |      encrypted rotating refresh grant
        |
        v
api.atlassian.com/ex/jira/{cloudId}/rest/api/3
```

The Jira user's normal Jira project and issue permissions remain authoritative. Clintware does not elevate them.

## Atlassian app: one-time setup

Create one OAuth 2.0 (3LO) integration in the Atlassian Developer Console.

Use this callback URL exactly:

```text
https://mcp.clintware.com/api/v1/jira/oauth/callback
```

Grant these scopes:

```text
read:jira-work
read:jira-user
write:jira-work
offline_access
```

The first three are the classic Jira scopes used by the adapter. `offline_access` is required for refresh tokens.

Create these GitHub Actions secrets in `clintkosh/clintware-site`:

- `ATLASSIAN_CLIENT_ID`
- `ATLASSIAN_CLIENT_SECRET`
- `JIRA_TOKEN_ENCRYPTION_KEY`

`JIRA_TOKEN_ENCRYPTION_KEY` should be a separate high-entropy random value. It encrypts the stored Atlassian grant. If omitted, the adapter can derive its encryption key from an existing Control Plane secret, but a dedicated key is preferred.

After the secrets exist, the normal `Deploy Clintware Control Plane` workflow syncs them into the Worker secret store. They are never committed to source.

## Connect from qq

The qq task registry contains:

```text
connect-jira
```

Dispatch it through the existing `clintware_quillgeist_lite_run` MCP tool. The local task:

1. uses the existing authenticated `clintkosh` GitHub CLI identity to request a short-lived authorization URL;
2. opens Atlassian in the default browser;
3. waits for the Control Plane callback to complete;
4. confirms the connected Jira site(s).

The Atlassian token never passes through the local task payload or qq logs.

## MCP tools

Read:

- `clintware_jira_status`
- `clintware_jira_sites`
- `clintware_jira_projects`
- `clintware_jira_search`
- `clintware_jira_get_issue`
- `clintware_jira_transitions`

Authorization:

- `clintware_jira_oauth_start`

Write:

- `clintware_jira_create_issue`
- `clintware_jira_update_issue`
- `clintware_jira_add_comment`
- `clintware_jira_transition_issue`

A scoped MCP client must be allowed to access the `quillgeist-lite` product. The product manifest separately requires `jira.read:quillgeist-lite` or `jira.write:quillgeist-lite`.

If more than one Jira Cloud site is authorized, callers must provide the desired `cloud_id`. With exactly one site, it is selected automatically.

## Token lifecycle

The Control Plane requests `offline_access`. Atlassian refresh tokens rotate. Every successful refresh replaces the stored refresh token atomically with the newly returned token.

Stored grant data is AES-GCM encrypted before it is written to the Control Plane Durable Object. Public health/status surfaces expose only configuration state, safe scope names, and Jira site metadata.

## Disconnect

Delete the stored Clintware grant with:

```http
DELETE /api/v1/jira
Authorization: Bearer <authorized Clintware/admin/GitHub receiver credential>
```

Also revoke the app from the Atlassian account if complete provider-side revocation is required.
