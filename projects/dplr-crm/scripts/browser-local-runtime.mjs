import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const clone=x=>JSON.parse(JSON.stringify(x));
const slug=v=>String(v||"account").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"account";

function parseSeed(worker){
  const start=worker.indexOf("const CUSTOMER=");
  const end=worker.indexOf("export class",start);
  if(start<0||end<0||end<=start)throw new Error("Could not locate CRM seed block before browser-local conversion.");
  const block=worker.slice(start,end);
  return Function(block+"\nreturn {CUSTOMER,SEED,KB_SEED};")();
}

function parseSampleRecordFactory(worker){
  const marker="sampleRecords(s){";
  const start=worker.indexOf(marker);
  if(start<0)return null;
  const bodyStart=start+"sampleRecords".length;
  const end=worker.indexOf("\n async seed()",bodyStart);
  if(end<0)return null;
  const signatureAndBody=worker.slice(bodyStart,end);
  try{return Function("return function"+signatureAndBody)()}catch{return null}
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
    portfolio:clone(s.portfolio||{}),
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
    ["kpi",p,{name:"Primary success measure",hypothesis:s.g||"",baseline:"Synthetic baseline / discovery",target:s.met||"Define target with customer",metricDefinition:"Define the exact measurement contract with the customer.",sourceSystem:s.sys||"Customer-approved source",owner:"Customer outcome owner + operator",cadence:"Monthly",calculation:"Define with customer",currentValue:"Progressing",realizedValue:"Pending customer approval",approval:sourceLabel}],
    ["risk",p,{title:s.dep||"Primary dependency to validate",impact:"May affect customer outcome, timeline, adoption, renewal confidence, or decision quality.",owner:"Customer team + operator",mitigation:"Validate evidence, assign an owner, define acceptance criteria, and remeasure.",escalationStatus:"Open",nextDecision:"Confirm owner, evidence source, and next checkpoint."}],
    ["stakeholder",p,{name:c.isPublicReference?"Executive Sponsor (role to validate)":"Executive Sponsor (Synthetic)",role:"Executive sponsor / value owner",organization:c.name,email:"",phone:"",decisionRole:"Business outcome, priority, renewal, and investment decisions",status:c.isPublicReference?"Discovery required":"Active",notes:sourceLabel}],
    ["stakeholder",p,{name:c.isPublicReference?"Operational Owner (role to validate)":"Operational Owner (Synthetic)",role:"Business / adoption owner",organization:c.name,email:"",phone:"",decisionRole:"Adoption, workflow change, and operational KPI ownership",status:c.isPublicReference?"Discovery required":"Active",notes:sourceLabel}],
    ["stakeholder",p,{name:c.isPublicReference?"Technical Owner (role to validate)":"Technical Owner (Synthetic)",role:"Technical / platform owner",organization:c.name,email:"",phone:"",decisionRole:"Technical readiness, integrations, and acceptance",status:c.isPublicReference?"Discovery required":"Active",notes:sourceLabel}],
    ["action",p,{title:"Close the highest-risk open dependency",owner:"Operator + customer owner",due:"Next checkpoint",status:"In Progress",audience:"Customer / Internal"}],
    ["action",p,{title:"Validate adoption and value evidence before the executive review",owner:"Customer Success + customer outcome owner",due:"Before EBR",status:"Planned",audience:"Customer / Internal"}],
    ["meeting",p,{title:"Executive business review",type:"EBR",date:"Next executive checkpoint",attendees:"Executive sponsor; operational owner; technical owner; Customer Success; Sales",objective:"Review outcomes, adoption, open risk, decisions, and the evidence needed for retention or expansion.",notes:sourceLabel}],
    ["call_prep","internal_proposal",{title:"Executive business review",meetingDate:"Next executive checkpoint",meetingType:"EBR",objective:"Connect current adoption and execution to the customer's stated business objective, resolve the highest-risk dependency, and leave with explicit owners and decisions.",attendees:"Executive sponsor; operational owner; technical owner; Customer Success; Sales",opening:"Start with the customer's objective and the decisions required. Use product activity only as evidence toward adoption and outcomes.",currentState:s.cs||"Synthetic sample account with meaningful progress and at least one dependency to resolve.",evidenceReady:(s.met||"Success measures")+"; "+(s.sys||"customer systems")+"; risk and action register",questions:"Which outcome is ready to approve? What adoption gap matters most? Which risk needs escalation? What must be true before renewal or expansion advances?",decisions:"Approve measurement approach; assign risk owner; confirm next adoption intervention; advance or defer retention/expansion hypothesis.",escalationCriteria:"Do not claim realized value without a baseline, metric definition, source, owner, and customer approval.",followUp:"Publish decisions, owners, due dates, evidence gaps, and next executive checkpoint.",technologyNotes:s.sys||"",assistantNotes:"Synthetic/default ASTRO seed. Replace assumptions with customer-validated evidence before external use."}],
    ["raci","template",{title:"Operating RACI",rows:[],roles:["Executive Sponsor","Operational Owner","Technical Owner","Customer Success","Sales","Implementation / Services","Support / Product / Engineering"],note:"Default ASTRO seed. Assign real names and decision rights during discovery."}]
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
  const referenceSampleRecords=parseSampleRecordFactory(worker);
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
  samples.forEach((s,i)=>{
    const customer=customers[i+1];
    let rows=null;
    if(referenceSampleRecords){
      try{rows=referenceSampleRecords(clone(s))}catch{}
    }
    if(!Array.isArray(rows))rows=sampleRecords(customer,s).map(r=>[r.type,r.provenance,r.data]);
    const mapped=rows.map((r,n)=>({
      id:customer.id+"-seed-"+String(n+1).padStart(3,"0"),
      customerId:customer.id,
      type:r[0],
      provenance:r[1],
      data:clone(r[2]),
      createdAt:"2026-09-30T00:00:00.000Z",
      updatedAt:"2026-09-30T00:00:00.000Z"
    }));
    records.push(...mapped);
  });

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
    +'const SEC={"strict-transport-security":"max-age=15552000; includeSubDomains","x-frame-options":"DENY","x-content-type-options":"nosniff","x-robots-tag":"noindex, nofollow, noarchive","referrer-policy":"no-referrer","content-security-policy":"default-src \'self\'; script-src \'self\' \'unsafe-inline\' https://www.googletagmanager.com; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: https:; connect-src \'self\' https://mcp.clintware.com https://www.google-analytics.com; font-src \'self\' data:; frame-ancestors \'none\'; form-action \'self\'; base-uri \'none\'"};\n'
    +'const j=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...H,...SEC}});\n'
    +'const secured=async r=>{const h=new Headers(r.headers);for(const [k,v] of Object.entries(SEC))h.set(k,v);return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})};\n'
    +'export default {async fetch(req,env){const u=new URL(req.url);'
    +'if(u.pathname==="/health")return j({service:'+JSON.stringify(serviceName)+',ok:true,app:APP_ID,workspace:WORKSPACE_ID,storage:"browser-local",persistence:"localStorage-with-memory-fallback",databaseRowsPerDemoSession:0,durableObjectsRequired:false,quotaIndependent:true});'
    +'if(u.pathname.startsWith("/api/"))return j({error:"browser_local_api",detail:"CRM demo persistence is handled in the browser; no Durable Object or server database is required."},409);'
    +'return secured(await env.ASSETS.fetch(req))}};\n';
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
