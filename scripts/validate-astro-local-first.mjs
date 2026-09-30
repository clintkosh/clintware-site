import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const projects=["anth-crm","bm-crm","cxp-crm","nma-crm","smspc-crm"];
const failures=[];
const ok=(condition,message)=>{if(!condition)failures.push(message)};

for(const project of projects){
  const manifestPath=path.join(root,"projects",project,"manifest.json");
  const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
  ok(manifest.persistence_mode==="browser-local",project+": persistence_mode must default to browser-local");
  ok(manifest.remote_state_required===false,project+": remote_state_required must be false for candidate/demo mode");
  ok(manifest.durable_objects_required===false,project+": durable_objects_required must be false for candidate/demo mode");

  execFileSync(process.execPath,[path.join(root,"projects",project,"scripts","materialize.mjs")],{cwd:root,stdio:"inherit"});
  const out=path.join(root,".build",project);
  const wrangler=fs.readFileSync(path.join(out,"wrangler.jsonc"),"utf8");
  const worker=fs.readFileSync(path.join(out,"src","index.js"),"utf8");
  ok(!wrangler.includes('"durable_objects"'),project+": generated deployment still contains durable_objects");
  ok(worker.includes("databaseRowsPerDemoSession:0"),project+": health contract does not prove zero required DB rows");
  const html=fs.readFileSync(path.join(out,"public","index.html"),"utf8");
  const hasLocalRuntime=html.includes("cw-astro-local-store.js")||html.includes("nma-local-api.js")||html.includes("smspc-local-store.js");
  ok(hasLocalRuntime,project+": browser-local runtime is not loaded by the generated app");
}

for(const legacy of [
  {script:"projects/dpl-crm/scripts/materialize-local.mjs",out:"dpl-crm-local",label:"dpl-crm-live"},
  {script:"projects/n7demo-crm/scripts/materialize-local.mjs",out:"n7demo-crm-local",label:"n7demo-crm-live"}
]){
  execFileSync(process.execPath,[path.join(root,legacy.script)],{cwd:root,stdio:"inherit"});
  const out=path.join(root,".build",legacy.out);
  const wrangler=fs.readFileSync(path.join(out,"wrangler.jsonc"),"utf8");
  const worker=fs.readFileSync(path.join(out,"src","index.js"),"utf8");
  const html=fs.readFileSync(path.join(out,"public","index.html"),"utf8");
  ok(!wrangler.includes('"durable_objects"'),legacy.label+": generated live artifact still contains durable_objects");
  ok(worker.includes("databaseRowsPerDemoSession:0"),legacy.label+": health contract does not prove zero required DB rows");
  ok(html.includes("cw-astro-local-store.js"),legacy.label+": browser-local runtime is not loaded");
}

execFileSync(process.execPath,[path.join(root,"projects","dplr-crm","scripts","materialize.mjs")],{cwd:root,stdio:"inherit"});
{
  const out=path.join(root,".build","dplr-crm");
  const wrangler=fs.readFileSync(path.join(out,"wrangler.jsonc"),"utf8");
  const worker=fs.readFileSync(path.join(out,"src","index.js"),"utf8");
  ok(!wrangler.includes('"durable_objects"'),"dplr-crm: default implementation reference still contains durable_objects");
  ok(worker.includes("databaseRowsPerDemoSession:0"),"dplr-crm: default output is not quota-independent");
}

for(const rel of [
  "ASTRO_CRM_ONE_OFF_SKILL.md",
  "ASTRO_CRM_CSM_SUPPORT_DUAL_TRACK_SKILL.md",
  "ASTRO_WEBSITE_SKILL.md",
  "skills/advanced-customer-success-crm-builder/SKILL.md",
  "skills/standard-saas-website-template/SKILL.md",
  "AGENTS.md"
]){
  const text=fs.readFileSync(path.join(root,rel),"utf8");
  ok(/local-first-persistence-standard|browser-local persistence|Local-first persistence/i.test(text),rel+": local-first persistence rule missing");
}

if(failures.length){
  console.error("\nASTRO LOCAL-FIRST VALIDATION FAILED");
  failures.forEach(x=>console.error(" - "+x));
  process.exit(2);
}
console.log("\nASTRO LOCAL-FIRST VALIDATION PASSED");
console.log(JSON.stringify({projects:[...projects,"dplr-crm","dpl-crm-live","n7demo-crm-live"],durableObjectsRequired:false,defaultPersistence:"browser-local"},null,2));
