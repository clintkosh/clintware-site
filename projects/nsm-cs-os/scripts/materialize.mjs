import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyBrowserLocalRuntime } from "../../dplr-crm/scripts/browser-local-runtime.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const source=path.join(repo,"projects","dpl-crm");
const overlay=path.join(repo,"projects","nsm-cs-os");
const out=path.join(repo,".build","nsm-cs-os");

if(!fs.existsSync(source)) throw new Error("Missing reusable CRM source");
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.cpSync(source,out,{recursive:true});

const read=f=>fs.readFileSync(path.join(out,f),"utf8");
const write=(f,s)=>fs.writeFileSync(path.join(out,f),s);
const between=(src,start,end,replacement)=>{
  const a=src.indexOf(start),b=src.indexOf(end,a);
  if(a<0||b<0) throw new Error("Patch anchor missing: "+start);
  return src.slice(0,a)+replacement+src.slice(b);
};

let src=read("src/index.js");
const replacements=[
  ['const AUTH_CONFIG_URL=AUTH_ORIGIN+"/client-config/dpl-crm";','const AUTH_CONFIG_URL=AUTH_ORIGIN+"/client-config/nsm-cs-os";'],
  ['const APP_ID="dpl-crm";','const APP_ID="nsm-cs-os";'],
  ['const REQUIRED_CONTEXT="dpl-crm:read";','const REQUIRED_CONTEXT="nsm-cs-os:read";'],
  ['const COMPANY_DOMAIN="doppel.com";','const COMPANY_DOMAIN="norsemanservices.com";'],
  ['const WORKSPACE_ID="dpl-doppel";','const WORKSPACE_ID="nsm-norseman-demo";'],
  ['__Host-dpl-','__Host-nsm-'],
  ['ctx.includes("dpl-crm:write")','ctx.includes("nsm-cs-os:write")'],
  ['idFromName("n7demo-main")','idFromName("nsm-cs-main")'],
  ['clintware-dpl-crm','clintware-nsm-cs-os'],
  ['https://dpl.clintware.com','https://nsm.clintware.com'],
  ['Doppel Technical Customer Engineering CRM','NSM ServiceNow Customer Outcomes OS'],
  ['DOPPEL TCE CRM','NSM SERVICE OUTCOMES'],
  ['Doppel Guest Demo','NSM Candidate Demo'],
  ['feature:"dpl_crm"','feature:"nsm_cs_os"'],
  ['task:"dpl_public_research_query"','task:"nsm_public_research_query"'],
  ['task:"dpl_"+mode+"_assistant"','task:"nsm_"+mode+"_assistant"'],
  ['task:"dpl_crm_change_interpreter"','task:"nsm_cs_change_interpreter"'],
  ['task:"dpl_live_customer_assistant"','task:"nsm_live_customer_assistant"'],
  ["form-action 'self' https://auth.clintware.com;","form-action 'self';"],
  ['cookie:fresh?sessionCookie(GUEST_COOKIE,id):""','cookie:fresh?setCookie(GUEST_COOKIE,id,15552000):""'],
  ['persistence:"guest-session"','persistence:"browser-persistent"'],
  ['session?"account":"guest-session"','session?"account":"browser-persistent"'],
  ['identity:AUTH_ORIGIN,oauthApp:APP_ID,','identity:"disabled-no-login-demo",oauthApp:"none",']
];
for(const [a,b] of replacements) src=src.split(a).join(b);

src=src.replace(
 'if(req.method==="GET"&&u.pathname==="/auth/login")return startLogin();',
 'if(req.method==="GET"&&u.pathname==="/auth/login")return j({error:"not_found"},404);'
);
src=src.replace(
 'if(req.method==="GET"&&u.pathname==="/auth/callback")return finishLogin(req,env);',
 'if(req.method==="GET"&&u.pathname==="/auth/callback")return j({error:"not_found"},404);'
);
src=src.replace(
 'if(req.method==="POST"&&u.pathname==="/auth/logout"){const s=await currentSession(req,env).catch(()=>null);if(s)await doStub(env).fetch("https://internal/session/"+encodeURIComponent(s.sid),{method:"DELETE"});return new Response(null,{status:303,headers:secureHeaders(new Headers({location:"/","set-cookie":clearCookie(SESSION_COOKIE)}))})}',
 'if(req.method==="POST"&&u.pathname==="/auth/logout")return j({error:"not_found"},404);'
);
src=src.replace('const session=await currentSession(req,env).catch(()=>null);','const session=null;');

