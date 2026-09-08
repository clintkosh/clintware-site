import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

test("serves same-coupon product markers and mobile viewport", async () => {
  const response = await worker.fetch(new Request("https://buyerorigin.clintware.com/"));
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Stop the same buyer from using the same coupon again/);
  assert.match(html, /unedited CSV/i);
  assert.match(html, /Working now:/);
  assert.match(html, /Simulated:/);
  assert.match(html, /Current-checkout simulator/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /never checkout/i);
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
});

test("reports worker health and honest Shopify status", async () => {
  const health = await worker.fetch(new Request("https://buyerorigin.clintware.com/healthz"));
  assert.deepEqual(await health.json(), { service: "BuyerOrigin", version: "0.3.0", status: "ok", capability: "same-coupon-reuse-audit" });
  const status = await worker.fetch(new Request("https://buyerorigin.clintware.com/api/status"));
  assert.deepEqual(await status.json(), { service: "BuyerOrigin", version: "0.3.0", status: "ok", audit: "working", shopify_enforcement: "not_installed" });
});

test("serves browser code and rejects writes", async () => {
  assert.equal((await worker.fetch(new Request("https://buyerorigin.clintware.com/engine.js"))).status, 200);
  assert.equal((await worker.fetch(new Request("https://buyerorigin.clintware.com/app.js"))).status, 200);
  assert.equal((await worker.fetch(new Request("https://buyerorigin.clintware.com/", { method: "POST" }))).status, 405);
});
