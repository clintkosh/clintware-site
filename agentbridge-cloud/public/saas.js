const KEY="quillgeist-saas-v1";
const LEDGER_KEY="quillgeist-saas-ledger-v1";
const $=id=>document.getElementById(id);
let discovered=null;
let lastRoute=null;

const defaults={policy:"balanced",taskType:"general",mainModel:"auto",subModel:"auto",subCount:2,subEnabled:true,gateway:"",task:"Research the latest relevant evidence, compare it, then produce a concise implementation recommendation."};

function load(){
  let s={...defaults};
  try{s={...s,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{}
  for(const k of ["policy","taskType","mainModel","subModel","gateway","task"]) if($(k)) $(k).value=s[k]??defaults[k];
  $("subCount").value=Number(s.subCount??2);
  $("subEnabled").checked=s.subEnabled!==false;
  renderLedger();
  updateMetrics();
}
function state(){
  return {policy:$("policy").value,taskType:$("taskType").value,mainModel:$("mainModel").value,subModel:$("subModel").value,subCount:Math.max(0,Math.min(8,Number($("subCount").value)||0)),subEnabled:$("subEnabled").checked,gateway:$("gateway").value.trim().replace(/\/$/,""),task:$("task").value};
}
function save(){localStorage.setItem(KEY,JSON.stringify(state()));setStatus($("routeStatus"),"Policy saved in this browser.","ok")}
function setStatus(el,msg,type=""){el.className="status"+(type?" "+type:"");el.textContent=msg}
function localCompile(x){
  const primaryDefaults={image:"xai:auto-image",vision:"auto:vision",code:"local:auto-code",fresh:"auto:fresh",private:"local:auto",action:"clintware:action",general:"auto:reasoning"};
  const subDefaults={fresh:"web:auto",image:"google:auto-vision",vision:"google:auto-vision",code:"local:auto-code",private:"local:auto",action:"web:auto",general:"web:auto"};
  let primary=x.mainModel==="auto"?(primaryDefaults[x.taskType]||primaryDefaults.general):x.mainModel;
  let sub=x.subModel==="auto"?(subDefaults[x.taskType]||subDefaults.general):x.subModel;
  if(x.policy==="local_first"&&x.mainModel==="auto"&&!["fresh","action","image"].includes(x.taskType))primary="local:auto";
  if(x.policy==="private"&&x.mainModel==="auto")primary="local:auto";
  if(x.policy==="lowest_cost"&&x.mainModel==="auto"&&!["fresh","action"].includes(x.taskType))primary="local:auto";
  if(x.policy==="fastest"&&x.mainModel==="auto")primary=x.taskType==="fresh"?"web:auto":"local:auto-fast";
  const branches=x.subEnabled?Array.from({length:x.subCount},(_,i)=>({id:"subsearch-"+(i+1),model:sub,purpose:x.taskType==="fresh"?"fresh-source retrieval":"bounded supporting search/research"})):[];
  return {version:"browser-local-v1",task:x.task,task_type:x.taskType,policy:x.policy,primary:{model:primary,role:"final synthesis"},subsearch:{enabled:branches.length>0,model:sub,branches},execution:{authority:x.taskType==="action"?"clintware-control-plane":"quillgeist",local_first:["local_first","private","lowest_cost"].includes(x.policy),requires_fresh_authority:x.taskType==="fresh",state_conflict_serialization:x.taskType==="action"},source:"browser-local"};
}
function capabilities(){
  const eps=discovered?.endpoints||{};
  return {route:eps.route?.path||null,compact:eps.compact?.path||null};
}
async function probe(){
  const x=state();
  if(!x.gateway){discovered=null;setStatus($("gatewayStatus"),"No gateway configured. Route compilation will run browser-local only.","warn");updateMetrics();return}
  try{
    const r=await fetch(x.gateway+"/api/v1",{headers:{accept:"application/json"}});
    if(!r.ok)throw new Error("HTTP "+r.status);
    discovered=await r.json();
    const c=capabilities();
    setStatus($("gatewayStatus"),`Connected. API ${discovered.version||"unknown"} · route ${c.route?"available":"not advertised"} · compact ${c.compact?"available":"not advertised"}`,"ok");
    localStorage.setItem(KEY,JSON.stringify(x));
  }catch(e){discovered=null;setStatus($("gatewayStatus"),"Gateway discovery failed: "+e.message,"bad")}
  updateMetrics();
}
async function compile(){
  const x=state();
  let out=null,source="browser-local";
  const c=capabilities();
  if(x.gateway&&c.route){
    try{
      const r=await fetch(x.gateway+c.route,{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({task:x.task,task_type:x.taskType,policy:x.policy,main_model:x.mainModel,subsearch_model:x.subModel,subsearch_enabled:x.subEnabled,subsearch_count:x.subCount})});
      if(!r.ok)throw new Error("HTTP "+r.status);
      out=await r.json();source="gateway";
      setStatus($("routeStatus"),"Route compiled by discovered Quillgeist gateway.","ok");
    }catch(e){setStatus($("routeStatus"),"Gateway route failed; browser-local compiler used: "+e.message,"warn")}
  }
  if(!out)out=localCompile(x);
  out.source=source;
  lastRoute=out;
  $("route").textContent=JSON.stringify(out,null,2);
  addLedger(out);
  updateMetrics();
  localStorage.setItem(KEY,JSON.stringify(x));
}
async function compact(){
  const x=state(),c=capabilities();
  if(!x.gateway||!c.compact){setStatus($("gatewayStatus"),"Configured gateway does not currently advertise context compaction.","warn");return}
  try{
    const r=await fetch(x.gateway+c.compact,{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({text:x.task,record_aggregate_metrics:false})});
    const j=await r.json();if(!r.ok)throw new Error(j.error||("HTTP "+r.status));
    setStatus($("gatewayStatus"),`Compaction round trip passed · ${j.metrics?.raw_tokens_est||0} → ${j.metrics?.output_tokens_est||0} est. tokens`,"ok");
  }catch(e){setStatus($("gatewayStatus"),"Compaction test failed: "+e.message,"bad")}
}
function ledger(){try{return JSON.parse(localStorage.getItem(LEDGER_KEY)||"[]")}catch{return[]}}
function addLedger(route){
  const rows=ledger();rows.unshift({ts:new Date().toISOString(),route});localStorage.setItem(LEDGER_KEY,JSON.stringify(rows.slice(0,50)));renderLedger()
}
function renderLedger(){
  const rows=ledger();$("ledger").innerHTML=rows.length?rows.map(x=>`<article class="entry"><div class="entryTop"><b>${escapeHtml(x.route?.primary?.model||"unknown")} + ${escapeHtml(x.route?.subsearch?.model||"none")}</b><small>${new Date(x.ts).toLocaleString()} · ${escapeHtml(x.route?.source||"local")}</small></div><pre>${escapeHtml(JSON.stringify({task_type:x.route?.task_type,policy:x.route?.policy,branches:x.route?.subsearch?.branches?.length||0,authority:x.route?.execution?.authority},null,2))}</pre></article>`).join(""):'<div class="note">No compiled routes yet.</div>'
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function updateMetrics(){
  $("mRoute").textContent=capabilities().route?"GATEWAY":"LOCAL";
  const x=lastRoute||localCompile(state());
  $("mPrimary").textContent=(x.primary?.model||"auto").replace(":auto","");
  $("mSub").textContent=(x.subsearch?.model||"auto").replace(":auto","");
}
async function copyRoute(){
  if(!lastRoute)await compile();
  try{await navigator.clipboard.writeText(JSON.stringify(lastRoute,null,2));setStatus($("routeStatus"),"Route JSON copied.","ok")}catch{setStatus($("routeStatus"),"Clipboard unavailable. Select the route JSON manually.","warn")}
}
$("compile").addEventListener("click",compile);
$("save").addEventListener("click",save);
$("copy").addEventListener("click",copyRoute);
$("probe").addEventListener("click",probe);
$("compact").addEventListener("click",compact);
$("clearGateway").addEventListener("click",()=>{$("gateway").value="";discovered=null;save();setStatus($("gatewayStatus"),"Gateway cleared. Browser-local mode active.","warn");updateMetrics()});
$("clearLedger").addEventListener("click",()=>{localStorage.removeItem(LEDGER_KEY);renderLedger()});
for(const id of ["policy","taskType","mainModel","subModel","subCount","subEnabled"])$(id).addEventListener("change",()=>{save();updateMetrics()});
load();
if(state().gateway)probe();
compile();
