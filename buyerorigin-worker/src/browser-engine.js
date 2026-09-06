export const BROWSER_ENGINE = String.raw`
(function (root) {
  "use strict";
  const REQUIRED_COLUMNS = ["order_id", "email", "phone", "address", "discount_code", "order_date", "order_total", "discount_amount"];
  function parseCsv(text) {
    const rows = []; let row = [], field = "", quoted = false;
    const input = String(text || "").replace(/^\uFEFF/, "");
    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      if (quoted) {
        if (char === '"' && input[i + 1] === '"') { field += '"'; i += 1; }
        else if (char === '"') quoted = false; else field += char;
      } else if (char === '"') quoted = true;
      else if (char === ",") { row.push(field); field = ""; }
      else if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (char !== "\r") field += char;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    const nonEmpty = rows.filter((cells) => cells.some((cell) => String(cell).trim()));
    if (!nonEmpty.length) return [];
    const headers = nonEmpty[0].map((value) => String(value).trim().toLowerCase());
    const missing = REQUIRED_COLUMNS.filter((name) => !headers.includes(name));
    if (missing.length) throw new Error("Missing required columns: " + missing.join(", "));
    return nonEmpty.slice(1).map((cells) => Object.fromEntries(headers.map((name, index) => [name, String(cells[index] || "").trim()])));
  }
  function normalizeEmail(value) {
    const email = String(value || "").trim().toLowerCase(); const at = email.lastIndexOf("@");
    if (at < 1) return email;
    let local = email.slice(0, at), domain = email.slice(at + 1);
    if (domain === "googlemail.com") domain = "gmail.com";
    if (domain === "gmail.com") local = local.split("+")[0].replace(/\./g, "");
    return local + "@" + domain;
  }
  function normalizePhone(value) { const digits = String(value || "").replace(/\D/g, ""); return digits.length > 10 && digits[0] === "1" ? digits.slice(-10) : digits; }
  function normalizeAddress(value) {
    return String(value || "").toLowerCase().trim().replace(/\b(apartment|apt|unit|suite|ste)\b[\s#-]*[a-z0-9-]+/g, "")
      .replace(/\b(street|st)\b/g, "st").replace(/\b(road|rd)\b/g, "rd").replace(/\b(avenue|ave)\b/g, "ave").replace(/\b(boulevard|blvd)\b/g, "blvd").replace(/[^a-z0-9]/g, "");
  }
  function money(value) { const number = Number(String(value || "0").replace(/[$,]/g, "")); return Number.isFinite(number) ? number : 0; }
  function audit(csvText, options) {
    const settings = options || {}; const allowlist = new Set((settings.allowlist || []).map((value) => String(value).trim()).filter(Boolean));
    const mode = settings.mode === "enforce" ? "enforce" : "monitor";
    const orders = parseCsv(csvText).map((order, inputIndex) => ({ ...order, inputIndex, order_total_number: money(order.order_total), discount_amount_number: money(order.discount_amount), limited_offer: !/^(false|no|0)$/i.test(order.is_new_customer_offer || "true"), normalized: { email: normalizeEmail(order.email), phone: normalizePhone(order.phone), address: normalizeAddress(order.address) } })).sort((a, b) => String(a.order_date).localeCompare(String(b.order_date)) || a.inputIndex - b.inputIndex);
    const prior = [];
    const results = orders.map((order) => {
      let best = null;
      if (order.limited_offer && order.discount_code) for (const candidate of prior) {
        const matches = [];
        if (order.normalized.email && order.normalized.email === candidate.normalized.email) matches.push("EMAIL_ALIAS_MATCH");
        if (order.normalized.phone && order.normalized.phone === candidate.normalized.phone) matches.push("PHONE_MATCH");
        if (order.normalized.address && order.normalized.address === candidate.normalized.address) matches.push("ADDRESS_MATCH");
        if (matches.length >= 2 && (!best || matches.length > best.matches.length)) best = { orderId: candidate.order_id, matches };
      }
      if (order.limited_offer && order.discount_code) prior.push(order);
      const allowed = allowlist.has(order.order_id); const flagged = Boolean(best) && !allowed;
      return { order_id: order.order_id, order_date: order.order_date, discount_code: order.discount_code, order_total: order.order_total_number, discount_amount: order.discount_amount_number, status: allowed && best ? "Allowed" : flagged ? "Flagged" : "Clear", risk: flagged ? (best.matches.length === 3 ? "High" : "Medium") : "None", action: flagged ? (mode === "enforce" ? "Deny discount" : "Review") : "Allow", reason_codes: best ? best.matches : [], matched_order_id: best ? best.orderId : "", note: allowed && best ? "Merchant allowlist override" : flagged ? "Two or more buyer signals matched a prior limited-offer redemption" : "No two-signal repeat found" };
    });
    const flagged = results.filter((row) => row.status === "Flagged");
    return { mode, generated_at: new Date().toISOString(), totals: { orders: results.length, promotion_uses: orders.filter((order) => order.limited_offer && order.discount_code).length, flagged: flagged.length, estimated_leakage: flagged.reduce((sum, row) => sum + row.discount_amount, 0) }, results };
  }
  root.BuyerOriginEngine = { REQUIRED_COLUMNS, parseCsv, normalizeEmail, normalizePhone, normalizeAddress, audit };
})(typeof window !== "undefined" ? window : globalThis);
`;