const golden=`const CUSTOMER={
 id:"northstar-financial-group",
 name:"Aegis Federal Programs",
 nameStatus:"Golden example customer · synthetic",
 industry:"Federal / defense",
 stage:"Value / Renewal",
 week:null,
 provenance:"synthetic_sample",
 isGoldenExample:true,
 isSynthetic:true,
 protected:true,
 defaultSample:true,
 sourceFile:"Synthetic target company Director of Customer Success operating scenario",
 portfolio:{segment:"Strategic",arr:780000,renewalDate:"2027-01-31",health:"Watch",healthScore:71,adoption:74,automation:69,sentiment:"Engaged",expansionPotential:180000,renewalForecast:"Likely",risk:"Sponsor transition + evidence exceptions",lifecycle:"Value / Renewal",owner:"CS Lead",products:"Compliance · Risk · Third Party · Trust",framework:"ServiceNow current release · ITIL-aligned",lastExec:"2026-09-12",nextAction:"Land executive value reset",nextReview:"2026-10-02"},
 facts:{users:"CIO, Platform Owner, Service Desk, CMDB Owner, Security Operations, Mission Operations",product:"ServiceNow ITSM, CSM, CMDB/CSDM, ITOM, SecOps, and Now Assist",committedTimeline:"120-day renewal motion",roiTarget:"Make customer value, adoption, risk, renewal confidence, and expansion evidence visible in one operating system",kickoff:"Synthetic mature account entering renewal planning",unvalidatedDependencies:"New executive sponsor has not approved the current value narrative; two CMDB ownership and release-readiness exceptions remain open",successMetrics:"Executive-approved success plan; health >=80; adoption >=85%; renewal forecast moves to Commit; qualified expansion path",currentSystems:"ServiceNow; CMDB/CSDM; ITSM; CSM; ITOM; SecOps"}};
const SEED=[
 ["handoff","synthetic_sample",{title:"Executive success criteria",value:"One approved success plan tying adoption, automated evidence, risk visibility, and audit readiness to executive outcomes.",validation:"Synthetic golden example",note:"Proposed operating model for the public Director of Customer Success role."}],
 ["handoff","synthetic_sample",{title:"Commercial objective",value:"Protect the base renewal while qualifying an additional Now Assist / CSM expansion.",validation:"Synthetic golden example",note:"Illustrative only; not target company customer data."}],
 ["renewal","synthetic_sample",{renewalDate:"2027-01-31",term:"Annual",arr:"$780,000",valueRealized:"Synthetic account has strong platform breadth but incomplete executive value re-baselining.",renewalPlan:"120 days: value reset + risk map. 90 days: executive proof. 60 days: scope and commercial alignment. 30 days: close plan.",expansionSignals:"$180,000 synthetic potential in Now Assist / CSM expansion after sponsor alignment.",notes:"Simulation only · Forecast: Likely"}],
 ["adoption","synthetic_sample",{name:"Core workflow adoption",value:"74%",period:"Current synthetic quarter",source:"Synthetic product telemetry",owner:"Customer Success"}],
 ["adoption","synthetic_sample",{name:"Platform workflow utilization",value:"69%",period:"Current synthetic quarter",source:"Synthetic GRC workflow model",owner:"Customer Success + GRC owner"}],
 ["kpi","synthetic_sample",{name:"Platform health",hypothesis:"A transparent score should surface intervention before renewal risk becomes a surprise.",baseline:"71",target:"90",metricDefinition:"Adoption 30% + outcomes 25% + relationship 20% + support/risk 15% + commercial/renewal 10%",sourceSystem:"Synthetic CRM + product + support model",owner:"Customer Success Operations",cadence:"Weekly",calculation:"Weighted component score",currentValue:"78",realizedValue:"Simulation only",approval:"Synthetic sample"}],
 ["kpi","synthetic_sample",{name:"License utilization",hypothesis:"Renewal confidence should increase when the sponsor approves outcome evidence.",baseline:"64%",target:"80%",metricDefinition:"Documented executive acceptance of success outcomes and next priorities",sourceSystem:"Executive review",owner:"CS Lead",cadence:"Renewal checkpoints",calculation:"Approved / Not approved",currentValue:"72%",realizedValue:"Simulation only",approval:"Synthetic sample"}],
 ["kpi","synthetic_sample",{name:"Critical CI ownership",hypothesis:"Fast onboarding creates room for deeper adoption before renewal.",baseline:"74%",target:"95%",metricDefinition:"Kickoff to first approved customer outcome",sourceSystem:"Synthetic onboarding milestones",owner:"Customer Success",cadence:"Per onboarding",calculation:"Milestone date - kickoff",currentValue:"83%",realizedValue:"Simulation only",approval:"Synthetic sample"}],
 ["stakeholder","synthetic_sample",{name:"Jordan Avery (Synthetic)",role:"Program CIO",organization:"Aegis Federal Programs",email:"",phone:"",decisionRole:"Executive sponsor / value owner",status:"Engaged",notes:"Synthetic stakeholder. Owns executive outcomes and renewal confidence."}],
 ["stakeholder","synthetic_sample",{name:"Priya Nolan (Synthetic)",role:"ServiceNow Platform Owner",organization:"Aegis Federal Programs",email:"",phone:"",decisionRole:"Technical owner / platform governance",status:"Advocate",notes:"Synthetic stakeholder. Owns platform health, release readiness and CMDB governance."}],
 ["stakeholder","synthetic_sample",{name:"Elliot Park (Synthetic)",role:"Director, Service Management",organization:"Aegis Federal Programs",email:"",phone:"",decisionRole:"Operational champion / adoption owner",status:"Engaged",notes:"Synthetic stakeholder. Owns adoption, service-management process and operating outcomes."}],
 ["risk","synthetic_sample",{title:"Executive sponsor changed inside the renewal window",impact:"Strong operational adoption may not translate into renewal confidence if the new sponsor has not approved the value story.",owner:"CS Lead",mitigation:"Run an executive success-plan reset using verified adoption, outcomes, open risks, and next-quarter priorities.",escalationStatus:"Watch",nextDecision:"Approve the executive value narrative at the October review."}],
 ["risk","synthetic_sample",{title:"Two CMDB ownership and release-readiness exceptions remain unresolved",impact:"Exceptions can weaken the control-health narrative and reduce confidence in automation coverage.",owner:"Customer Success + customer GRC owner",mitigation:"Assign accountable owners, due dates, and exception rationale; escalate only overdue critical items.",escalationStatus:"Open",nextDecision:"Close or explicitly accept both exceptions before the 90-day renewal checkpoint."}],
 ["milestone","synthetic_sample",{title:"Executive success-plan reset",owner:"CS Lead + CISO",due:"2026-10-02",status:"In Progress",dependencies:"Approved outcome evidence and current risk view"}],
 ["milestone","synthetic_sample",{title:"Raise adoption above 85%",owner:"Customer Success + GRC champion",due:"2026-11-15",status:"Planned",dependencies:"Role-based enablement and exception cleanup"}],
 ["milestone","synthetic_sample",{title:"Qualify Trust expansion",owner:"CS Lead + Sales",due:"2026-11-30",status:"Planned",dependencies:"Renewal confidence and agreed business case"}],
 ["meeting","synthetic_sample",{title:"Executive value + renewal review",type:"Executive Business Review",date:"2026-10-02",attendees:"CISO; Director GRC; Procurement; CS Lead",objective:"Approve the value narrative, close material risk decisions, and confirm the next 90-day renewal plan.",notes:"Synthetic meeting example."}],
 ["action","synthetic_sample",{title:"Prepare one-page executive value proof",owner:"CS Lead",due:"2026-10-01",status:"In Progress",audience:"Customer"}],
 ["action","synthetic_sample",{title:"Close two CMDB ownership and release-readiness exceptions",owner:"Customer Success + GRC champion",due:"2026-10-02",status:"In Progress",audience:"Customer / Internal"}],
 ["action","synthetic_sample",{title:"Run expansion discovery only after sponsor alignment",owner:"CS Lead + Sales",due:"2026-10-16",status:"Planned",audience:"Customer / Internal"}],
 ["note","synthetic_sample",{title:"Voice of Customer -> Product signal",body:"Executive users want one view that separates control-health exceptions, evidence freshness, and financially material risk without requiring a deep operational drill-down.",impact:"Strategic account · $780,000 synthetic ARR",status:"Proposed",owner:"Customer Success",nextDecision:"Validate across additional accounts before Product prioritization."}],
 ["incident","synthetic_sample",{number:"INC0012847",severity:"2 - High",title:"Portal routing degradation after release",status:"Monitoring",businessImpact:"Case intake delayed for one mission service line",assignmentGroup:"Platform Support",opened:"2026-09-26",nextUpdate:"30 minutes"}],
 ["problem","synthetic_sample",{number:"PRB000418",title:"Routing rule drift after update set promotion",status:"Root cause isolated",knownError:"Rule order depends on stale assignment metadata",nextStep:"Validate fix in sub-prod and attach evidence"}],
 ["change","synthetic_sample",{number:"CHG003918",title:"Correct routing rule order + CMDB ownership mapping",risk:"Moderate",window:"2026-10-03 22:00 CT",status:"Awaiting CAB",rollback:"Restore prior rule set and ownership map"}],
 ["architect_handoff","synthetic_sample",{title:"Architect handoff packet",facts:"Reproducible in sub-prod; impact bounded to one service line; no data loss.",evidence:"Incident timeline, affected CI list, update-set diff, assignment-rule trace",ask:"Validate architecture fix and release path",owner:"CTA + Customer Success Advocate",status:"Ready"}],
 ["success_play","synthetic_sample",{title:"Release Readiness + CMDB Trust",trigger:"Platform health below 80 or release dependency unresolved",actions:"Health scan; CMDB ownership review; release-readiness checkpoint; executive decision log",exitCriteria:"Platform health >=85 and no unowned critical CIs"}],
 ["license","synthetic_sample",{entitled:"ITSM Pro · CSM Pro · ITOM Visibility · Now Assist",active:"ITSM · CSM · ITOM",utilization:"72%",gap:"Now Assist readiness gated on CMDB quality and governance"}],
 ["raci","template",{title:"Post-implementation ServiceNow RACI",rows:[{item:"Success plan",responsible:"CS",accountable:"CS leader",advised:"Customer sponsor / Product",informed:"Sales"},{item:"Renewal forecast",responsible:"CS",accountable:"CS leader",advised:"Sales / Finance",informed:"Executive team"},{item:"Expansion qualification",responsible:"CS + Sales",accountable:"Revenue leadership",advised:"Product",informed:"Customer sponsor"},{item:"Product feedback closure",responsible:"CS",accountable:"Product",advised:"Support / Engineering",informed:"Customer"}],roles:["Customer","Customer Success","Sales","Product","Support","Engineering","Finance"],note:"Proposed operating model; real ownership must be validated."}]
];`;
src=between(src,"const CUSTOMER=","const KB_SEED=",golden+"\n\n");

