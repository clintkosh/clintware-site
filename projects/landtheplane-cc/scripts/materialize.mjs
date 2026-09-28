import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const project=path.resolve(here,"..");
const repo=path.resolve(project,"../..");
const base=path.join(repo,"projects","dpl-crm");
const out=path.join(repo,".build","landtheplane-cc");
const overlay=path.join(project,"overlay");

fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.cpSync(base,out,{recursive:true});
fs.cpSync(overlay,out,{recursive:true});
fs.copyFileSync(path.join(project,"wrangler.jsonc"),path.join(out,"wrangler.jsonc"));

const sourcePath=path.join(out,"src","index.js");
let s=fs.readFileSync(sourcePath,"utf8");
function mustReplace(search,replacement,label){
  if(!s.includes(search)) throw new Error("Materializer contract failed: "+label);
  s=s.replace(search,replacement);
}
mustReplace('const AUTH_CONFIG_URL=AUTH_ORIGIN+"/client-config/dpl-crm";','const AUTH_CONFIG_URL=AUTH_ORIGIN+"/client-config/landtheplane-cc";',"auth config");
mustReplace('const APP_ID="dpl-crm";','const APP_ID="landtheplane-cc";',"app id");
mustReplace('const REQUIRED_CONTEXT="dpl-crm:read";','const REQUIRED_CONTEXT="landtheplane-cc:read";',"read scope");
mustReplace('const COMPANY_DOMAIN="doppel.com";','const COMPANY_DOMAIN="clintware.com";',"allowed domain");
mustReplace('const WORKSPACE_ID="dpl-doppel";','const WORKSPACE_ID="landtheplane-cc-private";',"workspace id");
mustReplace('const TX_COOKIE="__Host-dpl-auth-tx";','const TX_COOKIE="__Host-ltpcc-auth-tx";',"tx cookie");
mustReplace('const SESSION_COOKIE="__Host-dpl-session";','const SESSION_COOKIE="__Host-ltpcc-session";',"session cookie");
mustReplace('const GUEST_COOKIE="__Host-dpl-guest";','const GUEST_COOKIE="__Host-ltpcc-guest-disabled";',"guest cookie");
mustReplace('const MAX_CUSTOMERS_PER_WORKSPACE=250;','const MAX_CUSTOMERS_PER_WORKSPACE=2000;',"company limit");
mustReplace('const MAX_RECORDS_PER_WORKSPACE=10000;','const MAX_RECORDS_PER_WORKSPACE=50000;',"record limit");

s=s.replace(
  /const VALID_RECORD_TYPES=new Set\(\[[^\n]+\]\);/,
  'const VALID_RECORD_TYPES=new Set(["handoff","integration","milestone","risk","kpi","adoption","incident","engineering_issue","meeting","stakeholder","renewal","document","action","deployment_card","sprint","raci","note","proposed_plan","jira_config","assistant_profile","assistant_session","plan_change","call_prep","email_draft","job_profile","application_event","interview","follow_up","offer","search_digest","active_role","role_goal","performance_evidence"]);'
);
s=s.replace(
  /const VALID_PROVENANCE=new Set\(\[[^\n]+\]\);/,
  'const VALID_PROVENANCE=new Set(["customer_provided","internal_record","internal_proposal","derived_calculation","ai_suggestion","template","scenario","synthetic_sample","public_research","google_evidence","calendar_evidence","search_digest"]);'
);

const userPolicy=/function userAllowed\(u\)\{[\s\S]*?\}\nfunction userCanWrite\(u\)\{[\s\S]*?\}/;
if(!userPolicy.test(s)) throw new Error("Materializer contract failed: identity policy");
s=s.replace(userPolicy,`function userAllowed(u){if(!u?.sub||u.application!==APP_ID||u.provider!=="google"||u.email_verified!==true)return false;const ctx=Array.isArray(u.application_context)?u.application_context:[];if(!ctx.includes(REQUIRED_CONTEXT))return false;const email=String(u.email||"").toLowerCase();const domain=email.includes("@")?email.split("@").pop():"";return OWNER_EMAILS.has(email)||domain===COMPANY_DOMAIN}
function userCanWrite(u){const ctx=Array.isArray(u?.application_context)?u.application_context:[];return userAllowed(u)&&ctx.includes("landtheplane-cc:write")}`);

