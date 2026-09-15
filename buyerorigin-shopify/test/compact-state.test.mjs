import assert from "node:assert/strict";
import test from "node:test";
import { buildCompactState, keyedToken, normalizeCode } from "../src/compact-state.js";
import { extractCouponUses } from "../src/order-ingest.js";

test("compact state is merchant-secret keyed and case-insensitive by coupon", () => {
  const secret = "test-secret";
  const state = buildCompactState({ secret, uses: [{ orderId: "1", discountCode: "WELCOME20", email: "A@example.com", phone: "512-555-0001", address: "10 Oak St", usedAt: "2026-09-01" }] });
  assert.equal(normalizeCode(" Welcome20 "), "welcome20");
  assert.equal(state.byCode.welcome20.uses.length, 1);
  assert.equal(state.byCode.welcome20.uses[0].e, keyedToken(secret, "email", "a@example.com"));
  assert.ok(!JSON.stringify(state).includes("a@example.com"));
});

test("Shopify order webhook extraction stores pseudonymous keys", () => {
  const rows = extractCouponUses({ id: 123, email: "buyer@example.com", phone: "+1 512 555 0001", created_at: "2026-09-01T00:00:00Z", shipping_address: { address1: "10 Oak Street", city: "Austin", province_code: "TX", zip: "78701", country_code: "US" }, discount_codes: [{ code: "WELCOME20", amount: "20.00" }] }, "test-secret");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].discountCode, "welcome20");
  assert.ok(rows[0].couponKey && rows[0].emailKey && rows[0].phoneKey && rows[0].addressKey);
});
