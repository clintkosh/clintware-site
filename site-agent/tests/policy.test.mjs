import test from "node:test";
import assert from "node:assert/strict";
import {actionPolicy, isOriginAllowed, normalizeMessages, safePageContext} from "../src/policy.js";

test("origin allowlist supports Clintware wildcard", () => {
  const patterns = ["https://clintware.com","https://*.clintware.com"];
  assert.equal(isOriginAllowed("https://clintware.com",patterns),true);
  assert.equal(isOriginAllowed("https://helper.clintware.com",patterns),true);
  assert.equal(isOriginAllowed("https://example.com",patterns),false);
});

test("authority levels stay bounded", () => {
  const env = {AUTO_ACTIONS:"read_public_content",CONFIRM_ACTIONS:"schedule_meeting"};
  assert.equal(actionPolicy("read_public_content",env).level,"auto");
  assert.equal(actionPolicy("schedule_meeting",env).level,"confirm");
  assert.equal(actionPolicy("delete_account",env).level,"owner");
});

test("messages are bounded and normalized", () => {
  const input = Array.from({length:20},(_,i)=>({role:i%2?"assistant":"user",content:"x"}));
  const out = normalizeMessages(input);
  assert.equal(out.length,12);
});

test("page context is length bounded", () => {
  const out = safePageContext({title:"x".repeat(1000)});
  assert.ok(out.title.length <= 300);
});
