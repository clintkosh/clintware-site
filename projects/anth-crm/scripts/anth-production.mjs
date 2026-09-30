import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.dirname(fileURLToPath(import.meta.url));
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const write=(rel,text)=>fs.writeFileSync(path.join(root,rel),text);

function rewrite(rel,transforms){
  const p=path.join(root,rel);
  if(!fs.existsSync(p))return;
  let text=fs.readFileSync(p,"utf8");
  for(const [from,to] of transforms)text=text.split(from).join(to);
  fs.writeFileSync(p,text);
}

let src=read("src/index.js");

// Candidate demos remain no-login and browser-persistent.  This keeps the
// reusable persistence/security implementation while removing source-company
// operating assumptions.
src=src.replace(
  'cookie:fresh?sessionCookie(GUEST_COOKIE,id):""',
  'cookie:fresh?setCookie(GUEST_COOKIE,id,15552000):""'
);
src=src.replaceAll('persistence:"guest-session"','persistence:"browser-persistent"');
src=src.replaceAll('session?"account":"guest-session"','session?"account":"browser-persistent"');
src=src.replace("form-action 'self' https://auth.clintware.com;","form-action 'self';");
src=src.replace('identity:AUTH_ORIGIN,oauthApp:APP_ID,','identity:"disabled-no-login-demo",oauthApp:"none",');
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
  'if(u.pathname==="/auth/logout")return j({error:"not_found"},404)'
);
src=src.replace('const session=await currentSession(req,env).catch(()=>null);','const session=null;');

const sampleStart=src.indexOf("sampleRecords(s){");
const sampleEnd=src.indexOf("\n async seed(){",sampleStart);
if(sampleStart<0||sampleEnd<0)throw new Error("Anthropic production transform could not locate sampleRecords.");

const sampleMethod=String.raw`sampleRecords(s){
 const p="synthetic_sample",label="Synthetic sample",a=[
  ["handoff",p,{title:"Customer objective / AI vision",value:s.g||"",validation:label,note:s.met||""}],
  ["handoff",p,{title:"Product / use-case scope",value:s.sc||"",validation:label,note:"Synthetic role-training context"}],
  ["handoff",p,{title:"Lifecycle / success-plan horizon",value:s.tl||"",validation:label,note:s.st||""}],
  ["risk",p,{title:s.dep||"Adoption dependency to validate",impact:"May affect healthy usage, value realization, or expansion readiness.",owner:"Customer Success + customer owner",mitigation:"Validate the gap, assign an owner, run a bounded intervention, and remeasure.",escalationStatus:"Open",nextDecision:"Confirm owner, evidence source, and next checkpoint."}],
  ["kpi",p,{name:"Primary customer outcome",hypothesis:s.g||"",baseline:"",target:s.met||"",metricDefinition:"Synthetic account target; define the exact measurement contract with the customer.",sourceSystem:s.sys||"",owner:"Customer Success + customer value owner",cadence:"Monthly",calculation:"Define with customer",currentValue:"",realizedValue:"",approval:label}],
  ["document",p,{name:s.f||"Synthetic success-plan source",classification:"Synthetic sample seed source",binaryStatus:"Built-in sample",approvedForBriefs:"Yes"}],
  ["raci","template",{title:"GSI AI adoption RACI",rows:[],roles:["Executive Sponsor","AI Platform Owner","Enablement / CoE","Business Value Owner","Customer Success","Sales","Product / PM"],note:"Synthetic template. Assign real names and decision rights during discovery."}],
  ["stakeholder",p,{name:"Executive Sponsor (Synthetic)",role:"Executive sponsor / value owner",organization:s.n,email:"",phone:"",decisionRole:"Business objective, investment narrative, and executive decisions",status:"Active",notes:"Synthetic role placeholder."}],
  ["stakeholder",p,{name:"AI Platform Owner (Synthetic)",role:"AI platform / technical owner",organization:s.n,email:"",phone:"",decisionRole:"Technical readiness, usage planning, and production standards",status:"Active",notes:"Synthetic role placeholder."}],
  ["stakeholder",p,{name:"Enablement Champion (Synthetic)",role:"AI CoE / enablement lead",organization:s.n,email:"",phone:"",decisionRole:"Champions, Train-the-Trainer, and repeat adoption",status:"Active",notes:"Synthetic role placeholder."}],
  ["action",p,{title:"Close the highest-risk adoption or evidence gap",owner:"Customer Success + customer owner",due:"Next checkpoint",status:"Planned",audience:"Customer / Internal"}],
  ["meeting",p,{title:"Customer success checkpoint",type:"Success-plan review",date:"Next checkpoint",attendees:"Executive sponsor; AI platform; enablement; Customer Success",objective:"Review usage, adoption, value evidence, risks, and the next decision.",notes:"Synthetic candidate-demo meeting."}]
 ];
 for(const x of String(s.sys||"").split(";").map(v=>v.trim()).filter(Boolean))a.splice(3,0,["integration",p,{name:x,purpose:"Synthetic customer technology / workflow context",connectorStatus:s.cs||"Not validated",technicalValidation:s.dep||"Needs human review"}]);
 return a}`;

