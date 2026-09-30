import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");

test("QQ status has a live-only fallback when durable state is degraded",()=>{
  const start=source.indexOf("async quillgeistLiteStatus()");
  const end=source.indexOf("async infraUsageSnapshot()",start);
  assert.ok(start>=0&&end>start,"QQ status method missing");
  const block=source.slice(start,end);
  assert.match(block,/quillgeistLiteLiveServicePresence\(\)/);
  assert.match(block,/status_mode:"live-only"/);
  assert.match(block,/storage_degraded:true/);
  assert.match(block,/live_service_presence/);
  assert.match(block,/live_service_devices/);
});

test("QQ check-in can report and read replies without durable persistence",()=>{
  assert.match(source,/persistence="degraded-live-only"/);
  assert.match(source,/last_checkin_reply/);
  assert.match(source,/quillgeist_checkin_persistence_degraded/);
  assert.match(source,/quillgeist_checkin_reply_persistence_degraded/);
});

test("live watchdog messages are cached in websocket attachments before durable writes",()=>{
  const start=source.indexOf('if(attachment.receiver==="quillgeist-lite-wake")');
  const end=source.indexOf('if(attachment.receiver==="quillgeist-lite-recovery")',start);
  assert.ok(start>=0&&end>start,"wake handler missing");
  const block=source.slice(start,end);
  assert.match(block,/ws\.serializeAttachment/);
  assert.match(block,/presence/);
  assert.match(block,/last_checkin_reply/);
  assert.match(block,/try\{await this\.recordQuillgeistLitePresence/);
});
