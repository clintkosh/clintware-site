(()=>{
const TRACKS=[
{id:"portfolio",label:"Enterprise Portfolio",tab:"customers",objective:"Prioritize enterprise accounts around objectives, health, executive alignment, risk, decisions, value, and next actions."},
{id:"success-plan",label:"Success Plan & KPIs",tab:"command",objective:"Translate customer business priorities into measurable success plans, owners, milestones, adoption outcomes, and executive checkpoints."},
{id:"adoption",label:"Adoption & Value Realization",tab:"adoption",objective:"Connect platform adoption and usage to customer-defined outcomes while separating activity, adoption, and realized value."},
{id:"risk",label:"Risk & Escalation",tab:"issues",objective:"Surface adoption, technical, relationship, or commercial risk early and coordinate mitigation across the right teams."},
{id:"executive",label:"Executive Business Review",tab:"meetings",objective:"Turn customer outcomes, evidence, risks, decisions, and next-quarter priorities into an executive decision agenda."},
{id:"growth",label:"Retention & Expansion",tab:"renewal",objective:"Use verified customer value and adoption evidence to support retention, expansion, and broader strategic partnership."},
{id:"advocacy",label:"Advocacy & Referenceability",tab:"roi",objective:"Identify credible value stories and advocacy opportunities only after customer outcomes are evidenced and approved."},
{id:"orchestration",label:"Cross-functional Orchestration",tab:"handoff",objective:"Coordinate Sales, Onboarding, Professional Services, Renewals, Product, Support, and Engineering around explicit owners and customer outcomes."},
{id:"cover",label:"Cover Letter & Positioning",tab:"prep",objective:"Map Clinton Kosh's real evidence to the Customer Success Director operating model without overclaiming."}
];
window.GNS_TRACKS=TRACKS;
const KEEP=new Set(["customers","accounts","command","handoff","adoption","roi","renewal","meetings","prep","issues"]);
for(let i=TABS.length-1;i>=0;i--)if(!KEEP.has(TABS[i][0]))TABS.splice(i,1);
const relabel={customers:"Enterprise Portfolio",accounts:"Account Workspace",command:"Success Plan & KPIs",handoff:"Cross-functional Orchestration",adoption:"Adoption & Value",roi:"Value Evidence & Advocacy",renewal:"Retention & Expansion",meetings:"Executive Business Review",prep:"Cover Letter & Meeting Prep",issues:"Risk & Escalation"};
for(const t of TABS)if(relabel[t[0]])t[1]=relabel[t[0]];
NAV_GROUPS.splice(0,NAV_GROUPS.length,
["Lead",["customers","accounts","command"]],
["Deliver",["handoff","adoption","issues"]],
["Prove",["roi","meetings"]],
["Grow",["renewal","prep"]]
);
const KEY="gnsActiveTrack",SESSION="gnsTrackLaunched";
const byId=id=>TRACKS.find(t=>t.id===id)||null;
const active=()=>{try{return byId(localStorage.getItem(KEY))}catch{return null}};
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function cards(){return TRACKS.map((t,i)=>'<button class="gns-track-card" data-gns-track="'+e(t.id)+'"><span>'+String(i+1).padStart(2,"0")+' · CUSTOMER SUCCESS DIRECTOR</span><strong>'+e(t.label)+'</strong><small>'+e(t.objective)+'</small><b>Open operating surface →</b></button>').join("")}
function chooser(force=false){
 if(!force){try{if(sessionStorage.getItem(SESSION)==="1")return}catch{}}
 document.querySelector(".gns-gate")?.remove();
 const gate=document.createElement("div");gate.className="gns-gate";
 gate.innerHTML='<section class="gns-panel"><header><div class="gns-kicker">Genesys · candidate-built CRM+Cover ASTRO</div><h1>Turn enterprise adoption into measurable customer value.</h1><p>A role-specific operating system for a strategic Customer Success Director: align on business outcomes, drive adoption, prove value, mitigate risk, orchestrate cross-functional execution, protect retention, create expansion paths, and earn customer advocacy.</p></header><div class="gns-disclosure">Built by Clintware from public Genesys role context with synthetic enterprise account data. Not an official Genesys product, customer tenant, or statement of private process.</div><div class="gns-loop"><b>ALIGN</b><i>→</i><b>ADOPT</b><i>→</i><b>PROVE</b><i>→</i><b>MITIGATE</b><i>→</i><b>EXPAND</b><i>→</i><b>ADVOCATE</b><i>→</i><b>ORCHESTRATE</b></div><div class="gns-grid">'+cards()+'</div></section>';
 document.body.appendChild(gate);gate.querySelectorAll("[data-gns-track]").forEach(b=>b.onclick=()=>select(b.dataset.gnsTrack));
}
function select(id){const t=byId(id);if(!t)return;try{localStorage.setItem(KEY,id);sessionStorage.setItem(SESSION,"1")}catch{}tab=t.tab;document.querySelector(".gns-gate")?.remove();render()}
const COVER=[
"Dear Genesys Hiring Team,",
"",
"I am applying for the Customer Success, Director role because the operating model behind it closely matches the work I have spent my career doing: taking complex enterprise customers from post-sale ambiguity to measurable adoption, executive alignment, risk visibility, and durable value.",
"",
"Across enterprise cybersecurity and cloud environments, I have owned portfolios of roughly 20–40 customers representing about $3M in ARR, partnered with executive and technical stakeholders, led escalations, built success plans and operating cadences, and connected adoption work to retention and expansion. At Dedrone, my work contributed to a 20% improvement in renewals and a 25% increase in engagement. I also standardized onboarding to roughly one month and helped improve portfolio visibility from about 40% to approximately 99%.",
"",
"What I would bring to Genesys is not a relationship-only version of Customer Success. My strength is the operating layer between customer goals and cross-functional execution: clarifying outcomes and KPIs, identifying risk early, coordinating Support, Product, Engineering, Sales, and implementation resources, and making executive reviews decision-oriented rather than activity-oriented.",
"",
"I am particularly interested in Genesys because customer experience technology sits at the intersection of business outcomes, operational change, AI, and complex enterprise adoption. That is the kind of environment where I do my best work.",
"",
"I would welcome the opportunity to discuss how I could help Genesys customers turn adoption into measurable value, stronger retention, and credible expansion.",
"",
"Clinton Kosh"
].join("\n");
function coverTool(){
 if(tab!=="prep")return "";
 return '<section class="gns-tool"><label>CRM+Cover · tailored application narrative</label><h3>Genesys Customer Success Director cover letter</h3><p>Built from established career evidence and the role operating model. Edit locally; nothing here requires server-side state.</p><textarea class="gns-cover" id="gns-cover">'+e(COVER)+'</textarea><div style="margin-top:10px"><button class="btn primary" id="gns-copy-cover">Copy cover letter</button></div></section>';
}
function inject(){
 const mark=document.querySelector(".dplr-mark");if(mark)mark.textContent="G";
 const brand=document.querySelector(".dplr-brand strong");if(brand)brand.textContent="Genesys Customer Success Director Operating System";
 const sub=document.querySelector(".dplr-brand small");if(sub)sub.textContent="CRM+Cover · candidate proof-of-work · synthetic account data";
 const tools=document.querySelector(".dplr-header-tools");
 if(tools&&!tools.querySelector("#gns-switch")){const b=document.createElement("button");b.id="gns-switch";b.className="btn";b.textContent="Switch operating track";b.onclick=()=>chooser(true);tools.prepend(b)}
 const main=document.querySelector(".dplr-main"),t=active();
 if(main&&t&&!main.querySelector(".gns-banner")){const d=document.createElement("div");d.className="gns-banner";d.innerHTML='<div><span>Customer Success, Director</span><strong>'+e(t.label)+'</strong><small>'+e(t.objective)+'</small></div><div class="actions"><button class="btn" id="gns-cover-jump">Open cover letter</button></div>';main.prepend(d);d.querySelector("#gns-cover-jump").onclick=()=>select("cover")}
 if(main&&tab==="prep"&&!main.querySelector(".gns-tool")){main.querySelector(".gns-banner")?.insertAdjacentHTML("afterend",coverTool());const b=document.querySelector("#gns-copy-cover");if(b)b.onclick=async()=>{const v=document.querySelector("#gns-cover")?.value||COVER;try{await navigator.clipboard.writeText(v);b.textContent="Copied"}catch{b.textContent="Select + copy"}}}
}
const priorRender=render;
render=function(){priorRender();inject();try{if(sessionStorage.getItem(SESSION)!=="1")chooser(false)}catch{chooser(false)}};
if(document.querySelector("#app")?.children.length)render();
})();