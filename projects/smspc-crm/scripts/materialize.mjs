import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { smspcDataBlock } from "./smspc-data.mjs";
import { SAMPLE_CUSTOMERS } from "../src/sample-customers.js";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const dplr=path.join(repo,"projects","dplr-crm","scripts","materialize.mjs");
const sourceBuild=path.join(repo,".build","dplr-crm");
const overlay=path.join(repo,"projects","smspc-crm");
const out=path.join(repo,".build","smspc-crm");

execFileSync(process.execPath,[dplr],{cwd:repo,stdio:"inherit"});
if(!fs.existsSync(sourceBuild))throw new Error("DPLR materializer did not produce its build.");
fs.rmSync(out,{recursive:true,force:true});
fs.cpSync(sourceBuild,out,{recursive:true});

function rewrite(file,transforms){
  const p=path.join(out,file);
  if(!fs.existsSync(p))return;
  let text=fs.readFileSync(p,"utf8");
  for(const [from,to] of transforms)text=text.split(from).join(to);
  fs.writeFileSync(p,text);
}

for(const file of ["src/index.js","package.json","wrangler.jsonc","public/app-config.js","public/app-router.js","public/app-views.js","public/app-ai.js","public/app-forms.js","public/import-utils.js","public/dplr-shell.js","public/dplr-prep.js","public/dplr-enrich.js","dplr-production.mjs"]){
  rewrite(file,[
    ["clintware-dplr-crm","clintware-smspc-crm"],
    ["dplr-crm","smspc-crm"],
    ["dplr-doppel","smspc-simspace"],
    ["__Host-dplr-","__Host-smspc-"],
    ["https://dplrcrm.clintware.com","https://smspc.clintware.com"],
    ["https://dplcrm.clintware.com","https://smspc.clintware.com"],
    ["Doppel Technical Customer Engineering OS","SimSpace Senior Solution Engineer Operating System"],
    ["DOPPEL TCE OS","SIMSPACE SE OS"],
    ["Doppel Technical Customer Engineering CRM","SimSpace Senior Solution Engineer Operating System"],
    ["Technical Customer Engineering","Solutions Engineering"],
    ["Technical Customer Engineer","Senior Solution Engineer"],
    ["Customer Engineering","Solutions Engineering"],
    ["Doppel","SimSpace"]
  ]);
}

const workerPath=path.join(out,"src","index.js");
let worker=fs.readFileSync(workerPath,"utf8");
worker=worker.replace('const COMPANY_DOMAIN="doppel.com";','const COMPANY_DOMAIN="simspace.com";');
worker=worker.replace('const COMPANY_DOMAIN="boompay.app";','const COMPANY_DOMAIN="simspace.com";');
const start=worker.indexOf("const CUSTOMER=");
const end=worker.indexOf("export class DPLCRM");
if(start<0||end<0||end<=start)throw new Error("Could not locate CRM seed block.");
worker=worker.slice(0,start)+smspcDataBlock+"\n"+worker.slice(end);
fs.writeFileSync(workerPath,worker);

fs.copyFileSync(path.join(overlay,"src","sample-customers.js"),path.join(out,"src","sample-customers.js"));
for(const file of ["index.html","smspc-ui.css","smspc-track.js","smspc-local-store.js"]){
  fs.copyFileSync(path.join(overlay,"public",file),path.join(out,"public",file));
}

