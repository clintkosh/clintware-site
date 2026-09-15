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
  return crypto.createHmac("sha256", secret).update(`${kind}:${normalized}`).digest("base64url").slice(0, 22);
}

export function buildCompactState({ secret, uses, policy = {} }) {
  const byCode = {};
  for (const use of uses) {
    const code = normalizeCode(use.discountCode || use.code);
    if (!code) continue;
    const coupon = byCode[code] ||= { uses: [] };
    coupon.uses.push({
      e: keyedToken(secret, "email", use.email),
      p: keyedToken(secret, "phone", use.phone),
      a: keyedToken(secret, "address", use.address),
      t: new Date(use.usedAt || use.orderDate).toISOString(),
      o: String(use.orderId || "")
    });
  }
  return {
    v: 1,
    policy: { minSignals: Number(policy.minSignals || 2), lookbackDays: Number(policy.lookbackDays || 365), allowedPreviousUses: Number(policy.allowedPreviousUses || 0) },
    byCode
  };
}
