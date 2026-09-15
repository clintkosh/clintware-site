import { keyedToken, normalizeCode } from "./compact-state.js";

function addressFromOrder(order) {
  const a = order?.shipping_address || order?.billing_address || {};
  return [a.address1, a.address2, a.city, a.province_code || a.province, a.zip, a.country_code || a.country].filter(Boolean).join(" ");
}

export function extractCouponUses(order, secret) {
  const discountCodes = Array.isArray(order?.discount_codes) ? order.discount_codes : [];
  const email = order?.email || order?.contact_email || "";
  const phone = order?.phone || order?.shipping_address?.phone || order?.billing_address?.phone || "";
  const address = addressFromOrder(order);
  const usedAt = order?.processed_at || order?.created_at || new Date().toISOString();
  return discountCodes.map((d) => ({
    orderId: String(order?.admin_graphql_api_id || order?.id || order?.name || ""),
    discountCode: normalizeCode(d.code),
    couponKey: keyedToken(secret, "code", d.code),
    emailKey: keyedToken(secret, "email", email),
    phoneKey: keyedToken(secret, "phone", phone),
    addressKey: keyedToken(secret, "address", address),
    email, phone, address, usedAt,
    discountAmount: d.amount == null ? null : Number(d.amount)
  })).filter((x) => x.discountCode);
}
