# Clintware Live Site Agent

A reusable, fail-closed helper for Clintware public pages.

## Goal

Give a site visitor a toggleable chat surface that can:

1. answer verified questions in a voice aligned with Clinton Kosh's public professional style;
2. identify itself clearly as an AI helper rather than pretending to be Clinton;
3. use the Clintware control plane for approved context or actions when an adapter is connected;
4. perform only narrowly scoped actions allowed by policy;
5. require visitor confirmation for actions that create an external effect;
6. escalate uncertain, sensitive, or owner-only questions to Clinton through an owner relay;
7. return an owner response to the active session when the control plane exposes handoff status.

## Architecture

```text
visitor browser
    |
    v
public/assets/site-agent.js
    |
    v
helper.clintware.com
Cloudflare Worker
    |          |
    |          +--> model endpoint
    |
    +--> Clintware MCP adapter
          |-- context
          |-- scoped action
          |-- owner handoff
          '-- handoff status
```

Browser code never receives model keys, MCP tokens, owner relay credentials, or provider secrets.

## Authority model

- Level 0: Public answers. No tool call.
- Level 1: Read-only context from approved MCP capabilities.
- Level 2: Reversible, low-risk actions only after explicit visitor confirmation.
- Level 3: Owner approval required for external commitments, messages sent as Clinton, private-data access, or any capability not explicitly allowlisted.
- Level 4: Blocked. Destructive admin work, credential disclosure, permission grants, financial transfers, legal acceptance, or other irreversible/high-impact actions.

The worker defaults to deny. New powers are added by capability name, not by exposing raw shell or arbitrary provider access.

## Escalation contract

The owner relay receives:

- session ID;
- current page;
- visitor question;
- short recent transcript;
- why owner input is needed;
- proposed capability, if any;
- creation time.

Preferred relay order:

1. Clintware MCP handoff capability;
2. owner relay webhook;
3. visible fallback to the site's normal contact path when neither is connected.

Never tell a visitor that Clinton was notified unless the relay call succeeded.

## MCP adapter contract

Set `MCP_PROXY_URL` and store `MCP_PROXY_TOKEN` as a Worker secret. The adapter receives:

```json
{
  "agent": "clintware-live-site-agent",
  "operation": "context | action | owner_handoff | handoff_status",
  "session_id": "opaque-session-id"
}
```

The adapter must enforce its own identity, capability, product, and data scopes. The Worker allowlist is a second gate, not a replacement for control-plane authorization.

## Required secrets

```text
LLM_API_KEY
MCP_PROXY_TOKEN        # only when MCP_PROXY_URL is enabled
OWNER_RELAY_TOKEN      # only when OWNER_RELAY_URL is enabled
```

Never commit these values.

## Activation behavior

The shared Clintware loader imports the widget assets. The widget first checks:

`https://helper.clintware.com/api/health`

If the worker is unavailable, the button is not rendered. This makes front-end deployment safe before backend activation.

A page can opt out with:

```html
<body data-site-agent="off">
```

A page can override the endpoint before `clintware.js` loads:

```html
<script>
window.CLINTWARE_SITE_AGENT = { endpoint: "https://helper.clintware.com" };
</script>
```

## Deployment sequence

1. Configure `LLM_MODEL`.
2. Add Worker secrets.
3. Connect the MCP adapter and owner relay.
4. Run `npm test` in this directory.
5. Deploy the Worker.
6. Verify `/api/health` from an allowed Clintware origin.
7. Merge the public widget loader.
8. Test desktop, mobile, keyboard navigation, failure behavior, escalation, and a confirmed low-risk action.
9. Verify the agent never claims to be Clinton and never reports an action or handoff as completed unless the downstream call succeeded.

## Next hardening steps

- edge rate limiting and bot protection;
- durable session storage with short retention;
- event-driven owner response push rather than fallback status checks;
- analytics limited to operational health, not transcript harvesting;
- redaction of email/phone values in retained diagnostics;
- allowlisted knowledge sources with freshness metadata;
- action idempotency keys;
- owner dashboard for pending handoffs.