const kb=`const KB_SEED=[
 {id:"kb-segmentation",slug:"segmentation-and-coverage",title:"Segmentation & Coverage",summary:"Define service levels from customer complexity, ARR, lifecycle, and growth potential rather than one-size-fits-all cadence.",category:"Operating Model",tags:["segmentation","capacity","coverage"],status:"published",source:"internal_best_practice",authorLabel:"Candidate Operating Model",body:"PROPOSED MODEL\\nStrategic: named ownership, executive cadence, account plan, 120-day renewal motion.\\nEnterprise: named CSM, value cadence, 90-day renewal motion.\\nGrowth: pooled or scaled coverage with trigger-based human intervention.\\n\\nRULE\\nSegment is a service-design decision, not a statement of customer importance. Revisit thresholds as portfolio shape and team capacity change."},
 {id:"kb-health",slug:"health-scoring",title:"Health Scoring Governance",summary:"A transparent health model with explainable components, intervention thresholds, and human review.",category:"Customer Health",tags:["health","risk","renewal"],status:"published",source:"internal_best_practice",authorLabel:"Candidate Operating Model",body:"WEIGHTS\\nAdoption 30%\\nOutcomes 25%\\nRelationship 20%\\nSupport / risk 15%\\nCommercial / renewal 10%\\n\\nGOVERNANCE\\nThe score proposes attention; it does not replace CSM judgment. Every red or watch account requires a reason, owner, next action, and review date."},
 {id:"kb-renewal",slug:"renewal-operating-rhythm",title:"Renewal Operating Rhythm",summary:"A 120/90/60/30-day renewal system that connects value, risk, stakeholders, forecast, and expansion without last-minute surprises.",category:"Retention",tags:["renewal","grr","nrr","expansion"],status:"published",source:"internal_best_practice",authorLabel:"Candidate Operating Model",body:"120 DAYS\\nRefresh success outcomes, sponsor map, product adoption, open risks, and value evidence.\\n90 DAYS\\nExecutive proof, risk closure plan, preliminary forecast.\\n60 DAYS\\nScope and commercial alignment; expansion only when customer value supports it.\\n30 DAYS\\nClose plan, decision path, blockers, executive escalation if required."},
 {id:"kb-voc",slug:"voice-of-customer-loop",title:"Voice of Customer -> Product Loop",summary:"Convert account feedback into evidence-bearing patterns that Product can evaluate and close back to customers.",category:"Voice of Customer",tags:["product","feedback","evidence"],status:"published",source:"internal_best_practice",authorLabel:"Candidate Operating Model",body:"CAPTURE\\nProblem, affected workflow, account segment, ARR context, frequency, workaround, desired outcome.\\nVALIDATE\\nLook for repeated patterns before presenting one account request as a market need.\\nCLOSE LOOP\\nReturn Product decisions and rationale to Customer Success, then to affected customers."}
];`;
src=between(src,"const KB_SEED=","export class DPLCRM",kb+"\n\n");

