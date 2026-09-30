import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { applyBrowserLocalRuntime } from "../../dplr-crm/scripts/browser-local-runtime.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const project=path.resolve(here,"..");
const repo=path.resolve(project,"../..");
const out=path.join(repo,".build","dpl-crm-local");
fs.rmSync(out,{recursive:true,force:true});
fs.cpSync(project,out,{recursive:true,filter:(src)=>!/[\\/]node_modules(?:[\\/]|$)/.test(src)&&!/[\\/]\.build(?:[\\/]|$)/.test(src)});
fs.copyFileSync(path.join(repo,"projects","dplr-crm","public","cw-astro-local-store.js"),path.join(out,"public","cw-astro-local-store.js"));
if(fs.existsSync(path.join(out,"prepare-production.mjs"))){
  execFileSync(process.execPath,[path.join(out,"prepare-production.mjs")],{cwd:out,stdio:"inherit"});
}
const result=await applyBrowserLocalRuntime({
  out,
  appId:"dpl-crm",
  workspaceId:"dpl-doppel",
  serviceName:"clintware-dpl-crm",
  workspaceName:"Doppel Technical Customer Engineering browser-local workspace",
  version:4
});
console.log("DPL browser-local deployment artifact:",JSON.stringify(result));
