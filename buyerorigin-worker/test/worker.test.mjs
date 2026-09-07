import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

test("serves the working offer eligibility MVP and truth boundary", async () => {
  const response = await worker.fetch(new Request("https://buyerorigin.clintware.com/"));
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Evaluate eligibility/);
  assert.match(html, /live Shopify enforcement, billing, merchant accounts/i);
  assert.match(html, /never denies checkout/i);
  assert.match(html, /Automation alone never triggers denial/i);
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
});

test("reports the offer eligibility health contract", async () => {
  const response = await worker.fetch(new Request("https://buyerorigin.clintware.com/healthz"));
  assert.deepEqual(await response.json(), { service: "BuyerOrigin", version: "0.2.0", status: "ok", capability: "merchant-offer-eligibility" });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("serves browser code and rejects writes", async () => {
  assert.equal((await worker.fetch(new Request("https://buyerorigin.clintware.com/engine.js"))).status, 200);
  assert.equal((await worker.fetch(new Request("https://buyerorigin.clintware.com/", { method: "POST" }))).status, 405);
});
