import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { applyBrowserLocalRuntime } from "../dplr-crm/scripts/browser-local-runtime.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../..");
const projectId=process.argv[2]||"";
if(!/^[a-z0-9][a-z0-9-]{1,40}$/.test(projectId))throw new Error("Pass a valid project id.");
const root=path.join(repo,"projects",projectId);
const manifestPath=path.join(root,"manifest.json");
if(!fs.existsSync(manifestPath))throw new Error("Missing manifest: "+manifestPath);
const m=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
if(m.implementation_reference!=="dplr-crm")throw new Error("CRM+Cover local factory currently requires implementation_reference=dplr-crm.");
const refBuild=path.join(repo,".build","dplr-crm");
if(!fs.existsSync(refBuild))throw new Error("Shared DPLR reference build is missing. Pre-materialize it once with CW_ASTRO_REFERENCE_MODE=1.");
const out=path.join(repo,".build",projectId);
fs.rmSync(out,{recursive:true,force:true});
fs.cpSync(refBuild,out,{recursive:true});

const clone=x=>JSON.parse(JSON.stringify(x));
const slug=s=>String(s||"item").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"item";
const scenarios=Array.isArray(m.seed_scenarios)?m.seed_scenarios:[];
if(scenarios.length<5)throw new Error("CRM+Cover role manifests require at least five seed scenarios.");
for(const s of scenarios){
  if(!Array.isArray(s.kpis)||s.kpis.length<3)throw new Error("Each seed scenario requires at least three KPIs: "+s.name);
  if(!Array.isArray(s.actions)||s.actions.length<2)throw new Error("Each seed scenario requires at least two actions: "+s.name);
}
const stakeholderRoles=Array.isArray(m.stakeholder_roles)&&m.stakeholder_roles.length>=3?m.stakeholder_roles:[
  "Executive Sponsor / Value Owner","Operational Owner","Systems / Data Owner"
];

function customer(s,i){
  return {
    id:(i===0?"golden-":"sample-")+slug(s.name),
    name:s.name,
    nameStatus:i===0?"Golden example customer · synthetic":"Synthetic role-specific sample account",
    industry:s.industry,
    stage:s.stage,
    week:null,
    provenance:"synthetic_sample",
    isGoldenExample:i===0,
    protected:i===0,
    defaultSample:true,
    isSynthetic:true,
    sourceFile:"Synthetic "+m.company+" "+m.roles[0].name+" operating scenario",
    portfolio:{health:s.health||"Watch",priority:s.priority||"Medium",owner:s.owner||"Clint Kosh (Candidate Demo)",nextAction:s.next_action||s.actions?.[0]?.title||"Review next action"},
    facts:{
      users:s.personas||stakeholderRoles.join("; "),
      product:s.scope||m.role_mission,
      committedTimeline:s.timeline||"Role-specific operating cadence",
      roiTarget:s.success||s.kpis.map(x=>x.target).join("; "),
      kickoff:s.current_state||s.stage,
      unvalidatedDependencies:s.dependency||"No critical dependency recorded",
      successMetrics:s.success||s.kpis.map(x=>x.name+": "+x.target).join("; "),
      currentSystems:(s.systems||[]).join("; ")
    }
  };
}

