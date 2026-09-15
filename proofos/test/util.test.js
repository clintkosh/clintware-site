import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newRequestId,
  newSessionId,
  normalizeCompany,
  companySlug,
  hostLabel,
} from "../src/util.js";

test("newRequestId returns a unique identifier", () => {
  const a = newRequestId();
  const b = newRequestId();
  assert.ok(a && b && a !== b);
});

test("normalizeCompany accepts real company names", () => {
  assert.equal(normalizeCompany("  Gainsight  "), "Gainsight");
  assert.equal(normalizeCompany("DHL Group (Canada)"), "DHL Group (Canada)");
  assert.equal(normalizeCompany("O'Reilly Media, Inc."), "O'Reilly Media, Inc.");
  assert.equal(normalizeCompany("SaaS & Co."), "SaaS & Co.");
});

test("normalizeCompany rejects invalid or unsafe input", () => {
  assert.equal(normalizeCompany(""), null);
  assert.equal(normalizeCompany(null), null);
  assert.equal(normalizeCompany(42), null);
  assert.equal(normalizeCompany("x".repeat(81)), null);
  assert.equal(normalizeCompany("<script>alert(1)</script>"), null);
  assert.equal(normalizeCompany("DROP TABLE users; --"), null);
  assert.equal(normalizeCompany("12345"), null); // no letters
});

test("companySlug produces cache-safe slugs", () => {
  assert.equal(companySlug("Gainsight"), "gainsight");
  assert.equal(companySlug("DHL Group (Canada)"), "dhl-group-canada");
  assert.equal(companySlug("Ünïcödé Corp"), "unicode-corp");
  assert.equal(companySlug("!!!"), "company");
});

test("hostLabel extracts the registrable label", () => {
  assert.equal(hostLabel("www.gainsight.com"), "gainsight");
  assert.equal(hostLabel("gainsight.com"), "gainsight");
  assert.equal(hostLabel("docs.acme.co.uk"), "acme");
  assert.equal(hostLabel(""), "");
});
