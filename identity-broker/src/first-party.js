const CLINTWARE_OWNER_EMAILS = Object.freeze(["clint.kosh@gmail.com", "fedfromchat@gmail.com", "clint@clintware.com", "clint.kosh@clintware.com", "clinton@clintware.com", "hello@clintware.com", "support@clintware.com", "sales@clintware.com", "billing@clintware.com", "abuse@clintware.com", "bb@clintware.com", "studio@clintware.com"]);

export const FIRST_PARTY_CLIENT_ID = "https://auth.clintware.com/client/clintware-web";

export const FIRST_PARTY_CLIENT = Object.freeze({
  clientId: FIRST_PARTY_CLIENT_ID,
  clientName: "Clintware Web",
  clientUri: "https://clintware.com",
  tokenEndpointAuthMethod: "none",
});

export const FIRST_PARTY_APPS = Object.freeze({
  mail: Object.freeze({
    product: "mail",
    name: "Clintware Mail",
    home: "https://mail.clintware.com",
    redirectUri: "https://mail.clintware.com/callback",
    scopes: Object.freeze(["identity", "email", "profile"]),
    identityProviders: Object.freeze(["google"]),
  }),
  "neuron7-case": Object.freeze({
    product: "neuron7-case",
    name: "N7 Customer Value OS",
    home: "https://n7crm.clintware.com",
    redirectUri: "https://n7crm.clintware.com/auth/callback",
    scopes: Object.freeze(["identity", "email", "profile"]),
    allowedEmailDomains: Object.freeze(["neuron7.ai"]),
    allowedEmails: CLINTWARE_OWNER_EMAILS,
    contextScopes: Object.freeze(["neuron7-case:read", "neuron7-case:operator"]),
    identityProviders: Object.freeze(["google", "microsoft", "okta", "auth0", "pingone", "oidc"]),
  }),
  "n7demo-crm": Object.freeze({
    product: "n7demo-crm",
    name: "N7 Demo CRM",
    home: "https://n7demo.clintware.com",
    redirectUri: "https://n7demo.clintware.com/auth/callback",
    scopes: Object.freeze(["identity", "email", "profile"]),
    allowedEmailDomains: Object.freeze(["neuron7.ai"]),
    allowedEmails: CLINTWARE_OWNER_EMAILS,
    contextScopes: Object.freeze(["n7demo-crm:read", "n7demo-crm:write"]),
    identityProviders: Object.freeze(["google", "microsoft", "okta", "auth0", "pingone", "oidc"]),
  }),
  "dpl-crm": Object.freeze({
    product: "dpl-crm",
    name: "Doppel Technical Customer Engineering CRM",
    home: "https://dpl.clintware.com",
    redirectUri: "https://dpl.clintware.com/auth/callback",
    scopes: Object.freeze(["identity", "email", "profile"]),
    allowedEmailDomains: Object.freeze(["doppel.com"]),
    allowedEmails: CLINTWARE_OWNER_EMAILS,
    contextScopes: Object.freeze(["dpl-crm:read", "dpl-crm:write"]),
    identityProviders: Object.freeze(["google", "microsoft", "okta", "auth0", "pingone", "oidc"]),
  }),
  "control-plane-admin": Object.freeze({
    product: "control-plane-admin",
    name: "Clintware Control Plane Admin",
    home: "https://mcp.clintware.com/admin",
    redirectUri: "https://mcp.clintware.com/admin/callback",
    scopes: Object.freeze(["identity", "email", "profile"]),
    identityProviders: Object.freeze(["google"]),
  }),
  "control-plane-mcp": Object.freeze({
    product: "control-plane-mcp",
    name: "Clintware MCP for ChatGPT",
    home: "https://mcp.clintware.com",
    redirectUri: "https://mcp.clintware.com/oauth/callback",
    scopes: Object.freeze(["identity", "email", "profile"]),
    identityProviders: Object.freeze(["google"]),
  }),
});

export function universalRedirectUris() {
  return [...new Set(Object.values(FIRST_PARTY_APPS).map((app) => app.redirectUri))].sort();
}

export function firstPartyApp(key) {
  return FIRST_PARTY_APPS[String(key || "").trim().toLowerCase()] || null;
}

export function firstPartyAppForRedirectUri(redirectUri) {
  const target = String(redirectUri || "").trim();
  return Object.values(FIRST_PARTY_APPS).find((app) => app.redirectUri === target) || null;
}

export function firstPartyClientMetadata() {
  return {
    client_id: FIRST_PARTY_CLIENT_ID,
    client_name: FIRST_PARTY_CLIENT.clientName,
    client_uri: FIRST_PARTY_CLIENT.clientUri,
    redirect_uris: universalRedirectUris(),
    token_endpoint_auth_method: FIRST_PARTY_CLIENT.tokenEndpointAuthMethod,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  };
}