function richRows(s,customerName){
  const p="synthetic_sample";
  const milestones=(Array.isArray(s.milestones)&&s.milestones.length?s.milestones:[
    {title:"Validate current state and decision criteria",owner:"Role owner + stakeholder",due:"Current cycle",status:"Done",column:"Done"},
    {title:"Close highest-risk dependency",owner:"Role owner + cross-functional partner",due:"Next checkpoint",status:"In Progress",column:"In Progress"},
    {title:"Measure target outcome and prepare next decision",owner:"Role owner",due:"End of cycle",status:"Planned",column:"Ready"}
  ]);
  const rows=[
    ["handoff",p,{title:"Role operating context",value:s.context||m.role_mission,validation:"Synthetic candidate scenario",note:s.goal||""}],
    ["handoff",p,{title:"Customer / business objective",value:s.goal||"",validation:"Synthetic candidate scenario",note:s.success||""}],
    ["risk",p,{title:s.risk?.title||s.dependency||"Primary operating risk",impact:s.risk?.impact||"May affect customer outcome, operational efficiency, adoption, forecast quality, or retention.",owner:s.risk?.owner||"Role owner + cross-functional partner",mitigation:s.risk?.mitigation||"Validate evidence, assign an owner, define acceptance criteria, and remeasure.",escalationStatus:s.risk?.status||"Open",nextDecision:s.risk?.nextDecision||"Confirm owner, evidence source, and next checkpoint."}],
    ["meeting",p,{title:s.meeting||"Operating review",type:s.meeting_type||"Operating review",date:s.meeting_date||"Next checkpoint",attendees:stakeholderRoles.join("; "),objective:s.goal||m.role_mission,notes:"Synthetic role-specific meeting context."}],
    ["renewal",p,{renewalDate:s.renewal_date||"Not applicable / validate",term:s.term||"Synthetic planning horizon",arr:s.arr||"Synthetic / not claimed",valueRealized:"Pending evidence review",renewalPlan:s.renewal_plan||"Use verified outcomes and risk state to determine next commercial motion.",expansionSignals:s.expansion||"No expansion claim without evidence.",notes:"Synthetic candidate operating scenario."}],
    ["raci","template",{title:m.roles[0].name+" operating RACI",rows:[],roles:stakeholderRoles,note:"Synthetic template. Assign real decision rights only after validation."}],
    ["call_prep","internal_proposal",{title:(s.meeting||"Operating review")+" prep",meetingDate:s.meeting_date||"Next checkpoint",meetingType:s.meeting_type||"Operating review",objective:s.goal||m.role_mission,attendees:stakeholderRoles.join("; "),opening:"Start with the outcome and the decision required. Separate evidence from assumptions.",currentState:s.current_state||s.stage,evidenceReady:s.kpis.map(x=>x.name+" source: "+(x.source||"to validate")).join("; "),questions:"What changed? Which metric is decision-relevant? What is blocked? Who owns the next action? What evidence is still missing?",decisions:"Confirm priority, owner, due date, measurement source, and next checkpoint.",escalationCriteria:"Escalate when the outcome, customer experience, data integrity, or committed timeline is materially at risk and the issue cannot be resolved within the role's normal operating path.",followUp:"Publish decisions, owners, due dates, evidence gaps, and next checkpoint. Keep the follow-up concise.",technologyNotes:(s.systems||[]).join("; "),assistantNotes:"Evidence gate: never turn an illustrative or AI-generated number into a factual claim. Answer, prove, connect, stop."}],
    ["document",p,{name:slug(customerName)+"-operating-brief.md",classification:"Synthetic candidate artifact",binaryStatus:"Built-in sample",approvedForBriefs:"Yes"}],
    ["assistant_profile","template",{title:"Role operating assistant",playbook:"SOURCE GATE: Every consequential number must resolve to a source or be labeled hypothetical.\nANSWER GATE: Answer -> proof -> role link -> stop.\nCORE BEFORE EXTRAS: Perfect the requested deliverable before bonus artifacts.\nAI GATE: Automation prepares and synthesizes; human judgment owns validation and consequential outbound communication.\nFOLLOW-UP GATE: 100-175 words, one substantive takeaway, one proof point, continued interest, then stop.",participants:"",updatedFrom:"CRM+Cover ASTRO quality gates"}]
  ];
  for(const k of s.kpis){
    const sourceId=k.source_id||("SYN-"+slug(customerName)+"-"+slug(k.name));
    const claimClass=String(k.claim_class||"SYNTHETIC").toUpperCase();
    rows.push(["kpi",p,{
      name:k.name,
      hypothesis:k.hypothesis||s.goal||"",
      baseline:k.baseline||"Synthetic baseline",
      target:k.target,
      metricDefinition:k.definition||"Define and validate the measurement contract.",
      definition:k.definition||"Define and validate the measurement contract.",
      sourceSystem:k.source||"Synthetic source to validate",
      source:k.source||"Synthetic source to validate",
      sourceId,
      source_id:sourceId,
      claimClass,
      claim_class:claimClass,
      synthetic:claimClass==="SYNTHETIC",
      scenarioPurpose:k.scenario_purpose||s.goal||m.role_mission,
      logicSource:k.logic_source||("Synthetic role scenario: "+(s.goal||m.role_mission)),
      owner:k.owner||"Role owner",
      cadence:k.cadence||"Weekly",
      calculation:k.calculation||"Defined in metric contract",
      currentValue:k.current||"In progress",
      realizedValue:"Not claimed",
      approval:"Synthetic sample",
      lastUpdated:k.last_updated||"Synthetic seed"
    }]);
  }
  const scenarioStakeholders=Array.isArray(s.stakeholder_roles)&&s.stakeholder_roles.length>=3?s.stakeholder_roles:stakeholderRoles;
  scenarioStakeholders.slice(0,3).forEach((role,i)=>rows.push(["stakeholder",p,{name:["Alex Morgan","Taylor Reed","Jordan Lee"][i]+" (Synthetic)",role,organization:customerName,email:"",phone:"",decisionRole:role,status:i===0?"Active":"Engaged",notes:"Synthetic stakeholder for role-specific operating proof."}]));
  for(const a of s.actions)rows.push(["action",p,{title:a.title,owner:a.owner||"Role owner",due:a.due||"Next checkpoint",status:a.status||"Planned",audience:a.audience||"Internal / Customer"}]);
  (s.systems||[]).forEach(sys=>rows.push(["integration",p,{name:sys,purpose:"Role-relevant system / data source",connectorStatus:"Synthetic context",technicalValidation:s.dependency||"Validate ownership, field definitions, and source-of-truth boundaries."}]));
  s.kpis.slice(0,2).forEach(k=>rows.push(["adoption",p,{name:k.name,value:k.current||"In progress",period:s.timeline||"Current cycle",source:k.source||"Synthetic source to validate",owner:k.owner||"Role owner"}]));
  milestones.forEach((x,i)=>rows.push(["milestone",p,{title:x.title||String(x),owner:x.owner||"Role owner",due:x.due||"Planned",status:x.status||"Planned",dependencies:x.dependencies||s.dependency||""}]));
  milestones.forEach((x,i)=>rows.push(["deployment_card",p,{title:x.title||String(x),column:x.column||(["Ready","In Progress","Blocked","Review","Done"][i%5]),stageOrder:i+1,sprint:x.sprint||"Current operating cycle",owner:x.owner||"Role owner",dependency:x.dependencies||s.dependency||"",jiraKey:"",jiraUrl:"",notes:"Synthetic operational program card."}]));
  rows.push(["sprint",p,{name:"Current operating cycle",weeks:s.timeline||"Current cycle",goal:s.goal||m.role_mission,planned:milestones.length,completed:Math.max(0,milestones.filter(x=>String(x.status||"").toLowerCase()==="done").length),notes:"Synthetic role-aligned work cycle."}]);
  if((m.tracks||[]).some(t=>t.tab==="issues"))rows.push(["engineering_issue",p,{title:"Cross-functional operating issue · "+(s.dependency||"dependency validation"),severity:s.health==="At Risk"?"High":"Medium",affected:customerName,environment:(s.systems||[]).join("; ")||"Operating workflow",firstObserved:"Current cycle",lastObserved:"Current cycle",actual:s.dependency||"A role-relevant dependency requires validation.",expected:"The operating workflow should have an explicit source of truth, owner, and acceptance condition.",reproducible:"Yes",reproSteps:"Review the synthetic account state, compare the expected operating contract with the current dependency, and confirm the gap.",evidence:"Synthetic CRM records, metric sources, actions, and risk state.",troubleshooting:"Validated ownership and current evidence captured in this synthetic scenario.",workaround:"Use a bounded manual review until the process or data rule is corrected.",businessImpact:"May affect decision quality, execution speed, reporting trust, adoption, or customer outcome.",engineeringAsk:"Confirm the durable process/system correction and its acceptance criteria.",jiraKey:"",jiraUrl:"",status:"Ready for Engineering"}]);
  return rows;
}

