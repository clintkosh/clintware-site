(()=>{
const TRACKS=[
{id:"portfolio",label:"Portfolio & Success Plans",tab:"customers",objective:"Prioritize a GSI portfolio around business objectives, product mix, health, stakeholders, commitments, and next actions."},
{id:"product-fit",label:"Product Fit & Use Cases",tab:"handoff",objective:"Map customer objectives and AI vision to the right mix of Claude API, Claude for Enterprise, and Claude Code use cases."},
{id:"usage",label:"Usage & Adoption",tab:"adoption",objective:"Plan and monitor API consumption plus Enterprise and Claude Code seat adoption, surfacing underutilization and optimization opportunities."},
{id:"value",label:"Value & ROI",tab:"roi",objective:"Connect usage and deployed use cases to agreed outcomes, ROI evidence, and investment narratives without turning targets into realized value."},
{id:"expansion",label:"Expansion & New LOB",tab:"renewal",objective:"Identify additional teams, departments, workflows, and use cases that can create customer value and support a grounded expansion plan."},
{id:"enablement",label:"Change Management & CoE",tab:"rollout",objective:"Coordinate Train-the-Trainer, Center of Excellence, champions, and organizational enablement to make adoption scalable."},
{id:"qbr",label:"Executive QBR",tab:"meetings",objective:"Turn current account state, adoption, value evidence, risks, and expansion hypotheses into a concise executive review and decision agenda."},
{id:"signal",label:"Product & Roadmap Signal",tab:"issues",objective:"Capture customer feedback and recurring use-case friction cleanly for Product, Research, and GTM partners."}
];
window.ANTH_TRACKS=TRACKS;
const KEEP=new Set(["customers","accounts","command","handoff","adoption","roi","rollout","renewal","meetings","prep","issues"]);
for(let i=TABS.length-1;i>=0;i--)if(!KEEP.has(TABS[i][0]))TABS.splice(i,1);
const relabel={customers:"GSI Portfolio",accounts:"Account Workspace",command:"Success Plan",handoff:"Product Fit & Use Cases",adoption:"Usage & Adoption",roi:"Value & ROI",rollout:"Change Management & CoE",renewal:"Expansion Plan",meetings:"Executive QBR",prep:"Meeting Brief",issues:"Product / Roadmap Signal"};
for(const t of TABS)if(relabel[t[0]])t[1]=relabel[t[0]];
NAV_GROUPS.splice(0,NAV_GROUPS.length,
["Plan",["customers","accounts","command","handoff"]],
["Scale",["adoption","rollout"]],
["Prove",["roi","meetings","prep"]],
["Expand",["renewal","issues"]]
);
const KEY="anthActiveTrack",SESSION="anthTrackLaunched";
const byId=id=>TRACKS.find(t=>t.id===id)||null;
const active=()=>{try{return byId(localStorage.getItem(KEY))}catch{return null}};
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ascii=x=>String(x??"").normalize("NFKD").replace(/[^\x20-\x7E]/g,"-");
function cards(){return TRACKS.map((t,i)=>'<button class="anth-track-card" data-anth-track="'+e(t.id)+'"><span>'+String(i+1).padStart(2,"0")+' · GSI Customer Success</span><strong>'+e(t.label)+'</strong><small>'+e(t.objective)+'</small><b>Open operating surface →</b></button>').join("")}
function chooser(force=false){
 if(!force){try{if(sessionStorage.getItem(SESSION)==="1")return}catch{}}
 document.querySelector(".anth-gate")?.remove();
 const gate=document.createElement("div");gate.className="anth-gate";
 gate.innerHTML='<section class="anth-panel"><header><div class="anth-kicker">Anthropic · candidate-built operating prototype</div><h1>Scale AI adoption into measurable customer value.</h1><p>A concise operating system for the Customer Success Manager, GSI motion: align objectives, fit the right Claude capability, manage consumption and seat adoption, prove value, expand use cases, enable the organization, and return clean customer signal.</p></header><div class="anth-disclosure">Built by Clintware from public Anthropic role context with clearly synthetic Systems Integrator account data. Not an official Anthropic product, customer tenant, or statement of private process.</div><div class="anth-loop"><b>ALIGN</b><i>→</i><b>ACTIVATE</b><i>→</i><b>SCALE</b><i>→</i><b>PROVE</b><i>→</i><b>EXPAND</b><i>→</i><b>ENABLE</b><i>→</i><b>SIGNAL</b></div><div class="anth-grid">'+cards()+'</div></section>';
 document.body.appendChild(gate);gate.querySelectorAll("[data-anth-track]").forEach(b=>b.onclick=()=>select(b.dataset.anthTrack));
}
function select(id){const t=byId(id);if(!t)return;try{localStorage.setItem(KEY,id);sessionStorage.setItem(SESSION,"1")}catch{}tab=t.tab;document.querySelector(".anth-gate")?.remove();render()}
function pct(v){const m=String(v||"").match(/([0-9]+(?:\.[0-9]+)?)/);return m?Math.max(0,Math.min(100,Number(m[1]))):0}
function usageTool(){
 if(tab!=="adoption")return "";
 const rec=S?.records||[],items=rec.filter(r=>r.type==="adoption").slice(0,3);
 if(!items.length)return "";
 return '<section class="anth-tool"><label>Consumption + seat adoption</label><h3>Different products, different adoption signals.</h3><p>API consumption, seat activation, and weekly active usage answer different questions. Keep them distinct before deciding where to intervene.</p><div class="anth-metrics">'+items.map(r=>{const v=r.data?.value||"Not recorded",p=pct(v);return '<article class="anth-metric"><small>'+e(r.data?.name||"Metric")+'</small><strong>'+e(v)+'</strong><div class="anth-bar"><i style="width:'+p+'%"></i></div><small>'+e(r.data?.owner||"Owner not recorded")+'</small></article>'}).join("")+'</div></section>'
}
function makePdf(lines){
 const enc=new TextEncoder(),safe=lines.map(ascii).slice(0,52);let y=760;const ops=["BT","/F1 10 Tf"];
 for(const line of safe){const txt=line.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");ops.push("1 0 0 1 46 "+y+" Tm ("+txt.slice(0,116)+") Tj");y-=14}ops.push("ET");
 const stream=ops.join("\n"),objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>","<< /Length "+enc.encode(stream).length+" >>\nstream\n"+stream+"\nendstream"];let pdf="%PDF-1.4\n";const off=[0];objects.forEach((o,i)=>{off[i+1]=enc.encode(pdf).length;pdf+=(i+1)+" 0 obj\n"+o+"\nendobj\n"});const xr=enc.encode(pdf).length;pdf+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";for(let i=1;i<=objects.length;i++)pdf+=String(off[i]).padStart(10,"0")+" 00000 n \n";pdf+="trailer\n<< /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+xr+"\n%%EOF\n";return new Blob([pdf],{type:"application/pdf"})
}
function qbrPdf(){
 const c=S?.customer||{},rec=S?.records||[];
 const k=rec.filter(r=>r.type==="kpi").slice(0,6),risks=rec.filter(r=>r.type==="risk"&&!/closed|resolved|done/i.test(String(r.data?.escalationStatus||""))).slice(0,4),acts=rec.filter(r=>r.type==="action"&&!/closed|complete|done/i.test(String(r.data?.status||""))).slice(0,5);
 const lines=["ANTHROPIC GSI CUSTOMER SUCCESS OPERATING SYSTEM","Candidate-built synthetic QBR brief","",c.name||"No account selected","Stage: "+(c.stage||"Not recorded"),"","Success measures:"];
 k.forEach(r=>lines.push("- "+(r.data?.name||"Metric")+": "+(r.data?.currentValue||"Not recorded")+" | target "+(r.data?.target||"Not recorded")));
 lines.push("","Open risks:");risks.forEach(r=>lines.push("- "+(r.data?.title||"Risk")+" | "+(r.data?.owner||"Unassigned")));
 lines.push("","Next actions:");acts.forEach(r=>lines.push("- "+(r.data?.title||"Action")+" | "+(r.data?.owner||"Unassigned")+" | "+(r.data?.status||"Open")));
 lines.push("","Boundary: public role context + synthetic account data; not an official Anthropic system or customer record.");
 const blob=makePdf(lines),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="anthropic-gsi-qbr-brief.pdf";document.body.appendChild(a);a.click();const href=a.href;a.remove();setTimeout(()=>URL.revokeObjectURL(href),1500)
}
function inject(){
 const mark=document.querySelector(".dplr-mark");if(mark)mark.textContent="A";
 const brand=document.querySelector(".dplr-brand strong");if(brand)brand.textContent="Anthropic GSI Customer Success Operating System";
 const sub=document.querySelector(".dplr-brand small");if(sub)sub.textContent="candidate proof-of-work · synthetic account data";
 const tools=document.querySelector(".dplr-header-tools");
 if(tools&&!tools.querySelector("#anth-switch")){const b=document.createElement("button");b.id="anth-switch";b.className="btn";b.textContent="Switch operating track";b.onclick=()=>chooser(true);tools.prepend(b)}
 const main=document.querySelector(".dplr-main"),t=active();
 if(main&&t&&!main.querySelector(".anth-banner")){const d=document.createElement("div");d.className="anth-banner";d.innerHTML='<div><span>Customer Success Manager, GSI</span><strong>'+e(t.label)+'</strong><small>'+e(t.objective)+'</small></div><div class="actions"><button class="btn" id="anth-qbr">Download QBR brief PDF</button></div>';main.prepend(d);d.querySelector("#anth-qbr").onclick=qbrPdf}
 if(main&&tab==="adoption"&&!main.querySelector(".anth-tool"))main.querySelector(".anth-banner")?.insertAdjacentHTML("afterend",usageTool());
}
const priorRender=render;
render=function(){priorRender();inject();try{if(sessionStorage.getItem(SESSION)!=="1")chooser(false)}catch{chooser(false)}};
if(document.querySelector("#app")?.children.length)render();
})();
