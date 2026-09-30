import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const clone=x=>JSON.parse(JSON.stringify(x));
const slug=v=>String(v||"account").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"account";

function parseSeed(worker){
  const start=worker.indexOf("const CUSTOMER=");
  const end=worker.indexOf("export class DPLCRM",start);
  if(start<0||end<0||end<=start)throw new Error("Could not locate DPLCRM seed block before browser-local conversion.");
  const block=worker.slice(start,end);
  return Function(block+"\nreturn {CUSTOMER,SEED,KB_SEED};")();
}
function customerFromSample(s){
  const provenance=String(s.pv||"synthetic_sample");
  const isPublic=Boolean(s.publicReference)||provenance==="public_research";
  return {
    id:"sample-"+slug(s.n),
    name:String(s.n||"Sample Account"),
    nameStatus:isPublic?"Public-reference account":"Synthetic role-specific sample account",
    industry:String(s.i||"Not recorded"),
    stage:String(s.st||"Discovery"),
    week:null,
    provenance,
    isSynthetic:!isPublic,
    isPublicReference:isPublic,
    defaultSample:true,
    sourceFile:String(s.f||""),
    facts:{
      serviceModel:String(s.sm||""),
      product:String(s.sc||""),
      currentSystems:String(s.sys||""),
      businessGoal:String(s.g||""),
      successMetrics:String(s.met||""),
      committedTimeline:String(s.tl||""),
      connectorStatus:String(s.cs||""),
      unvalidatedDependencies:String(s.dep||""),
      roiTarget:String(s.met||""),
      users:String(s.sm||"")
    }
  };
}
function sampleRecords(c,s){
  const p=c.provenance==="public_research"?"internal_proposal":"synthetic_sample";
  const sourceLabel=c.provenance==="public_research"?"Public-source discovery proposal":"Synthetic sample";
  const rows=[
    ["handoff",p,{title:"Operating context",value:s.sm||"",validation:sourceLabel,note:s.g||""}],
    ["handoff",p,{title:"Customer objective",value:s.g||"",validation:sourceLabel,note:s.met||""}],
    ["risk",p,{title:s.dep||"Primary dependency to validate",impact:"May affect customer outcome, timeline, adoption, or decision quality.",owner:"Customer team + operator",mitigation:"Validate evidence, assign an owner, define acceptance criteria, and remeasure.",escalationStatus:"Open",nextDecision:"Confirm owner, evidence source, and next checkpoint."}],
    ["kpi",p,{name:"Primary success measure",hypothesis:s.g||"",baseline:"Not yet validated",target:s.met||"",metricDefinition:"Define the exact measurement contract with the customer.",sourceSystem:s.sys||"",owner:"Customer outcome owner + operator",cadence:"Monthly",calculation:"Define with customer",currentValue:"Discovery",realizedValue:"Not yet approved",approval:sourceLabel}],
    ["stakeholder",p,{name:c.isPublicReference?"Executive Sponsor (role to validate)":"Executive Sponsor (Synthetic)",role:"Executive sponsor / value owner",organization:c.name,email:"",phone:"",decisionRole:"Business outcome and priority decisions",status:c.isPublicReference?"Discovery required":"Active",notes:sourceLabel}],
    ["stakeholder",p,{name:c.isPublicReference?"Technical Owner (role to validate)":"Technical Owner (Synthetic)",role:"Technical / platform owner",organization:c.name,email:"",phone:"",decisionRole:"Technical readiness, integrations, and acceptance",status:c.isPublicReference?"Discovery required":"Active",notes:sourceLabel}],
    ["action",p,{title:"Close the highest-risk open dependency",owner:"Operator + customer owner",due:"Next checkpoint",status:"Planned",audience:"Customer / Internal"}],
    ["raci","template",{title:"Operating RACI",rows:[],roles:["Customer","Sales","Customer Success","Technical","Support","Product"],note:"Assign real names and decision rights during discovery."}]
  ];
  String(s.sys||"").split(";").map(x=>x.trim()).filter(Boolean).forEach(name=>rows.push(["integration",p,{name,purpose:"Customer technology / workflow context",connectorStatus:s.cs||"Not validated",technicalValidation:s.dep||"Needs human review"}]));
  return rows.map((r,i)=>({id:c.id+"-seed-"+String(i+1).padStart(3,"0"),customerId:c.id,type:r[0],provenance:r[1],data:r[2],createdAt:"2026-09-30T00:00:00.000Z",updatedAt:"2026-09-30T00:00:00.000Z"}));
}

