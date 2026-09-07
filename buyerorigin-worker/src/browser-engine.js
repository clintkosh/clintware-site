export const BROWSER_ENGINE = String.raw`
(function (root) {
  "use strict";
  const REQUIRED_COLUMNS = ["order_id", "email", "phone", "address", "discount_code", "order_date", "order_total", "discount_amount"];
  const DEFAULT_POLICY = Object.freeze({
    min_matching_signals: 2,
    lookback_days: 365,
    offer_scope: "acquisition",
    max_prior_redemptions: 0
  });

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
  function bool(value, fallback) { const text = String(value == null ? "" : value).trim(); if (!text) return fallback; return !/^(false|no|0)$/i.test(text); }
  function clampInt(value, min, max, fallback) { const n = Number.parseInt(value, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
  function dayDistance(later, earlier) {
    const a = Date.parse(later), b = Date.parse(earlier);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return Math.floor((a - b) / 86400000);
  }
  function normalizePolicy(input) {
    const source = input || {};
    return {
      min_matching_signals: clampInt(source.min_matching_signals, 2, 3, DEFAULT_POLICY.min_matching_signals),
      lookback_days: clampInt(source.lookback_days, 1, 3650, DEFAULT_POLICY.lookback_days),
      offer_scope: source.offer_scope === "same_code" ? "same_code" : "acquisition",
      max_prior_redemptions: clampInt(source.max_prior_redemptions, 0, 20, DEFAULT_POLICY.max_prior_redemptions)
    };
  }
  function sameEligibilityScope(order, candidate, policy) {
    if (!candidate.limited_offer || !candidate.discount_code) return false;
    if (policy.offer_scope === "same_code") return candidate.discount_code.toLowerCase() === order.discount_code.toLowerCase();
    return true;
  }
  function buyerMatches(order, candidate) {
    const matches = [];
    if (order.normalized.email && order.normalized.email === candidate.normalized.email) matches.push("EMAIL_ALIAS_MATCH");
    if (order.normalized.phone && order.normalized.phone === candidate.normalized.phone) matches.push("PHONE_MATCH");
    if (order.normalized.address && order.normalized.address === candidate.normalized.address) matches.push("ADDRESS_MATCH");
    return matches;
  }

  function audit(csvText, options) {
    const settings = options || {};
    const allowlist = new Set((settings.allowlist || []).map((value) => String(value).trim()).filter(Boolean));
    const mode = settings.mode === "enforce" ? "enforce" : "monitor";
    const policy = normalizePolicy(settings.policy || settings);
    const orders = parseCsv(csvText).map((order, inputIndex) => ({
      ...order,
      inputIndex,
      order_total_number: money(order.order_total),
      discount_amount_number: money(order.discount_amount),
      limited_offer: bool(order.is_new_customer_offer, true),
      actor_type: String(order.actor_type || order.channel || "human_or_unknown").trim().toLowerCase() || "human_or_unknown",
      agent_id: String(order.agent_id || "").trim(),
      normalized: { email: normalizeEmail(order.email), phone: normalizePhone(order.phone), address: normalizeAddress(order.address) }
    })).sort((a, b) => String(a.order_date).localeCompare(String(b.order_date)) || a.inputIndex - b.inputIndex);

    const prior = [];
    const results = orders.map((order) => {
      const candidates = [];
      if (order.limited_offer && order.discount_code) {
        for (const candidate of prior) {
          if (!sameEligibilityScope(order, candidate, policy)) continue;
          const ageDays = dayDistance(order.order_date, candidate.order_date);
          if (ageDays != null && (ageDays < 0 || ageDays > policy.lookback_days)) continue;
          const matches = buyerMatches(order, candidate);
          if (matches.length >= policy.min_matching_signals) candidates.push({ orderId: candidate.order_id, matches, ageDays, discountCode: candidate.discount_code });
        }
      }
      if (order.limited_offer && order.discount_code) prior.push(order);
      candidates.sort((a, b) => b.matches.length - a.matches.length || (a.ageDays == null ? 99999 : a.ageDays) - (b.ageDays == null ? 99999 : b.ageDays));
      const best = candidates[0] || null;
      const priorRedemptions = candidates.length;
      const policyIneligible = priorRedemptions > policy.max_prior_redemptions;
      const overridden = allowlist.has(order.order_id) && policyIneligible;
      const ineligible = policyIneligible && !overridden;
      const evaluated = Boolean(order.limited_offer && order.discount_code);
      let status = "Not evaluated", action = "Allow checkout", note = "Not marked as an acquisition offer";
      if (evaluated && overridden) { status = "Merchant override"; action = "Allow offer"; note = "Merchant allowlist override retained with evidence"; }
      else if (evaluated && ineligible) { status = "Ineligible"; action = mode === "enforce" ? "Deny offer" : "Review eligibility"; note = "Merchant policy found too many prior qualifying redemptions by the same underlying buyer"; }
      else if (evaluated) { status = "Eligible"; action = "Allow offer"; note = best ? "Prior identity evidence remains within merchant policy" : "No qualifying prior buyer match found"; }
      return {
        order_id: order.order_id,
        order_date: order.order_date,
        discount_code: order.discount_code,
        order_total: order.order_total_number,
        discount_amount: order.discount_amount_number,
        actor_type: order.actor_type,
        agent_id: order.agent_id,
        evaluated,
        eligible: evaluated ? !ineligible : null,
        status,
        risk: ineligible ? (best && best.matches.length === 3 ? "High confidence" : "Policy match") : "None",
        action,
        reason_codes: best ? best.matches : [],
        matched_order_id: best ? best.orderId : "",
        prior_qualifying_redemptions: priorRedemptions,
        note
      };
    });
    const ineligible = results.filter((row) => row.status === "Ineligible");
    const overrides = results.filter((row) => row.status === "Merchant override");
    return {
      mode,
      policy,
      generated_at: new Date().toISOString(),
      totals: {
        orders: results.length,
        promotion_uses: results.filter((row) => row.evaluated).length,
        ineligible: ineligible.length,
        flagged: ineligible.length,
        merchant_overrides: overrides.length,
        estimated_leakage: ineligible.reduce((sum, row) => sum + row.discount_amount, 0)
      },
      results
    };
  }
  root.BuyerOriginEngine = { REQUIRED_COLUMNS, DEFAULT_POLICY, parseCsv, normalizeEmail, normalizePhone, normalizeAddress, normalizePolicy, audit };
})(typeof window !== "undefined" ? window : globalThis);
`;
