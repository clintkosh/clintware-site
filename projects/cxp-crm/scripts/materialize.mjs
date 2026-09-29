import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { cxpDataBlock } from "./cxp-data.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const dplr=path.join(repo,"projects","dplr-crm","scripts","materialize.mjs");
const sourceBuild=path.join(repo,".build","dplr-crm");
const overlay=path.join(repo,"projects","cxp-crm");
const out=path.join(repo,".build","cxp-crm");

execFileSync(process.execPath,[dplr],{cwd:repo,stdio:"inherit"});
if(!fs.existsSync(sourceBuild))throw new Error("DPLR materializer did not produce its build.");
fs.rmSync(out,{recursive:true,force:true});
fs.cpSync(sourceBuild,out,{recursive:true});

function rewrite(file,transforms){const p=path.join(out,file);if(!fs.existsSync(p))return;let text=fs.readFileSync(p,"utf8");for(const [from,to] of transforms)text=text.split(from).join(to);fs.writeFileSync(p,text)}
for(const file of ["src/index.js","package.json","wrangler.jsonc","public/app-config.js","public/app-router.js","public/app-views.js","public/app-ai.js","public/app-forms.js","public/import-utils.js","public/dplr-shell.js","public/dplr-prep.js","public/dplr-enrich.js","dplr-production.mjs"]){
 rewrite(file,[
  ["clintware-dplr-crm","clintware-cxp-crm"],
  ["dplr-crm","cxp-crm"],
  ["dplr-doppel","cxp-cxponent"],
  ["__Host-dplr-","__Host-cxp-"],
  ["https://dplrcrm.clintware.com","https://cxp.clintware.com"],
  ["https://dplcrm.clintware.com","https://cxp.clintware.com"],
  ["Doppel Technical Customer Engineering OS","CXponent Infrastructure Advisory Workspace"],
  ["DOPPEL TCE OS","CXponent Infrastructure Advisory Workspace"],
  ["Doppel Technical Customer Engineering CRM","CXponent Infrastructure Advisory Workspace"],
  ["Technical Customer Engineering","Infrastructure Advisory"],
  ["Technical Customer Engineer","Senior Infrastructure Pre-Sales Architect"],
  ["Customer Engineering","Infrastructure Advisory"],
  ["Doppel","CXponent"]
 ]);
}
const workerPath=path.join(out,"src","index.js");
let worker=fs.readFileSync(workerPath,"utf8");
worker=worker.replace('const COMPANY_DOMAIN="doppel.com";','const COMPANY_DOMAIN="cxponent.com";');
worker=worker.replace('const COMPANY_DOMAIN="boompay.app";','const COMPANY_DOMAIN="cxponent.com";');
const start=worker.indexOf("const CUSTOMER=");
const end=worker.indexOf("export class DPLCRM");
if(start<0||end<0||end<=start)throw new Error("Could not locate CRM seed block.");
worker=worker.slice(0,start)+cxpDataBlock+"\n"+worker.slice(end);
fs.writeFileSync(workerPath,worker);

fs.copyFileSync(path.join(overlay,"src","sample-customers.js"),path.join(out,"src","sample-customers.js"));
for(const file of ["index.html","cxp-ui.css","cxp-track.js"])fs.copyFileSync(path.join(overlay,"public",file),path.join(out,"public",file));

const pkgPath=path.join(out,"package.json");
const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
pkg.name="clintware-cxp-crm";pkg.version="1.0.0";pkg.scripts=pkg.scripts||{};pkg.scripts.check=(pkg.scripts.check||"")+" && node --check public/cxp-track.js";
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+"\n");

const wranglerPath=path.join(out,"wrangler.jsonc");
let wrangler=fs.readFileSync(wranglerPath,"utf8");
wrangler=wrangler.replace('"name":"clintware-cxp-crm",','"name":"clintware-cxp-crm",\n  "workers_dev":false,\n  "preview_urls":false,\n  "routes":[{"pattern":"cxp.clintware.com","custom_domain":true}],');
fs.writeFileSync(wranglerPath,wrangler);

const configPath=path.join(out,"public","app-config.js");
let config=fs.readFileSync(configPath,"utf8");
config=config.replace('localStorage.getItem("dplrtheme")||"light"','localStorage.getItem("dplrtheme")||"light"');
config=config.replace('localStorage.getItem("dplrtheme")||"dark"','localStorage.getItem("dplrtheme")||"light"');
fs.writeFileSync(configPath,config);

const html=fs.readFileSync(path.join(out,"public","index.html"),"utf8");
for(const required of ["/cxp-ui.css","/cxp-track.js","noindex,nofollow,noarchive"])if(!html.includes(required))throw new Error("CXponent UI overlay missing: "+required);
const finalWorker=fs.readFileSync(workerPath,"utf8");
for(const required of ['const APP_ID="cxp-crm"','const WORKSPACE_ID="cxp-cxponent"','HarborPoint Health Network','TCO confidence'])if(!finalWorker.includes(required))throw new Error("CXponent identity/data patch missing: "+required);
const sampleText=fs.readFileSync(path.join(out,"src","sample-customers.js"),"utf8");
if(!sampleText.includes("SAMPLE_SEED_VERSION=1")||!sampleText.includes("Summit Financial Group"))throw new Error("CXponent sample set missing.");
const trackText=fs.readFileSync(path.join(out,"public","cxp-track.js"),"utf8");
if((trackText.match(/objective:/g)||[]).length!==8)throw new Error("CXponent operating-track contract must remain eight tracks.");
if(!trackText.includes("Comparable TCO model")||!trackText.includes("Vendor / architecture comparison"))throw new Error("CXponent interactive decision tools missing.");
if(!wrangler.includes('"pattern":"cxp.clintware.com"'))throw new Error("CXponent custom domain route missing.");
console.log("CXP CRM materialized at "+out);