const golden=customer(scenarios[0],0);
const goldenRows=richRows(scenarios[0],golden.name);
const KB_SEED=[
  {id:"kb-role-playbook",slug:"role-operating-playbook",title:m.roles[0].name+" Operating Playbook",summary:"Evidence-first operating principles for this candidate demo.",category:"Operating Model",tags:["role","operations","evidence"],status:"published",source:"internal_best_practice",authorLabel:"Clintware ASTRO",body:"Start from the business outcome. Maintain a visible source of truth. Separate facts, assumptions, and synthetic examples. Surface risk early. Define owners and next dates. Validate consequential numbers before they leave draft. Automate preparation and hygiene, while keeping human judgment over commitments and external communication."},
  {id:"kb-quality-gates",slug:"application-quality-gates",title:"Application and Interview Quality Gates",summary:"Permanent controls learned from prior interview and case-study review.",category:"Application QA",tags:["interview","quality","ai"],status:"published",source:"internal_best_practice",authorLabel:"Clintware ASTRO",body:"SOURCE GATE: No orphan metrics. ANSWER GATE: Answer, proof, role link, stop. CORE BEFORE EXTRAS: Requested deliverable before bonus artifacts. PERSONAL CONNECTION: Keep it reciprocal and brief; do not manufacture intimacy afterward. FOLLOW-UP: 100-175 words. AI: Human validates consequential claims and outbound communication. RED TEAM: Ask where every number came from before submission."}
];

