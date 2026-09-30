import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyBrowserLocalRuntime } from "../../dplr-crm/scripts/browser-local-runtime.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const source=path.join(repo,"projects","dpl-crm");
const overlay=path.join(repo,"projects","cpl-cs-os");
const out=path.join(repo,".build","cpl-cs-os");

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
  ['const AUTH_CONFIG_URL=AUTH_ORIGIN+"/client-config/dpl-crm";','const AUTH_CONFIG_URL=AUTH_ORIGIN+"/client-config/cpl-cs-os";'],
  ['const APP_ID="dpl-crm";','const APP_ID="cpl-cs-os";'],
  ['const REQUIRED_CONTEXT="dpl-crm:read";','const REQUIRED_CONTEXT="cpl-cs-os:read";'],
  ['const COMPANY_DOMAIN="doppel.com";','const COMPANY_DOMAIN="compyl.com";'],
  ['const WORKSPACE_ID="dpl-doppel";','const WORKSPACE_ID="cpl-compyl-demo";'],
  ['__Host-dpl-','__Host-cpl-'],
  ['ctx.includes("dpl-crm:write")','ctx.includes("cpl-cs-os:write")'],
  ['idFromName("n7demo-main")','idFromName("cpl-cs-main")'],
  ['clintware-dpl-crm','clintware-cpl-cs-os'],
  ['https://dpl.clintware.com','https://cpl.clintware.com'],
  ['Doppel Technical Customer Engineering CRM','CPL Customer Success Operating System'],
  ['DOPPEL TCE CRM','CPL CS OPERATING SYSTEM'],
  ['Doppel Guest Demo','CPL Candidate Demo'],
  ['feature:"dpl_crm"','feature:"cpl_cs_os"'],
  ['task:"dpl_public_research_query"','task:"cpl_public_research_query"'],
  ['task:"dpl_"+mode+"_assistant"','task:"cpl_"+mode+"_assistant"'],
  ['task:"dpl_crm_change_interpreter"','task:"cpl_cs_change_interpreter"'],
  ['task:"dpl_live_customer_assistant"','task:"cpl_live_customer_assistant"'],
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
 name:"Northstar Financial Group",
 nameStatus:"Golden example customer · synthetic",
 industry:"Financial services",
 stage:"Value / Renewal",
 week:null,
 provenance:"synthetic_sample",
 isGoldenExample:true,
 isSynthetic:true,
 protected:true,
 defaultSample:true,
 sourceFile:"Synthetic Compyl Director of Customer Success operating scenario",
 portfolio:{segment:"Strategic",arr:780000,renewalDate:"2027-01-31",health:"Watch",healthScore:71,adoption:74,automation:69,sentiment:"Engaged",expansionPotential:180000,renewalForecast:"Likely",risk:"Sponsor transition + evidence exceptions",lifecycle:"Value / Renewal",owner:"CS Lead",products:"Compliance · Risk · Third Party · Trust",framework:"SOC 2 · ISO 27001 · PCI DSS",lastExec:"2026-09-12",nextAction:"Land executive value reset",nextReview:"2026-10-02"},
 facts:{users:"CISO, GRC, Internal Audit, Risk, Vendor Risk, Security Engineering",product:"Integrated GRC workflows across compliance, risk, third-party risk, and trust",committedTimeline:"120-day renewal motion",roiTarget:"Make customer value, adoption, risk, renewal confidence, and expansion evidence visible in one operating system",kickoff:"Synthetic mature account entering renewal planning",unvalidatedDependencies:"New executive sponsor has not approved the current value narrative; two evidence-owner exceptions remain open",successMetrics:"Executive-approved success plan; health >=80; adoption >=85%; renewal forecast moves to Commit; qualified expansion path",currentSystems:"Okta; AWS; GitHub; Jira; ServiceNow"}};
