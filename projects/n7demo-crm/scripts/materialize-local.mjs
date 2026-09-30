import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyBrowserLocalRuntime } from "../../dplr-crm/scripts/browser-local-runtime.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const project=path.resolve(here,"..");
const repo=path.resolve(project,"../..");
const out=path.join(repo,".build","n7demo-crm-local");
fs.rmSync(out,{recursive:true,force:true});
fs.cpSync(project,out,{recursive:true,filter:(src)=>!/[\\/]node_modules(?:[\\/]|$)/.test(src)&&!/[\\/]\.build(?:[\\/]|$)/.test(src)});
fs.copyFileSync(path.join(repo,"projects","dplr-crm","public","cw-astro-local-store.js"),path.join(out,"public","cw-astro-local-store.js"));
const result=await applyBrowserLocalRuntime({
  out,
  appId:"n7demo-crm",
  workspaceId:"n7demo-neuron7",
  serviceName:"clintware-n7demo-crm",
  workspaceName:"Neuron7 candidate-demo browser-local workspace",
  version:3
});
console.log("N7Demo browser-local deployment artifact:",JSON.stringify(result));