s=s.replace(/function loginPage\(\)\{return '[^\n]+'\}/,
  `function loginPage(){return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LandThePlane Command Center · Sign in</title><link rel="stylesheet" href="/cc.css"></head><body><main class="boot"><section class="card" style="max-width:560px"><div class="eyebrow">CLINTWARE IDENTITY</div><h1>LandThePlane Command Center</h1><p class="muted">Private application, interview, and active-role workspace.</p><a class="btn primary" href="/auth/login">Continue with Google</a></section></main></body></html>'}`);

s=s.replaceAll("Doppel Technical Customer Engineering CRM Team","LandThePlane Command Center");
s=s.replaceAll("Doppel Guest Demo","Unauthorized workspace");
s=s.replace('feature:"dpl_crm"','feature:"landtheplane_cc"');
s=s.replace('env.CRM.idFromName("n7demo-main")','env.CRM.idFromName("landtheplane-cc-main")');

const seedNeedle='if(!v||Number(v.version)<SAMPLE_SEED_VERSION){this.seedDefaults(workspace);this.sql.exec("INSERT OR REPLACE INTO workspace_seed(workspace_id,version,updated_at) VALUES(?,?,?)",workspace,SAMPLE_SEED_VERSION,t)}';
mustReplace(seedNeedle,'if(!v||Number(v.version)<SAMPLE_SEED_VERSION){this.sql.exec("INSERT OR REPLACE INTO workspace_seed(workspace_id,version,updated_at) VALUES(?,?,?)",workspace,SAMPLE_SEED_VERSION,t)}',"disable sample seed");

const stateNeedle='if(m==="GET"&&p==="/state"){';
const boardRoute=`if(m==="GET"&&p==="/career-board"){const wanted=new Set(["job_profile","application_event","interview","follow_up","offer","search_digest","active_role","role_goal","performance_evidence","stakeholder","action","document"]);const customers=[...this.sql.exec("SELECT * FROM customers WHERE workspace_id=? ORDER BY updated_at DESC",workspace)].map(r=>JSON.parse(r.data));const records=[...this.sql.exec("SELECT * FROM records WHERE workspace_id=? AND archived=0 ORDER BY updated_at DESC",workspace)].map(r=>this.row(r)).filter(r=>wanted.has(r.type));return j({customers,records,workspace:{id:workspace,name:"LandThePlane Command Center"},access:{authenticated:req.headers.get("x-authenticated")==="1",canWrite:req.headers.get("x-can-write")!=="0",mode:req.headers.get("x-persistence")||"account"}})}
  if(m==="GET"&&p==="/state"){`;
mustReplace(stateNeedle,boardRoute,"career board route");

s=s.replace('stage:"Onboarding"','stage:"Applied"');
fs.writeFileSync(sourcePath,s);

const pkgPath=path.join(out,"package.json");
const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
pkg.name="clintware-landtheplane-cc";
pkg.description="LandThePlane private career command center";
pkg.scripts.check="node --check src/index.js && node --check src/sample-customers.js && node --check src/cc-entry.js && node --check public/cc.js";
pkg.scripts.deploy="npm run check && wrangler deploy";
delete pkg.scripts["prepare:prod"];
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+"\n");
fs.rmSync(path.join(out,"prepare-production.mjs"),{force:true});

for(const file of ["public/doppel-brand.css","public/doppel-polish.js"]){
  fs.rmSync(path.join(out,file),{force:true});
}
console.log("LandThePlane Command Center materialized:",out);