const SEED=[
 ["handoff","synthetic_sample",{title:"Executive success criteria",value:"One approved success plan tying adoption, automated evidence, risk visibility, and audit readiness to executive outcomes.",validation:"Synthetic golden example",note:"Proposed operating model for the public Director of Customer Success role."}],
 ["handoff","synthetic_sample",{title:"Commercial objective",value:"Protect the base renewal while qualifying an additional Trust / questionnaire workflow.",validation:"Synthetic golden example",note:"Illustrative only; not Compyl customer data."}],
 ["renewal","synthetic_sample",{renewalDate:"2027-01-31",term:"Annual",arr:"$780,000",valueRealized:"Synthetic account has strong platform breadth but incomplete executive value re-baselining.",renewalPlan:"120 days: value reset + risk map. 90 days: executive proof. 60 days: scope and commercial alignment. 30 days: close plan.",expansionSignals:"$180,000 synthetic potential in Trust / questionnaire workflow after sponsor alignment.",notes:"Simulation only · Forecast: Likely"}],
 ["adoption","synthetic_sample",{name:"Core workflow adoption",value:"74%",period:"Current synthetic quarter",source:"Synthetic product telemetry",owner:"Customer Success"}],
 ["adoption","synthetic_sample",{name:"Evidence / workflow automation coverage",value:"69%",period:"Current synthetic quarter",source:"Synthetic GRC workflow model",owner:"Customer Success + GRC owner"}],
 ["kpi","synthetic_sample",{name:"Account health score",hypothesis:"A transparent score should surface intervention before renewal risk becomes a surprise.",baseline:"71",target:">= 80",metricDefinition:"Adoption 30% + outcomes 25% + relationship 20% + support/risk 15% + commercial/renewal 10%",sourceSystem:"Synthetic CRM + product + support model",owner:"Customer Success Operations",cadence:"Weekly",calculation:"Weighted component score",currentValue:"71",realizedValue:"Simulation only",approval:"Synthetic sample"}],
 ["kpi","synthetic_sample",{name:"Executive value proof",hypothesis:"Renewal confidence should increase when the sponsor approves outcome evidence.",baseline:"Previous sponsor narrative",target:"New sponsor approval",metricDefinition:"Documented executive acceptance of success outcomes and next priorities",sourceSystem:"Executive review",owner:"CS Lead",cadence:"Renewal checkpoints",calculation:"Approved / Not approved",currentValue:"Not yet approved",realizedValue:"Simulation only",approval:"Synthetic sample"}],
 ["kpi","synthetic_sample",{name:"Time to first value",hypothesis:"Fast onboarding creates room for deeper adoption before renewal.",baseline:"62 days",target:"30 days",metricDefinition:"Kickoff to first approved customer outcome",sourceSystem:"Synthetic onboarding milestones",owner:"Customer Success",cadence:"Per onboarding",calculation:"Milestone date - kickoff",currentValue:"33 days",realizedValue:"Simulation only",approval:"Synthetic sample"}],
 ["stakeholder","synthetic_sample",{name:"Jordan Avery (Synthetic)",role:"Chief Information Security Officer",organization:"Northstar Financial Group",email:"",phone:"",decisionRole:"Executive sponsor and renewal approver",status:"New sponsor",notes:"Synthetic stakeholder. Needs success-plan reset."}],
 ["stakeholder","synthetic_sample",{name:"Priya Nolan (Synthetic)",role:"Director, GRC",organization:"Northstar Financial Group",email:"",phone:"",decisionRole:"Operational champion",status:"Advocate",notes:"Synthetic stakeholder. Owns day-to-day program outcomes."}],
 ["stakeholder","synthetic_sample",{name:"Elliot Park (Synthetic)",role:"VP, Procurement",organization:"Northstar Financial Group",email:"",phone:"",decisionRole:"Commercial stakeholder",status:"Engaged",notes:"Synthetic stakeholder. Participates in renewal and vendor-governance scope."}],
 ["risk","synthetic_sample",{title:"Executive sponsor changed inside the renewal window",impact:"Strong operational adoption may not translate into renewal confidence if the new sponsor has not approved the value story.",owner:"CS Lead",mitigation:"Run an executive success-plan reset using verified adoption, outcomes, open risks, and next-quarter priorities.",escalationStatus:"Watch",nextDecision:"Approve the executive value narrative at the October review."}],
 ["risk","synthetic_sample",{title:"Two evidence-owner exceptions remain unresolved",impact:"Exceptions can weaken the control-health narrative and reduce confidence in automation coverage.",owner:"Customer Success + customer GRC owner",mitigation:"Assign accountable owners, due dates, and exception rationale; escalate only overdue critical items.",escalationStatus:"Open",nextDecision:"Close or explicitly accept both exceptions before the 90-day renewal checkpoint."}],
 ["milestone","synthetic_sample",{title:"Executive success-plan reset",owner:"CS Lead + CISO",due:"2026-10-02",status:"In Progress",dependencies:"Approved outcome evidence and current risk view"}],
 ["milestone","synthetic_sample",{title:"Raise adoption above 85%",owner:"Customer Success + GRC champion",due:"2026-11-15",status:"Planned",dependencies:"Role-based enablement and exception cleanup"}],
 ["milestone","synthetic_sample",{title:"Qualify Trust expansion",owner:"CS Lead + Sales",due:"2026-11-30",status:"Planned",dependencies:"Renewal confidence and agreed business case"}],
 ["meeting","synthetic_sample",{title:"Executive value + renewal review",type:"Executive Business Review",date:"2026-10-02",attendees:"CISO; Director GRC; Procurement; CS Lead",objective:"Approve the value narrative, close material risk decisions, and confirm the next 90-day renewal plan.",notes:"Synthetic meeting example."}],
 ["action","synthetic_sample",{title:"Prepare one-page executive value proof",owner:"CS Lead",due:"2026-10-01",status:"In Progress",audience:"Customer"}],
 ["action","synthetic_sample",{title:"Close two evidence-owner exceptions",owner:"Customer Success + GRC champion",due:"2026-10-02",status:"In Progress",audience:"Customer / Internal"}],
 ["action","synthetic_sample",{title:"Run expansion discovery only after sponsor alignment",owner:"CS Lead + Sales",due:"2026-10-16",status:"Planned",audience:"Customer / Internal"}],
 ["note","synthetic_sample",{title:"Voice of Customer -> Product signal",body:"Executive users want one view that separates control-health exceptions, evidence freshness, and financially material risk without requiring a deep operational drill-down.",impact:"Strategic account · $780,000 synthetic ARR",status:"Proposed",owner:"Customer Success",nextDecision:"Validate across additional accounts before Product prioritization."}],
 ["raci","template",{title:"Customer Success revenue RACI",rows:[{item:"Success plan",responsible:"CS",accountable:"CS leader",advised:"Customer sponsor / Product",informed:"Sales"},{item:"Renewal forecast",responsible:"CS",accountable:"CS leader",advised:"Sales / Finance",informed:"Executive team"},{item:"Expansion qualification",responsible:"CS + Sales",accountable:"Revenue leadership",advised:"Product",informed:"Customer sponsor"},{item:"Product feedback closure",responsible:"CS",accountable:"Product",advised:"Support / Engineering",informed:"Customer"}],roles:["Customer","Customer Success","Sales","Product","Support","Engineering","Finance"],note:"Proposed operating model; real ownership must be validated."}]
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
const customerCreateAnchor='  if(m==="POST"&&p==="/customers"){';
const customerCreateAt=src.indexOf(customerCreateAnchor);
if(customerCreateAt<0) throw new Error("Customer create endpoint anchor missing");
const customerBulkAt=src.indexOf('  if(m==="POST"&&p==="/customers/bulk-import")',customerCreateAt);
if(customerBulkAt<0) throw new Error("Customer bulk endpoint anchor missing");
const customerPatch=`  const cplCustomer=p.match(/^\\/customers\\/([^/]+)$/);if(cplCustomer&&m==="PATCH"){const rows=[...this.sql.exec("SELECT * FROM customers WHERE id=? AND workspace_id=?",cplCustomer[1],workspace)];if(!rows.length)return j({error:"customer_not_found"},404);const old=JSON.parse(rows[0].data),b=await req.json(),allowed={},portfolioAllowed={};for(const k of ["name","industry","stage"])if(typeof b[k]==="string")allowed[k]=String(b[k]).slice(0,500);const pp=b.portfolio&&typeof b.portfolio==="object"&&!Array.isArray(b.portfolio)?b.portfolio:{};for(const k of ["segment","renewalDate","health","sentiment","renewalForecast","risk","lifecycle","owner","products","framework","lastExec","nextAction","nextReview"])if(typeof pp[k]==="string")portfolioAllowed[k]=String(pp[k]).slice(0,1000);for(const k of ["arr","healthScore","adoption","automation","expansionPotential"])if(pp[k]!==undefined&&Number.isFinite(Number(pp[k])))portfolioAllowed[k]=Number(pp[k]);const next={...old,...allowed,portfolio:{...(old.portfolio||{}),...portfolioAllowed}},t=ts();this.sql.exec("UPDATE customers SET data=?,updated_at=? WHERE id=? AND workspace_id=?",JSON.stringify(next),t,cplCustomer[1],workspace);this.audit(workspace,actor,"customer.updated",{customerId:cplCustomer[1],fields:Object.keys(allowed),portfolioFields:Object.keys(portfolioAllowed)});return j({customer:next})}
`;
src=src.slice(0,customerBulkAt)+customerPatch+src.slice(customerBulkAt);

const a=src.indexOf(" sampleCustomer(workspace,s){");
const b=src.indexOf(" async seed()",a);
if(a<0||b<0) throw new Error("Customer seed method anchors missing");
src=src.slice(0,a)+sampleFn+src.slice(b);

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

src=src.split('"Doppel Technical Customer Engineering CRM Team"').join('"CPL Customer Success Operating System"');
src=src.split('"Doppel Guest Demo"').join('"CPL Candidate Demo"');
src=src.split("Doppel").join("CPL");
src=src.split("doppel").join("cpl");
src=src.split('"Doppel public customer story"').join('"Public target-company context"');
write("src/index.js",src);

fs.copyFileSync(path.join(overlay,"src","sample-customers.js"),path.join(out,"src","sample-customers.js"));

fs.rmSync(path.join(out,"public"),{recursive:true,force:true});
fs.cpSync(path.join(overlay,"public"),path.join(out,"public"),{recursive:true});
fs.copyFileSync(path.join(repo,"projects","dplr-crm","public","cw-astro-local-store.js"),path.join(out,"public","cw-astro-local-store.js"));

const pkg={
 name:"cpl-cs-os",private:true,version:"1.0.0",type:"module",
 scripts:{check:"node --check src/index.js && node --check src/sample-customers.js && node --check public/cpl.js",deploy:"npm run check && wrangler deploy"},
 devDependencies:{wrangler:"^4.40.0"}
};
write("package.json",JSON.stringify(pkg,null,2)+"\n");

let wr=read("wrangler.jsonc");
wr=wr.split("clintware-dpl-crm").join("clintware-cpl-cs-os");
wr=wr.split('"CRM_ANALYTICS_MODE":"first-party-control-plane"').join('"CRM_ANALYTICS_MODE":"first-party-control-plane","PRODUCT_ID":"cpl-cs-os"');
write("wrangler.jsonc",wr);

for(const stale of ["prepare-production.mjs"]) fs.rmSync(path.join(out,stale),{force:true});

const checks=[
 ['src/index.js','const APP_ID="cpl-cs-os"'],
 ['src/index.js','const WORKSPACE_ID="cpl-compyl-demo"'],
 ['src/index.js','identity:"disabled-no-login-demo",oauthApp:"none"'],
 ['src/index.js','persistence:"browser-persistent"'],
 ['src/index.js','Northstar Financial Group'],
 ['src/sample-customers.js','SAMPLE_SEED_VERSION=8'],
 ['public/index.html','CPL // CUSTOMER SUCCESS CRM'],
 ['public/cpl.js','Customer Success CRM']
];
for(const [f,s] of checks) if(!read(f).includes(s)) throw new Error("Missing build contract: "+f+" :: "+s);
const localRuntime=await applyBrowserLocalRuntime({
  out,
  appId:"cpl-cs-os",
  workspaceId:"cpl-compyl-demo",
  serviceName:"clintware-cpl-cs-os",
  workspaceName:"CPL Customer Success browser-local workspace",
  version:9
});
if(fs.readFileSync(path.join(out,"wrangler.jsonc"),"utf8").includes('"durable_objects"'))throw new Error("Browser-local cpl-cs-os still contains Durable Objects.");
console.log("ASTRO browser-local runtime:",JSON.stringify(localRuntime));
console.log("CPL Customer Success CRM materialized at "+out);
