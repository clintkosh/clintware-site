(()=>{
/* Generated during materialization: the two markers below are replaced with NMA synthetic data. */
const NMA_DATA=(()=>{
__NMA_DATA_BLOCK__
return {CUSTOMER,SEED,KB_SEED};
})();
const SAMPLE_CUSTOMERS=__NMA_SAMPLE_CUSTOMERS__;
const STORAGE_KEY="nma.crm.local.v2";
const VERSION=3;
const REPLACEABLE=new Set(["synthetic_sample","template","scenario"]);
const clone=x=>JSON.parse(JSON.stringify(x));
const now=()=>new Date().toISOString();
const slug=x=>String(x||"account").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,54)||"account";
const uid=p=>(p||"id")+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
const json=(x,status=200)=>Promise.resolve(new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}}));
function customerFromSample(s){return {
 id:"sample-"+slug(s.n),name:s.n,nameStatus:"Synthetic role-specific sample account",industry:s.i||"Not recorded",
 stage:s.st||"Discovery",week:Number(s.week||1),health:s.health||"Watch",trend:s.trend||"Stable",progress:Number(s.progress||0),
 priority:s.priority||s.g||"",nextAction:s.nextAction||s.dep||"",phase:s.phase||"discover",
 provenance:"synthetic_sample",isSynthetic:true,defaultSample:true,sourceFile:s.f||"Synthetic sample",
 facts:{users:s.sm||"",product:s.sc||"",committedTimeline:s.tl||"",roiTarget:s.met||"",kickoff:s.cs||"",unvalidatedDependencies:s.dep||"",successMetrics:s.met||"",currentSystems:s.sys||"",businessGoal:s.g||""}
}}
function semanticKey(r){const d=r?.data||{};return [r?.type||"",d.title||d.name||d.metricName||""].join("|").toLowerCase()}
function sampleRecords(c,s){
 const p="synthetic_sample",label="Synthetic sample", rows=[];
 const push=(type,data,prov=p)=>rows.push([type,prov,data]);
 push("handoff",{title:"Customer objective / AI security program",value:s.g||"",validation:label,note:s.met||""});
 push("handoff",{title:"AI environment / scope",value:s.sc||"",validation:label,note:"Synthetic role-training context"});
 push("handoff",{title:"Lifecycle / success-plan horizon",value:s.tl||"",validation:label,note:(s.st||"")+" · phase "+(s.phase||"discover")+" · week "+(s.week||1)});
 for(const x of String(s.sys||"").split(";").map(v=>v.trim()).filter(Boolean)) push("integration",{name:x,purpose:"Synthetic customer technology / workflow context",connectorStatus:s.cs||"Not validated",technicalValidation:s.dep||"Needs human review"});
 const metrics=Array.isArray(s.metrics)&&s.metrics.length?s.metrics:[{name:"Primary customer outcome",baseline:"Not yet validated",current:"Discovery",target:s.met||"",owner:"Customer Solutions + customer outcome owner",cadence:"Monthly",source:s.sys||""}];
 for(const m of metrics) push("kpi",{name:m.name,hypothesis:s.g||"",baseline:m.baseline||"Not yet validated",target:m.target||s.met||"",metricDefinition:"Synthetic measurement contract for "+m.name+". Confirm exact definition with the customer.",sourceSystem:m.source||s.sys||"",owner:m.owner||"Customer Solutions + customer outcome owner",cadence:m.cadence||"Monthly",calculation:m.calculation||"Defined in synthetic success plan",currentValue:m.current||"Not recorded",realizedValue:m.realizedValue||"Not yet approved",approval:label});
 for(const a of (s.adoption||[])) push("adoption",{name:a.name,value:a.value,period:a.period||("Week "+(s.week||1)),source:a.source||"Synthetic operating ledger",owner:a.owner||"Customer Solutions"});
 for(const r of (s.risks||[])) push("risk",{title:r.title,impact:r.impact||"May affect risk reduction, adoption, executive evidence, retention, or expansion readiness.",owner:r.owner||"Customer Solutions + customer owner",mitigation:r.mitigation||"Assign owner, define acceptance criteria, execute the bounded mitigation, and remeasure.",severity:r.severity||"Medium",escalationStatus:r.status||"Open",nextDecision:r.decision||"Confirm owner and next checkpoint."});
 const stakeholders=Array.isArray(s.stakeholders)&&s.stakeholders.length?s.stakeholders:[
  {name:"Executive Sponsor (Synthetic)",role:"CISO / executive sponsor",decisionRole:"Risk appetite, executive outcomes, and expansion decisions",status:"Active"},
  {name:"AI Platform Owner (Synthetic)",role:"AI platform / technical owner",decisionRole:"AI architecture, workload readiness, and platform standards",status:"Active"},
  {name:"Security Program Owner (Synthetic)",role:"AppSec / GRC / AI security lead",decisionRole:"Control ownership, evidence, testing, and operationalization",status:"Active"}
 ];
 for(const st of stakeholders) push("stakeholder",{name:st.name,role:st.role,organization:c.name,email:"",phone:"",decisionRole:st.decisionRole||"",status:st.status||"Active",notes:"Synthetic role placeholder aligned to this account stage."});
 for(const a of (s.actions||[])) push("action",{title:a.title,owner:a.owner||"Customer Solutions + customer owner",due:a.due||"Next checkpoint",status:a.status||"Planned",audience:a.audience||"Customer / Internal"});
 for(const i of (s.issues||[])) push("issue",{title:i.title,status:i.status||"Open",owner:i.owner||"Customer Solutions",priority:i.priority||"Medium",detail:i.detail||("Synthetic cross-functional dependency for "+(s.st||"current stage"))},"synthetic_sample");
 const mt=s.meeting||{title:"AI security success checkpoint",type:"Success-plan review",date:"Next checkpoint",objective:"Review AI estate, risk, governance, testing, runtime protection, outcomes, expansion readiness, and the next decision."};
 push("meeting",{title:mt.title,type:mt.type||"Success-plan review",date:mt.date||"Next checkpoint",attendees:stakeholders.map(x=>x.role).join("; ")+"; Customer Solutions",objective:mt.objective||"",notes:"Synthetic candidate-demo meeting."});
 push("call_prep",{title:mt.title,meetingDate:mt.date||"Next checkpoint",meetingType:mt.type||"Success-plan review",objective:mt.objective||"",attendees:stakeholders.map(x=>x.name).join("; "),opening:"Start with the customer's current phase, the decision that matters now, and the evidence required to advance responsibly.",currentState:"Stage: "+(s.st||"Discovery")+" · Health: "+(s.health||"Watch")+" · Progress: "+(s.progress||0)+"%. Priority: "+(s.priority||s.g||""),evidenceReady:metrics.map(x=>x.name+": "+(x.current||"Not recorded")+" vs "+(x.target||"target not recorded")).join("; "),questions:"What must be true to advance to the next phase? Which risk changes the decision? Which owner or dependency is blocking progress? What evidence is sufficient?",decisions:"Confirm next-phase exit criteria, owners, dates, escalation state, and any expansion or de-risking decision.",followUp:s.nextAction||s.dep||"Publish decisions, owners, dates, and evidence gaps."},"synthetic_sample");
 push("document",{name:s.f||"Synthetic success-plan source",classification:"Synthetic sample seed source",binaryStatus:"Built-in sample",approvedForBriefs:"Yes"});
 push("raci",{title:"AI security program RACI",rows:[],roles:["CISO","AI Platform","AppSec","GRC","Developer Productivity","Customer Solutions","Sales","Product / Research","Support / Engineering"],note:"Synthetic template. Assign real names and decision rights during discovery."},"template");
 return rows.map((r,i)=>({id:c.id+"-r-"+i,customerId:c.id,type:r[0],provenance:r[1],data:r[2],createdAt:now(),updatedAt:now()}))
}
function migrate(old){
 const next=fresh();
 if(!old||!Array.isArray(old.customers)||!old.recordsByCustomer)return next;
 const byName=new Map(next.customers.map(c=>[String(c.name||"").toLowerCase(),c]));
 for(const oc of old.customers){
  const isDefault=!!oc.defaultSample||!!oc.isGoldenExample;
  if(!isDefault){
   if(!next.customers.some(c=>c.id===oc.id)){next.customers.push(clone(oc));next.recordsByCustomer[oc.id]=clone(old.recordsByCustomer[oc.id]||[])}
   continue;
  }
  const nc=next.customers.find(c=>c.id===oc.id)||byName.get(String(oc.name||"").toLowerCase());
  if(!nc)continue;
  const seeded=next.recordsByCustomer[nc.id]||[];
  const prior=old.recordsByCustomer[oc.id]||[];
  const userOwned=prior.filter(r=>!REPLACEABLE.has(r.provenance)||String(r.updatedAt||"")!==String(r.createdAt||""));
  const replaceKeys=new Set(userOwned.map(semanticKey));
  next.recordsByCustomer[nc.id]=seeded.filter(r=>!replaceKeys.has(semanticKey(r))).concat(clone(userOwned));
 }
 if(old.activeCustomerId&&next.customers.some(c=>c.id===old.activeCustomerId))next.activeCustomerId=old.activeCustomerId;
 next.createdAt=old.createdAt||next.createdAt;
 return next
}
function fresh(){const golden={...clone(NMA_DATA.CUSTOMER),isSynthetic:true};const customers=[golden,...SAMPLE_CUSTOMERS.map(customerFromSample)];const recordsByCustomer={};recordsByCustomer[golden.id]=NMA_DATA.SEED.map((r,i)=>({id:golden.id+"-seed-"+i,customerId:golden.id,type:r[0],provenance:r[1],data:clone(r[2]),createdAt:now(),updatedAt:now()}));SAMPLE_CUSTOMERS.forEach((s,i)=>{const c=customers[i+1];recordsByCustomer[c.id]=sampleRecords(c,s)});return {version:VERSION,activeCustomerId:golden.id,workspace:{id:"nma-northstar",name:"Noma Candidate Customer Solutions Workspace",mode:"browser-local",updatedAt:now()},customers,recordsByCustomer,kb:clone(NMA_DATA.KB_SEED||[]),kbConfig:{},createdAt:now(),updatedAt:now()}}
function read(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(x&&Array.isArray(x.customers)&&x.recordsByCustomer){if(x.version===VERSION)return x;const m=migrate(x);write(m);return m}}catch{}const x=fresh();write(x);return x}
function write(x){x.updatedAt=now();localStorage.setItem(STORAGE_KEY,JSON.stringify(x));return x}
function state(db,id){const customer=db.customers.find(c=>c.id===(id||db.activeCustomerId))||db.customers[0]||null;if(customer)db.activeCustomerId=customer.id;write(db);return {customer,customers:clone(db.customers),records:clone(customer?db.recordsByCustomer[customer.id]||[]:[]),workspace:clone(db.workspace),access:{authenticated:false,mode:"browser-persistent",persistence:"localStorage",storage:"browser-local",quotaIndependent:true}}}
function bodyOf(init){if(!init?.body)return {};if(typeof init.body==="string"){try{return JSON.parse(init.body)}catch{return {}}}return init.body||{}}
function recordFind(db,id){for(const [cid,rows] of Object.entries(db.recordsByCustomer)){const at=rows.findIndex(r=>r.id===id);if(at>=0)return {cid,rows,at,record:rows[at]}}return null}
function reset(){const x=fresh();write(x);return x}
async function localRoute(url,init={}){const method=String(init.method||"GET").toUpperCase(),path=url.pathname.replace(/^\/api/,"")||"/",db=read(),b=bodyOf(init);
 if(path==="/state"&&method==="GET")return json(state(db,url.searchParams.get("customer")));
 if(path==="/kb"&&method==="GET"){const a=db.kb.filter(x=>x.status!=="archived");return json({articles:a,latest:a.slice(0,6),trending:a.slice(0,6),config:db.kbConfig||{},usageSignalAvailable:false})}
 if(path==="/ai/status"&&method==="GET")return json({configured:false,enabled:false,mode:"browser-local-demo",research:{configured:false}});
 if(path==="/control-plane/status"&&method==="GET")return json({connected:false,mode:"browser-local-demo"});
 if(/^\/integrations\/(jira|confluence)\/status$/.test(path)&&method==="GET")return json({connected:false,writable:false,configured:false,sites:[]});
 if(path==="/records"&&method==="POST"){const c=db.customers.find(x=>x.id===b.customerId);if(!c)return json({error:"customer_not_found"},404);const r={id:uid("rec"),customerId:c.id,type:b.type||"note",provenance:b.provenance||"internal_record",data:clone(b.data||{}),createdAt:now(),updatedAt:now()};(db.recordsByCustomer[c.id] ||= []).push(r);write(db);return json(r,201)}
 const recMatch=path.match(/^\/records\/([^/]+)$/);if(recMatch){const hit=recordFind(db,decodeURIComponent(recMatch[1]));if(!hit)return json({error:"record_not_found"},404);if(method==="PATCH"){hit.record.data={...hit.record.data,...clone(b.data||{})};if(b.provenance)hit.record.provenance=b.provenance;else if(REPLACEABLE.has(hit.record.provenance))hit.record.provenance="internal_record";hit.record.updatedAt=now();write(db);return json(hit.record)}if(method==="DELETE"){hit.rows.splice(hit.at,1);write(db);return json({ok:true,id:hit.record.id})}}
 if(path==="/customers"&&method==="POST"){const name=String(b.name||"").trim();if(!name)return json({error:"name_required"},400);const c={id:uid("customer"),name,industry:String(b.industry||""),stage:"Discovery",provenance:"internal_record",isSynthetic:false,defaultSample:false,facts:{}};db.customers.push(c);db.recordsByCustomer[c.id]=[{id:uid("raci"),customerId:c.id,type:"raci",provenance:"template",data:{title:"AI security program RACI",rows:[],roles:["Customer","Customer Solutions","Sales","Product / Research","Support / Engineering"]},createdAt:now(),updatedAt:now()}];db.activeCustomerId=c.id;write(db);return json({customer:c},201)}
 if(path==="/customers/bulk-import"&&method==="POST"){const ids=[];for(const raw of Array.isArray(b.customers)?b.customers:[]){const name=String(raw.name||raw.customer_name||"").trim();if(!name)continue;const c={id:uid("customer"),name,industry:raw.industry||"",stage:raw.stage||raw.technical_services_stage||"Imported",provenance:"internal_record",isSynthetic:false,defaultSample:false,sourceFile:raw.sourceName||"Imported file",facts:{users:raw.stakeholder_roles||"",product:raw.scope||"",committedTimeline:raw.timeline||raw.target_timeline||"",roiTarget:raw.success_metrics||"",kickoff:raw.connector_status||"",unvalidatedDependencies:raw.dependencies||"",successMetrics:raw.success_metrics||"",currentSystems:raw.systems||raw.current_systems||"",businessGoal:raw.goal||raw.business_goal||""}};db.customers.push(c);db.recordsByCustomer[c.id]=sampleRecords(c,{...raw,n:name,i:c.industry,st:c.stage,g:c.facts.businessGoal,sc:c.facts.product,sys:c.facts.currentSystems,met:c.facts.successMetrics,tl:c.facts.committedTimeline,cs:c.facts.kickoff,dep:c.facts.unvalidatedDependencies});ids.push(c.id)}if(ids[0])db.activeCustomerId=ids[0];write(db);return json({customerIds:ids},201)}
 if(path==="/customers/clear"&&method==="POST"){const keep=b.overrideGolden?[]:db.customers.filter(c=>c.isGoldenExample);const keepIds=new Set(keep.map(c=>c.id));db.customers=keep;for(const k of Object.keys(db.recordsByCustomer))if(!keepIds.has(k))delete db.recordsByCustomer[k];db.activeCustomerId=keep[0]?.id||"";write(db);return json({ok:true,remaining:keep.length})}
 if(path==="/customers/reset-samples"&&method==="POST"){const x=reset();return json({ok:true,customerIds:x.customers.map(c=>c.id)})}
 const kbMatch=path.match(/^\/kb\/articles\/([^/]+)(\/useful)?$/);if(kbMatch){const id=decodeURIComponent(kbMatch[1]),a=db.kb.find(x=>x.id===id);if(!a)return json({error:"article_not_found"},404);if(method==="GET"){a.views=Number(a.views||0)+1;write(db);return json({article:clone(a)})}if(method==="PATCH"){Object.assign(a,clone(b),{updatedAt:now()});write(db);return json({article:clone(a)})}if(method==="DELETE"){a.status="archived";a.updatedAt=now();write(db);return json({ok:true})}if(method==="POST"&&kbMatch[2]){a.useful=Number(a.useful||0)+1;write(db);return json({ok:true,useful:a.useful})}}
 if(path==="/kb/articles"&&method==="POST"){const a={id:uid("kb"),slug:slug(b.title),views:0,useful:0,createdAt:now(),updatedAt:now(),...clone(b)};db.kb.push(a);write(db);return json({article:a},201)}
 if(path==="/kb/guidelines/append"&&method==="POST"){let a=db.kb.find(x=>x.slug==="customer-solutions-guidelines");if(!a){a={id:uid("kb"),slug:"customer-solutions-guidelines",title:"Customer Solutions Guidelines",summary:"Reusable operating lessons",category:"Customer Solutions",tags:["guidelines"],status:"published",source:"internal_best_practice",authorLabel:"Candidate operating model",body:"",views:0,useful:0,createdAt:now(),updatedAt:now()};db.kb.push(a)}a.body+=(a.body?"\n\n":"")+String(b.point||"");a.updatedAt=now();write(db);return json({articleId:a.id})}
 if(path==="/kb/config"&&method==="PATCH"){db.kbConfig={...(db.kbConfig||{}),...clone(b)};write(db);return json({ok:true,config:db.kbConfig})}
 if(path==="/export"&&method==="GET")return json({exportedAt:now(),...state(db,url.searchParams.get("customer"))});
 return json({error:"browser_local_route_not_implemented",path,method},404)
}
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,init={})=>{try{const u=new URL(typeof input==="string"?input:input.url,location.href);if(u.origin===location.origin&&u.pathname.startsWith("/api"))return localRoute(u,init)}catch{}return nativeFetch(input,init)};
window.NMALocalStore={key:STORAGE_KEY,read,reset,state:()=>state(read()),version:VERSION};
})();
