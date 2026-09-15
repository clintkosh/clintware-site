import { tokenFor } from "./token.js";

const MESSAGE = "This coupon is not available for this order.";
function addressString(a) { return a ? [a.address1,a.address2,a.city,a.provinceCode,a.zip,a.countryCode].filter(Boolean).join(" ") : ""; }
function dayNumber(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || "")); if (!m) return null;
  let y=Number(m[1]), mo=Number(m[2]), d=Number(m[3]); y -= mo <= 2 ? 1 : 0; const era=Math.floor(y/400); const yoe=y-era*400; const mp=mo+(mo>2?-3:9); const doy=Math.floor((153*mp+2)/5)+d-1; const doe=yoe*365+Math.floor(yoe/4)-Math.floor(yoe/100)+doy; return era*146097+doe-719468;
}
function evaluateCode(state, input, code) {
  if (!state || state.v !== 2 || state.enabled !== true || !state.k || !state.coupon || !Array.isArray(state.uses)) return false;
  if (tokenFor(state.k, "code", code) !== state.coupon) return false;
  const minSignals = Math.max(2, Math.min(3, Number(state.policy?.minSignals || 2)));
  const current = {
    e: tokenFor(state.k, "email", input.cart?.buyerIdentity?.email),
    p: tokenFor(state.k, "phone", input.cart?.buyerIdentity?.phone),
    a: tokenFor(state.k, "address", addressString(input.cart?.deliveryGroups?.[0]?.deliveryAddress) || addressString(input.cart?.billingAddress))
  };
  if ([current.e,current.p,current.a].filter(Boolean).length < minSignals) return false;
  const today = dayNumber(input.shop?.localTime?.date); if (today == null) return false;
  const lookback = Number(state.policy?.lookbackDays || 365); const allowed = Number(state.policy?.allowedPreviousUses || 0); let qualifying=0;
  for (const prior of state.uses) {
    const priorDay=dayNumber(prior.d); if (priorDay == null) continue; const age=today-priorDay; if (age < 0 || age > lookback) continue;
    let matches=0; if (current.e && prior.e === current.e) matches++; if (current.p && prior.p === current.p) matches++; if (current.a && prior.a === current.a) matches++;
    if (matches >= minSignals) qualifying++;
  }
  return qualifying > allowed;
}
export function cartLinesDiscountsGenerateRun(input) {
  const state = input?.discount?.metafield?.jsonValue;
  const rejected=[];
  for (const entry of Array.isArray(input?.enteredDiscountCodes) ? input.enteredDiscountCodes : []) {
    const code=String(entry?.code||"").trim(); if (!code || entry?.rejectable !== true) continue;
    if (evaluateCode(state,input,code)) rejected.push({code});
  }
  return rejected.length ? {operations:[{enteredDiscountCodesReject:{codes:rejected,message:MESSAGE}}]} : {operations:[]};
}
export { evaluateCode, MESSAGE as REJECTION_MESSAGE };
