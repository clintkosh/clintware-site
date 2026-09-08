import { buildDiscountRejection } from "../../../src/rejection-policy.js";

/**
 * Shopify Discount Function entrypoint contract.
 *
 * The app-owned discount metafield is expected to contain a compact object:
 * {
 *   "verdictByCode": {
 *     "welcome20": {
 *       "decision": "reject_coupon",
 *       "matchedSignals": 2,
 *       "requiredSignals": 2
 *     }
 *   }
 * }
 *
 * Missing, stale, malformed, or insufficient state fails open.
 */
export function cartLinesDiscountsGenerateRun(input) {
  const state = input?.discount?.metafield?.jsonValue;
  const verdictByCode = state && typeof state === "object" && state.verdictByCode && typeof state.verdictByCode === "object"
    ? state.verdictByCode
    : {};

  return buildDiscountRejection({
    enteredDiscountCodes: Array.isArray(input?.enteredDiscountCodes) ? input.enteredDiscountCodes : [],
    verdictByCode,
  });
}
