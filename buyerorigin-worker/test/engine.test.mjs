import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { BROWSER_ENGINE } from "../src/browser-engine.js";
import { SAMPLE_CSV } from "../src/browser-app.js";

const context = { globalThis: {}, Date }; vm.createContext(context); vm.runInContext(BROWSER_ENGINE, context); const engine = context.globalThis.BuyerOriginEngine;
test("normalizes buyer signals", () => { assert.equal(engine.normalizeEmail("Alex.Smith+offer@googlemail.com"), "alexsmith@gmail.com"); assert.equal(engine.normalizePhone("+1 (512) 555-0101"), "5125550101"); assert.equal(engine.normalizeAddress("10 Oak Street, Apt 2"), "10oakst"); });
test("requires two signals before flagging", () => { const audit = engine.audit(SAMPLE_CSV, { mode: "monitor" }); assert.equal(audit.totals.orders, 6); assert.equal(audit.totals.flagged, 2); assert.equal(audit.totals.estimated_leakage, 43); assert.deepEqual(Array.from(audit.results.find((row) => row.order_id === "BO-1003").reason_codes), ["EMAIL_ALIAS_MATCH", "PHONE_MATCH"]); });
test("merchant allowlist overrides without hiding evidence", () => { const audit = engine.audit(SAMPLE_CSV, { mode: "enforce", allowlist: ["BO-1005"] }); const row = audit.results.find((entry) => entry.order_id === "BO-1005"); assert.equal(row.status, "Allowed"); assert.equal(row.note, "Merchant allowlist override"); assert.equal(audit.totals.flagged, 1); });
test("simulation denies only the discount", () => { const audit = engine.audit(SAMPLE_CSV, { mode: "enforce" }); assert.equal(audit.results.find((row) => row.order_id === "BO-1003").action, "Deny discount"); assert.ok(audit.results.every((row) => row.action !== "Deny checkout")); });
test("rejects incomplete exports", () => assert.throws(() => engine.audit("order_id,email\n1,a@example.com"), /Missing required columns/));