export async function applyBrowserLocalRuntime({out,appId,workspaceId,serviceName,workspaceName,version=1}){
  const workerPath=path.join(out,"src","index.js");
  const htmlPath=path.join(out,"public","index.html");
  const wranglerPath=path.join(out,"wrangler.jsonc");
  const samplePath=path.join(out,"src","sample-customers.js");
  const worker=fs.readFileSync(workerPath,"utf8");
  const seed=parseSeed(worker);
  const samples=fs.existsSync(samplePath)
    ? (await import(pathToFileURL(samplePath).href+"?v="+Date.now())).SAMPLE_CUSTOMERS||[]
    : [];
  const golden={...clone(seed.CUSTOMER),isSynthetic:true};
  const customers=[golden,...samples.map(customerFromSample)];
  const records=(seed.SEED||[]).map((r,i)=>({
    id:golden.id+"-golden-"+String(i+1).padStart(3,"0"),
    customerId:golden.id,
    type:r[0],
    provenance:r[1],
    data:clone(r[2]),
    createdAt:"2026-09-30T00:00:00.000Z",
    updatedAt:"2026-09-30T00:00:00.000Z"
  }));
  samples.forEach((s,i)=>records.push(...sampleRecords(customers[i+1],s)));

  const bootstrap={
    version,
    appId,
    workspaceId,
    workspaceName:workspaceName||serviceName,
    storageKey:"cw-astro:"+appId+":workspace:v"+version,
    customers,
    records,
    kb:clone(seed.KB_SEED||[])
  };
  fs.writeFileSync(path.join(out,"public","cw-astro-local-bootstrap.js"),"window.CW_ASTRO_LOCAL_BOOTSTRAP="+JSON.stringify(bootstrap)+";\n");

  let html=fs.readFileSync(htmlPath,"utf8");
  const scripts='<script src="/cw-astro-local-bootstrap.js"></script>\n  <script src="/cw-astro-local-store.js"></script>\n  ';
  if(!html.includes("/cw-astro-local-store.js")){
    if(!html.includes('<script src="/app-config.js"></script>'))throw new Error("Could not locate app-config script insertion point.");
    html=html.replace('<script src="/app-config.js"></script>',scripts+'<script src="/app-config.js"></script>');
    fs.writeFileSync(htmlPath,html);
  }

  const wrangler=JSON.parse(fs.readFileSync(wranglerPath,"utf8"));
  const oldClasses=Array.isArray(wrangler.durable_objects?.bindings)
    ? [...new Set(wrangler.durable_objects.bindings.map(x=>x.class_name).filter(Boolean))]
    : [];
  wrangler.assets={...(wrangler.assets||{}),directory:"./public",binding:"ASSETS",run_worker_first:false};
  delete wrangler.durable_objects;
  delete wrangler.services;
  wrangler.vars={...(wrangler.vars||{}),CRM_RUNTIME_MODE:"browser-local-candidate-demo"};
  if(oldClasses.length){
    const migrations=Array.isArray(wrangler.migrations)?wrangler.migrations:[];
    const hasDelete=migrations.some(m=>Array.isArray(m.deleted_classes)&&oldClasses.every(c=>m.deleted_classes.includes(c)));
    if(!hasDelete)migrations.push({tag:"v2-browser-local",deleted_classes:oldClasses});
    wrangler.migrations=migrations;
  }
  fs.writeFileSync(wranglerPath,JSON.stringify(wrangler,null,2)+"\n");

  const staticWorker='const APP_ID='+JSON.stringify(appId)+';\n'
    +'const WORKSPACE_ID='+JSON.stringify(workspaceId)+';\n'
    +'const H={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-robots-tag":"noindex, nofollow, noarchive"};\n'
    +'const j=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});\n'
    +'export default {async fetch(req,env){const u=new URL(req.url);'
    +'if(u.pathname==="/health")return j({service:'+JSON.stringify(serviceName)+',ok:true,app:APP_ID,workspace:WORKSPACE_ID,storage:"browser-local",persistence:"localStorage-with-memory-fallback",databaseRowsPerDemoSession:0,durableObjectsRequired:false,quotaIndependent:true});'
    +'if(u.pathname.startsWith("/api/"))return j({error:"browser_local_api",detail:"CRM demo persistence is handled in the browser; no Durable Object or server database is required."},409);'
    +'return env.ASSETS.fetch(req)}};\n';
  fs.writeFileSync(workerPath,staticWorker);

  const pkgPath=path.join(out,"package.json");
  const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
  pkg.scripts=pkg.scripts||{};
  // Role-specific production transforms are applied before this helper. Once the
  // generated runtime is stateless, later checks must not try to mutate the retired
  // Durable Object worker again.
  pkg.scripts["prepare:prod"]="node --check src/index.js";
  const extra="node --check public/cw-astro-local-bootstrap.js && node --check public/cw-astro-local-store.js";
  if(!String(pkg.scripts.check||"").includes("cw-astro-local-store.js"))pkg.scripts.check=(pkg.scripts.check||"node --check src/index.js")+" && "+extra;
  fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+"\n");

  const checkWrangler=fs.readFileSync(wranglerPath,"utf8");
  if(checkWrangler.includes('"durable_objects"'))throw new Error("Browser-local runtime still contains a Durable Object binding.");
  if(!fs.readFileSync(htmlPath,"utf8").includes("/cw-astro-local-store.js"))throw new Error("Browser-local runtime was not injected into the app.");
  if(!fs.readFileSync(workerPath,"utf8").includes("databaseRowsPerDemoSession:0"))throw new Error("Quota-independent health contract missing.");
  return {customers:customers.length,records:records.length,storage:"browser-local",durableObjectsRequired:false};
}
