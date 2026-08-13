import assert from "node:assert/strict";
import { test } from "node:test";

import { CRM_PORTFOLIO, crmForPage, GA_MEASUREMENT_ID } from "../src/config.js";
import { reportingConfiguration, summarizeReports } from "../src/google-analytics.js";
import worker, { constantTimeEqual, derivePassword } from "../src/worker.js";

test("portfolio uses one measurement ID and unique page namespaces", () => {
  assert.equal(GA_MEASUREMENT_ID, "G-DCY144YM9P");
  assert.equal(CRM_PORTFOLIO.length, 7);
  assert.equal(new Set(CRM_PORTFOLIO.map((crm) => crm.hostname)).size, CRM_PORTFOLIO.length);
  assert.equal(new Set(CRM_PORTFOLIO.map((crm) => crm.pathPrefix)).size, CRM_PORTFOLIO.length);
  for (const crm of CRM_PORTFOLIO) {
    assert.match(crm.url, /^https:\/\//);
    assert.match(crm.pathPrefix, /^\/.+\/$/);
  }
});

test("page paths and hostnames resolve to the correct CRM", () => {
  assert.equal(crmForPage("/an/accounts")?.id, "abnormal");
  assert.equal(crmForPage("/renewnudge/app/dashboard")?.id, "renewnudge");
  assert.equal(crmForPage("/", "pp.clintware.com")?.id, "proofpoint");
  assert.equal(crmForPage("/unassigned"), undefined);
});

test("password derivation and comparison helpers are deterministic", async () => {
  const salt = "MDEyMzQ1Njc4OWFiY2RlZg==";
  const left = await derivePassword("fixture-only", salt, 1000);
  const right = await derivePassword("fixture-only", salt, 1000);
  const wrong = await derivePassword("different", salt, 1000);
  assert.equal(constantTimeEqual(left, right), true);
  assert.equal(constantTimeEqual(left, wrong), false);
  assert.equal(constantTimeEqual(new Uint8Array([1]), new Uint8Array([1, 0])), false);
});

test("GA reporting configuration requires all three read credentials", () => {
  assert.equal(reportingConfiguration({}).configured, false);
  assert.equal(
    reportingConfiguration({
      GA_PROPERTY_ID: "properties/123456",
      GA_CLIENT_EMAIL: "reader@example.iam.gserviceaccount.com",
      GA_PRIVATE_KEY: "private-key",
    }).configured,
    true,
  );
  assert.equal(
    reportingConfiguration({ GA_PROPERTY_ID: "properties/123456" }).configured,
    false,
  );
});

test("GA reports are summarized without mixing page namespaces", () => {
  const result = summarizeReports(
    { rows: [{ metricValues: [{ value: "4" }, { value: "7" }, { value: "19" }, { value: "31" }] }] },
    { rows: [{ dimensionValues: [{ value: "20260813" }], metricValues: [{ value: "4" }, { value: "7" }, { value: "19" }] }] },
    {
      rows: [
        { dimensionValues: [{ value: "/an/accounts" }, { value: "an.clintware.com" }], metricValues: [{ value: "11" }, { value: "3" }] },
        { dimensionValues: [{ value: "/pp/portfolio" }, { value: "pp.clintware.com" }], metricValues: [{ value: "8" }, { value: "2" }] },
      ],
    },
  );
  assert.deepEqual(result.summary, { activeUsers: 4, sessions: 7, pageViews: 19, events: 31 });
  assert.equal(result.crmViews.abnormal, 11);
  assert.equal(result.crmViews.proofpoint, 8);
  assert.equal(result.crmViews.zscaler, 0);
});

test("public shell is noindex and protected API rejects anonymous requests", async () => {
  const shell = await worker.fetch(new Request("https://stats.clintware.com/"), {});
  const html = await shell.text();
  assert.equal(shell.status, 200);
  assert.match(shell.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.match(shell.headers.get("x-robots-tag"), /noindex/);
  assert.match(html, /G-DCY144YM9P/);
  assert.doesNotMatch(html, /\$&@\$&@/);

  const api = await worker.fetch(new Request("https://stats.clintware.com/api/dashboard"), {});
  assert.equal(api.status, 401);
  assert.equal(api.headers.get("cache-control"), "no-store, max-age=0");
});

test("password API accepts the same-origin dashboard header", async () => {
  const response = await worker.fetch(
    new Request("https://stats.clintware.com/api/session", {
      method: "POST",
      headers: { "X-Clintware-Password": "definitely-not-the-password" },
    }),
    {},
  );
  assert.equal(response.status, 401);
});

test("native form login rejects the wrong password without redirecting", async () => {
  const form = new FormData();
  form.set("password", "definitely-not-the-password");
  const response = await worker.fetch(
    new Request("https://stats.clintware.com/login", { method: "POST", body: form }),
    {},
  );
  assert.equal(response.status, 401);
  assert.match(await response.text(), /That password did not match\./);
});

test("authenticated HTML safely serializes the dashboard payload", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("", { status: 200 });
  try {
    const { buildDashboardPayload } = await import("../src/worker.js");
    const payload = await buildDashboardPayload({});
    const { dashboardHtml } = await import("../src/ui.js");
    const html = dashboardHtml("fixture", { payload });
    assert.match(html, /window\.__CLINTWARE_STATS_DATA__=/);
    assert.match(html, /\/stats\/dashboard/);
    assert.doesNotMatch(html, /<\/script><script>alert/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("health endpoint is intentionally minimal", async () => {
  const response = await worker.fetch(new Request("https://stats.clintware.com/health"), {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "clintware-stats-dashboard" });
});
