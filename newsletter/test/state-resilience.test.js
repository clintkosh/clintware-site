import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { stateBackend } from "../src/state.js";

const root = new URL("../", import.meta.url);

test("production state backend requires D1 rather than Durable Objects", async () => {
  assert.equal(stateBackend({ NEWSLETTER_DB: { prepare() {} } }), "d1");
  assert.equal(stateBackend({ SUBSCRIBERS: { getByName() {} } }), "unconfigured");

  const worker = await readFile(new URL("src/worker.js", root), "utf8");
  assert.match(worker, /new D1SubscriberRegistry\(env\.NEWSLETTER_DB/);
  assert.match(worker, /function legacyRegistry\(env\)/);
  assert.match(worker, /legacyDurableObjectRequired:\s*false/);
  assert.match(worker, /\/internal\/migrate-legacy-state/);
});

test("Wrangler declares D1 primary state and keeps legacy DO only for migration", async () => {
  const config = JSON.parse(await readFile(new URL("wrangler.jsonc", root), "utf8"));
  const d1 = config.d1_databases?.find((entry) => entry.binding === "NEWSLETTER_DB");
  assert.ok(d1);
  assert.equal(d1.database_name, "clintware-blog-newsletter");
  assert.ok(config.durable_objects?.bindings?.some((entry) => entry.name === "SUBSCRIBERS"));
});

test("D1 schema contains subscriber consent, publication queue, and migration metadata", async () => {
  const schema = await readFile(new URL("schema.sql", root), "utf8");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS subscribers/);
  assert.match(schema, /unsubscribe_token TEXT NOT NULL/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS publications/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS newsletter_meta/);
});
