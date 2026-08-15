const TOKEN_KEY="agentbridge-alpha-token";
let state={devices:[],jobs:[],schedules:[],metrics:{}};
const $=s=>document.querySelector(s);
const token=()=>localStorage.getItem(TOKEN_KEY)||"";
async function api(path,opt={}){
  const headers={...(opt.headers||{})}; if(token())headers.authorization=`Bearer ${token()}`;
  if(opt.body&&typeof opt.body!=="string"){headers["content-type"]="application/json";opt.body=JSON.stringify(opt.body)}
  const r=await fetch(path,{...opt,headers}); const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||j.message||`HTTP ${r.status}`); return j;
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function show(){$("#bootstrap").classList.toggle("hidden",Boolean(token()));$("#app").classList.toggle("hidden",!token())}
async function refresh(){
  if(!token())return; state=await api("/api/state"); const m=state.metrics||{};
  $("#mDevices").textContent=state.devices.length;$("#mRuns").textContent=m.runs||0;$("#mPass").textContent=m.runs?Math.round((m.passed||0)/m.runs*100)+"%":"—";$("#mTokens").textContent=(m.tokens_avoided_est||0).toLocaleString();
  const needs=state.jobs.filter(j=>j.status==="approval_required"||j.status==="failed").length;
  $("#calm").textContent=needs?`${needs} item${needs===1?"":"s"} need attention.`:"All systems relaxed.";$("#calm").classList.toggle("danger",Boolean(needs));
  $("#devices").innerHTML=state.devices.map(x=>`<div class="device"><strong>${esc(x.device_name||x.device_id)}</strong><span class="muted">${esc(x.platform)} · ${esc(x.device_id)}</span></div>`).join("")||'<p class="muted">No devices paired yet.</p>';
  for(const id of ["jobDevice","scheduleDevice"]){const sel=$("#"+id);sel.innerHTML=state.devices.map(x=>`<option value="${esc(x.device_id)}">${esc(x.device_name||x.device_id)} · ${esc(x.platform)}</option>`).join("")}
  $("#jobs").innerHTML=state.jobs.slice(0,20).map(j=>{const r=j.result||{};const approve=j.status==="approval_required"?`<button data-approve="${esc(j.id)}">Approve requested capabilities</button>`:"";return `<div class="job"><strong>${esc(j.title||j.pack_name||j.id)}</strong><span class="muted">${esc(j.status)} · ${esc(j.device_id)}</span>${approve}${r.planner_feedback?`<details><summary>Compact Result Pack</summary><pre>${esc(r.planner_feedback)}</pre></details>`:""}</div>`}).join("")||'<p class="muted">No jobs yet.</p>';
  $("#schedules").innerHTML=state.schedules.slice(0,20).map(s=>{const opts=state.devices.map(d=>`<option value="${esc(d.device_id)}" ${d.device_id===s.device_id?"selected":""}>${esc(d.device_name||d.device_id)}</option>`).join("");const approval=s.owner==="device"?(s.approved_local?" · locally approved":" · local approval required"):"";return `<div class="schedule"><strong>${esc(s.owner)} · ${esc(s.device_id)}</strong><span class="muted">${new Date(Number(s.next_run_at)).toLocaleString()}${s.every_seconds?" · every "+s.every_seconds+"s":""}${approval}</span><div class="schedule-actions"><select data-schedule-device="${esc(s.id)}">${opts}</select><button data-move-schedule="${esc(s.id)}">Move</button><button data-delete-schedule="${esc(s.id)}">Delete</button></div></div>`}).join("")||'<p class="muted">No schedules yet.</p>';
}
async function filePayload(input){const f=input.files[0];if(!f)return{};if(f.name.toLowerCase().endsWith(".abpack")){const bytes=new Uint8Array(await f.arrayBuffer());let bin="";for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return{pack_name:f.name,pack_b64:btoa(bin)}}return{pack_name:f.name,pack_text:await f.text()}}
document.addEventListener("click",async e=>{const a=e.target.closest("[data-approve]");if(a){await api(`/api/jobs/${a.dataset.approve}/approve`,{method:"POST",body:{}});await refresh()}const mv=e.target.closest("[data-move-schedule]");if(mv){const current=state.schedules.find(x=>x.id===mv.dataset.moveSchedule);const sel=document.querySelector(`[data-schedule-device="${CSS.escape(mv.dataset.moveSchedule)}"]`);if(current&&sel){await api("/api/schedules",{method:"POST",body:{...current,device_id:sel.value}});await refresh()}}const d=e.target.closest("[data-delete-schedule]");if(d){await api(`/api/schedules/${d.dataset.deleteSchedule}`,{method:"DELETE"});await refresh()}});
$("#createAccount").onclick=async()=>{const a=await api("/api/account/bootstrap",{method:"POST",body:{}});localStorage.setItem(TOKEN_KEY,a.account_token);show();await refresh()};
$("#refresh").onclick=refresh;
$("#claim").onclick=async()=>{await api("/api/pair/claim",{method:"POST",body:{pair_code:$("#pairCode").value.trim().toUpperCase()}});$("#pairCode").value="";await refresh()};
$("#sendJob").onclick=async()=>{const fp=await filePayload($("#packFile"));const text=$("#packText").value.trim();const body={device_id:$("#jobDevice").value,workspace:$("#workspace").value.trim()||undefined,title:"AgentBridge task",...fp};if(!fp.pack_name&&text){body.pack_name="task.md";body.pack_text=text}if(!body.pack_name)throw new Error("Choose a pack file or paste pack text.");await api("/api/jobs",{method:"POST",body});await refresh()};
$("#createSchedule").onclick=async()=>{const at=$("#scheduleAt").value;if(!at)throw new Error("Choose a schedule time.");const body={device_id:$("#scheduleDevice").value,owner:$("#scheduleOwner").value,next_run_at:new Date(at).getTime(),every_seconds:Number($("#scheduleEvery").value)||null,pack_name:"scheduled-task.md",pack_text:$("#schedulePack").value,approved:false,enabled:true};await api("/api/schedules",{method:"POST",body});await refresh()};
$("#copyKey").onclick=async()=>{await navigator.clipboard.writeText(token());$("#copyKey").textContent="Copied";setTimeout(()=>$("#copyKey").textContent="Copy key",1200)};
$("#resetKey").onclick=()=>{if(confirm("Forget this browser account key?")){localStorage.removeItem(TOKEN_KEY);location.reload()}};
window.addEventListener("unhandledrejection",e=>alert(e.reason?.message||String(e.reason)));
window.addEventListener("error",e=>{if(e.error)alert(e.error.message||String(e.error))});
(async()=>{show();try{const h=await api("/api/health");$("#health").textContent=h.ok?"Cloud healthy":"Cloud issue"}catch{$("#health").textContent="Cloud unavailable";$("#health").classList.add("danger")}if(token())await refresh();if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{})})();
