import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { webcrypto } from "node:crypto";

const source = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
const start = source.indexOf('  server.registerTool("clintware_quillgeist_lite_run"');
const end = source.indexOf('  server.registerTool("clintware_quillgeist_lite_job"', start);

function createHarness(allowed = true) {
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
    audit: async () => {},
    registryHub: () => ({ fetch: async request => {
      const body = await request.json();
      requests.push({ path: new URL(request.url).pathname, body });
      return new Response(JSON.stringify(request.url.endsWith("-job")
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
