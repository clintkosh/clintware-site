const PRIMARY_KEY = "delegated:google:primary";

function normalizedEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function accountKey(email) {
  return `delegated:google:account:${normalizedEmail(email)}`;
}

export function schedulingAccount(returnTo) {
  return new URL(returnTo).hostname === "meet.clintware.com" ? "clint.kosh@gmail.com" : "";
}

export function delegatedScopes(scopes, returnTo) {
  return schedulingAccount(returnTo)
    ? scopes.filter((scope) => !scope.endsWith("/gmail.readonly") && !scope.endsWith("/calendar.readonly"))
    : scopes;
}

export async function readDelegatedGrant(kv, decode, email = "") {
  if (!kv) return null;
  const expected = normalizedEmail(email);
  const keys = expected ? [accountKey(expected), PRIMARY_KEY] : [PRIMARY_KEY];
  for (const key of keys) {
    const sealed = await kv.get(key);
    if (!sealed) continue;
    try {
      const grant = await decode(sealed);
      if (!expected || normalizedEmail(grant.email) === expected) return grant;
    } catch {
      // A corrupt or obsolete envelope cannot authorize another account.
    }
  }
  return null;
}

export async function writeDelegatedGrant(kv, decode, sealed, email) {
  // Migrate the previous primary before another account replaces it.
  const previous = await kv.get(PRIMARY_KEY);
  if (previous) {
    try {
      const grant = await decode(previous);
      if (grant.email) await kv.put(accountKey(grant.email), previous);
    } catch {
      // Keep a corrupt legacy record from blocking a valid reconnection.
    }
  }
  await kv.put(accountKey(email), sealed);
  await kv.put(PRIMARY_KEY, sealed);
}
