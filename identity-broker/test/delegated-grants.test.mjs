import test from "node:test";
import assert from "node:assert/strict";
import { delegatedScopes, readDelegatedGrant, schedulingAccount, writeDelegatedGrant } from "../src/delegated-grants.js";

function fakeKv(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { get: async (key) => data.get(key) || null, put: async (key, value) => data.set(key, value) };
}

test("a support reconnect preserves the Gmail scheduling grant", async () => {
  const gmail = JSON.stringify({ email: "clint.kosh@gmail.com", refreshToken: "test-gmail" });
  const support = JSON.stringify({ email: "support@clintware.com", refreshToken: "test-support" });
  const kv = fakeKv({ "delegated:google:primary": gmail });
  await writeDelegatedGrant(kv, JSON.parse, support, "support@clintware.com");
  assert.equal((await readDelegatedGrant(kv, JSON.parse, "clint.kosh@gmail.com")).refreshToken, "test-gmail");
  assert.equal((await readDelegatedGrant(kv, JSON.parse)).email, "support@clintware.com");
});

test("legacy support connection cannot satisfy a Gmail scheduling request", async () => {
  const kv = fakeKv({ "delegated:google:primary": JSON.stringify({ email: "support@clintware.com" }) });
  assert.equal(await readDelegatedGrant(kv, JSON.parse, "clint.kosh@gmail.com"), null);
});

test("account lookup validates the encrypted grant identity and migrates legacy Gmail", async () => {
  const gmail = JSON.stringify({ email: "Clint.Kosh@Gmail.com" });
  const kv = fakeKv({
    "delegated:google:primary": gmail,
    "delegated:google:account:clint.kosh@gmail.com": JSON.stringify({ email: "support@clintware.com" }),
  });
  assert.equal((await readDelegatedGrant(kv, JSON.parse, "CLINT.KOSH@GMAIL.COM")).email, "Clint.Kosh@Gmail.com");
});

test("scheduler reconnect is pinned to Gmail with no inbox-read scopes", () => {
  const scopes = ["openid", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.freebusy"];
  const scheduler = "https://meet.clintware.com/?calendar=connected";
  assert.equal(schedulingAccount(scheduler), "clint.kosh@gmail.com");
  assert.equal(schedulingAccount("https://cc.clintware.com/"), "");
  assert.ok(!delegatedScopes(scopes, scheduler).some((scope) => scope.endsWith("readonly")));
  assert.deepEqual(delegatedScopes(scopes, "https://cc.clintware.com/"), scopes);
});