const workerPath=path.join(out,"src","index.js");
let worker=fs.readFileSync(workerPath,"utf8");
const a=worker.indexOf("const CUSTOMER=");
const b=worker.indexOf("export class DPLCRM",a);
if(a<0||b<0)throw new Error("DPLR seed block not found.");
const block="const CUSTOMER="+JSON.stringify(golden)+";\nconst SEED="+JSON.stringify(goldenRows)+";\nconst KB_SEED="+JSON.stringify(KB_SEED)+";\n\n";
worker=worker.slice(0,a)+block+worker.slice(b);
fs.writeFileSync(workerPath,worker);

const samples=scenarios.slice(1).map((s,i)=>{
  const c=customer(s,i+1);
  return {n:c.name,i:c.industry,st:c.stage,sm:s.context||m.role_mission,sc:s.scope||m.role_mission,sys:(s.systems||[]).join("; "),g:s.goal||"",met:s.success||s.kpis.map(x=>x.name+": "+x.target).join("; "),tl:s.timeline||"",dep:s.dependency||"",cs:"Synthetic context",pv:"synthetic_sample",portfolio:c.portfolio,kpis:s.kpis,actions:s.actions,risk:s.risk,meeting:s.meeting,meeting_type:s.meeting_type,meeting_date:s.meeting_date,milestones:s.milestones||[],renewal_date:s.renewal_date||"",renewal_plan:s.renewal_plan||"",expansion:s.expansion||""};
});
fs.writeFileSync(path.join(out,"src","sample-customers.js"),"export const SAMPLE_SEED_VERSION=3;\nexport const SAMPLE_CUSTOMERS="+JSON.stringify(samples,null,2)+";\n");

const richSampleRecords=s=>richRows(s,String(s.n||"Sample Account"));
const local=await applyBrowserLocalRuntime({
  out,
  appId:projectId,
  workspaceId:(m.workspace_id||projectId+"-workspace"),
  serviceName:"clintware-"+projectId,
  workspaceName:m.name+" browser-local workspace",
  version:Number(m.seed_version||1),
  sampleRecordFactory:richSampleRecords
});

