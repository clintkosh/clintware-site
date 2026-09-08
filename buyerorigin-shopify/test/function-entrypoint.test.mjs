import assert from "node:assert/strict";
import test from "node:test";
import { cartLinesDiscountsGenerateRun } from "../extensions/buyerorigin-discount-guard/src/cart_lines_discounts_generate_run.js";

test("Function entrypoint rejects only a rejectable code with compact sufficient evidence", () => {
  const result = cartLinesDiscountsGenerateRun({
    enteredDiscountCodes: [
      { code: "WELCOME20", rejectable: true },
      { code: "LOCKED10", rejectable: false },
    ],
    discount: {
      metafield: {
        jsonValue: {
          verdictByCode: {
            welcome20: { decision: "reject_coupon", matchedSignals: 2, requiredSignals: 2 },
            locked10: { decision: "reject_coupon", matchedSignals: 3, requiredSignals: 2 },
          },
        },
      },
    },
  });

  assert.deepEqual(result.operations, [{
    enteredDiscountCodesReject: {
      codes: [{ code: "WELCOME20" }],
      message: "This coupon is not available for this order.",
    },
  }]);
});

test("Function entrypoint fails open on missing or malformed compact state", () => {
  assert.deepEqual(cartLinesDiscountsGenerateRun({ enteredDiscountCodes: [{ code: "WELCOME20", rejectable: true }] }), { operations: [] });
  assert.deepEqual(cartLinesDiscountsGenerateRun({ enteredDiscountCodes: [{ code: "WELCOME20", rejectable: true }], discount: { metafield: { jsonValue: "bad" } } }), { operations: [] });
});
