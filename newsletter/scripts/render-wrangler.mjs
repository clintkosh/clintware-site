#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const databaseId = String(process.argv[2] || "").trim();
if (!/^[0-9a-fA-F-]{36}$/.test(databaseId)) {
  throw new Error("Usage: node newsletter/scripts/render-wrangler.mjs <D1_DATABASE_UUID>");
}

const source = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const bindings = Array.isArray(source.d1_databases) ? source.d1_databases : [];
const target = bindings.find((item) => item.binding === "NEWSLETTER_DB");
if (!target) throw new Error("NEWSLETTER_DB D1 binding is missing from wrangler.jsonc");
target.database_id = databaseId;

writeFileSync(
  new URL("../wrangler.generated.jsonc", import.meta.url),
  JSON.stringify(source, null, 2) + "\n",
  "utf8",
);
console.log(`Rendered newsletter D1 binding NEWSLETTER_DB -> ${databaseId}`);
