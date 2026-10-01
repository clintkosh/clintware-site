import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { applyBrowserLocalRuntime } from "../../dplr-crm/scripts/browser-local-runtime.mjs";
import { genesysDataBlock } from "./genesys-data.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const reference=path.join(repo,"projects","anth-crm","scripts","materialize.mjs");
const sourceBuild=path.join(repo,".build","anth-crm");
const overlay=path.join(repo,"projects","gns-crm");
const out=path.join(repo,".build","gns-crm");

execFileSync(process.execPath,[reference],{cwd:repo,stdio:"inherit",env:{...process.env,CW_ASTRO_REFERENCE_MODE:"1"}});
if(!fs.existsSync(sourceBuild))throw new Error("Adaptive Anthropic implementation reference did not materialize.");
fs.rmSync(out,{recursive:true,force:true});
fs.cpSync(sourceBuild,out,{recursive:true});

function rewrite(file,transforms){
 const p=path.join(out,file);
 if(!fs.existsSync(p))return;
 let text=fs.readFileSync(p,"utf8");
 for(const [from,to] of transforms)text=text.split(from).join(to);
 fs.writeFileSync(p,text);
}

const identityTransforms=[
 ["clintware-anth-crm","clintware-gns-crm"],
 ["anth-crm","gns-crm"],
 ["anth-gsi","gns-enterprise"],
 ["__Host-anth-","__Host-gns-"],
 ["https://anth.clintware.com","https://gns.clintware.com"],
 ["Anthropic GSI Customer Success Operating System","Genesys Customer Success Director Operating System"],
 ["ANTHROPIC GSI CS OS","GENESYS CS DIRECTOR OS"]
];
for(const file of ["src/index.js","package.json","wrangler.jsonc","public/app-config.js","public/app-router.js","public/app-views.js","public/app-ai.js","public/app-forms.js","public/import-utils.js","public/dplr-shell.js","public/dplr-prep.js"]){
 rewrite(file,identityTransforms);
}

const workerPath=path.join(out,"src","index.js");
let worker=fs.readFileSync(workerPath,"utf8");
worker=worker.replace('const COMPANY_DOMAIN="anthropic.com";','const COMPANY_DOMAIN="genesys.com";');
const seedStart=worker.indexOf("const CUSTOMER=");
const seedEnd=worker.indexOf("export class DPLCRM");
if(seedStart<0||seedEnd<0||seedEnd<=seedStart)throw new Error("Could not locate adaptable CRM seed block.");
worker=worker.slice(0,seedStart)+genesysDataBlock+"\n"+worker.slice(seedEnd);
fs.writeFileSync(workerPath,worker);

fs.copyFileSync(path.join(overlay,"src","sample-customers.js"),path.join(out,"src","sample-customers.js"));
for(const file of ["index.html","gns-ui.css","gns-track.js"])fs.copyFileSync(path.join(overlay,"public",file),path.join(out,"public",file));
fs.copyFileSync(path.join(overlay,"scripts","genesys-production.mjs"),path.join(out,"genesys-production.mjs"));

const pkgPath=path.join(out,"package.json");
const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
pkg.name="clintware-gns-crm";
pkg.version="1.0.0";
pkg.scripts=pkg.scripts||{};
pkg.scripts["prepare:prod"]="node prepare-production.mjs && node anth-production.mjs && node genesys-production.mjs";
pkg.scripts.check=(pkg.scripts.check||"")+" && node --check public/gns-track.js && node --check genesys-production.mjs";
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+"\n");

const wranglerPath=path.join(out,"wrangler.jsonc");
let wrangler=fs.readFileSync(wranglerPath,"utf8");
wrangler=wrangler.replace(/"routes"\s*:\s*\[[\s\S]*?\],?/m,"");
wrangler=wrangler.replace('"name":"clintware-gns-crm",','"name":"clintware-gns-crm",\n  "workers_dev":false,\n  "preview_urls":false,\n  "routes":[{"pattern":"gns.clintware.com","custom_domain":true}],');
fs.writeFileSync(wranglerPath,wrangler);

execFileSync(process.execPath,[path.join(out,"genesys-production.mjs")],{cwd:out,stdio:"inherit"});

const html=fs.readFileSync(path.join(out,"public","index.html"),"utf8");
for(const required of ["/gns-ui.css","/gns-track.js","noindex,nofollow,noarchive"])if(!html.includes(required))throw new Error("Genesys UI overlay missing: "+required);
const finalWorker=fs.readFileSync(workerPath,"utf8");
for(const required of ['const APP_ID="gns-crm"','const WORKSPACE_ID="gns-enterprise"','Northstar Retail Group (Synthetic)','Customer satisfaction'])if(!finalWorker.includes(required))throw new Error("Genesys identity/data patch missing: "+required);
const sampleText=fs.readFileSync(path.join(out,"src","sample-customers.js"),"utf8");
if(!sampleText.includes("SAMPLE_SEED_VERSION=2")||!sampleText.includes("Atlas Financial Services"))throw new Error("Genesys sample set missing.");
const trackText=fs.readFileSync(path.join(out,"public","gns-track.js"),"utf8");
if((trackText.match(/objective:/g)||[]).length!==9)throw new Error("Genesys operating-track contract must remain nine tracks.");
if(!trackText.includes("Copy cover letter")||!trackText.includes("Retention & Expansion"))throw new Error("Genesys CRM+Cover controls missing.");
if(!wrangler.includes('"pattern":"gns.clintware.com"'))throw new Error("Genesys custom domain route missing.");
for(const rel of ["src/index.js","public/app-config.js","public/app-router.js","public/app-views.js","public/app-ai.js","public/app-forms.js","public/import-utils.js","public/dplr-shell.js","public/dplr-prep.js"]){
 const text=fs.readFileSync(path.join(out,rel),"utf8");
 if(/Doppel|doppel\.com/i.test(text))throw new Error("Source-company semantics leaked into generated runtime: "+rel);
}
const localRuntime=await applyBrowserLocalRuntime({
  out,
  appId:"gns-crm",
  workspaceId:"gns-enterprise",
  serviceName:"clintware-gns-crm",
  workspaceName:"Genesys Customer Success Director browser-local workspace",
  version:2
});
console.log("ASTRO browser-local runtime:",JSON.stringify(localRuntime));
console.log("GNS CRM materialized at "+out);