const domain=new URL(m.domain).hostname;
const wranglerPath=path.join(out,"wrangler.jsonc");
const wrangler=JSON.parse(fs.readFileSync(wranglerPath,"utf8"));
wrangler.name="clintware-"+projectId;
wrangler.workers_dev=false;
wrangler.preview_urls=false;
wrangler.routes=[{pattern:domain,custom_domain:true}];
wrangler.assets={directory:"./public",binding:"ASSETS",run_worker_first:false};
fs.writeFileSync(wranglerPath,JSON.stringify(wrangler,null,2)+"\n");

const profile={
  projectId,company:m.company,role:m.roles[0].name,domain:m.domain,jobUrl:m.public_sources?.[0]?.url||"",
  mission:m.role_mission,operatingLoop:m.operating_loop||[],tracks:m.tracks||[],
  disclosure:m.disclosure,uiReplacements:m.ui_replacements||{},
  publicPresentation:m.public_presentation||{},
  roleProblem:m.role_problem_hypothesis||"",
  coverageModel:m.coverage_model||{},
  systemMap:m.system_map||[],
  routingRules:m.routing_rules||[],
  applicationBundle:m.application_bundle||{},
  qualityGates:[
    "Every consequential metric must resolve to a source or be labeled hypothetical.",
    "Answer -> proof -> role link -> stop.",
    "Perfect the requested deliverable before adding bonus artifacts.",
    "Keep personal connection reciprocal; do not manufacture intimacy in follow-up.",
    "Follow-up defaults to 100-175 words and stops after one value point.",
    "AI may prepare and synthesize; human judgment validates claims and owns consequential outbound communication."
  ]
};
const profileJs=String.raw`(()=>{const P=${JSON.stringify(profile)};
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const PP=P.publicPresentation||{};
const showTarget=PP.show_target_identity!==false;
const showApplication=PP.show_application_surface!==false;
const displayName=PP.name||(showTarget?P.company+" · "+P.role:"Operations Workspace");
const displaySubtitle=PP.subtitle||(showTarget?"candidate operating prototype":"candidate-built operating system");
const unique=[];for(const t of P.tracks){if(t.tab&&!unique.some(x=>x[0]===t.tab))unique.push([t.tab,t.label])}
const tail=[["prep","Meeting Brief"],...(showApplication?[["application","Application"]]:[]),["accounts","Admin"]];
TABS.splice(0,TABS.length,["customers","Portfolio"],["command","Command Center"],...unique.filter(x=>x[0]!=="prep"),...tail);
NAV_GROUPS.splice(0,NAV_GROUPS.length,
  ["Operate",["customers","command",...unique.slice(0,4).map(x=>x[0]).filter(x=>x!=="prep")]],
  ["Inspect",unique.slice(4).map(x=>x[0]).filter(x=>x!=="prep")],
  ["Prepare",["prep",...(showApplication?["application"]:[])]],
  ["Admin",["accounts"]]
);
const baseBody=body,baseRender=render;
function patchRoleUi(){
 const root=document.querySelector("#app");if(!root)return;
 const brand=root.querySelector(".dplr-brand strong");if(brand)brand.textContent=displayName;
 const sub=root.querySelector(".dplr-brand small");if(sub)sub.textContent=displaySubtitle;
 const mark=root.querySelector(".dplr-mark");if(mark&&PP.mark)mark.textContent=String(PP.mark).slice(0,2);
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let n;
 while((n=walker.nextNode())){
   let v=n.nodeValue||"";
   v=v.split("Doppel").join(showTarget?P.company:(PP.source_label||"Source platform"));
   for(const [a,b] of Object.entries(P.uiReplacements||{}))v=v.split(a).join(b);
   n.nodeValue=v;
 }
 if(PP.theme){
   const r=document.documentElement;
   for(const [k,v] of Object.entries(PP.theme))if(v)r.style.setProperty("--"+k,String(v));
   if(PP.default_dark!==false)r.dataset.theme="dark";
 }
}
function coveragePage(){
 const a=Array.isArray(P.coverageModel?.assignments)?P.coverageModel.assignments:[];
 const rules=Array.isArray(P.coverageModel?.rules)?P.coverageModel.rules:[];
 return head("Coverage","Coverage & Assignment","One ownership view across direct and partner-sourced work. Assignment is operational context, not a replacement for the source CRM or support system.")+
 '<div class="dplr-kpis"><article><span>Accounts / queues</span><b>'+a.length+'</b><small>synthetic working set</small></article><article><span>Dual-owned</span><b>'+a.filter(x=>x.csm&&x.tam).length+'</b><small>CSM + technical owner</small></article><article><span>Partner motion</span><b>'+a.filter(x=>/partner/i.test(x.motion||"")).length+'</b><small>synthetic routing examples</small></article><article><span>Direct motion</span><b>'+a.filter(x=>/direct/i.test(x.motion||"")).length+'</b><small>synthetic named accounts</small></article></div>'+
 '<div class="tablewrap"><table class="table"><thead><tr><th>Account / queue</th><th>Motion</th><th>CSM</th><th>Technical owner</th><th>Partner / support lane</th><th>Next action</th></tr></thead><tbody>'+
 a.map(x=>'<tr><td>'+esc(x.account)+'</td><td>'+esc(x.motion)+'</td><td>'+esc(x.csm||"—")+'</td><td>'+esc(x.tam||"—")+'</td><td>'+esc(x.lane||"—")+'</td><td>'+esc(x.next_action||"—")+'</td></tr>').join("")+
 '</tbody></table></div>'+
 (rules.length?'<div class="section"><h2>Assignment rules</h2></div><div class="grid g2">'+rules.map(x=>'<div class="card"><div class="eyebrow">'+esc(x.when||"Routing rule")+'</div><h3>'+esc(x.owner||"Owner")+'</h3><p>'+esc(x.action||"")+'</p></div>').join("")+'</div>':'');
}
function flowPage(){
 const systems=Array.isArray(P.systemMap)?P.systemMap:[];
 const rules=Array.isArray(P.routingRules)?P.routingRules:[];
 return head("Flow","Signal & Handoff Flow","Representative role-relevant systems and handoffs. These are synthetic/illustrative unless explicitly sourced; they are not claims about a private internal stack.")+
 '<div class="dplr-flow">'+systems.map((s,i)=>'<div><b>'+String(i+1).padStart(2,"0")+'</b><span><strong>'+esc(s.name||"System")+'</strong>'+esc(s.purpose||"")+'<small style="display:block;margin-top:5px;color:var(--muted)">'+esc(s.truth_line||"Representative source")+'</small></span></div>'+(i<systems.length-1?'<i>→</i>':'')).join("")+'</div>'+
 '<div class="section"><h2>Routing logic</h2></div><div class="grid g2">'+rules.map(r=>'<div class="card"><div class="eyebrow">'+esc(r.signal||"Signal")+'</div><h3>'+esc(r.owner||"Owner")+'</h3><p>'+esc(r.rule||"")+'</p></div>').join("")+'</div>';
}
function appPage(){const b=P.applicationBundle||{},cl=b.cover_letter?.draft||"",why=b.why_company?.draft||"";
 return head("Application",P.company+" · "+P.role,"CRM+Cover package. Public role facts, synthetic demo data, and candidate evidence remain explicitly separated.")+
 '<div class="grid g2" style="margin-top:18px"><div class="card"><div class="eyebrow">Role mission</div><p>'+esc(P.mission)+'</p><div class="eyebrow">Operating loop</div><p>'+esc(P.operatingLoop.join(" -> "))+'</p></div><div class="card"><div class="eyebrow">Quality gates</div><ul>'+P.qualityGates.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div></div>'+
 '<div class="section"><h2>Role map</h2></div><div class="grid g2">'+P.tracks.map(t=>'<div class="card"><div class="eyebrow">'+esc(t.tab)+'</div><h3>'+esc(t.label)+'</h3><p>'+esc(t.objective)+'</p></div>').join("")+'</div>'+
 '<div class="section"><h2>Why company</h2><button class="btn" data-copy-app="why">Copy</button></div><div class="card"><pre style="white-space:pre-wrap">'+esc(why)+'</pre></div>'+
 '<div class="section"><h2>Tailored cover letter</h2><div class="actions"><button class="btn primary" data-copy-app="cover">Copy cover letter</button><button class="btn" id="download-application-pdf">Download application PDF</button></div></div><div class="card"><pre style="white-space:pre-wrap">'+esc(cl)+'</pre></div>'+
 '<div class="callout"><strong>Synthetic boundary</strong><span>'+esc(P.disclosure||"Candidate-built role-specific operating prototype.")+'</span></div>'+
 (P.jobUrl?'<p><a href="'+esc(P.jobUrl)+'" target="_blank" rel="noreferrer">Open verified job posting</a></p>':'');
}
body=function(){
 if(tab==="coverage")return coveragePage();
 if(tab==="flow")return flowPage();
 if(tab==="application"&&showApplication)return appPage();
 let html=baseBody();
 for(const [a,b] of Object.entries(P.uiReplacements||{}))html=html.split(a).join(b);
 const label=showTarget?(P.company+" · "+P.role):displayName;
 return '<div class="callout"><strong>'+esc(label)+'</strong><span>'+esc(P.tracks.find(x=>x.tab===tab)?.objective||P.mission)+'</span></div>'+html
}
function pdfEscape(s){return String(s??"").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)").replace(/[^\x20-\x7E]/g,"?")}
function makePdfBytes(title,text){
 const raw=(title+"\n\n"+text).replace(/\r/g,"").split("\n");
 const lines=[];for(const r of raw){let x=r||" ";while(x.length>92){let cut=x.lastIndexOf(" ",92);if(cut<40)cut=92;lines.push(x.slice(0,cut));x=x.slice(cut).trim()}lines.push(x)}
 const pages=[];for(let i=0;i<lines.length;i+=48)pages.push(lines.slice(i,i+48));
 const objects=[null];const pageIds=[];const streamIds=[];
 objects[1]="<< /Type /Catalog /Pages 2 0 R >>";
 objects[2]="";
 for(const page of pages){const pid=objects.length;pageIds.push(pid);objects.push("");const sid=objects.length;streamIds.push(sid);const stream="BT /F1 10 Tf 48 748 Td 13 TL\n"+page.map((x,i)=>(i?"T* ":"")+"("+pdfEscape(x)+") Tj").join("\n")+"\nET";objects.push("<< /Length "+stream.length+" >>\nstream\n"+stream+"\nendstream")}
 const fontId=objects.length;objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
 pageIds.forEach((pid,i)=>{objects[pid]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 "+fontId+" 0 R >> >> /Contents "+streamIds[i]+" 0 R >>"});
 objects[2]="<< /Type /Pages /Kids ["+pageIds.map(id=>id+" 0 R").join(" ")+"] /Count "+pageIds.length+" >>";
 let pdf="%PDF-1.4\n",offsets=[0];
 for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=i+" 0 obj\n"+objects[i]+"\nendobj\n"}
 const xref=pdf.length;pdf+="xref\n0 "+objects.length+"\n0000000000 65535 f \n";
 for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
 pdf+="trailer\n<< /Size "+objects.length+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF\n";
 return new TextEncoder().encode(pdf)
}
function downloadPdf(name,title,text){
 const bytes=makePdfBytes(title,text),blob=new Blob([bytes],{type:"application/pdf"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);return bytes.length
}
function bindRoleExtras(){
 document.querySelectorAll("[data-copy-app]").forEach(b=>b.onclick=()=>navigator.clipboard.writeText(b.dataset.copyApp==="why"?(P.applicationBundle.why_company?.draft||""):(P.applicationBundle.cover_letter?.draft||"")));
 const ap=document.querySelector("#download-application-pdf");if(ap)ap.onclick=()=>downloadPdf(P.projectId+"-application.pdf",P.company+" · "+P.role,"WHY COMPANY\n\n"+(P.applicationBundle.why_company?.draft||"")+"\n\nCOVER LETTER\n\n"+(P.applicationBundle.cover_letter?.draft||""));
 const prep=document.querySelector("#prep-pdf");if(prep&&window.DPLRPrep?.prepText)prep.onclick=()=>downloadPdf(P.projectId+"-"+String(S.customer?.name||"account").toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-meeting-brief.pdf",P.company+" · "+P.role+" · Meeting Brief",window.DPLRPrep.prepText());
}
render=function(){baseRender();patchRoleUi();bindRoleExtras()};
document.title=displayName+" · Clintware";render();})();`;
fs.writeFileSync(path.join(out,"public","role-profile.js"),profileJs+"\n");
let html=fs.readFileSync(path.join(out,"public","index.html"),"utf8");
html=html.replace(/<title>[\s\S]*?<\/title>/i,"<title>"+(pp.show_target_identity===false?(pp.name||"Operations Workspace"):m.company+" · "+m.roles[0].name)+" · Clintware</title>");
const pp=m.public_presentation||{};
const publicIdentity=pp.show_target_identity===false?(pp.name||"Operations Workspace")+" · "+(pp.subtitle||"candidate-built synthetic operating prototype"):m.company+" · "+m.roles[0].name+" · Candidate-built synthetic operating prototype";
const identityBar='<div id="role-identity" style="font:600 12px/1.4 system-ui,sans-serif;padding:8px 16px;background:#0b1118;color:#e7edf4;border-bottom:1px solid #273241;letter-spacing:.02em">'+publicIdentity+'</div>';
if(!html.includes('id="role-identity"'))html=html.replace('<div id="app"></div>',identityBar+'<div id="app"></div>');
if(!html.includes("/role-profile.js"))html=html.replace("</body>",'  <script src="/role-profile.js"></script>\n</body>');
fs.writeFileSync(path.join(out,"public","index.html"),html);

