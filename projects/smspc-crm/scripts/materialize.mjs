import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { smspcDataBlock } from "./smspc-data.mjs";

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

function rewrite(file,transforms){const p=path.join(out,file);if(!fs.existsSync(p))return;let text=fs.readFileSync(p,"utf8");for(const [from,to] of transforms)text=text.split(from).join(to);fs.writeFileSync(p,text)}

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
for(const file of ["index.html","smspc-ui.css","smspc-track.js"])fs.copyFileSync(path.join(overlay,"public",file),path.join(out,"public",file));

const pkgPath=path.join(out,"package.json");
const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
pkg.name="clintware-smspc-crm";pkg.version="1.0.0";pkg.scripts=pkg.scripts||{};pkg.scripts.check=(pkg.scripts.check||"")+" && node --check public/smspc-track.js";
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+"\n");

const wranglerPath=path.join(out,"wrangler.jsonc");
let wrangler=fs.readFileSync(wranglerPath,"utf8");
wrangler=wrangler.replace('"name":"clintware-smspc-crm",','"name":"clintware-smspc-crm",\n  "workers_dev":false,\n  "preview_urls":false,\n  "routes":[{"pattern":"smspc.clintware.com","custom_domain":true}],');
fs.writeFileSync(wranglerPath,wrangler);

const configPath=path.join(out,"public","app-config.js");
let config=fs.readFileSync(configPath,"utf8");
config=config.replace('localStorage.getItem("dplrtheme")||"light"','localStorage.getItem("dplrtheme")||"dark"');
fs.writeFileSync(configPath,config);

const html=fs.readFileSync(path.join(out,"public","index.html"),"utf8");
for(const required of ["/smspc-ui.css","/smspc-track.js","noindex,nofollow,noarchive"])if(!html.includes(required))throw new Error("SimSpace UI overlay missing: "+required);
const finalWorker=fs.readFileSync(workerPath,"utf8");
for(const required of ['const APP_ID="smspc-crm"','const WORKSPACE_ID="smspc-simspace"','Aegis National Bank','AI Proving Grounds'])if(!finalWorker.includes(required))throw new Error("SimSpace identity/data patch missing: "+required);
const samples=fs.readFileSync(path.join(out,"src","sample-customers.js"),"utf8");
if(!samples.includes("SAMPLE_SEED_VERSION=1")||!samples.includes("Liberty Grid Operations"))throw new Error("SimSpace sample set missing.");
const track=fs.readFileSync(path.join(out,"public","smspc-track.js"),"utf8");
if((track.match(/objective:/g)||[]).length!==8)throw new Error("SimSpace operating-track contract must remain eight tracks.");
if(!wrangler.includes('"pattern":"smspc.clintware.com"'))throw new Error("SimSpace custom domain route missing.");

console.log("SMSPC CRM materialized at "+out);
