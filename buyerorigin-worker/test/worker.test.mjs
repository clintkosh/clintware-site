import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

test("serves the working MVP and its truth boundary", async () => {
  const response = await worker.fetch(new Request("https://buyerorigin.clintware.com/"));
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Run local audit/);
  assert.match(html, /Shopify enforcement, billing, merchant accounts/);
  assert.match(html, /denying a discount, never the checkout/i);
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
});

test("reports a specific MVP health contract", async () => {
  const response = await worker.fetch(new Request("https://buyerorigin.clintware.com/healthz"));
  assert.deepEqual(await response.json(), { service: "BuyerOrigin", version: "0.1.0", status: "ok", capability: "local-audit-mvp" });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("serves browser code and rejects writes", async () => {
  assert.equal((await worker.fetch(new Request("https://buyerorigin.clintware.com/engine.js"))).status, 200);
  assert.equal((await worker.fetch(new Request("https://buyerorigin.clintware.com/", { method: "POST" }))).status, 405);
});