const sampleFn=` sampleCustomer(workspace,s){const slug=String(s.n).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),p="synthetic_sample";return{id:this.baseId(workspace,"sample-"+slug),name:s.n,nameStatus:"Synthetic portfolio scenario",industry:s.i||"",stage:s.st||"Sample",week:null,provenance:p,isSynthetic:true,isPublicReference:false,defaultSample:true,sourceFile:s.f||"",portfolio:s.portfolio||{},facts:{serviceModel:s.sm||"",product:s.sc||"",currentSystems:s.sys||"",businessGoal:s.g||"",successMetrics:s.met||"",committedTimeline:s.tl||"",connectorStatus:s.cs||"",unvalidatedDependencies:s.dep||""}}}
 sampleRecords(s){const p="synthetic_sample",a=[
  ["handoff",p,{title:"Operating context",value:s.sm||"",validation:"Synthetic sample",note:"Candidate-built role demonstration; not private customer data."}],
  ["handoff",p,{title:"Customer goal / use case",value:s.g||"",validation:"Synthetic sample",note:s.met||""}],
  ["handoff",p,{title:"Timeline / lifecycle context",value:s.tl||"",validation:"Synthetic sample",note:s.st||""}],
  ["document",p,{name:s.f||"Synthetic sample source",classification:"Synthetic customer scenario",binaryStatus:"Built-in sample",approvedForBriefs:"Yes"}],
  ["raci","template",{title:"Customer Success RACI",rows:[],roles:["Customer","Customer Success","Sales","Product","Support","Engineering"],note:"Proposed operating model. Assign real ownership only after discovery."}]
 ];for(const x of String(s.sys||"").split(";").map(v=>v.trim()).filter(Boolean))a.push(["integration",p,{name:x,purpose:"Synthetic customer-system context",connectorStatus:s.cs||"Proposed",technicalValidation:s.dep||"Validate during discovery"}]);if(Array.isArray(s.records))for(const r of s.records)a.push(r);return a}
`;
const a=src.indexOf(" sampleCustomer(workspace,s){");
const b=src.indexOf(" async seed()",a);
if(a<0||b<0) throw new Error("Customer seed method anchors missing");
src=src.slice(0,a)+sampleFn+src.slice(b);

