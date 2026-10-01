import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { nmaDataBlock } from "./nma-data.mjs";
import { SAMPLE_CUSTOMERS } from "../src/sample-customers.js";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const reference=path.join(repo,"projects","dplr-crm","scripts","materialize.mjs");
const sourceBuild=path.join(repo,".build","dplr-crm");
const overlay=path.join(repo,"projects","nma-crm");
const out=path.join(repo,".build","nma-crm");
execFileSync(process.execPath,[reference],{cwd:repo,stdio:"inherit",env:{...process.env,CW_ASTRO_REFERENCE_MODE:"1"}});
if(!fs.existsSync(sourceBuild))throw new Error("Adaptive implementation reference did not materialize.");
fs.rmSync(out,{recursive:true,force:true});
fs.cpSync(sourceBuild,out,{recursive:true});
function rewrite(file,transforms){const p=path.join(out,file);if(!fs.existsSync(p))return;let text=fs.readFileSync(p,"utf8");for(const [from,to] of transforms)text=text.split(from).join(to);fs.writeFileSync(p,text)}
const identityTransforms=[
 ["clintware-dplr-crm","clintware-nma-crm"],
 ["dplr-crm","nma-crm"],
 ["dplr-doppel","nma-northstar"],
 ["__Host-dplr-","__Host-nma-"],
 ["https://dplrcrm.clintware.com","https://nma.clintware.com"],
 ["Doppel Technical Customer Engineering OS","Noma AI Security Customer Operating System"],
 ["DOPPEL TCE OS","NOMA AI SECURITY CS OS"]
];
for(const file of ["src/index.js","package.json","wrangler.jsonc","public/app-config.js","public/app-router.js","public/app-views.js","public/app-ai.js","public/app-forms.js","public/import-utils.js","public/dplr-shell.js","public/dplr-prep.js"])rewrite(file,identityTransforms);
const workerPath=path.join(out,"src","index.js");
let worker=fs.readFileSync(workerPath,"utf8");
worker=worker.replace('const COMPANY_DOMAIN="doppel.com";','const COMPANY_DOMAIN="noma.security";');
const seedStart=worker.indexOf("const CUSTOMER=");
const seedEnd=worker.indexOf("export class DPLCRM");
if(seedStart<0||seedEnd<0||seedEnd<=seedStart)throw new Error("Could not locate adaptable CRM seed block.");
worker=worker.slice(0,seedStart)+nmaDataBlock+"\n"+worker.slice(seedEnd);
fs.writeFileSync(workerPath,worker);
fs.copyFileSync(path.join(overlay,"src","sample-customers.js"),path.join(out,"src","sample-customers.js"));
for(const file of ["index.html","nma-ui.css","nma-track.js","nma-build-status.js"])fs.copyFileSync(path.join(overlay,"public",file),path.join(out,"public",file));
for(const file of ["nma-production.mjs","nma-logic-test.mjs"])fs.copyFileSync(path.join(overlay,"scripts",file),path.join(out,file));
const configPath=path.join(out,"public","app-config.js");
let config=fs.readFileSync(configPath,"utf8");
config=config.replace('localStorage.getItem("dplrtheme")||"light"','localStorage.getItem("dplrtheme")||"dark"');
fs.writeFileSync(configPath,config);

// Reuse the mature DPLR cleanup, then replace only the persistence/runtime layer
// with a quota-independent browser-local candidate demo.
execFileSync(process.execPath,[path.join(out,"nma-production.mjs")],{cwd:out,stdio:"inherit"});
const localTemplate=fs.readFileSync(path.join(overlay,"public","nma-local-api.js"),"utf8");
const localApi=localTemplate
 .replace("__NMA_DATA_BLOCK__",nmaDataBlock)
 .replace("__NMA_SAMPLE_CUSTOMERS__",JSON.stringify(SAMPLE_CUSTOMERS));
if(localApi.includes("__NMA_DATA_BLOCK__")||localApi.includes("__NMA_SAMPLE_CUSTOMERS__"))throw new Error("NMA browser-local data markers were not replaced.");
fs.writeFileSync(path.join(out,"public","nma-local-api.js"),localApi);
fs.writeFileSync(path.join(out,"public","health.json"),JSON.stringify({service:"clintware-nma-crm",ok:true,storage:"browser-local",databaseRowsPerDemoSession:0,syntheticData:true},null,2)+"\n");
const staticWorker=`const APP_ID="nma-crm";\nconst WORKSPACE_ID="nma-northstar";\nconst JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-robots-tag":"noindex, nofollow, noarchive"};\nconst j=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:JSON_HEADERS});\nexport default {async fetch(req,env){const u=new URL(req.url);if(u.pathname==="/health")return j({service:"clintware-nma-crm",ok:true,app:APP_ID,workspace:WORKSPACE_ID,storage:"browser-local",databaseRowsPerDemoSession:0});if(u.pathname.startsWith("/api/"))return j({error:"browser_local_api",detail:"This candidate demo keeps CRM persistence in the browser to avoid server-side database quota consumption."},409);return env.ASSETS.fetch(req)}};\n`;
fs.writeFileSync(workerPath,staticWorker);

