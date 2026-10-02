import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const remoteTasks = JSON.parse(fs.readFileSync(new URL("../quillgeist-remote-tasks.json", import.meta.url), "utf8"));
const watchdog = fs.readFileSync(new URL("../../quillgeist-lite/service/QuillgeistLiteHealthService.cs", import.meta.url), "utf8");
const statusWorkflow = fs.readFileSync(new URL("../../.github/workflows/quillgeist-lite-status-snapshot.yml", import.meta.url), "utf8");

test("control plane exposes independent QQ check-in paths", () => {
  assert.match(source, /clintware_quillgeist_lite_checkin/);
  assert.match(source, /\/api\/v1\/quillgeist-lite\/check-in/);
  assert.match(source, /clintware-quillgeist-lite-checkin\/v1/);
  assert.match(source, /attachment\.receiver==="quillgeist-lite-wake"/);
  assert.match(source, /recordQuillgeistLiteCheckinReply/);
});

test("watchdog remains responsive while runner work is protected", () => {
  assert.match(watchdog, /ServiceVersion = "1\.4\.0-health-contract"/);
  assert.match(watchdog, /"checkin_reply"/);
  assert.match(watchdog, /FreshBusyHeartbeatActive\(\)/);
  assert.match(watchdog, /deferred_busy/);
  assert.match(watchdog, /restart_requested/);
  assert.match(watchdog, /progress_age_seconds/);
  assert.match(watchdog, /busy_progressing/);
});

test("status snapshots actively ask every registered watchdog for live state", () => {
  assert.match(statusWorkflow, /live_checkins/);
  assert.match(statusWorkflow, /\/api\/v1\/quillgeist-lite\/check-in/);
  assert.match(statusWorkflow, /requested_action=str\(control_request\.get\("action"\) or "status"\)/);
  assert.match(statusWorkflow, /requested_action not in \{"status","restart_runner"\}/);
  assert.match(statusWorkflow, /action=requested_action if \(requested_target and device_id\.lower\(\)==requested_target\.lower\(\)\) else "status"/);
});

test("network share task is control-plane allowlisted", () => {
  assert.deepEqual(remoteTasks.tasks["share-ai-network"], { runtime: "powershell", parameters: [] });
  assert.match(source, /quillgeist-lite\/tasks\/share-network-folder\.ps1/);
});

test("CRM ASTRO remote task keeps a bounded argument surface", () => {
  assert.deepEqual(remoteTasks.tasks["crm-astro-build"], {
    runtime: "powershell",
    parameters: ["Action", "Project", "SkipInstall"],
  });
});

test("wake channel stays persistent across queued-job notifications", () => {
  const start = source.indexOf("async broadcastQuillgeistLiteWake(job)");
  const end = source.indexOf("async broadcastQuillgeistLiteJobEvent", start);
  const block = source.slice(start, end);
  assert.doesNotMatch(block, /wake_reconnect/);
  assert.doesNotMatch(block, /ws\.close\(/);
  assert.match(block, /clintware-quillgeist-lite-wake\/v1/);
});


test("CRM+Cover batch remote task exposes only bounded application-factory controls", () => {
  assert.deepEqual(remoteTasks.tasks["crm-cover-batch"], {
    runtime: "powershell",
    parameters: ["Projects", "Action", "Workers", "GenerateCopy", "Model"],
  });
});


test("central QQ job creation load-balances untargeted work before broadcast", () => {
  const start = source.indexOf("async putQuillgeistLiteJob(job)");
  const end = source.indexOf("async updateQuillgeistLiteJob", start);
  const block = source.slice(start, end);
  assert.match(block, /this\.ctx\.getWebSockets\("quillgeist-lite"\)/);
  assert.match(block, /adaptive-resource-score/);
  assert.match(block, /available_workers/);
  assert.match(block, /queued_jobs/);
  assert.match(block, /cpu_load_percent/);
  assert.match(block, /memory_load_percent/);
  assert.match(block, /gpu_worker_capacity/);
  assert.match(block, /routing\.selected_device=target_device/);
  assert.match(block, /target_device,/);
});