fs.writeFileSync(path.join(out,"APPLICATION.md"),"# "+m.company+" · "+m.roles[0].name+"\n\n## Why company\n\n"+(m.application_bundle?.why_company?.draft||"")+"\n\n## Cover letter\n\n"+(m.application_bundle?.cover_letter?.draft||"")+"\n");

const claimLedger=clone(m.evidence_provenance||{version:1,claims:[],allowlist:[]});
claimLedger.claims=Array.isArray(claimLedger.claims)?claimLedger.claims:[];
for(const s of scenarios){
  for(const k of (s.kpis||[])){
    const vals=[k.target,k.baseline,k.current].filter(v=>v!==undefined&&v!==null&&String(v).trim());
    claimLedger.claims.push({
      id:k.source_id||("SYN-"+slug(s.name)+"-"+slug(k.name)),
      label:k.name,
      rendered_values:vals,
      claim_class:String(k.claim_class||"SYNTHETIC").toUpperCase(),
      scope:s.name,
      time_window:s.timeline||"Synthetic scenario",
      source:{kind:"synthetic_seed",ref:"projects/"+projectId+"/manifest.json",locator:"seed_scenarios -> "+s.name+" -> "+k.name},
      formula:k.calculation||null,
      inputs:k.inputs||[],
      assumptions:k.assumptions||[],
      scenario_purpose:k.scenario_purpose||s.goal||m.role_mission,
      confidence:"synthetic",
      allowed_contexts:["crm-demo","meeting-brief","application-demo"]
    });
  }
}
fs.writeFileSync(path.join(out,"evidence-provenance.json"),JSON.stringify(claimLedger,null,2)+"\n");
const pkgPath=path.join(out,"package.json");
const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
pkg.name="clintware-"+projectId;
pkg.scripts=pkg.scripts||{};
pkg.scripts.check=(pkg.scripts.check||"node --check src/index.js")+" && node --check public/role-profile.js";
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+"\n");
console.log(JSON.stringify({ok:true,project:projectId,domain:m.domain,customers:local.customers,records:local.records,storage:local.storage},null,2));