const seedSync=` seedRecordKey(type,data){const d=data&&typeof data==="object"?data:{};return String(type||"")+"|"+String(d.name||d.title||d.number||d.renewalDate||"").trim().toLowerCase()}
 syncSeedRecords(workspace,customerId,rows){const seeded=new Set(["synthetic_sample","template","scenario"]),protectedKeys=new Set();for(const r of [...this.sql.exec("SELECT type,provenance,data FROM records WHERE workspace_id=? AND customer_id=? AND archived=0",workspace,customerId)]){if(seeded.has(String(r.provenance||"")))continue;let data={};try{data=JSON.parse(r.data||"{}")}catch{}protectedKeys.add(this.seedRecordKey(r.type,data))}this.sql.exec("DELETE FROM records WHERE workspace_id=? AND customer_id=? AND provenance IN ('synthetic_sample','template','scenario')",workspace,customerId);for(const [type,p,data] of rows){if(protectedKeys.has(this.seedRecordKey(type,data)))continue;this.addRecord(workspace,customerId,type,p,data)}}
 seedDefaults(workspace){const t=ts(),goldId=this.baseId(workspace,CUSTOMER.id),gold={...CUSTOMER,id:goldId},goldRow=[...this.sql.exec("SELECT * FROM customers WHERE id=? AND workspace_id=?",goldId,workspace)][0];if(goldRow){const old=JSON.parse(goldRow.data),next={...old,...gold,facts:{...(old.facts||{}),...(gold.facts||{})}};this.sql.exec("UPDATE customers SET data=?,updated_at=? WHERE id=? AND workspace_id=?",JSON.stringify(next),t,goldId,workspace)}else this.sql.exec("INSERT INTO customers(id,workspace_id,data,created_at,updated_at) VALUES(?,?,?,?,?)",goldId,workspace,JSON.stringify(gold),t,t);this.syncSeedRecords(workspace,goldId,SEED);for(const src of SAMPLE_CUSTOMERS){const sample=this.sampleCustomer(workspace,src),row=[...this.sql.exec("SELECT data FROM customers WHERE id=? AND workspace_id=?",sample.id,workspace)][0];if(row){const old=JSON.parse(row.data),next={...old,...sample,facts:{...(old.facts||{}),...(sample.facts||{})}};this.sql.exec("UPDATE customers SET data=?,updated_at=? WHERE id=? AND workspace_id=?",JSON.stringify(next),t,sample.id,workspace)}else this.sql.exec("INSERT INTO customers(id,workspace_id,data,created_at,updated_at) VALUES(?,?,?,?,?)",sample.id,workspace,JSON.stringify(sample),t,t);this.syncSeedRecords(workspace,sample.id,this.sampleRecords(src))}}
`;
src=between(src," seedDefaults(workspace){"," async ensureWorkspace",seedSync);