const pkgPath=path.join(out,"package.json");
const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
pkg.name="clintware-nma-crm";pkg.version="1.1.1";pkg.scripts=pkg.scripts||{};
pkg.scripts["prepare:prod"]="node nma-logic-test.mjs";
pkg.scripts.check="node --check src/index.js && node --check src/sample-customers.js && node --check public/app-config.js && node --check public/app-views.js && node --check public/app-ai.js && node --check public/app-router.js && node --check public/app-forms.js && node --check public/import-utils.js && node --check public/dplr-shell.js && node --check public/dplr-prep.js && node --check public/nma-local-api.js && node --check public/nma-track.js && node --check public/nma-build-status.js && node --check nma-production.mjs && node nma-logic-test.mjs";
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+"\n");

const wranglerPath=path.join(out,"wrangler.jsonc");
const wrangler=JSON.parse(fs.readFileSync(wranglerPath,"utf8"));
wrangler.name="clintware-nma-crm";
wrangler.workers_dev=false;
wrangler.preview_urls=false;
wrangler.routes=[{pattern:"nma.clintware.com",custom_domain:true}];
wrangler.assets={directory:"./public",binding:"ASSETS",run_worker_first:false};
delete wrangler.durable_objects;
delete wrangler.services;
// The NMA Worker previously had DPLCRM v1. Keep its migration history and retire
// that synthetic-only namespace explicitly; future deploys remain stateless.
wrangler.migrations=[
 {tag:"v1",new_sqlite_classes:["DPLCRM"]},
 {tag:"v2-browser-local",deleted_classes:["DPLCRM"]}
];
wrangler.vars={NMA_RUNTIME_MODE:"browser-local-candidate-demo"};
fs.writeFileSync(wranglerPath,JSON.stringify(wrangler,null,2)+"\n");

const html=fs.readFileSync(path.join(out,"public","index.html"),"utf8");
for(const required of ["/nma-ui.css","/nma-local-api.js","/nma-track.js","/nma-build-status.js","noindex,nofollow,noarchive"])if(!html.includes(required))throw new Error("NMA UI overlay missing: "+required);
const finalWorker=fs.readFileSync(workerPath,"utf8"),finalLocal=fs.readFileSync(path.join(out,"public","nma-local-api.js"),"utf8");
for(const required of ['const APP_ID="nma-crm"','const WORKSPACE_ID="nma-northstar"'])if(!finalWorker.includes(required))throw new Error("NMA worker identity missing: "+required);
for(const required of ["Northstar Bank (Synthetic)","Priority MCP governance coverage","localStorage","databaseRowsPerDemoSession"])if(!finalLocal.includes(required)&&!finalWorker.includes(required))throw new Error("NMA local runtime/data patch missing: "+required);
const sampleText=fs.readFileSync(path.join(out,"src","sample-customers.js"),"utf8");
if(!sampleText.includes("SAMPLE_SEED_VERSION=2")||!sampleText.includes("Summit SaaS")||!sampleText.includes('phase:"discover"')||!sampleText.includes('phase:"expand"'))throw new Error("NMA lifecycle-varied sample set missing.");
const trackText=fs.readFileSync(path.join(out,"public","nma-track.js"),"utf8");
if((trackText.match(/objective:/g)||[]).length!==9)throw new Error("NMA operating-track contract must remain nine tracks.");
for(const required of ["MCP governance","Presentation","Download CISO brief PDF","Customer Insight & Product Signal"])if(!trackText.includes(required))throw new Error("NMA role-specific control missing: "+required);
const wranglerText=fs.readFileSync(wranglerPath,"utf8");
if(!wranglerText.includes('"pattern": "nma.clintware.com"')||wranglerText.includes("durable_objects")||!wranglerText.includes('"deleted_classes"')||!wranglerText.includes('"v2-browser-local"'))throw new Error("NMA quota-independent deployment / retirement contract failed.");
for(const rel of ["src/index.js","public/app-config.js","public/app-router.js","public/app-views.js","public/app-ai.js","public/app-forms.js","public/import-utils.js","public/dplr-shell.js","public/dplr-prep.js","public/nma-local-api.js","public/nma-track.js","public/nma-build-status.js"]){const text=fs.readFileSync(path.join(out,rel),"utf8");if(/Doppel|doppel\.com/i.test(text))throw new Error("Source-company semantics leaked into generated runtime: "+rel)}
if(fs.existsSync(path.join(out,"public","dplr-enrich.js")))throw new Error("Source-company enrichment module must not ship in NMA build.");
execFileSync(process.execPath,[path.join(out,"nma-logic-test.mjs")],{cwd:out,stdio:"inherit"});
console.log("NMA CRM materialized with browser-local persistence and DPLCRM retirement at "+out);
