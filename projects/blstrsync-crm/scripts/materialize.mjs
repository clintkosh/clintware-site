import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const projectRoot=path.resolve(here,"..");
const repo=path.resolve(projectRoot,"../..");
const out=path.join(repo,".build","blstrsync-crm");
const manifest=JSON.parse(fs.readFileSync(path.join(projectRoot,"manifest.json"),"utf8"));

fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const name of ["public","src","scripts"]){fs.cpSync(path.join(projectRoot,name),path.join(out,name),{recursive:true});}
for(const name of ["package.json","wrangler.jsonc","manifest.json"]){fs.copyFileSync(path.join(projectRoot,name),path.join(out,name));}

const evidence={
  version:1,
  claims:[
    {id:"QQ-REFRESH",label:"Repository refresh benchmark",rendered_values:["2.996"],claim_class:"MEASURED",scope:"Completed internal Quillgeist role-CRM benchmark",time_window:"single completed internal build",source:{kind:"internal_execution_evidence",ref:"docs/quillgeist-role-crm-case-study.md",locator:"Measured execution evidence"}},
    {id:"QQ-BUILD",label:"Validate/materialize/check/deploy benchmark",rendered_values:["22.220"],claim_class:"MEASURED",scope:"Completed internal Quillgeist role-CRM benchmark",time_window:"single completed internal build",source:{kind:"internal_execution_evidence",ref:"docs/quillgeist-role-crm-case-study.md",locator:"Measured execution evidence"}},
    {id:"QQ-BROWSER",label:"Browser verification benchmark",rendered_values:["13.560"],claim_class:"MEASURED",scope:"Completed internal Quillgeist role-CRM benchmark",time_window:"single completed internal build",source:{kind:"internal_execution_evidence",ref:"docs/quillgeist-role-crm-case-study.md",locator:"Measured execution evidence"}},
    {id:"QQ-TOKEN-LOW",label:"Modeled token avoidance low bound",rendered_values:["30000","30,000","30k"],claim_class:"ESTIMATE",scope:"Completed internal Quillgeist role-CRM benchmark",time_window:"modeled comparison",source:{kind:"modeled_case_study",ref:"docs/quillgeist-role-crm-case-study.md",locator:"Token-efficiency estimate"},assumptions:["Expected cloud-model supervision required for an equivalent deterministic repository/build/deploy/browser loop"],confidence:"directional"},
    {id:"QQ-TOKEN-HIGH",label:"Modeled token avoidance high bound",rendered_values:["60000","60,000","60k"],claim_class:"ESTIMATE",scope:"Completed internal Quillgeist role-CRM benchmark",time_window:"modeled comparison",source:{kind:"modeled_case_study",ref:"docs/quillgeist-role-crm-case-study.md",locator:"Token-efficiency estimate"},assumptions:["Expected cloud-model supervision required for an equivalent deterministic repository/build/deploy/browser loop"],confidence:"directional"},
    {id:"QQ-PCT",label:"Modeled implementation-token reduction",rendered_values:["60%","80%"],claim_class:"ESTIMATE",scope:"Completed internal Quillgeist role-CRM benchmark",time_window:"modeled comparison",source:{kind:"modeled_case_study",ref:"docs/quillgeist-role-crm-case-study.md",locator:"Token-efficiency estimate"},assumptions:["Comparison against cloud-model supervision of the same deterministic implementation loop"],confidence:"directional"}
  ],
  allowlist:[]
};
fs.writeFileSync(path.join(out,"evidence-provenance.json"),JSON.stringify(evidence,null,2)+"\n");
fs.writeFileSync(path.join(out,"BUILD-MANIFEST.json"),JSON.stringify({ok:true,project:manifest.project_id,domain:manifest.domain,system:manifest.name,roles:manifest.roles.map(x=>x.name),tracks:manifest.tracks.length,persistence:manifest.persistence_mode,qq_compatible:true,local_bitnet_compatible:true},null,2)+"\n");
console.log(JSON.stringify({ok:true,project:manifest.project_id,domain:manifest.domain,roles:manifest.roles.length,tracks:manifest.tracks.length,persistence:manifest.persistence_mode,build:out},null,2));
