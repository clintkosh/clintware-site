import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { boomDataBlock } from "./boom-data.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const dplr=path.join(repo,"projects","dplr-crm","scripts","materialize.mjs");
const sourceBuild=path.join(repo,".build","dplr-crm");
const overlay=path.join(repo,"projects","bm-crm");
const out=path.join(repo,".build","bm-crm");

execFileSync(process.execPath,[dplr],{cwd:repo,stdio:"inherit"});
if(!fs.existsSync(sourceBuild)) throw new Error("DPLR materializer did not produce its build.");
fs.rmSync(out,{recursive:true,force:true});
fs.cpSync(sourceBuild,out,{recursive:true});

function rewrite(file,transforms){
  const p=path.join(out,file);
  let text=fs.readFileSync(p,"utf8");
  for(const [from,to] of transforms) text=text.split(from).join(to);
  fs.writeFileSync(p,text);
}

for(const file of ["src/index.js","package.json","wrangler.jsonc","public/app-config.js","public/app-router.js","public/app-views.js","public/app-ai.js","public/app-forms.js","public/import-utils.js","public/dplr-shell.js","public/dplr-prep.js","public/dplr-enrich.js"]){
  const p=path.join(out,file);
  if(!fs.existsSync(p)) continue;
  rewrite(file,[
    ["clintware-dplr-crm","clintware-bm-crm"],
    ["dplr-crm","bm-crm"],
    ["dplr-doppel","bm-boom"],
    ["__Host-dplr-","__Host-bm-"],
    ["https://dplrcrm.clintware.com","https://bm.clintware.com"],
    ["https://dplcrm.clintware.com","https://bm.clintware.com"],
    ["Doppel Technical Customer Engineering OS","Boom CSM + Support Dual-Track OS"],
    ["DOPPEL TCE OS","BOOM CSM + SUPPORT OS"],
    ["Doppel Technical Customer Engineering CRM","Boom CSM + Support Dual-Track OS"],
    ["Technical Customer Engineering","Customer Success + Support"],
    ["Technical Customer Engineer","CSM / Support Lead"],
    ["Customer Engineering","CS + Support"],
    ["Doppel","Boom"]
  ]);
}

const workerPath=path.join(out,"src","index.js");
let worker=fs.readFileSync(workerPath,"utf8");
worker=worker.replace('const COMPANY_DOMAIN="doppel.com";','const COMPANY_DOMAIN="boompay.app";');
worker=worker.replace('const COMPANY_DOMAIN="boom.com";','const COMPANY_DOMAIN="boompay.app";');
const start=worker.indexOf("const CUSTOMER=");
const end=worker.indexOf("export class DPLCRM");
if(start<0||end<0||end<=start) throw new Error("Could not locate CRM seed block.");
worker=worker.slice(0,start)+boomDataBlock+"\n"+worker.slice(end);
fs.writeFileSync(workerPath,worker);

fs.copyFileSync(path.join(overlay,"src","sample-customers.js"),path.join(out,"src","sample-customers.js"));
for(const file of ["index.html","bm-ui.css","bm-track.js"]){
  fs.copyFileSync(path.join(overlay,"public",file),path.join(out,"public",file));
}

const pkgPath=path.join(out,"package.json");
const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
pkg.name="clintware-bm-crm";
pkg.version="1.0.0";
pkg.scripts=pkg.scripts||{};
pkg.scripts.check=(pkg.scripts.check||"");
pkg.scripts.check += " && node --check public/bm-track.js";
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+"\n");

const wranglerPath=path.join(out,"wrangler.jsonc");
let wrangler=fs.readFileSync(wranglerPath,"utf8");
wrangler=wrangler.replace('"name":"clintware-dplr-crm"','"name":"clintware-bm-crm"');
fs.writeFileSync(wranglerPath,wrangler);

const configPath=path.join(out,"public","app-config.js");
let config=fs.readFileSync(configPath,"utf8");
config=config
 .replace('["customers","Customers"]','["customers","Portfolio"]')
 .replace('["kb","Technical Playbooks"]','["kb","Support Playbooks"]')
 .replace('["handoff","Technical Handoff"]','["handoff","Success Handoff"]')
 .replace('["implementation","Technical Services"]','["implementation","Onboarding & Integrations"]')
 .replace('["deployment","Service Projects"]','["deployment","Launch Projects"]')
 .replace('["adoption","Support Scale"]','["adoption","Adoption & Shift Left"]')
 .replace('["triage","Advanced Investigations"]','["triage","Escalations & Triage"]')
 .replace('["meetings","Customer Reviews"]','["meetings","Reviews & Service Metrics"]');
fs.writeFileSync(configPath,config);

const html=fs.readFileSync(path.join(out,"public","index.html"),"utf8");
if(!html.includes("/bm-track.js")||!html.includes("/bm-ui.css")) throw new Error("Boom UI overlay missing.");
const finalWorker=fs.readFileSync(workerPath,"utf8");
for(const required of ['const APP_ID="bm-crm"','const WORKSPACE_ID="bm-boom"','Pinnacle Residential Group','BoomScreen + BoomReport']){
  if(!finalWorker.includes(required)) throw new Error("Boom identity/data patch missing: "+required);
}
const samples=fs.readFileSync(path.join(out,"src","sample-customers.js"),"utf8");
if(!samples.includes("SAMPLE_SEED_VERSION=6")||!samples.includes("Atlas Property Partners")) throw new Error("Boom sample set missing.");
const track=fs.readFileSync(path.join(out,"public","bm-track.js"),"utf8");
if((track.match(/group:"CSM"/g)||[]).length!==6||(track.match(/group:"Support"/g)||[]).length!==6) throw new Error("Boom track contract must remain 6 + 6.");

console.log("BM CRM materialized at "+out);
