import assert from "node:assert/strict";
import test from "node:test";
import { buildDiscountRejection } from "../src/rejection-policy.js";

test("rejects a rejectable code when BuyerOrigin has sufficient evidence", () => {
  const result = buildDiscountRejection({ enteredDiscountCodes: [{ code: "WELCOME20", rejectable: true }], verdictByCode: { welcome20: { decision: "reject_coupon", matchedSignals: 2, requiredSignals: 2 } } });
  assert.deepEqual(result.operations[0].enteredDiscountCodesReject.codes, [{ code: "WELCOME20" }]);
  assert.equal("checkoutReject" in result.operations[0], false);
});

test("allows a Shopify code that is not rejectable", () => {
  assert.deepEqual(buildDiscountRejection({ enteredDiscountCodes: [{ code: "WELCOME20", rejectable: false }], verdictByCode: { welcome20: { decision: "reject_coupon", matchedSignals: 3, requiredSignals: 2 } } }), { operations: [] });
});

test("fails open when evidence is missing or below confidence threshold", () => {
  assert.deepEqual(buildDiscountRejection({ enteredDiscountCodes: [{ code: "WELCOME20", rejectable: true }], verdictByCode: {} }), { operations: [] });
  assert.deepEqual(buildDiscountRejection({ enteredDiscountCodes: [{ code: "WELCOME20", rejectable: true }], verdictByCode: { welcome20: { decision: "reject_coupon", matchedSignals: 1, requiredSignals: 2 } } }), { operations: [] });
});