src=src.slice(0,sampleStart)+sampleMethod+src.slice(sampleEnd);
src=src
 .replaceAll('Public Doppel customer reference','Public external customer reference')
 .replaceAll('Public Doppel source','Public external source')
 .replaceAll('Doppel public customer story','Public external customer story')
 .replaceAll('Public Doppel customer story','Public external customer story')
 .replaceAll('Doppel Technical Customer Engineering CRM Team','Anthropic GSI Customer Success Workspace')
 .replaceAll('Doppel Guest Demo','Anthropic GSI Guest Demo')
 .replaceAll('Doppel Technical Customer Engineering CRM','Anthropic GSI Customer Success Operating System')
 .replaceAll('Technical Customer Engineering','GSI Customer Success')
 .replaceAll('Technical Customer Engineer','Customer Success Manager, GSI')
 .replaceAll('Doppel platform','Customer platform')
 .replaceAll('Published from Doppel','Published from candidate workspace');
if(/Doppel|doppel\.com/i.test(src))throw new Error("Source-company semantics detected in generated Anthropic worker.");
write("src/index.js",src);

rewrite("public/app-config.js",[
 ["Public research / Doppel-published","Public research / external source"]
]);
rewrite("public/app-router.js",[
 ["DOPPEL TCE CRM","ANTHROPIC GSI CS OS"],
 ["Doppel TCE CRM","Anthropic GSI Customer Success Operating System"],
 ["Doppel","Anthropic"]
]);
rewrite("public/app-views.js",[
 ["Doppel Technical Customer Engineering CRM","Anthropic GSI Customer Success Operating System"],
 ["Technical Customer Engineering","GSI Customer Success"],
 ["Technical Customer Engineer","Customer Success Manager, GSI"]
]);
rewrite("public/app-forms.js",[
 ["Synthetic Technical Customer Engineering scenario, not a real Doppel customer incident.","Synthetic customer-success scenario, not a real customer incident."],
 ["Technical Customer Engineering","GSI Customer Success"],
 ["Technical Customer Engineer","Customer Success Manager, GSI"],
 ["Doppel","customer platform"]
]);
rewrite("public/dplr-shell.js",[
 ["Public Doppel references are labeled separately from synthetic or workspace data.","Public external references are labeled separately from synthetic or workspace data."],
 ["Doppel-published evidence only","external evidence only"],
 ["restrained Doppel accents","role-specific candidate styling"]
]);
rewrite("public/dplr-prep.js",[
 ["Technical Customer Engineering","GSI Customer Success"],
 ["Technical Customer Engineer","Customer Success Manager, GSI"]
]);

rewrite("public/import-utils.js",[
 ["Doppel-style scope","Product / use-case scope"],
 ["NEURON7-STYLE CRM SEED RECORD","ROLE-SPECIFIC CRM SEED RECORD"]
]);

fs.rmSync(path.join(root,"public","dplr-enrich.js"),{force:true});

for(const rel of ["src/index.js","public/app-config.js","public/app-router.js","public/app-views.js","public/app-ai.js","public/app-forms.js","public/import-utils.js","public/dplr-shell.js","public/dplr-prep.js"]){
 const text=read(rel);
 if(/Doppel|doppel\.com/i.test(text))throw new Error("Source-company semantics leaked into generated runtime: "+rel);
}
console.log("Anthropic one-off persistence and GSI Customer Success production transform applied.");