const modes=`const N7_ASSIST_MODES={
 portfolio:"Review the selected account and portfolio context. Identify the most material health, value, renewal, stakeholder, and next-action signals. Separate facts from suggestions.",
 health:"Explain the account health drivers using recorded adoption, outcomes, relationship, support/risk, and commercial evidence. Never invent a score component.",
 renewal:"Prepare a renewal-readiness brief using recorded value, risks, stakeholders, timing, forecast, and expansion signals. Do not manufacture commercial commitments.",
 onboarding:"Review onboarding and time-to-value evidence. Identify blocked milestones, missing owners, acceptance gaps, and the smallest next action.",
 expansion:"Assess recorded expansion signals only after value and renewal context. Separate customer evidence from a proposed discovery path.",
 executive:"Create an executive-ready account brief: outcomes, adoption, risk, decisions, renewal posture, and next commitments. Do not invent metrics.",
 voc:"Summarize Voice-of-Customer evidence into a product signal with affected workflow, recurrence, impact context, and validation gaps.",
 general:"Answer using the selected account record as the primary source. Clearly distinguish recorded facts, synthetic scenario data, and recommendations."
};
`;
src=between(src,"const N7_ASSIST_MODES={","function wantsPublicResearch",modes);

src=src.split('"Doppel Technical Customer Engineering CRM Team"').join('"NSM ServiceNow Customer Outcomes OS"');
src=src.split('"Doppel Guest Demo"').join('"NSM Candidate Demo"');
src=src.split("Doppel").join("NSM");
src=src.split("doppel").join("nsm");
src=src.split('"Doppel public customer story"').join('"Public target-company context"');
write("src/index.js",src);

