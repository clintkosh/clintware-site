(()=>{
const TRACKS=[
{id:"csm-portfolio",group:"CSM",label:"Portfolio & Health",tab:"customers",objective:"Prioritize the property-management portfolio using health, stakeholders, risk, and next action."},
{id:"csm-onboarding",group:"CSM",label:"Onboarding & Time-to-Value",tab:"implementation",objective:"Move BoomScreen and BoomReport customers from handoff through readiness and early wins."},
{id:"csm-integrations",group:"CSM",label:"PMS Integrations & Go-Live",tab:"deployment",objective:"Coordinate PMS integrations, workflows, owners, dependencies, and go-live readiness."},
{id:"csm-adoption",group:"CSM",label:"Adoption & Usage",tab:"adoption",objective:"Monitor usage signals, close adoption gaps early, and connect enablement to outcomes."},
{id:"csm-value",group:"CSM",label:"Value / ROI & Reviews",tab:"roi",objective:"Define measurable outcomes and prepare client-facing value and performance reviews."},
{id:"csm-retention",group:"CSM",label:"Retention / Expansion / Voice",tab:"renewal",objective:"Surface churn risk, expansion signals, advocacy, and product feedback while preserving relationship continuity."},
{id:"support-command",group:"Support",label:"Support Command",tab:"command",objective:"Run the service operating pulse across products, customers, priorities, owners, and critical work."},
{id:"support-metrics",group:"Support",label:"SLA / CSAT / Response Metrics",tab:"meetings",objective:"Manage first response, time to resolution, SLA attainment, CSAT, contact rate, and service-quality trends."},
{id:"support-escalations",group:"Support",label:"Escalations & Save Strategies",tab:"triage",objective:"De-escalate complex inquiries, protect customer outcomes, and route evidence-complete technical issues."},
{id:"support-coverage",group:"Support",label:"24/7 Coverage & Handoffs",tab:"rollout",objective:"Coordinate US leadership, offshore coverage, ownership, handoffs, queue continuity, and staffing risk."},
{id:"support-shiftleft",group:"Support",label:"Help Center / AI / Shift Left",tab:"kb",objective:"Convert repeat issues into knowledge, AI-assisted resolution, proactive support, in-product help, and self-service."},
{id:"support-product",group:"Support",label:"Product & Engineering Feedback",tab:"issues",objective:"Turn support evidence into reproducible Product and Engineering feedback with customer impact and clear asks."}
];
window.BM_TRACKS=TRACKS;
const prepIndex=TABS.findIndex(([id])=>id==="prep"); if(prepIndex>=0)TABS.splice(prepIndex,1);
for(const group of NAV_GROUPS){const i=group[1].indexOf("prep");if(i>=0)group[1].splice(i,1)}
const KEY="bmActiveTrack";
const SESSION_KEY="bmTrackLaunched";
const byId=id=>TRACKS.find(t=>t.id===id)||null;
const active=()=>{try{return byId(localStorage.getItem(KEY))}catch{return null}};
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const cleanAscii=x=>String(x??"").normalize("NFKD").replace(/[^\x20-\x7E]/g,"-");

function trackCards(group){
  return TRACKS.filter(t=>t.group===group).map(t=>'<button class="bm-track-card" data-bm-track="'+esc(t.id)+'" data-group="'+esc(t.group)+'"><span>'+esc(t.group)+'</span><strong>'+esc(t.label)+'</strong><small>'+esc(t.objective)+'</small><b>Open track -></b></button>').join("");
}
function showChooser(force=false){
  if(!force){
    try{if(sessionStorage.getItem(SESSION_KEY)==="1")return}catch{}
  }
  document.querySelector(".bm-track-gate")?.remove();
  const prior=active();
  const gate=document.createElement("div");
  gate.className="bm-track-gate";
  gate.innerHTML='<section class="bm-track-panel"><header><div><div class="bm-kicker">BOOM · CANDIDATE OPERATING PROTOTYPE</div><h1>Choose an operating track</h1><p>Twelve role-specific entry points share one synthetic customer workspace. Six focus on Customer Success; six focus on Support leadership.</p></div>'+(prior?'<div class="bm-prior">Last track<br><strong>'+esc(prior.label)+'</strong></div>':'')+'</header><div class="bm-disclosure">Candidate-built demonstration using public role context and clearly synthetic customer data. This is not an official Boom product or production tenant.</div><div class="bm-track-groups"><section><h2>Customer Success · 6</h2><div class="bm-track-grid">'+trackCards("CSM")+'</div></section><section><h2>Support · 6</h2><div class="bm-track-grid">'+trackCards("Support")+'</div></section></div></section>';
  document.body.appendChild(gate);
  gate.querySelectorAll("[data-bm-track]").forEach(btn=>btn.addEventListener("click",()=>selectTrack(btn.dataset.bmTrack)));
}
function selectTrack(id){
  const t=byId(id); if(!t)return;
  try{localStorage.setItem(KEY,id);sessionStorage.setItem(SESSION_KEY,"1")}catch{}
  tab=t.tab;
  document.querySelector(".bm-track-gate")?.remove();
  render();
}
function sharedOperatingModel(){
  const rows=TRACKS.map((t,i)=>'<tr><td><b>'+String(i+1).padStart(2,"0")+'</b></td><td>'+esc(t.group)+'</td><td><strong>'+esc(t.label)+'</strong></td><td>'+esc(t.objective)+'</td><td><button class="btn" data-bm-track="'+esc(t.id)+'">Open</button></td></tr>').join("");
  return '<div class="dplr-section-head"><div><div class="dplr-kicker">Dual-track customer operating model</div><h1>Customer Success + Support</h1><p>One customer context from onboarding through adoption, service, escalation, learning, and retention.</p></div></div>'+
    '<div class="bm-journey"><span>HANDOFF</span><i>-></i><span>ONBOARD</span><i>-></i><span>INTEGRATE</span><i>-></i><span>ADOPT</span><i>-></i><span>MEASURE</span><i>-></i><span>SUPPORT</span><i>-></i><span>ESCALATE</span><i>-></i><span>LEARN</span><i>-></i><span>RETAIN</span></div>'+
    '<div class="section"><h2>12 launch tracks</h2><p class="muted">Tracks change the operating lens, not the underlying customer truth.</p></div><div class="tablewrap"><table class="table"><thead><tr><th>#</th><th>Role</th><th>Track</th><th>Operating objective</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<div class="dplr-two bm-contract"><section class="dplr-panel"><h2>Customer Success contract</h2><p>Relationship continuity, onboarding, adoption, measurable value, customer risk, stakeholder alignment, retention, and customer advocacy.</p></section><section class="dplr-panel"><h2>Support contract</h2><p>Service execution, queue health, response and resolution quality, escalations, knowledge, coverage, repeat-contact reduction, and evidence for Product/Engineering.</p></section></div>';
}

function makePdf(lines){
  const enc=new TextEncoder();
  const safe=lines.map(cleanAscii).slice(0,42);
  let y=760;
  const ops=["BT","/F1 11 Tf"];
  for(const line of safe){
    const txt=line.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
    ops.push("1 0 0 1 48 "+y+" Tm ("+txt.slice(0,108)+") Tj");
    y-=17;
  }
  ops.push("ET");
  const stream=ops.join("\n");
  const objects=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length "+enc.encode(stream).length+" >>\nstream\n"+stream+"\nendstream"
  ];
  let pdf="%PDF-1.4\n";
  const offsets=[0];
  objects.forEach((obj,i)=>{offsets[i+1]=enc.encode(pdf).length;pdf+=(i+1)+" 0 obj\n"+obj+"\nendobj\n"});
  const xref=enc.encode(pdf).length;
  pdf+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";
  for(let i=1;i<=objects.length;i++) pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
  pdf+="trailer\n<< /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF\n";
  return new Blob([pdf],{type:"application/pdf"});
}
function downloadBrief(){
  const t=active()||TRACKS[0];
  const c=S?.customer||{};
  const actions=(S?.records||[]).filter(r=>r.type==="action"&&!/done|closed|complete/i.test(String(r.data?.status||""))).slice(0,5);
  const risks=(S?.records||[]).filter(r=>r.type==="risk"&&!/done|closed|resolved/i.test(String(r.data?.escalationStatus||""))).slice(0,4);
  const kpis=(S?.records||[]).filter(r=>r.type==="kpi").slice(0,5);
  const lines=[
    "BOOM CSM + SUPPORT DUAL-TRACK OS",
    "Candidate-built synthetic operating brief",
    "",
    "Track: "+t.group+" / "+t.label,
    "Objective: "+t.objective,
    "Customer: "+(c.name||"No customer selected"),
    "Stage: "+(c.stage||"Not recorded"),
    "",
    "KPIs:"
  ];
  kpis.forEach(r=>lines.push("- "+(r.data?.name||"Metric")+": "+(r.data?.currentValue||r.data?.value||"Not recorded")+" | target "+(r.data?.target||"Not recorded")));
  lines.push("","Open risks:");
  risks.forEach(r=>lines.push("- "+(r.data?.title||"Risk")+" | owner "+(r.data?.owner||"Unassigned")));
  lines.push("","Next actions:");
  actions.forEach(r=>lines.push("- "+(r.data?.title||"Action")+" | "+(r.data?.owner||"Unassigned")+" | "+(r.data?.status||"Open")));
  lines.push("","Boundary: public role context + synthetic customer data; not an official Boom system.");
  const blob=makePdf(lines);
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="boom-"+t.id+"-brief.pdf";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
function injectChrome(){
  const brand=document.querySelector(".dplr-brand strong");
  if(brand)brand.textContent="Boom CSM + Support OS";
  const sub=document.querySelector(".dplr-brand small");
  if(sub)sub.textContent="candidate operating prototype · synthetic customer data";
  const tools=document.querySelector(".dplr-header-tools");
  if(tools&&!tools.querySelector("#bm-switch-track")){
    const b=document.createElement("button");b.id="bm-switch-track";b.className="btn bm-switch";b.textContent="Switch track";b.onclick=()=>showChooser(true);tools.prepend(b);
  }
  const main=document.querySelector(".dplr-main");
  const t=active();
  if(main&&t&&!main.querySelector(".bm-track-banner")){
    const d=document.createElement("div");d.className="bm-track-banner";
    d.innerHTML='<div><span>'+esc(t.group)+' TRACK</span><strong>'+esc(t.label)+'</strong><small>'+esc(t.objective)+'</small></div><div class="actions"><button class="btn" id="bm-track-brief">Download track brief PDF</button><button class="btn" id="bm-operating-model">12-track map</button></div>';
    main.prepend(d);
    d.querySelector("#bm-track-brief").onclick=downloadBrief;
    d.querySelector("#bm-operating-model").onclick=()=>{tab="operating_model";render()};
  }
  document.querySelectorAll("[data-bm-track]").forEach(btn=>{if(!btn.dataset.bmBound){btn.dataset.bmBound="1";btn.addEventListener("click",()=>selectTrack(btn.dataset.bmTrack))}});
}
const priorBody=body;
body=function(){return tab==="operating_model"?sharedOperatingModel():priorBody()};
const priorRender=render;
render=function(){
  priorRender();
  injectChrome();
  try{if(sessionStorage.getItem(SESSION_KEY)!=="1")showChooser(false)}catch{showChooser(false)}
};
if(document.querySelector("#app")?.children.length) render();
})();
