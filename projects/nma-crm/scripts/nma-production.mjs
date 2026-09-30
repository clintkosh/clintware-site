import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.dirname(fileURLToPath(import.meta.url));
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const write=(rel,text)=>fs.writeFileSync(path.join(root,rel),text);
function rewrite(rel,transforms){const p=path.join(root,rel);if(!fs.existsSync(p))return;let text=fs.readFileSync(p,"utf8");for(const [from,to] of transforms)text=text.split(from).join(to);fs.writeFileSync(p,text)}
let src=read("src/index.js");
src=src.replace('cookie:fresh?sessionCookie(GUEST_COOKIE,id):""','cookie:fresh?setCookie(GUEST_COOKIE,id,15552000):""');
src=src.replaceAll('persistence:"guest-session"','persistence:"browser-persistent"');
src=src.replaceAll('session?"account":"guest-session"','session?"account":"browser-persistent"');
src=src.replace("form-action 'self' https://auth.clintware.com;","form-action 'self';");
src=src.replace('identity:AUTH_ORIGIN,oauthApp:APP_ID,','identity:"disabled-no-login-demo",oauthApp:"none",');
src=src.replace('if(req.method==="GET"&&u.pathname==="/auth/login")return startLogin();','if(req.method==="GET"&&u.pathname==="/auth/login")return j({error:"not_found"},404);');
src=src.replace('if(req.method==="GET"&&u.pathname==="/auth/callback")return finishLogin(req,env);','if(req.method==="GET"&&u.pathname==="/auth/callback")return j({error:"not_found"},404);');
src=src.replace('if(req.method==="POST"&&u.pathname==="/auth/logout"){const s=await currentSession(req,env).catch(()=>null);if(s)await doStub(env).fetch("https://internal/session/"+encodeURIComponent(s.sid),{method:"DELETE"});return new Response(null,{status:303,headers:secureHeaders(new Headers({location:"/","set-cookie":clearCookie(SESSION_COOKIE)}))})}','if(u.pathname==="/auth/logout")return j({error:"not_found"},404)');
src=src.replace('const session=await currentSession(req,env).catch(()=>null);','const session=null;');
const sampleStart=src.indexOf("sampleRecords(s){");
const sampleEnd=src.indexOf("\n async seed(){",sampleStart);
if(sampleStart<0||sampleEnd<0)throw new Error("NMA production transform could not locate sampleRecords.");
const sampleMethod=String.raw`sampleRecords(s){
 const p="synthetic_sample",label="Synthetic sample",a=[
  ["handoff",p,{title:"Customer objective / AI security program",value:s.g||"",validation:label,note:s.met||""}],
  ["handoff",p,{title:"AI environment / scope",value:s.sc||"",validation:label,note:"Synthetic role-training context"}],
  ["handoff",p,{title:"Lifecycle / success-plan horizon",value:s.tl||"",validation:label,note:s.st||""}],
  ["risk",p,{title:s.dep||"AI security dependency to validate",impact:"May affect risk reduction, operational adoption, executive evidence, retention, or expansion readiness.",owner:"Customer Solutions + customer owner",mitigation:"Validate evidence, assign an owner, define acceptance criteria, execute a bounded intervention, and remeasure.",escalationStatus:"Open",nextDecision:"Confirm owner, evidence source, decision, and next checkpoint."}],
  ["kpi",p,{name:"Primary customer outcome",hypothesis:s.g||"",baseline:"",target:s.met||"",metricDefinition:"Synthetic account target; define the exact measurement contract with the customer.",sourceSystem:s.sys||"",owner:"Customer Solutions + customer outcome owner",cadence:"Monthly",calculation:"Define with customer",currentValue:"",realizedValue:"",approval:label}],
  ["document",p,{name:s.f||"Synthetic success-plan source",classification:"Synthetic sample seed source",binaryStatus:"Built-in sample",approvedForBriefs:"Yes"}],
  ["raci","template",{title:"AI security program RACI",rows:[],roles:["CISO","AI Platform","AppSec","GRC","Developer Productivity","Customer Solutions","Sales","Product / Research","Support / Engineering"],note:"Synthetic template. Assign real names and decision rights during discovery."}],
  ["stakeholder",p,{name:"Executive Sponsor (Synthetic)",role:"CISO / executive sponsor",organization:s.n,email:"",phone:"",decisionRole:"Risk appetite, executive outcomes, and expansion decisions",status:"Active",notes:"Synthetic role placeholder."}],
  ["stakeholder",p,{name:"AI Platform Owner (Synthetic)",role:"AI platform / technical owner",organization:s.n,email:"",phone:"",decisionRole:"AI architecture, workload readiness, and platform standards",status:"Active",notes:"Synthetic role placeholder."}],
  ["stakeholder",p,{name:"Security Program Owner (Synthetic)",role:"AppSec / GRC / AI security lead",organization:s.n,email:"",phone:"",decisionRole:"Control ownership, evidence, testing, and operationalization",status:"Active",notes:"Synthetic role placeholder."}],
  ["action",p,{title:"Close the highest-risk AI security or evidence gap",owner:"Customer Solutions + customer owner",due:"Next checkpoint",status:"Planned",audience:"Customer / Internal"}],
  ["meeting",p,{title:"AI security success checkpoint",type:"Success-plan review",date:"Next checkpoint",attendees:"Executive sponsor; AI platform; security program owner; Customer Solutions",objective:"Review AI estate, risk, governance, testing, runtime protection, outcomes, expansion readiness, and the next decision.",notes:"Synthetic candidate-demo meeting."}]
 ];
 for(const x of String(s.sys||"").split(";").map(v=>v.trim()).filter(Boolean))a.splice(3,0,["integration",p,{name:x,purpose:"Synthetic customer technology / workflow context",connectorStatus:s.cs||"Not validated",technicalValidation:s.dep||"Needs human review"}]);
 return a}`;
