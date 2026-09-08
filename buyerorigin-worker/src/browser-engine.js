export const BROWSER_ENGINE = String.raw`
(function (root) {
  "use strict";
  const GENERIC_REQUIRED = ["order_id","email","phone","address","discount_code","order_date","order_total","discount_amount"];
  const DEFAULT_POLICY = Object.freeze({ min_matching_signals: 2, lookback_days: 365, offer_scope: "same_code", max_prior_redemptions: 0 });

  function rawCsv(text) {
    const rows=[]; let row=[], field="", quoted=false;
    const input=String(text||"").replace(/^\uFEFF/,"");
    for(let i=0;i<input.length;i+=1){const c=input[i];
      if(quoted){if(c==='"'&&input[i+1]==='"'){field+='"';i+=1;}else if(c==='"')quoted=false;else field+=c;}
      else if(c==='"')quoted=true; else if(c===","){row.push(field);field="";} else if(c==="\n"){row.push(field);rows.push(row);row=[];field="";} else if(c!=="\r")field+=c;
    }
    if(field.length||row.length){row.push(field);rows.push(row);}
    return rows.filter(cells=>cells.some(cell=>String(cell).trim()));
  }
  function key(value){return String(value||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");}
  function first(row,names){for(const name of names){const v=row[key(name)];if(String(v||"").trim())return String(v).trim();}return "";}
  function parseRows(text){
    const rows=rawCsv(text); if(!rows.length)return [];
    const headers=rows[0].map(key);
    return rows.slice(1).map(cells=>Object.fromEntries(headers.map((h,i)=>[h,String(cells[i]||"").trim()])));
  }
  function isShopify(headers){const set=new Set(headers);return set.has("name")&&(set.has("created_at")||set.has("paid_at"))&&(set.has("discount_code")||set.has("discount_codes"));}
  function joinAddress(row,prefix){
    const parts=["address1","address2","city","province","province_code","zip","country","country_code"].map(s=>row[key(prefix+" "+s)]).filter(Boolean);
    return parts.join(" ");
  }
  function canonicalizeShopify(rows){
    const out=[]; const byId=new Map(); let current=null;
    for(const row of rows){
      const explicit=first(row,["Name","Id","Order ID","Order"]);
      let id=explicit;
      if(!id && current) id=current.order_id;
      if(!id) continue;
      let order=byId.get(id);
      if(!order){
        const shipping=joinAddress(row,"Shipping"); const billing=joinAddress(row,"Billing");
        order={order_id:id,email:first(row,["Email","Contact Email"]),phone:first(row,["Phone","Shipping Phone","Billing Phone"]),address:shipping||billing,
          shipping_address:shipping,billing_address:billing,discount_code:first(row,["Discount Code","Discount Codes"]),
          order_date:first(row,["Created at","Paid at","Processed at"]),order_total:first(row,["Total","Current Total","Subtotal"]),
          discount_amount:first(row,["Discount Amount","Discounts","Total Discounts"]),is_new_customer_offer:"true",actor_type:"human_or_unknown",agent_id:"",source_format:"shopify_orders_csv"};
        byId.set(id,order); out.push(order);
      } else {
        if(!order.email)order.email=first(row,["Email","Contact Email"]);
        if(!order.phone)order.phone=first(row,["Phone","Shipping Phone","Billing Phone"]);
        if(!order.discount_code)order.discount_code=first(row,["Discount Code","Discount Codes"]);
        if(!order.order_date)order.order_date=first(row,["Created at","Paid at","Processed at"]);
        if(!order.order_total)order.order_total=first(row,["Total","Current Total","Subtotal"]);
        if(!order.discount_amount)order.discount_amount=first(row,["Discount Amount","Discounts","Total Discounts"]);
      }
      current=order;
    }
    return out;
  }
  function parseCsv(text){
    const raw=rawCsv(text); if(!raw.length)return [];
    const headers=raw[0].map(key); const rows=parseRows(text);
    if(isShopify(headers))return canonicalizeShopify(rows);
    const missing=GENERIC_REQUIRED.filter(name=>!headers.includes(name));
    if(missing.length)throw new Error("Unsupported CSV. Use an unedited Shopify Orders export or include: "+missing.join(", "));
    return rows.map(r=>({...r,source_format:"compatible_csv"}));
  }
  function normalizeEmail(value){const email=String(value||"").trim().toLowerCase(),at=email.lastIndexOf("@");if(at<1)return email;let local=email.slice(0,at),domain=email.slice(at+1);if(domain==="googlemail.com")domain="gmail.com";if(domain==="gmail.com")local=local.split("+")[0].replace(/\./g,"");return local+"@"+domain;}
  function normalizePhone(value){const d=String(value||"").replace(/\D/g,"");return d.length>10&&d[0]==="1"?d.slice(-10):d;}
  function normalizeAddress(value){return String(value||"").toLowerCase().trim().replace(/\b(apartment|apt|unit|suite|ste)\b[\s#-]*[a-z0-9-]+/g,"").replace(/\b(street|st)\b/g,"st").replace(/\b(road|rd)\b/g,"rd").replace(/\b(avenue|ave)\b/g,"ave").replace(/\b(boulevard|blvd)\b/g,"blvd").replace(/[^a-z0-9]/g,"");}
  function normalizeCode(value){return String(value||"").trim().toLowerCase();}
  function money(value){const n=Number(String(value||"0").replace(/[$,]/g,""));return Number.isFinite(n)?n:0;}
  function bool(value,fallback){const t=String(value==null?"":value).trim();if(!t)return fallback;return !/^(false|no|0)$/i.test(t);}
  function clampInt(v,min,max,fallback){const n=Number.parseInt(v,10);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;}
  function days(later,earlier){const a=Date.parse(later),b=Date.parse(earlier);if(!Number.isFinite(a)||!Number.isFinite(b))return null;return Math.floor((a-b)/86400000);}
  function normalizePolicy(input){const s=input||{};return {min_matching_signals:clampInt(s.min_matching_signals,2,3,2),lookback_days:clampInt(s.lookback_days,1,3650,365),offer_scope:"same_code",max_prior_redemptions:clampInt(s.max_prior_redemptions??s.allowed_previous_uses,0,20,0)};}
  function buyerMatches(a,b){const m=[];if(a.normalized.email&&a.normalized.email===b.normalized.email)m.push("EMAIL_MATCH");if(a.normalized.phone&&a.normalized.phone===b.normalized.phone)m.push("PHONE_MATCH");if(a.normalized.address&&a.normalized.address===b.normalized.address)m.push("ADDRESS_MATCH");return m;}
  function prepare(order,inputIndex){return {...order,inputIndex,order_total_number:money(order.order_total),discount_amount_number:money(order.discount_amount),limited_offer:bool(order.is_new_customer_offer,true),normalized:{email:normalizeEmail(order.email),phone:normalizePhone(order.phone),address:normalizeAddress(order.address)},normalized_code:normalizeCode(order.discount_code)};}
  function audit(csvText,options){
    const settings=options||{}, policy=normalizePolicy(settings.policy||settings), allowlist=new Set((settings.allowlist||[]).map(v=>String(v).trim()).filter(Boolean));
    const orders=parseCsv(csvText).map(prepare).sort((a,b)=>String(a.order_date).localeCompare(String(b.order_date))||a.inputIndex-b.inputIndex);
    const prior=[]; const results=orders.map(order=>{
      const available=[order.normalized.email,order.normalized.phone,order.normalized.address].filter(Boolean).length;
      const candidates=[];
      if(order.limited_offer&&order.normalized_code&&available>=policy.min_matching_signals){
        for(const candidate of prior){
          if(candidate.normalized_code!==order.normalized_code)continue;
          const age=days(order.order_date,candidate.order_date);if(age==null||age<0||age>policy.lookback_days)continue;
          const matches=buyerMatches(order,candidate);if(matches.length>=policy.min_matching_signals)candidates.push({orderId:candidate.order_id,matches,ageDays:age});
        }
      }
      if(order.limited_offer&&order.normalized_code)prior.push(order);
      candidates.sort((a,b)=>b.matches.length-a.matches.length||a.ageDays-b.ageDays);const best=candidates[0]||null;
      const insufficient=Boolean(order.limited_offer&&order.normalized_code&&available<policy.min_matching_signals);
      const policyReject=candidates.length>policy.max_prior_redemptions&&!insufficient;
      const overridden=policyReject&&(allowlist.has(order.order_id)||allowlist.has(order.discount_code)||allowlist.has(order.normalized_code));
      const reject=policyReject&&!overridden;
      let status="Not evaluated",action="Allow coupon",note="No coupon code to evaluate";
      if(insufficient){status="Allowed, insufficient evidence";note="Fail open: fewer identity signals are available than the merchant policy requires";}
      else if(overridden){status="Merchant override";note="Allowlist override retained with matched evidence";}
      else if(reject){status="Suspected reuse";action="Reject coupon";note="Same coupon was previously used by a buyer matching the identity policy";}
      else if(order.limited_offer&&order.normalized_code){status="Allowed";note="No disqualifying prior use of the same coupon was found";}
      return {order_id:order.order_id,order_date:order.order_date,discount_code:order.discount_code,source_format:order.source_format,order_total:order.order_total_number,discount_amount:order.discount_amount_number,evaluated:Boolean(order.limited_offer&&order.normalized_code),eligible:reject?false:true,status,action,recommended_action:action,reason_codes:best?best.matches:[],matched_evidence:best?best.matches.join(" + "):"",matched_order_id:best?best.orderId:"",prior_order_id:best?best.orderId:"",prior_qualifying_redemptions:candidates.length,estimated_leakage:reject?order.discount_amount_number:0,note};
    });
    const rejected=results.filter(r=>r.action==="Reject coupon"),overrides=results.filter(r=>r.status==="Merchant override");
    return {policy,generated_at:new Date().toISOString(),totals:{orders:results.length,promotion_uses:results.filter(r=>r.evaluated).length,ineligible:rejected.length,flagged:rejected.length,merchant_overrides:overrides.length,estimated_leakage:rejected.reduce((s,r)=>s+r.discount_amount,0)},results};
  }
  function simulate(historyCsv,shopper,options){
    const synthetic=["order_id,email,phone,address,discount_code,order_date,order_total,discount_amount",["CURRENT",shopper.email||"",shopper.phone||"",shopper.address||"",shopper.discount_code||"",shopper.order_date||new Date().toISOString(),"0","0"].map(v=>String(v).includes(",")?'"'+String(v).replace(/"/g,'""')+'"':v).join(",")].join("\n");
    const combined=String(historyCsv||"").trim(); const parsed=parseCsv(combined);
    const generic=["order_id,email,phone,address,discount_code,order_date,order_total,discount_amount",...parsed.map(o=>[o.order_id,o.email,o.phone,o.address,o.discount_code,o.order_date,o.order_total,o.discount_amount].join(",")),synthetic.split("\n")[1]].join("\n");
    const current=audit(generic,options).results.find(r=>r.order_id==="CURRENT");
    return {decision:current.action==="Reject coupon"?"reject_coupon":"allow_coupon",label:current.action,evidence:current.reason_codes,prior_order_id:current.prior_order_id,note:current.note};
  }
  root.BuyerOriginEngine={REQUIRED_COLUMNS:GENERIC_REQUIRED,DEFAULT_POLICY,parseCsv,normalizeEmail,normalizePhone,normalizeAddress,normalizeCode,normalizePolicy,audit,simulate};
})(typeof window!=="undefined"?window:globalThis);
`;
