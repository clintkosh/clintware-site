import assert from "node:assert/strict";
import test from "node:test";
import { BROWSER_ENGINE } from "../src/browser-engine.js";

globalThis.window = globalThis;
Function(BROWSER_ENGINE)();
const E = globalThis.BuyerOriginEngine;

const generic = `order_id,email,phone,address,discount_code,order_date,order_total,discount_amount
1,a@example.com,5125550001,10 Oak St,WELCOME20,2026-01-01,100,20
2,a@example.com,5125550001,10 Oak Street,welcome20,2026-02-01,100,20
3,a@example.com,5125550001,10 Oak St,OTHER20,2026-03-01,100,20`;

test("default exact same-code reuse is case-insensitive and rejects coupon only", () => {
  const audit = E.audit(generic);
  assert.equal(audit.policy.offer_scope, "same_code");
  assert.equal(audit.policy.max_prior_redemptions, 0);
  assert.equal(audit.results[1].action, "Reject coupon");
  assert.equal(audit.results[1].matched_order_id, "1");
  assert.equal(audit.results[2].action, "Allow coupon");
});

test("two of three identity matching is default", () => {
  const csv = `order_id,email,phone,address,discount_code,order_date,order_total,discount_amount
1,a@example.com,5125550001,10 Oak St,SAVE,2026-01-01,10,2
2,a@example.com,5125550001,99 Pine Rd,SAVE,2026-01-02,10,2`;
  assert.equal(E.audit(csv).results[1].action, "Reject coupon");
});

test("three of three optional policy", () => {
  const csv = `order_id,email,phone,address,discount_code,order_date,order_total,discount_amount
1,a@example.com,5125550001,10 Oak St,SAVE,2026-01-01,10,2
2,a@example.com,5125550001,99 Pine Rd,SAVE,2026-01-02,10,2`;
  assert.equal(E.audit(csv, { policy: { min_matching_signals: 3 } }).results[1].action, "Allow coupon");
});

test("lookback allows reuse older than 365 days", () => {
  const csv = `order_id,email,phone,address,discount_code,order_date,order_total,discount_amount
1,a@example.com,5125550001,10 Oak St,SAVE,2024-01-01,10,2
2,a@example.com,5125550001,10 Oak St,SAVE,2026-01-02,10,2`;
  assert.equal(E.audit(csv).results[1].action, "Allow coupon");
});

test("merchant override allows the coupon", () => {
  const audit = E.audit(generic, { allowlist: ["2"] });
  assert.equal(audit.results[1].status, "Merchant override");
  assert.equal(audit.results[1].action, "Allow coupon");
});

test("Shopify native CSV parses and collapses line-item continuation rows", () => {
  const csv = `Name,Email,Phone,Created at,Total,Discount Code,Discount Amount,Shipping Address1,Shipping City,Shipping Zip,Lineitem name
#1001,a@example.com,5125550001,2026-01-01,100,WELCOME20,20,10 Oak St,Austin,78701,Thing A
,,,,,,,,,,Thing B
#1002,a@example.com,5125550001,2026-02-01,80,welcome20,16,10 Oak Street,Austin,78701,Thing C`;
  const rows = E.parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].source_format, "shopify_orders_csv");
  assert.equal(E.audit(csv).results[1].action, "Reject coupon");
});

test("missing customer evidence fails open", () => {
  const csv = `order_id,email,phone,address,discount_code,order_date,order_total,discount_amount
1,,,,SAVE,2026-01-01,10,2
2,,,,SAVE,2026-01-02,10,2`;
  const audit = E.audit(csv);
  assert.match(audit.results[1].status, /insufficient evidence/i);
  assert.equal(audit.results[1].action, "Allow coupon");
});

test("current-checkout simulator returns Allow coupon or Reject coupon", () => {
  const result = E.simulate(generic, { email: "a@example.com", phone: "5125550001", address: "10 Oak St", discount_code: "WELCOME20", order_date: "2026-04-01" });
  assert.equal(result.label, "Reject coupon");
  const allowed = E.simulate(generic, { email: "new@example.com", phone: "5125559999", address: "55 Pine Rd", discount_code: "WELCOME20", order_date: "2026-04-01" });
  assert.equal(allowed.label, "Allow coupon");
});
