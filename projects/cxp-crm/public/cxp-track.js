(()=>{
const TRACKS=[
{id:"discovery",label:"Discovery & Outcome Map",tab:"handoff",objective:"Turn business objectives, workload requirements, stakeholders, constraints, and success measures into an explicit decision frame."},
{id:"current-state",label:"Current-State Architecture",tab:"implementation",objective:"Map applications, compute, storage, network, security, cloud, private-cloud, contracts, utilization, and operational dependencies."},
{id:"tco",label:"TCO & FinOps",tab:"roi",objective:"Normalize CapEx, OpEx, migration, consumption, licensing, egress, operations, and risk across a comparable decision horizon."},
{id:"vendor-selection",label:"Vendor Evaluation",tab:"adoption",objective:"Score candidate architectures against requirements without hard-coding vendor preference."},
{id:"solution-design",label:"Solution / HLD",tab:"deployment",objective:"Turn the decision into a target architecture with explicit assumptions, dependencies, resilience, security, and migration boundaries."},
{id:"commercial-scope",label:"SOW / BOM / Proposal",tab:"documents",objective:"Package technology and services into a scope the customer can evaluate, with assumptions and exclusions visible."},
{id:"business-case",label:"Executive Business Case",tab:"meetings",objective:"Translate architecture into financial, risk, flexibility, and business-outcome language for executive decision makers."},
{id:"handoff",label:"Delivery Handoff",tab:"renewal",objective:"Transfer decisions, architecture, assumptions, risks, owners, acceptance criteria, and open dependencies without losing context."}
];
window.CXP_TRACKS=TRACKS;
const KEEP=new Set(["customers","accounts","command","handoff","implementation","deployment","risks","roi","adoption","issues","triage","meetings","renewal","documents","prep"]);
for(let i=TABS.length-1;i>=0;i--)if(!KEEP.has(TABS[i][0]))TABS.splice(i,1);
const relabel={customers:"Engagement Portfolio",accounts:"Data & Persistence",command:"Architect Command Center",handoff:"Discovery & Requirements",implementation:"Current-State & Target Architecture",deployment:"Solution / HLD",risks:"Architecture & Commercial Risks",roi:"TCO & FinOps Model",adoption:"Vendor Matrix",issues:"Decision / Dependency Log",triage:"Deal Blockers",meetings:"Executive Business Case",renewal:"Delivery Handoff",documents:"SOW / BOM / Proposal",prep:"Meeting Brief"};
for(const t of TABS)if(relabel[t[0]])t[1]=relabel[t[0]];
NAV_GROUPS.splice(0,NAV_GROUPS.length,
["Plan",["customers","command","handoff","implementation"]],
["Evaluate",["roi","adoption","risks"]],
["Design",["deployment","documents","triage"]],
["Decide",["meetings","prep"]],
["Deliver",["renewal","issues"]],
["Admin",["accounts"]]
);
const KEY="cxpActiveTrack",SESSION="cxpTrackLaunched";
const byId=id=>TRACKS.find(t=>t.id===id)||null;
const active=()=>{try{return byId(localStorage.getItem(KEY))}catch{return null}};
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ascii=x=>String(x??"").normalize("NFKD").replace(/[^\x20-\x7E]/g,"-");
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n)||0);
const customerId=()=>String(S?.customer?.id||"default");
const tcoKey=()=> "cxpTco:"+customerId();
const matrixKey=()=> "cxpMatrix:"+customerId();
function cards(){return TRACKS.map((t,i)=>'<button class="cxp-track-card" data-cxp-track="'+e(t.id)+'"><span>'+String(i+1).padStart(2,"0")+' · Infrastructure Architect</span><strong>'+e(t.label)+'</strong><small>'+e(t.objective)+'</small><b>Open operating surface -></b></button>').join("")}
function chooser(force=false){
 if(!force){try{if(sessionStorage.getItem(SESSION)==="1")return}catch{}}
 document.querySelector(".cxp-gate")?.remove();
 const gate=document.createElement("div");gate.className="cxp-gate";
 gate.innerHTML='<section class="cxp-panel"><header><div class="cxp-kicker">CXponent · candidate-built operating prototype</div><h1>Make the infrastructure decision defensible.</h1><p>A role-specific workspace for the Senior Infrastructure Pre-Sales Architect motion: discovery, workload placement, TCO, vendor comparison, target architecture, commercial scope, executive decision, and delivery handoff.</p></header><div class="cxp-disclosure">Built by Clintware from public CXponent and role context with clearly synthetic engagement data. Not an official CXponent product, customer tenant, or statement of private process.</div><div class="cxp-loop"><b>ALIGN</b><i>→</i><b>DISCOVER</b><i>→</i><b>MODEL</b><i>→</i><b>COMPARE</b><i>→</i><b>RECOMMEND</b><i>→</i><b>SCOPE</b><i>→</i><b>HANDOFF</b></div><div class="cxp-grid">'+cards()+'</div></section>';
 document.body.appendChild(gate);gate.querySelectorAll("[data-cxp-track]").forEach(b=>b.onclick=()=>select(b.dataset.cxpTrack));
}
function select(id){const t=byId(id);if(!t)return;try{localStorage.setItem(KEY,id);sessionStorage.setItem(SESSION,"1")}catch{}tab=t.tab;document.querySelector(".cxp-gate")?.remove();render()}
function getTco(){
 const d={years:3,currentAnnual:1250000,cloudAnnual:930000,migration:380000,privateCapex:1580000,privateAnnual:430000};
 try{return {...d,...JSON.parse(localStorage.getItem(tcoKey())||"{}")}}catch{return d}
}
function calcTco(v){const y=Number(v.years)||3;return{current:(Number(v.currentAnnual)||0)*y,cloud:(Number(v.cloudAnnual)||0)*y+(Number(v.migration)||0),private:(Number(v.privateCapex)||0)+(Number(v.privateAnnual)||0)*y}}
function tcoTool(){
 if(tab!=="roi")return "";
 const v=getTco(),r=calcTco(v);
 return '<section class="cxp-tool" id="cxp-tco"><label>Decision model</label><h3>Comparable TCO model</h3><p>Synthetic values. Normalize the decision horizon before comparing public cloud, private cloud, or a hybrid placement strategy.</p><div class="cxp-form">'+
 '<label>Years<input data-tco="years" type="number" min="1" max="7" value="'+e(v.years)+'"></label>'+
 '<label>Current annual run rate<input data-tco="currentAnnual" type="number" min="0" step="1000" value="'+e(v.currentAnnual)+'"></label>'+
 '<label>Public cloud annual run rate<input data-tco="cloudAnnual" type="number" min="0" step="1000" value="'+e(v.cloudAnnual)+'"></label>'+
 '<label>Migration / transformation<input data-tco="migration" type="number" min="0" step="1000" value="'+e(v.migration)+'"></label>'+
 '<label>Private cloud CapEx<input data-tco="privateCapex" type="number" min="0" step="1000" value="'+e(v.privateCapex)+'"></label>'+
 '<label>Private cloud annual OpEx<input data-tco="privateAnnual" type="number" min="0" step="1000" value="'+e(v.privateAnnual)+'"></label></div>'+
 '<div class="cxp-results"><article><small>Current state</small><strong data-r="current">'+money(r.current)+'</strong></article><article><small>Public cloud</small><strong data-r="cloud">'+money(r.cloud)+'</strong></article><article><small>Private cloud</small><strong data-r="private">'+money(r.private)+'</strong></article></div></section>'
}
function bindTco(){
 const box=document.querySelector("#cxp-tco");if(!box)return;
 const save=()=>{const v=getTco();box.querySelectorAll("[data-tco]").forEach(i=>v[i.dataset.tco]=Number(i.value)||0);localStorage.setItem(tcoKey(),JSON.stringify(v));const r=calcTco(v);for(const k of ["current","cloud","private"]){const n=box.querySelector('[data-r="'+k+'"]');if(n)n.textContent=money(r[k])}};
 box.querySelectorAll("[data-tco]").forEach(i=>i.addEventListener("input",save));
}
function getMatrix(){
 const d=[
  {name:"Public cloud A",fit:4,cost:3,ops:4,migration:3,flex:5},
  {name:"Public cloud B",fit:4,cost:4,ops:4,migration:4,flex:4},
  {name:"Private / HCI",fit:5,cost:4,ops:3,migration:4,flex:3}
 ];
 try{return JSON.parse(localStorage.getItem(matrixKey())||"null")||d}catch{return d}
}
function matrixTool(){
 if(tab!=="adoption")return "";
 const rows=getMatrix().map((r,i)=>'<tr><td><input data-matrix-name="'+i+'" value="'+e(r.name)+'" style="width:150px"></td>'+["fit","cost","ops","migration","flex"].map(k=>'<td><input data-matrix="'+i+':'+k+'" type="number" min="1" max="5" value="'+e(r[k])+'"></td>').join("")+'<td><strong data-score="'+i+'">'+([r.fit,r.cost,r.ops,r.migration,r.flex].reduce((a,b)=>a+Number(b||0),0))+'/25</strong></td></tr>').join("");
 return '<section class="cxp-tool" id="cxp-matrix"><label>Independent evaluation</label><h3>Vendor / architecture comparison</h3><p>Synthetic example. Score against customer requirements, then replace labels and criteria with the actual shortlist.</p><div style="overflow:auto"><table class="cxp-matrix"><thead><tr><th>Option</th><th>Fit</th><th>Cost</th><th>Ops</th><th>Migration</th><th>Flexibility</th><th>Total</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'
}
function bindMatrix(){
 const box=document.querySelector("#cxp-matrix");if(!box)return;
 const save=()=>{const v=getMatrix();box.querySelectorAll("[data-matrix-name]").forEach(i=>v[Number(i.dataset.matrixName)].name=i.value);box.querySelectorAll("[data-matrix]").forEach(i=>{const [n,k]=i.dataset.matrix.split(":");v[Number(n)][k]=Math.max(1,Math.min(5,Number(i.value)||1))});localStorage.setItem(matrixKey(),JSON.stringify(v));v.forEach((r,i)=>{const s=["fit","cost","ops","migration","flex"].reduce((a,k)=>a+Number(r[k]||0),0),el=box.querySelector('[data-score="'+i+'"]');if(el)el.textContent=s+"/25"})};
 box.querySelectorAll("input").forEach(i=>i.addEventListener("input",save));
}
function makePdf(lines){
 const enc=new TextEncoder(),safe=lines.map(ascii).slice(0,52);let y=760;const ops=["BT","/F1 10 Tf"];
 for(const line of safe){const txt=line.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");ops.push("1 0 0 1 46 "+y+" Tm ("+txt.slice(0,116)+") Tj");y-=14}ops.push("ET");
 const stream=ops.join("\n"),objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>","<< /Length "+enc.encode(stream).length+" >>\nstream\n"+stream+"\nendstream"];let pdf="%PDF-1.4\n";const off=[0];objects.forEach((o,i)=>{off[i+1]=enc.encode(pdf).length;pdf+=(i+1)+" 0 obj\n"+o+"\nendobj\n"});const xr=enc.encode(pdf).length;pdf+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";for(let i=1;i<=objects.length;i++)pdf+=String(off[i]).padStart(10,"0")+" 00000 n \n";pdf+="trailer\n<< /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+xr+"\n%%EOF\n";return new Blob([pdf],{type:"application/pdf"})
}
function brief(){
 const t=active()||TRACKS[0],c=S?.customer||{},rec=S?.records||[],v=getTco(),tot=calcTco(v);
 const k=rec.filter(r=>r.type==="kpi").slice(0,5),risks=rec.filter(r=>r.type==="risk"&&!/closed|resolved|done/i.test(String(r.data?.escalationStatus||""))).slice(0,4),acts=rec.filter(r=>r.type==="action"&&!/closed|complete|done/i.test(String(r.data?.status||""))).slice(0,5);
 const lines=["CXponent INFRASTRUCTURE ADVISORY WORKSPACE","Candidate-built synthetic engagement brief","",t.label,t.objective,"","Engagement: "+(c.name||"No account selected"),"Stage: "+(c.stage||"Not recorded"),"","TCO horizon: "+v.years+" years","Current: "+money(tot.current),"Public cloud: "+money(tot.cloud),"Private cloud: "+money(tot.private),"","Decision measures:"];
 k.forEach(r=>lines.push("- "+(r.data?.name||"Metric")+": "+(r.data?.currentValue||"Not recorded")+" | target "+(r.data?.target||"Not recorded")));
 lines.push("","Open risks:");risks.forEach(r=>lines.push("- "+(r.data?.title||"Risk")+" | "+(r.data?.owner||"Unassigned")));
 lines.push("","Next actions:");acts.forEach(r=>lines.push("- "+(r.data?.title||"Action")+" | "+(r.data?.owner||"Unassigned")+" | "+(r.data?.status||"Open")));
 lines.push("","Boundary: public CXponent context + synthetic engagement data; not an official CXponent system.");
 const blob=makePdf(lines),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="cxponent-"+t.id+"-decision-brief.pdf";document.body.appendChild(a);a.click();const href=a.href;a.remove();setTimeout(()=>URL.revokeObjectURL(href),1500)
}
function scopeArtifact(){
 const c=S?.customer||{},v=getTco(),r=calcTco(v),m=getMatrix(),lines=[
  "# Infrastructure Decision Package",
  "",
  "Candidate-built synthetic artifact for "+(c.name||"selected engagement"),
  "",
  "## Decision frame",
  "- Stage: "+(c.stage||"Not recorded"),
  "- Current systems: "+(c.facts?.currentSystems||"Not recorded"),
  "- Success measures: "+(c.facts?.successMetrics||"Not recorded"),
  "",
  "## TCO comparison",
  "- Horizon: "+v.years+" years",
  "- Current state: "+money(r.current),
  "- Public cloud scenario: "+money(r.cloud),
  "- Private cloud scenario: "+money(r.private),
  "",
  "## Vendor / architecture matrix",
  ...m.map(x=>"- "+x.name+": "+["fit","cost","ops","migration","flex"].reduce((a,k)=>a+Number(x[k]||0),0)+"/25"),
  "",
  "## HLD / SOW outline",
  "1. Business outcomes and decision criteria",
  "2. Current-state architecture and workload inventory",
  "3. Target-state architecture and workload placement",
  "4. Security, resilience, networking, and data dependencies",
  "5. Migration waves and implementation assumptions",
  "6. Hardware, software, services, and managed-service scope",
  "7. BOM / licensing assumptions and exclusions",
  "8. Acceptance criteria, owners, risks, and delivery handoff",
  "",
  "Synthetic candidate demonstration. Validate all architecture, pricing, vendor, and customer facts before use."
 ];
 const blob=new Blob([lines.join("\n")],{type:"text/markdown"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="cxponent-hld-sow-outline.md";document.body.appendChild(a);a.click();const href=a.href;a.remove();setTimeout(()=>URL.revokeObjectURL(href),1500)
}
function inject(){
 const mark=document.querySelector(".dplr-mark");if(mark)mark.textContent="C";
 const brand=document.querySelector(".dplr-brand strong");if(brand)brand.textContent="CXponent Infrastructure Advisory Workspace";
 const sub=document.querySelector(".dplr-brand small");if(sub)sub.textContent="candidate proof-of-work · synthetic engagement data";
 const tools=document.querySelector(".dplr-header-tools");
 if(tools&&!tools.querySelector("#cxp-switch")){const b=document.createElement("button");b.id="cxp-switch";b.className="btn";b.textContent="Switch operating track";b.onclick=()=>chooser(true);tools.prepend(b)}
 const main=document.querySelector(".dplr-main"),t=active();
 if(main&&t&&!main.querySelector(".cxp-banner")){const d=document.createElement("div");d.className="cxp-banner";d.innerHTML='<div><span>Senior Infrastructure Pre-Sales Architect</span><strong>'+e(t.label)+'</strong><small>'+e(t.objective)+'</small></div><div class="actions"><button class="btn" id="cxp-scope">Download HLD / SOW outline</button><button class="btn" id="cxp-brief">Download decision brief PDF</button></div>';main.prepend(d);d.querySelector("#cxp-brief").onclick=brief;d.querySelector("#cxp-scope").onclick=scopeArtifact}
 if(main&&tab==="roi"&&!main.querySelector("#cxp-tco")){main.querySelector(".cxp-banner")?.insertAdjacentHTML("afterend",tcoTool());bindTco()}
 if(main&&tab==="adoption"&&!main.querySelector("#cxp-matrix")){main.querySelector(".cxp-banner")?.insertAdjacentHTML("afterend",matrixTool());bindMatrix()}
}
const priorRender=render;
render=function(){priorRender();inject();try{if(sessionStorage.getItem(SESSION)!=="1")chooser(false)}catch{chooser(false)}};
if(document.querySelector("#app")?.children.length)render();
})();