const parsedSeed=Function(smspcDataBlock+"\nreturn {CUSTOMER,SEED,KB_SEED};")();
const stableTime="2026-09-29T00:00:00.000Z";
const slugify=v=>String(v||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const sampleCustomer=s=>{
  const m=String(s.st||"").match(/week\s+(\d+)/i);
  return {
    id:"sample-"+slugify(s.n),
    name:s.n,
    nameStatus:"Synthetic default opportunity",
    industry:s.i||"",
    stage:s.st||"Discovery",
    week:m?Number(m[1]):null,
    provenance:"synthetic_sample",
    isSynthetic:true,
    isPublicReference:false,
    defaultSample:true,
    sourceFile:s.f||"",
    facts:{
      serviceModel:s.sm||"",
      product:s.sc||"",
      currentSystems:s.sys||"",
      businessGoal:s.g||"",
      successMetrics:s.met||"",
      committedTimeline:s.tl||"",
      connectorStatus:s.cs||"",
      unvalidatedDependencies:s.dep||""
    }
  };
};
const customers=[{...parsedSeed.CUSTOMER,isSynthetic:true},...SAMPLE_CUSTOMERS.map(sampleCustomer)];
const records=[];
const pushRecord=(customerId,type,provenance,data,key)=>records.push({
  id:key,customerId,type,provenance,data,createdAt:stableTime,updatedAt:stableTime
});
parsedSeed.SEED.forEach((row,i)=>pushRecord(
  parsedSeed.CUSTOMER.id,row[0],row[1],row[2],"golden-"+String(i+1).padStart(3,"0")
));
for(const src of SAMPLE_CUSTOMERS){
  const c=sampleCustomer(src),p="synthetic_sample";
  pushRecord(c.id,"handoff",p,{title:"Operating context",value:src.sm||"",validation:"Synthetic sample",note:"Role-training opportunity only."},c.id+"-handoff-1");
  pushRecord(c.id,"handoff",p,{title:"Customer goal / use case",value:src.g||"",validation:"Synthetic sample",note:src.met||""},c.id+"-handoff-2");
  pushRecord(c.id,"risk",p,{title:src.dep||"Technical dependency to validate",impact:"May affect scope, timeline, or the technical buying decision.",owner:"Solution Engineer",mitigation:"Validate in the representative evaluation environment.",escalationStatus:"Open",nextDecision:"Confirm the evidence needed for technical acceptance."},c.id+"-risk-1");
  pushRecord(c.id,"kpi",p,{name:"Evaluation outcome",hypothesis:src.g||"",baseline:"Synthetic baseline pending",target:src.met||"",metricDefinition:"Synthetic role-training metric",sourceSystem:src.sys||"",owner:"Solution Engineer",cadence:"Per evaluation",calculation:"Defined in customer scorecard",currentValue:"Synthetic sample",realizedValue:"Not a real customer outcome",approval:"Synthetic sample"},c.id+"-kpi-1");
  pushRecord(c.id,"document",p,{name:src.f||"Synthetic source",classification:"Synthetic opportunity source",binaryStatus:"Built-in sample",approvedForBriefs:"Yes"},c.id+"-doc-1");
  pushRecord(c.id,"raci","template",{title:"Solution Engineering RACI",rows:[],roles:["Customer Executive Sponsor","Customer Security","Customer Platform","Sales","Solution Engineer","Customer Success","Professional Services","Product"],note:"Template. Assign real people and decision rights during discovery."},c.id+"-raci-1");
  String(src.sys||"").split(";").map(x=>x.trim()).filter(Boolean).forEach((name,i)=>pushRecord(
    c.id,"integration",p,{name,purpose:"Synthetic evaluation integration",connectorStatus:src.cs||"Not validated",technicalValidation:src.dep||"Needs human review"},c.id+"-integration-"+(i+1)
  ));
}
const browserBootstrap={version:3,customers,records,kb:parsedSeed.KB_SEED||[]};
fs.writeFileSync(
  path.join(out,"public","smspc-bootstrap.js"),
  "window.SMSPC_LOCAL_BOOTSTRAP="+JSON.stringify(browserBootstrap)+";\n"
);

const pkgPath=path.join(out,"package.json");
const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
pkg.name="clintware-smspc-crm";
pkg.version="1.0.0";
pkg.scripts=pkg.scripts||{};
pkg.scripts.check=(pkg.scripts.check||"")+" && node --check public/smspc-track.js && node --check public/smspc-bootstrap.js && node --check public/smspc-local-store.js";
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+"\n");

const wranglerPath=path.join(out,"wrangler.jsonc");
let wrangler=fs.readFileSync(wranglerPath,"utf8");
wrangler=wrangler.replace(
  '"name":"clintware-smspc-crm",',
  '"name":"clintware-smspc-crm",\n  "workers_dev":false,\n  "preview_urls":false,\n  "routes":[{"pattern":"smspc.clintware.com","custom_domain":true}],'
);
fs.writeFileSync(wranglerPath,wrangler);

const configPath=path.join(out,"public","app-config.js");
let config=fs.readFileSync(configPath,"utf8");
config=config.replace('localStorage.getItem("dplrtheme")||"light"','localStorage.getItem("dplrtheme")||"dark"');
fs.writeFileSync(configPath,config);

const html=fs.readFileSync(path.join(out,"public","index.html"),"utf8");
for(const required of ["/smspc-ui.css","/smspc-track.js","/smspc-bootstrap.js","/smspc-local-store.js","noindex,nofollow,noarchive"]){
  if(!html.includes(required))throw new Error("SimSpace UI overlay missing: "+required);
}
const finalWorker=fs.readFileSync(workerPath,"utf8");
for(const required of ['const APP_ID="smspc-crm"','const WORKSPACE_ID="smspc-simspace"','Aegis National Bank','AI Proving Grounds']){
  if(!finalWorker.includes(required))throw new Error("SimSpace identity/data patch missing: "+required);
}
const samples=fs.readFileSync(path.join(out,"src","sample-customers.js"),"utf8");
if(!samples.includes("SAMPLE_SEED_VERSION=1")||!samples.includes("Liberty Grid Operations"))throw new Error("SimSpace sample set missing.");
const track=fs.readFileSync(path.join(out,"public","smspc-track.js"),"utf8");
if((track.match(/objective:/g)||[]).length!==8)throw new Error("SimSpace operating-track contract must remain eight tracks.");
if(!wrangler.includes('"pattern":"smspc.clintware.com"'))throw new Error("SimSpace custom domain route missing.");

console.log("SMSPC CRM materialized at "+out);
