import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { webcrypto } from "node:crypto";

const source = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const start = source.indexOf('  server.registerTool("clintware_quillgeist_lite_run"');
const end = source.indexOf('  server.registerTool("clintware_quillgeist_lite_job"', start);

function createHarness(allowed = true, status = { connected_devices: [], runner_presence: [] }) {
  let handler;
  const requests = [];
  const schema = new Proxy(() => schema, { get: () => schema, apply: () => schema });
  vm.runInNewContext(source.slice(start, end), {
    server: { registerTool: (name, options, callback) => { handler = callback; } },
    z: schema,
    env: {},
    mcpAuth: { client_id: "test-client" },
    mcpProductAllowed: () => allowed,
    QUILLGEIST_LITE_TASKS: { "self-update": { parameters: [] } },
    Request, crypto: webcrypto,
    clip: (value, max = 120) => String(value ?? "").slice(0, max),
    audit: async () => {},
    registryHub: () => ({ fetch: async request => {
      const path = new URL(request.url).pathname;
      if (path.endsWith("/quillgeist-lite-status")) {
        requests.push({ path, body: null });
        return new Response(JSON.stringify(status));
      }
      const body = await request.json();
      requests.push({ path, body });
      return new Response(JSON.stringify(path.endsWith("/quillgeist-lite-job")
        ? { ok: true, job: body } : { delivered: 1 }));
    } }),
  });
  return { handler, requests };
}

test("native chat maintenance preserves device targeting and resume semantics", async () => {
  const harness = createHarness();
  const result = await harness.handler({ task_id: "self-update", target_device: "DEVICE-B", resume_after: true });
  assert.equal(result.isError, undefined);
  assert.equal(harness.requests.length, 2);
  assert.equal(harness.requests[0].body.target_device, "DEVICE-B");
  assert.equal(harness.requests[0].body.resume_after, true);
  assert.equal(harness.requests[1].body.job.target_device, "DEVICE-B");
});

test("native chat maintenance still enforces product scope and task arguments", async () => {
  const unauthorized = createHarness(false);
  assert.equal((await unauthorized.handler({ task_id: "self-update" })).isError, true);
  assert.equal(unauthorized.requests.length, 0);
  const harness = createHarness();
  assert.equal((await harness.handler({ task_id: "self-update", args: { shell: "unreviewed" } })).isError, true);
  assert.equal(harness.requests.length, 0);
});

test("QQ autonomous recovery remains bounded and excludes interactive approval flows", () => {
  assert.match(source, /async scheduleQuillgeistLiteRecovery\(job\)/);
  assert.match(source, /async continueQuillgeistLiteRecovery\(job\)/);
  assert.match(source, /queueQuillgeistLiteRecoveryStep\("self-update"/);
  assert.match(source, /queueQuillgeistLiteRecoveryStep\("repair-local-service"/);
  assert.match(source, /followup\.stage==="retry"/);
  assert.match(source, /startsWith\("clintware-auto-recovery"\)/);
  assert.match(source, /\["browser-work","finish-google-oauth","google-cloud-support-access"\]/);
});



test("adaptive routing selects one fresh machine with the strongest available capacity", async () => {
  const now = new Date().toISOString();
  const harness = createHarness(true, {
    connected_devices: [
      { device_id: "MEMORIA" },
      { device_id: "DRIZNET" },
    ],
    runner_presence: [
      { device_id: "MEMORIA", runner_alive: true, updated_at: now, available_workers: 5, worker_capacity: 8, active_workers: 2, queued_jobs: 0, cpu_load_percent: 42, memory_load_percent: 51, gpu_worker_capacity: 2 },
      { device_id: "DRIZNET", runner_alive: true, updated_at: now, available_workers: 1, worker_capacity: 3, active_workers: 2, queued_jobs: 1, cpu_load_percent: 78, memory_load_percent: 82, gpu_worker_capacity: 0 },
    ],
  });
  const result = await harness.handler({ task_id: "self-update" });
  const payload = JSON.parse(result.content[0].text);
  assert.equal(payload.target_device, "MEMORIA");
  assert.equal(payload.routing.routing_mode, "adaptive-resource-score");
  assert.equal(payload.routing.selected_device, "MEMORIA");
  assert.equal(payload.routing.candidates.length, 2);
  assert.equal(harness.requests[1].body.target_device, "MEMORIA");
  assert.equal(harness.requests[2].body.job.target_device, "MEMORIA");
});

test("adaptive routing ignores stale presence and uses one connected fallback device", async () => {
  const stale = new Date(Date.now() - 120000).toISOString();
  const harness = createHarness(true, {
    connected_devices: [{ device_id: "DRIZNET" }, { device_id: "MEMORIA" }],
    runner_presence: [
      { device_id: "MEMORIA", runner_alive: true, updated_at: stale, available_workers: 10, worker_capacity: 12 },
    ],
  });
  const result = await harness.handler({ task_id: "self-update" });
  const payload = JSON.parse(result.content[0].text);
  assert.equal(payload.routing.routing_mode, "connected-device-fallback");
  assert.equal(payload.target_device, "DRIZNET");
  assert.equal(harness.requests[1].body.target_device, "DRIZNET");
});
