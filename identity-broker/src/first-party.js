export const FIRST_PARTY_CLIENT = Object.freeze({
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
  }),
  "neuron7-case": Object.freeze({
    product: "neuron7-case",
    name: "Neuron7 Case Console",
    home: "https://n7.clintware.com",
    redirectUri: "https://n7.clintware.com/auth/callback",
    scopes: Object.freeze(["identity", "email", "profile"]),
  }),
});

export function universalRedirectUris() {
  return [...new Set(Object.values(FIRST_PARTY_APPS).map((app) => app.redirectUri))].sort();
}

export function firstPartyApp(key) {
  return FIRST_PARTY_APPS[String(key || "").trim().toLowerCase()] || null;
}
