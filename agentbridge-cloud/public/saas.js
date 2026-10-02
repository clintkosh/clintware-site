const CONFIG_KEY="quillgeist-saas-config-v1";
const DEFAULT_ROLES=[
  {role:"Evidence",hint:"Find evidence, assumptions, unknowns, and facts that materially change the answer."},
  {role:"Implementation",hint:"Develop a concrete implementation path, edge cases, dependencies, and verification."},
  {role:"Critic",hint:"Challenge the plan, identify failure modes, contradictions, and simpler alternatives."}
];
let models=[];
let lanes=[];
let running=false;
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const now=()=>new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});
const config=()=>{try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||"{}")}catch{return{}}};
function saveConfig(){
  const value={gatewayUrl:$("#gatewayUrl").value.trim(),gatewayKey:$("#gatewayKey").value,policy:$("#policy").value,primaryModel:$("#primaryModel").value,lanes:lanes.map(x=>({enabled:x.enabled,role:x.role,hint:x.hint,model:x.model}))};
  localStorage.setItem(CONFIG_KEY,JSON.stringify(value));
}
function baseUrl(){return $("#gatewayUrl").value.trim().replace(/\/+$/,"")}
function headers(){const h={accept:"application/json","content-type":"application/json"};const key=$("#gatewayKey").value.trim();if(key)h.authorization="Bearer "+key;return h}
function setStatus(kind,text){$("#statusDot").className="dot"+(kind==="ok"?" ok":kind==="bad"?" bad":"");$("#statusText").textContent=text}
function log(type,message){const root=$("#ledger");if(root.querySelector(".small"))root.innerHTML="";const row=document.createElement("div");row.className="event";row.innerHTML="<span>"+esc(now())+"</span><b>"+esc(type)+"</b><span>"+esc(message)+"</span>";root.prepend(row)}
async function request(path,opt={}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),Number(opt.timeout||120000));
  try{
    const r=await fetch(baseUrl()+path,{...opt,headers:{...headers(),...(opt.headers||{})},signal:controller.signal});
    const body=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error((body.error&&body.error.message)||body.error||body.message||("HTTP "+r.status));
    return body;
  }finally{clearTimeout(timer)}
}
async function connect(){
  setStatus("","Checking gateway…");log("CONNECT",baseUrl());
  try{
    const health=await request("/health",{method:"GET",timeout:12000});
    const list=await request("/v1/models",{method:"GET",timeout:20000});
    models=(list.data||[]).map(x=>String(x.id||"")).filter(Boolean);
    if(!models.length)throw new Error("Gateway returned no models.");
    setStatus("ok",(health.service||"Gateway")+" · "+models.length+" model"+(models.length===1?"":"s"));
    renderModelOptions();renderModels();saveConfig();log("READY",models.join(", "));
  }catch(e){setStatus("bad","Gateway unavailable");log("ERROR",e.message);throw e}
}
function modelOptions(selected){return models.map(m=>'<option value="'+esc(m)+'" '+(m===selected?"selected":"")+'>'+esc(m)+'</option>').join("")}
function renderModelOptions(){
  const cfg=config();const primary=$("#primaryModel");const desired=primary.value||cfg.primaryModel||models[0]||"local-auto";primary.innerHTML=modelOptions(desired);
  if(models.includes(desired))primary.value=desired;
  lanes.forEach((lane,i)=>{if(!models.includes(lane.model))lane.model=models[Math.min(i,models.length-1)]||models[0]||"local-auto"});
  renderLanes();
}
function renderModels(){$("#models").innerHTML=models.map(m=>'<div class="model-row">'+esc(m)+'</div>').join("")}
function addLane(seed={}){
  if(lanes.length>=6)return;
  const d=DEFAULT_ROLES[lanes.length%DEFAULT_ROLES.length];
  lanes.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),enabled:seed.enabled!==false,role:seed.role||d.role,hint:seed.hint||d.hint,model:seed.model||models[Math.min(lanes.length,Math.max(0,models.length-1))]||models[0]||"local-auto",output:"",status:"idle"});
  renderLanes();saveConfig();
}
function renderLanes(){
  const root=$("#lanes");
  root.innerHTML=lanes.map((x,i)=>'<div class="lane" data-id="'+esc(x.id)+'"><div class="lane-head"><input type="checkbox" data-action="enabled" '+(x.enabled?"checked":"")+' title="Enable branch"><input class="control" data-action="role" value="'+esc(x.role)+'" aria-label="Branch role"><select class="control" data-action="model">'+(models.length?modelOptions(x.model):'<option>'+esc(x.model)+'</option>')+'</select><button class="btn" data-action="remove">×</button></div><label class="label">Sub-search instruction</label><input class="control" data-action="hint" value="'+esc(x.hint)+'"><div class="lane-output"><span class="tag">'+esc(x.status)+'</span>'+(x.output?"\n"+esc(x.output):"")+'</div></div>').join("");
  root.querySelectorAll(".lane").forEach(node=>{
    const id=node.dataset.id;const lane=lanes.find(x=>x.id===id);
    node.addEventListener("change",e=>{const a=e.target.dataset.action;if(!a||!lane)return;if(a==="enabled")lane.enabled=e.target.checked;else lane[a]=e.target.value;saveConfig()});
    node.querySelectorAll("input[data-action=role],input[data-action=hint]").forEach(el=>el.addEventListener("input",e=>{lane[e.target.dataset.action]=e.target.value;saveConfig()}));
    node.querySelector("[data-action=remove]").addEventListener("click",()=>{lanes=lanes.filter(x=>x.id!==id);renderLanes();saveConfig()});
  });
}
function previewRoute(){
  const enabled=lanes.filter(x=>x.enabled);const unique=[...new Set([$("#primaryModel").value,...enabled.map(x=>x.model)].filter(Boolean))];
  log("ROUTE",$("#policy").value+" · "+enabled.length+" branches · "+unique.length+" models");
  enabled.forEach(x=>{x.status="planned";x.output="Model: "+x.model+"\nInstruction: "+x.hint});
  $("#finalResult").textContent="Route preview\n\nPrimary: "+($("#primaryModel").value||"not selected")+"\nPolicy: "+$("#policy").value+"\nParallel branches:\n"+enabled.map((x,i)=>"  "+(i+1)+". "+x.role+" -> "+x.model).join("\n")+"\n\nThe branches are dependency-free and will fan out concurrently; their bounded outputs will rejoin at the primary synthesis model.";
  renderLanes();updateMetrics(enabled,unique,0);
}
async function chat(model,messages,maxTokens=700){
  const body={model,messages,temperature:.25,max_tokens:maxTokens,stream:false};
  const data=await request("/v1/chat/completions",{method:"POST",body:JSON.stringify(body),timeout:180000});
  return {text:String((((data.choices||[])[0]||{}).message||{}).content||""),model:String(data.model||model),usage:data.usage||{},meta:data.quillgeist||{}};
}
function branchMessages(prompt,lane){
  return [
    {role:"system",content:"You are a bounded Quillgeist sub-search branch. Work independently. Return dense evidence and actionable findings only. Do not synthesize the other branches."},
    {role:"user",content:"ROLE: "+lane.role+"\nSUB-SEARCH: "+lane.hint+"\n\nPARENT OBJECTIVE:\n"+prompt}
  ];
}
function synthesisMessages(prompt,results){
  const evidence=results.map((r,i)=>"BRANCH "+(i+1)+" ["+r.role+" | "+r.model+"]\n"+r.text).join("\n\n---\n\n");
  return [
    {role:"system",content:"You are Quillgeist synthesis. Preserve the user's objective, reconcile branch evidence, call out conflicts, and produce the strongest final answer with concrete next actions and verification. Do not mention hidden chain-of-thought."},
    {role:"user",content:"PARENT OBJECTIVE:\n"+prompt+"\n\nPARALLEL SUB-SEARCH RESULTS:\n"+evidence}
  ];
}
function updateMetrics(enabled,unique,elapsed){$("#mBranches").textContent=enabled.length;$("#mModels").textContent=unique.length;$("#mElapsed").textContent=elapsed?elapsed.toFixed(1)+"s":"—"}
async function runGraph(){
  if(running)return;const prompt=$("#prompt").value.trim();if(!prompt)return;
  if(!models.length){try{await connect()}catch{return}}
  const primary=$("#primaryModel").value||models[0];const enabled=lanes.filter(x=>x.enabled);
  running=true;$("#runBtn").disabled=true;$("#finalResult").textContent="Executing "+enabled.length+" parallel branch"+(enabled.length===1?"":"es")+"…";const started=performance.now();
  log("START","Primary "+primary+" · "+enabled.length+" branches");
  try{
    enabled.forEach(x=>{x.status="running";x.output="";});renderLanes();
    const settled=await Promise.all(enabled.map(async lane=>{
      const t=performance.now();
      try{
        const r=await chat(lane.model,branchMessages(prompt,lane),650);
        lane.status="passed";lane.output=r.text;log("BRANCH",lane.role+" · "+r.model+" · "+((performance.now()-t)/1000).toFixed(1)+"s");
        return {ok:true,role:lane.role,model:r.model,text:r.text,usage:r.usage};
      }catch(e){
        lane.status="failed";lane.output=e.message;log("FAIL",lane.role+" · "+e.message);
        return {ok:false,role:lane.role,model:lane.model,text:"Branch failed: "+e.message,usage:{}};
      }finally{renderLanes()}
    }));
    const usable=settled.filter(x=>x.ok);
    let final;
    if(usable.length){
      log("JOIN",usable.length+" branch results -> "+primary);
      final=await chat(primary,synthesisMessages(prompt,usable),1100);
    }else{
      log("FALLBACK","No branch passed; running primary directly");
      final=await chat(primary,[{role:"system",content:"Answer the objective directly with concrete actions and verification."},{role:"user",content:prompt}],1100);
    }
    $("#finalResult").textContent=final.text||"(empty response)";
    const elapsed=(performance.now()-started)/1000;const unique=[...new Set([final.model,...settled.map(x=>x.model)])];
    updateMetrics(enabled,unique,elapsed);log("VERIFIED","Synthesis returned from "+final.model+" in "+elapsed.toFixed(1)+"s");
    saveConfig();
  }catch(e){$("#finalResult").textContent="Run failed: "+e.message;log("ERROR",e.message)}
  finally{running=false;$("#runBtn").disabled=false}
}
function restore(){
  const cfg=config();if(cfg.gatewayUrl)$("#gatewayUrl").value=cfg.gatewayUrl;if(cfg.gatewayKey)$("#gatewayKey").value=cfg.gatewayKey;if(cfg.policy)$("#policy").value=cfg.policy;
  lanes=[];(cfg.lanes&&cfg.lanes.length?cfg.lanes:DEFAULT_ROLES).forEach(x=>addLane(x));renderLanes();
}
$("#connectBtn").addEventListener("click",()=>connect().catch(()=>{}));
$("#forgetBtn").addEventListener("click",()=>{localStorage.removeItem(CONFIG_KEY);$("#gatewayKey").value="";$("#gatewayUrl").value="http://127.0.0.1:11435";models=[];setStatus("","Config forgotten");renderModels();renderModelOptions()});
$("#addLaneBtn").addEventListener("click",()=>addLane());
$("#previewBtn").addEventListener("click",previewRoute);
$("#runBtn").addEventListener("click",runGraph);
$("#clearBtn").addEventListener("click",()=>{lanes.forEach(x=>{x.output="";x.status="idle"});renderLanes();$("#finalResult").textContent="No run yet.";$("#ledger").innerHTML='<div class="small">No events yet.</div>';updateMetrics([],[],0)});
$("#primaryModel").addEventListener("change",saveConfig);$("#policy").addEventListener("change",saveConfig);$("#gatewayUrl").addEventListener("change",saveConfig);$("#gatewayKey").addEventListener("change",saveConfig);
restore();
