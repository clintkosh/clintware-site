(()=>{
const TRACKS=[
{id:"discovery",label:"Outcome Discovery",tab:"handoff",objective:"Turn customer mission and business outcomes into explicit technical proof points, stakeholders, constraints, and buying criteria."},
{id:"range-blueprint",label:"Range Blueprint",tab:"implementation",objective:"Map enterprise, cloud, IT, OT, hybrid, identity, tools, data, people, and AI agents into a representative evaluation terrain."},
{id:"evaluation",label:"Evaluation & Success Criteria",tab:"roi",objective:"Define measurable acceptance criteria, evidence sources, thresholds, owners, and decision rules before pilot execution."},
{id:"field-engineering",label:"Field Engineering & Integrations",tab:"deployment",objective:"Build the smallest credible API, scripting, protocol, tool, and agent integrations required to prove the customer decision."},
{id:"demo-pilot",label:"Tailored Demo / Pilot",tab:"triage",objective:"Run realistic demonstrations and evaluations, isolate blockers, and preserve reproducible evidence from scenario to outcome."},
{id:"rfp",label:"RFI / RFP Technical Narrative",tab:"documents",objective:"Map architecture, capability, security, proof, and value into a decision-ready technical narrative."},
{id:"partners",label:"Partner Co-Sell & Enablement",tab:"adoption",objective:"Enable resellers, system integrators, MSSPs, and implementation partners with reusable technical proof and field-ready guidance."},
{id:"close-expand",label:"Technical Close, Expansion & Product Signal",tab:"renewal",objective:"Resolve final technical risk, capture broader use cases, hand off cleanly, and return recurring market signal to Product."}
];
window.SMSPC_TRACKS=TRACKS;
const KEEP=new Set(["customers","accounts","command","handoff","implementation","deployment","risks","roi","adoption","issues","triage","meetings","renewal","documents","prep"]);
for(let i=TABS.length-1;i>=0;i--)if(!KEEP.has(TABS[i][0]))TABS.splice(i,1);
const relabel={
customers:"Opportunity Portfolio",accounts:"Data & Persistence",command:"SE Command Center",handoff:"Discovery & Outcome Map",implementation:"Range Blueprint",deployment:"Field Engineering",risks:"Technical Risks",roi:"Evaluation Scorecard",adoption:"Partner Enablement",issues:"Product / Engineering Signal",triage:"Demo & Pilot Execution",meetings:"Executive / Technical Reviews",renewal:"Technical Close & Expansion",documents:"RFI / RFP Evidence",prep:"Meeting Brief"
};
for(const t of TABS)if(relabel[t[0]])t[1]=relabel[t[0]];
NAV_GROUPS.splice(0,NAV_GROUPS.length,
["Operate",["customers","command","handoff","risks"]],
["Prove",["implementation","deployment","triage","roi"]],
["Influence",["documents","adoption","issues"]],
["Close",["meetings","prep","renewal"]],
["Admin",["accounts"]]
);
const KEY="smspcActiveTrack", SESSION="smspcTrackLaunched";
const byId=id=>TRACKS.find(t=>t.id===id)||null;
const active=()=>{try{return byId(localStorage.getItem(KEY))}catch{return null}};
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ascii=x=>String(x??"").normalize("NFKD").replace(/[^\x20-\x7E]/g,"-");
function cards(){return TRACKS.map((t,i)=>'<button class="smspc-track-card" data-smspc-track="'+e(t.id)+'"><span>0'+(i+1)+' · Senior Solution Engineer</span><strong>'+e(t.label)+'</strong><small>'+e(t.objective)+'</small><b>Open operating surface -></b></button>').join("")}
function chooser(force=false){
 if(!force){try{if(sessionStorage.getItem(SESSION)==="1")return}catch{}}
 document.querySelector(".smspc-gate")?.remove();
 const gate=document.createElement("div");gate.className="smspc-gate";
 gate.innerHTML='<section class="smspc-panel"><header><div class="smspc-kicker">SIMSPACE · CANDIDATE-BUILT OPERATING PROTOTYPE</div><h1>Prove the decision, not just the demo.</h1><p>A role-specific operating system for the current Senior Solution Engineer, Americas posting: discovery, range design, evaluation criteria, field engineering, pilot execution, technical narrative, partner enablement, technical close, and product signal.</p></header><div class="smspc-disclosure">Built by Clintware from public SimSpace role and product context with clearly synthetic opportunity data. This is not an official SimSpace product, customer tenant, or statement of private SimSpace process.</div><div class="smspc-loop"><b>DISCOVER</b><i>→</i><b>MAP</b><i>→</i><b>DESIGN</b><i>→</i><b>BUILD</b><i>→</i><b>PROVE</b><i>→</i><b>CLOSE</b><i>→</i><b>EXPAND</b></div><div class="smspc-grid">'+cards()+'</div></section>';
 document.body.appendChild(gate);
 gate.querySelectorAll("[data-smspc-track]").forEach(b=>b.onclick=()=>select(b.dataset.smspcTrack));
}
function select(id){const t=byId(id);if(!t)return;try{localStorage.setItem(KEY,id);sessionStorage.setItem(SESSION,"1")}catch{}tab=t.tab;document.querySelector(".smspc-gate")?.remove();render()}
function makePdf(lines){
 const enc=new TextEncoder(),safe=lines.map(ascii).slice(0,46);let y=760;const ops=["BT","/F1 10 Tf"];
 for(const line of safe){const txt=line.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");ops.push("1 0 0 1 46 "+y+" Tm ("+txt.slice(0,116)+") Tj");y-=16}ops.push("ET");
 const stream=ops.join("\n"),objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>","<< /Length "+enc.encode(stream).length+" >>\nstream\n"+stream+"\nendstream"];let pdf="%PDF-1.4\n";const off=[0];objects.forEach((o,i)=>{off[i+1]=enc.encode(pdf).length;pdf+=(i+1)+" 0 obj\n"+o+"\nendobj\n"});const xr=enc.encode(pdf).length;pdf+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";for(let i=1;i<=objects.length;i++)pdf+=String(off[i]).padStart(10,"0")+" 00000 n \n";pdf+="trailer\n<< /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+xr+"\n%%EOF\n";return new Blob([pdf],{type:"application/pdf"})
}
function brief(){
 const t=active()||TRACKS[0],c=S?.customer||{},rec=S?.records||[];
 const k=rec.filter(r=>r.type==="kpi").slice(0,5),risks=rec.filter(r=>r.type==="risk"&&!/closed|resolved|done/i.test(String(r.data?.escalationStatus||""))).slice(0,4),acts=rec.filter(r=>r.type==="action"&&!/closed|complete|done/i.test(String(r.data?.status||""))).slice(0,5);
 const lines=["SIMSPACE SENIOR SOLUTION ENGINEER OS","Candidate-built synthetic opportunity brief","",t.label,t.objective,"","Opportunity: "+(c.name||"No account selected"),"Stage: "+(c.stage||"Not recorded"),"","Evaluation evidence:"];
 k.forEach(r=>lines.push("- "+(r.data?.name||"Metric")+": "+(r.data?.currentValue||"Not recorded")+" | target "+(r.data?.target||"Not recorded")));
 lines.push("","Open technical risks:");risks.forEach(r=>lines.push("- "+(r.data?.title||"Risk")+" | "+(r.data?.owner||"Unassigned")));
 lines.push("","Next actions:");acts.forEach(r=>lines.push("- "+(r.data?.title||"Action")+" | "+(r.data?.owner||"Unassigned")+" | "+(r.data?.status||"Open")));
 lines.push("","Boundary: public SimSpace context + synthetic opportunity data; not an official SimSpace system.");
 const blob=makePdf(lines),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="simspace-"+t.id+"-technical-brief.pdf";document.body.appendChild(a);a.click();const href=a.href;a.remove();setTimeout(()=>URL.revokeObjectURL(href),1500)
}
function inject(){
 const mark=document.querySelector(".dplr-mark");if(mark)mark.textContent="S";
 const brand=document.querySelector(".dplr-brand strong");if(brand)brand.textContent="SimSpace SE Operating System";
 const sub=document.querySelector(".dplr-brand small");if(sub)sub.textContent="candidate proof-of-work · synthetic opportunity data";
 const tools=document.querySelector(".dplr-header-tools");
 if(tools&&!tools.querySelector("#smspc-switch")){const b=document.createElement("button");b.id="smspc-switch";b.className="btn";b.textContent="Switch operating track";b.onclick=()=>chooser(true);tools.prepend(b)}
 const main=document.querySelector(".dplr-main"),t=active();
 if(main&&t&&!main.querySelector(".smspc-banner")){const d=document.createElement("div");d.className="smspc-banner";d.innerHTML='<div><span>SENIOR SOLUTION ENGINEER TRACK</span><strong>'+e(t.label)+'</strong><small>'+e(t.objective)+'</small></div><div class="actions"><button class="btn" id="smspc-brief">Download technical brief PDF</button></div>';main.prepend(d);d.querySelector("#smspc-brief").onclick=brief}
}
const priorRender=render;
render=function(){priorRender();inject();try{if(sessionStorage.getItem(SESSION)!=="1")chooser(false)}catch{chooser(false)}};
if(document.querySelector("#app")?.children.length)render();
})();
