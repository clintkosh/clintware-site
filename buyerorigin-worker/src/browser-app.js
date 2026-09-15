export const SAMPLE_CSV = `Name,Email,Phone,Created at,Total,Discount Code,Discount Amount,Shipping Address1,Shipping City,Shipping Province,Shipping Zip,Shipping Country,Lineitem name
#1001,alex.smith+first@gmail.com,(512) 555-0101,2026-08-01,100.00,WELCOME20,20.00,10 Oak Street,Austin,TX,78701,US,Widget A
,,,,,,,,,,,,Widget B
#1002,jordan@example.com,512-555-0144,2026-08-03,85.00,WELCOME20,17.00,55 Pine Road,Austin,TX,78702,US,Widget C
#1003,alexsmith@gmail.com,5125550101,2026-08-09,120.00,welcome20,24.00,10 Oak St,Austin,TX,78701,US,Widget D
#1004,alexsmith@gmail.com,5125550101,2026-08-12,64.00,OTHER10,6.40,10 Oak St,Austin,TX,78701,US,Widget E`;
export const BROWSER_APP = String.raw`
(function () {
  "use strict";
  const sample=${JSON.stringify(SAMPLE_CSV)}, el=id=>document.getElementById(id);
  const money=value=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value||0); let lastAudit=null;
  function setStatus(message,kind){const node=el("statusMessage");node.textContent=message;node.dataset.kind=kind||"info";}
  function clearTable(){el("resultsBody").replaceChildren();el("resultsEmpty").hidden=false;el("exportButton").disabled=true;}
  function settings(){return {allowlist:el("allowlist").value.split(/[\n,]/).map(v=>v.trim()).filter(Boolean),policy:{min_matching_signals:Number(el("minSignals").value),lookback_days:Number(el("lookbackDays").value),offer_scope:"same_code",max_prior_redemptions:Number(el("maxPrior").value)}};}
  function render(audit){lastAudit=audit;el("ordersValue").textContent=audit.totals.orders;el("promoValue").textContent=audit.totals.promotion_uses;el("flaggedValue").textContent=audit.totals.ineligible;el("leakageValue").textContent=money(audit.totals.estimated_leakage);
    const body=el("resultsBody");body.replaceChildren();audit.results.forEach(row=>{const tr=document.createElement("tr");const values=[row.order_id,row.order_date,row.discount_code||"None",row.status,row.action,row.matched_evidence||row.note,row.prior_order_id||"None",row.prior_qualifying_redemptions,money(row.estimated_leakage)];values.forEach((value,index)=>{const td=document.createElement("td");td.textContent=value;if(index===3)td.dataset.status=row.status.toLowerCase().replace(/\s+/g,"-");tr.appendChild(td);});body.appendChild(tr);});
    el("resultsEmpty").hidden=audit.results.length>0;el("exportButton").disabled=!audit.results.length;setStatus("Audit complete.  "+audit.totals.ineligible+" suspected same-coupon reuse case(s) found.  "+audit.totals.merchant_overrides+" override(s) applied.","success");}
  function analyze(){try{render(window.BuyerOriginEngine.audit(el("csvInput").value,settings()));}catch(error){clearTable();setStatus(error?.message||"Audit failed.","error");}}
  function simulate(){try{const result=window.BuyerOriginEngine.simulate(el("csvInput").value,{email:el("simEmail").value,phone:el("simPhone").value,address:el("simAddress").value,discount_code:el("simCode").value,order_date:new Date().toISOString()},settings());const out=el("simResult");out.textContent=result.label+(result.prior_order_id?"  Prior order: "+result.prior_order_id:"")+"  "+result.note;out.dataset.decision=result.decision;}catch(error){el("simResult").textContent="Cannot simulate until a compatible history CSV is loaded.  "+(error?.message||"");el("simResult").dataset.decision="error";}}
  function esc(value){const text=String(value??"");return /[",\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;}
  function exportCsv(){if(!lastAudit)return;const header=["order_id","order_date","discount_code","status","recommended_action","matched_evidence","prior_order_id","prior_qualifying_redemptions","estimated_leakage","note"];const rows=lastAudit.results.map(row=>header.map(key=>esc(row[key])).join(","));const blob=new Blob([[header.join(","),...rows].join("\n")+"\n"],{type:"text/csv;charset=utf-8"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="buyerorigin-results.csv";document.body.appendChild(link);link.click();URL.revokeObjectURL(link.href);link.remove();}
  el("sampleButton").addEventListener("click",()=>{el("csvInput").value=sample;setStatus("Synthetic Shopify Orders CSV loaded.  Run audit when ready.");});
  el("analyzeButton").addEventListener("click",analyze);el("simulateButton").addEventListener("click",simulate);el("exportButton").addEventListener("click",exportCsv);
  el("csvFile").addEventListener("change",event=>{const file=event.target.files&&event.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{el("csvInput").value=String(reader.result||"");setStatus("CSV loaded locally in this browser.  Nothing was uploaded.");};reader.onerror=()=>setStatus("The CSV could not be read.","error");reader.readAsText(file);});
  clearTable();
})();
`;
