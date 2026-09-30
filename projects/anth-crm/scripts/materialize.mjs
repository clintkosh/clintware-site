import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { anthDataBlock } from "./anth-data.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const reference=path.join(repo,"projects","dplr-crm","scripts","materialize.mjs");
const sourceBuild=path.join(repo,".build","dplr-crm");
const overlay=path.join(repo,"projects","anth-crm");
const out=path.join(repo,".build","anth-crm");

execFileSync(process.execPath,[reference],{cwd:repo,stdio:"inherit"});
if(!fs.existsSync(sourceBuild))throw new Error("Adaptive implementation reference did not materialize.");
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
 ["clintware-dplr-crm","clintware-anth-crm"],
 ["dplr-crm","anth-crm"],
 ["dplr-doppel","anth-gsi"],
 ["__Host-dplr-","__Host-anth-"],
 ["https://dplrcrm.clintware.com","https://anth.clintware.com"],
 ["Doppel Technical Customer Engineering OS","Anthropic GSI Customer Success Operating System"],
 ["DOPPEL TCE OS","ANTHROPIC GSI CS OS"]
];
for(const file of ["src/index.js","package.json","wrangler.jsonc","public/app-config.js","public/app-router.js","public/app-views.js","public/app-ai.js","public/app-forms.js","public/import-utils.js","public/dplr-shell.js","public/dplr-prep.js"]){
 rewrite(file,identityTransforms);
}

const workerPath=path.join(out,"src","index.js");
let worker=fs.readFileSync(workerPath,"utf8");
worker=worker.replace('const COMPANY_DOMAIN="doppel.com";','const COMPANY_DOMAIN="anthropic.com";');
const seedStart=worker.indexOf("const CUSTOMER=");
const seedEnd=worker.indexOf("export class DPLCRM");
if(seedStart<0||seedEnd<0||seedEnd<=seedStart)throw new Error("Could not locate adaptable CRM seed block.");
worker=worker.slice(0,seedStart)+anthDataBlock+"\n"+worker.slice(seedEnd);
fs.writeFileSync(workerPath,worker);

fs.copyFileSync(path.join(overlay,"src","sample-customers.js"),path.join(out,"src","sample-customers.js"));
for(const file of ["index.html","anth-ui.css","anth-track.js"])fs.copyFileSync(path.join(overlay,"public",file),path.join(out,"public",file));
fs.copyFileSync(path.join(overlay,"scripts","anth-production.mjs"),path.join(out,"anth-production.mjs"));

const pkgPath=path.join(out,"package.json");
const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
pkg.name="clintware-anth-crm";
pkg.version="1.0.0";
pkg.scripts=pkg.scripts||{};
pkg.scripts["prepare:prod"]="node prepare-production.mjs && node anth-production.mjs";
pkg.scripts.check=(pkg.scripts.check||"").replace(/\s*&&\s*node --check public\/dplr-enrich\.js/g,"")+" && node --check public/anth-track.js && node --check anth-production.mjs";
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+"\n");

const wranglerPath=path.join(out,"wrangler.jsonc");
let wrangler=fs.readFileSync(wranglerPath,"utf8");
wrangler=wrangler.replace('"name":"clintware-anth-crm",','"name":"clintware-anth-crm",\n  "workers_dev":false,\n  "preview_urls":false,\n  "routes":[{"pattern":"anth.clintware.com","custom_domain":true}],');
fs.writeFileSync(wranglerPath,wrangler);

const configPath=path.join(out,"public","app-config.js");
let config=fs.readFileSync(configPath,"utf8");
config=config.replace('localStorage.getItem("dplrtheme")||"dark"','localStorage.getItem("dplrtheme")||"light"');
fs.writeFileSync(configPath,config);

// Apply the target-role transform now.  npm prepare:prod applies it again after
// generic production preparation, making the boundary idempotent.
execFileSync(process.execPath,[path.join(out,"anth-production.mjs")],{cwd:out,stdio:"inherit"});

const html=fs.readFileSync(path.join(out,"public","index.html"),"utf8");
for(const required of ["/anth-ui.css","/anth-track.js","noindex,nofollow,noarchive"])if(!html.includes(required))throw new Error("Anthropic UI overlay missing: "+required);
const finalWorker=fs.readFileSync(workerPath,"utf8");
for(const required of ['const APP_ID="anth-crm"','const WORKSPACE_ID="anth-gsi"','Apex Systems Integrator (Synthetic)','API commitment utilization'])if(!finalWorker.includes(required))throw new Error("Anthropic identity/data patch missing: "+required);
const sampleText=fs.readFileSync(path.join(out,"src","sample-customers.js"),"utf8");
if(!sampleText.includes("SAMPLE_SEED_VERSION=1")||!sampleText.includes("Northstar Integration Group"))throw new Error("Anthropic sample set missing.");
const trackText=fs.readFileSync(path.join(out,"public","anth-track.js"),"utf8");
if((trackText.match(/objective:/g)||[]).length!==8)throw new Error("Anthropic operating-track contract must remain eight tracks.");
if(!trackText.includes("Consumption + seat adoption")||!trackText.includes("Download QBR brief PDF"))throw new Error("Anthropic role-specific controls missing.");
if(!wrangler.includes('"pattern":"anth.clintware.com"'))throw new Error("Anthropic custom domain route missing.");
for(const rel of ["src/index.js","public/app-config.js","public/app-router.js","public/app-views.js","public/app-ai.js","public/app-forms.js","public/dplr-shell.js","public/dplr-prep.js"]){
 const text=fs.readFileSync(path.join(out,rel),"utf8");
 if(/Doppel|doppel\.com/i.test(text))throw new Error("Source-company semantics leaked into generated runtime: "+rel);
}
if(fs.existsSync(path.join(out,"public","dplr-enrich.js")))throw new Error("Source-company enrichment module must not ship in Anthropic build.");
console.log("ANTH CRM materialized at "+out);
