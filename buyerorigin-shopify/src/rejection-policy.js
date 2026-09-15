export const REJECTION_MESSAGE = "This coupon is not available for this order.";

export function buildDiscountRejection({ enteredDiscountCodes = [], verdictByCode = {} } = {}) {
  const rejected = [];
  for (const entry of enteredDiscountCodes) {
    const code = String(entry?.code || "").trim();
    if (!code || entry?.rejectable !== true) continue;
    const verdict = verdictByCode[code.toLowerCase()];
    if (!verdict || verdict.decision !== "reject_coupon") continue;
    if (Number(verdict.matchedSignals || 0) < Number(verdict.requiredSignals || 2)) continue;
    rejected.push({ code });
  }
  if (!rejected.length) return { operations: [] };
  return { operations: [{ enteredDiscountCodesReject: { codes: rejected, message: REJECTION_MESSAGE } }] };
}