src=src.slice(0,sampleStart)+sampleMethod+src.slice(sampleEnd);
src=src.replaceAll('Public Doppel customer reference','Public external customer reference').replaceAll('Public Doppel source','Public external source').replaceAll('Doppel public customer story','Public external customer story').replaceAll('Public Doppel customer story','Public external customer story').replaceAll('Doppel Technical Customer Engineering CRM Team','Noma AI Security Customer Solutions Workspace').replaceAll('Doppel Guest Demo','Noma Candidate Demo').replaceAll('Doppel Technical Customer Engineering CRM','Noma AI Security Customer Operating System').replaceAll('Technical Customer Engineering','Customer Solutions').replaceAll('Technical Customer Engineer','Senior Customer Solutions Architect').replaceAll('Doppel platform','AI security platform').replaceAll('Published from Doppel','Published from candidate workspace');
if(/Doppel|doppel\.com/i.test(src))throw new Error("Source-company semantics detected in generated NMA worker.");
write("src/index.js",src);
rewrite("public/app-config.js",[["Public research / Doppel-published","Public research / external source"]]);
rewrite("public/app-router.js",[["DOPPEL TCE CRM","NOMA AI SECURITY CS OS"],["Doppel TCE CRM","Noma AI Security Customer Operating System"],["Doppel","Noma Security"]]);
rewrite("public/app-views.js",[["Doppel Technical Customer Engineering CRM","Noma AI Security Customer Operating System"],["Technical Customer Engineering","Customer Solutions"],["Technical Customer Engineer","Senior Customer Solutions Architect"]]);
rewrite("public/app-forms.js",[["Synthetic Technical Customer Engineering scenario, not a real Doppel customer incident.","Synthetic AI security customer scenario, not a real customer incident."],["Technical Customer Engineering","Customer Solutions"],["Technical Customer Engineer","Senior Customer Solutions Architect"],["Doppel","customer platform"]]);
rewrite("public/dplr-shell.js",[["Public Doppel references are labeled separately from synthetic or workspace data.","Public external references are labeled separately from synthetic or workspace data."],["Doppel-published evidence only","external evidence only"],["restrained Doppel accents","role-specific candidate styling"]]);
rewrite("public/dplr-prep.js",[["Technical Customer Engineering","Customer Solutions"],["Technical Customer Engineer","Senior Customer Solutions Architect"]]);
rewrite("public/import-utils.js",[["Doppel-style scope","AI security / use-case scope"],["NEURON7-STYLE CRM SEED RECORD","ROLE-SPECIFIC CRM SEED RECORD"]]);
fs.rmSync(path.join(root,"public","dplr-enrich.js"),{force:true});
for(const rel of ["src/index.js","public/app-config.js","public/app-router.js","public/app-views.js","public/app-ai.js","public/app-forms.js","public/import-utils.js","public/dplr-shell.js","public/dplr-prep.js"]){const text=read(rel);if(/Doppel|doppel\.com/i.test(text))throw new Error("Source-company semantics leaked into generated runtime: "+rel)}
console.log("NMA one-off persistence and Customer Solutions production transform applied.");