fs.copyFileSync(path.join(overlay,"src","sample-customers.js"),path.join(out,"src","sample-customers.js"));

fs.rmSync(path.join(out,"public"),{recursive:true,force:true});
fs.cpSync(path.join(overlay,"public"),path.join(out,"public"),{recursive:true});
fs.copyFileSync(path.join(repo,"projects","dplr-crm","public","cw-astro-local-store.js"),path.join(out,"public","cw-astro-local-store.js"));

const pkg={
 name:"nsm-cs-os",private:true,version:"1.0.0",type:"module",
 scripts:{check:"node --check src/index.js && node --check src/sample-customers.js && node --check public/nsm.js",deploy:"npm run check && wrangler deploy"},
 devDependencies:{wrangler:"^4.40.0"}
};
write("package.json",JSON.stringify(pkg,null,2)+"\n");

let wr=read("wrangler.jsonc");
wr=wr.split("clintware-dpl-crm").join("clintware-nsm-cs-os");
wr=wr.split('"CRM_ANALYTICS_MODE":"first-party-control-plane"').join('"CRM_ANALYTICS_MODE":"first-party-control-plane","PRODUCT_ID":"nsm-cs-os"');
write("wrangler.jsonc",wr);

for(const stale of ["prepare-production.mjs"]) fs.rmSync(path.join(out,stale),{force:true});

const checks=[
 ['src/index.js','const APP_ID="nsm-cs-os"'],
 ['src/index.js','const WORKSPACE_ID="nsm-norseman-demo"'],
 ['src/index.js','identity:"disabled-no-login-demo",oauthApp:"none"'],
 ['src/index.js','persistence:"browser-persistent"'],
 ['src/index.js','Aegis Federal Programs'],
 ['src/sample-customers.js','SAMPLE_SEED_VERSION=3'],
 ['public/index.html','NSM ServiceNow Customer Outcomes OS'],
 ['public/nsm.js','Post-implementation command view']
];
for(const [f,s] of checks) if(!read(f).includes(s)) throw new Error("Missing build contract: "+f+" :: "+s);
const localRuntime=await applyBrowserLocalRuntime({
  out,
  appId:"nsm-cs-os",
  workspaceId:"nsm-norseman-demo",
  serviceName:"clintware-nsm-cs-os",
  workspaceName:"NSM ServiceNow Customer Outcomes browser-local workspace",
  version:4
});
if(fs.readFileSync(path.join(out,"wrangler.jsonc"),"utf8").includes('"durable_objects"'))throw new Error("Browser-local nsm-cs-os still contains Durable Objects.");
console.log("ASTRO browser-local runtime:",JSON.stringify(localRuntime));
console.log("NSM ServiceNow Customer Outcomes OS materialized at "+out);
