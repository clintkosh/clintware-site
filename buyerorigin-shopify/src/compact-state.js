import crypto from "node:crypto";

export function normalizeEmail(value = "") {
  const email = String(value).trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  let local = email.slice(0, at); let domain = email.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.split("+")[0].replace(/\./g, "");
  return `${local}@${domain}`;
}
export const normalizePhone = (value = "") => { const digits = String(value).replace(/\D/g, ""); return digits.length > 10 && digits.startsWith("1") ? digits.slice(-10) : digits; };
export const normalizeAddress = (value = "") => String(value).toLowerCase().trim().replace(/\b(apartment|apt|unit|suite|ste)\b[\s#-]*[a-z0-9-]+/g, "").replace(/\b(street|st)\b/g, "st").replace(/\b(road|rd)\b/g, "rd").replace(/\b(avenue|ave)\b/g, "ave").replace(/\b(boulevard|blvd)\b/g, "blvd").replace(/[^a-z0-9]/g, "");
export const normalizeCode = (value = "") => String(value).trim().toLowerCase();

export function keyedToken(secret, kind, value) {
  const normalized = kind === "email" ? normalizeEmail(value) : kind === "phone" ? normalizePhone(value) : kind === "address" ? normalizeAddress(value) : normalizeCode(value);
  if (!normalized) return null;
  return crypto.createHash("sha256").update(`${secret}\0${kind}\0${normalized}`, "utf8").digest("hex").slice(0, 32);
}

export function buildCouponState({ secret, couponCode, uses, policy = {}, enabled = true }) {
  const couponToken = keyedToken(secret, "code", couponCode);
  const records = (uses || []).map((use) => ({
    e: use.emailKey || keyedToken(secret, "email", use.email),
    p: use.phoneKey || keyedToken(secret, "phone", use.phone),
    a: use.addressKey || keyedToken(secret, "address", use.address),
    d: String(use.usedAt || use.orderDate || "").slice(0, 10),
    o: String(use.orderId || "")
  })).filter((r) => r.d);
  return {
    v: 2,
    enabled: Boolean(enabled),
    k: secret,
    coupon: couponToken,
    policy: {
      minSignals: Number(policy.minSignals || 2),
      lookbackDays: Number(policy.lookbackDays || 365),
      allowedPreviousUses: Number(policy.allowedPreviousUses || 0)
    },
    uses: records
  };
}
