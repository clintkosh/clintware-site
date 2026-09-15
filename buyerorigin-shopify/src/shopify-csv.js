function rawCsv(text) {
  const rows=[]; let row=[], field="", quoted=false;
  const input=String(text||"").replace(/^\uFEFF/,"");
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(quoted){if(c==='"'&&input[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}
    else if(c==='"')quoted=true;else if(c===","){row.push(field);field="";}else if(c==="\n"){row.push(field);rows.push(row);row=[];field="";}else if(c!=="\r")field+=c;
  }
  if(field.length||row.length){row.push(field);rows.push(row);}
  return rows.filter(cells=>cells.some(cell=>String(cell).trim()));
}
const key=(v)=>String(v||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
const first=(row,names)=>{for(const name of names){const v=row[key(name)];if(String(v||"").trim())return String(v).trim();}return "";};
const joinAddress=(row,prefix)=>["address1","address2","city","province","province_code","zip","country","country_code"].map(s=>row[key(prefix+" "+s)]).filter(Boolean).join(" ");

export function parseShopifyOrdersCsv(text) {
  const raw=rawCsv(text); if(!raw.length)return [];
  const headers=raw[0].map(key);
  if(!headers.includes("name")||(!headers.includes("created_at")&&!headers.includes("paid_at"))||(!headers.includes("discount_code")&&!headers.includes("discount_codes"))) throw new Error("Expected an unedited Shopify Orders CSV export");
  const rows=raw.slice(1).map(cells=>Object.fromEntries(headers.map((h,i)=>[h,String(cells[i]||"").trim()])));
  const byId=new Map(); let current=null;
  for(const row of rows){
    const explicit=first(row,["Name","Id","Order ID","Order"]); let id=explicit||current?.orderId; if(!id)continue;
    let order=byId.get(id);
    if(!order){
      const shipping=joinAddress(row,"Shipping"),billing=joinAddress(row,"Billing");
      order={orderId:id,email:first(row,["Email","Contact Email"]),phone:first(row,["Phone","Shipping Phone","Billing Phone"]),address:shipping||billing,orderDate:first(row,["Created at","Paid at","Processed at"]),discountCodes:[],discountAmount:first(row,["Discount Amount","Discounts","Total Discounts"])};
      byId.set(id,order);
    }
    const code=first(row,["Discount Code","Discount Codes"]); if(code&&!order.discountCodes.some(x=>x.code.toLowerCase()===code.toLowerCase()))order.discountCodes.push({code,amount:order.discountAmount||null});
    if(!order.email)order.email=first(row,["Email","Contact Email"]); if(!order.phone)order.phone=first(row,["Phone","Shipping Phone","Billing Phone"]); if(!order.address){const shipping=joinAddress(row,"Shipping"),billing=joinAddress(row,"Billing");order.address=shipping||billing;}
    current=order;
  }
  return [...byId.values()];
}
