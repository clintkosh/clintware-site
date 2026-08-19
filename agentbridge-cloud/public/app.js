const TOKEN_KEY="agentbridge-alpha-token";
let state={devices:[],jobs:[],schedules:[],metrics:{}};
let telemetry={metrics:{},bugs:[]};
let report={events:[],bugs:[],metrics:{}};
let helpData={getting_started:[],setup_removal:[],faq:[],glossary:[],fixes:[]};
let activeHelpSection="all";
let currentView="home";
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const token=()=>localStorage.getItem(TOKEN_KEY)||"";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const compact=new Intl.NumberFormat(undefined,{notation:"compact",maximumFractionDigits:1});
const num=v=>Number(v||0);
const fmtNum=v=>compact.format(num(v));
const fmtDate=v=>{const d=new Date(Number(v)||v);return Number.isNaN(d.valueOf())?"—":d.toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})};
const fmtDuration=ms=>{ms=num(ms);if(!ms)return"—";if(ms<1000)return`${Math.round(ms)}ms`;const sec=ms/1000;if(sec<60)return`${sec.toFixed(sec<10?1:0)}s`;const min=sec/60;if(min<60)return`${min.toFixed(min<10?1:0)}m`;return`${(min/60).toFixed(1)}h`};

async function api(path,opt={}){
  const headers={...(opt.headers||{})};
  if(token())headers.authorization=`Bearer ${token()}`;
  if(opt.body&&typeof opt.body!=="string"&&!(opt.body instanceof Blob)){headers["content-type"]="application/json";opt.body=JSON.stringify(opt.body)}
  const r=await fetch(path,{...opt,headers});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||j.message||`HTTP ${r.status}`);
  return j;
}
function toast(message,type="info"){
  const el=document.createElement("div");el.className=`toast ${type==="error"?"error":""}`;el.textContent=message;$("#toasts").append(el);
  setTimeout(()=>{el.style.opacity="0";el.style.transform="translateY(6px)";setTimeout(()=>el.remove(),180)},3600);
}
function show(){const has=Boolean(token());$("#bootstrap").classList.toggle("hidden",has);$("#app").classList.toggle("hidden",!has)}

function setView(name){
  if(!$("#view-"+name))return;
  const apply=()=>{$$(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${name}`));$$('.nav-btn').forEach(b=>b.classList.toggle("active",b.dataset.view===name));currentView=name;$("#crumbView").textContent=$("#view-"+name).dataset.title||name;history.replaceState(null,"",`#${name}`)};
  if(document.startViewTransition&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.startViewTransition(apply);else apply();
  if(name==="activity")loadReport().catch(e=>toast(e.message,"error"));
  if(name==="help")loadHelp().catch(e=>toast(e.message,"error"));
}

function statusChip(status){const s=String(status||"unknown");return `<span class="status-chip ${esc(s)}">${esc(s.replaceAll("_"," "))}</span>`}
function deviceIcon(platform=""){
  const p=String(platform).toLowerCase();
  if(p.includes("win"))return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 5.5 10.5 4v7H4zm8-1.7L20 2v9h-8zM4 13h6.5v7L4 18.5zm8 0h8v9l-8-1.8z"/></svg>`;
  if(p.includes("darwin")||p.includes("mac"))return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15.5 4.5c.8-1 1.2-2 1.1-3-1.1.1-2.2.7-2.9 1.5-.6.7-1.2 1.8-1 2.8 1 .1 2.1-.5 2.8-1.3Z"/><path d="M18.8 12.7c0-2.5 2-3.7 2.1-3.8-1.2-1.8-3.1-2-3.8-2-1.6-.2-3.2 1-4 1-.9 0-2.3-1-3.7-1-1.9 0-3.6 1.1-4.5 2.8-1.9 3.3-.5 8.2 1.4 10.9.9 1.3 2 2.8 3.5 2.7 1.4-.1 2-.9 3.7-.9 1.7 0 2.2.9 3.7.9s2.5-1.3 3.4-2.7c1.1-1.5 1.5-3 1.5-3.1-.1 0-3.3-1.3-3.3-4.8Z"/></svg>`;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/></svg>`;
}
function renderDevices(){
  $("#deviceCount").textContent=`${state.devices.length} node${state.devices.length===1?"":"s"}`;$("#calmDevices").textContent=state.devices.length;
  const html=state.devices.map(d=>`<div class="device-card"><div class="device-icon">${deviceIcon(d.platform)}</div><div class="grow"><div class="item-title">${esc(d.device_name||d.device_id)}</div><div class="item-meta">${esc(d.platform||"device")} · ${esc(d.node_version||"alpha")} · ${esc(d.device_id)}</div></div>${statusChip("paired")}</div>`).join("");
  $("#devices").innerHTML=html||'<div class="empty">No Node paired yet. Run the downloaded Quillgeist executable with <code>pair</code>, then enter its code here.</div>';
  for(const id of ["jobDevice","scheduleDevice"]){const sel=$("#"+id);sel.innerHTML=state.devices.map(d=>`<option value="${esc(d.device_id)}">${esc(d.device_name||d.device_id)} · ${esc(d.platform)}</option>`).join("")}
  const reportSel=$("#reportDevice");const selected=reportSel.value;reportSel.innerHTML='<option value="">All devices</option>'+state.devices.map(d=>`<option value="${esc(d.device_id)}">${esc(d.device_name||d.device_id)}</option>`).join("");reportSel.value=selected;
}
function jobCard(j,compactMode=false){
  const r=j.result||{};const title=j.title||j.pack_name||j.id;const feedback=r.planner_feedback||"";
  const approve=j.status==="approval_required"?`<button class="btn ghost" data-approve="${esc(j.id)}">Approve</button>`:"";
  const bug=j.status==="failed"?`<button class="btn ghost" data-report-bug="${esc(j.id)}">Report product bug</button>`:"";
  return `<div class="job-card"><div class="device-icon">${j.status==="passed"?"✓":j.status==="failed"?"!":"→"}</div><div class="grow"><div class="item-title">${esc(title)}</div><div class="item-meta">${esc(j.device_id||"")} · ${fmtDate(j.updated_at||j.created_at)}${r.duration_ms?` · ${fmtDuration(r.duration_ms)}`:""}</div>${!compactMode&&feedback?`<details><summary class="item-meta" style="cursor:pointer;margin-top:6px">Compact Result Pack</summary><pre>${esc(feedback)}</pre></details>`:""}</div>${statusChip(j.status)}${compactMode?"":approve+bug}</div>`;
}
function renderJobs(){
  $("#jobs").innerHTML=state.jobs.slice(0,20).map(j=>jobCard(j)).join("")||'<div class="empty">No jobs yet.</div>';
  $("#homeJobs").innerHTML=state.jobs.slice(0,4).map(j=>jobCard(j,true)).join("")||'<div class="empty">Your first execution will appear here.</div>';
  const latest=state.jobs.find(j=>j.result);
  if(!latest){$("#latestResult").className="empty";$("#latestResult").innerHTML="Run a task to see verified evidence here.";return}
  const r=latest.result||{};const dod=(r.definition_of_done||[]).map(x=>`<div class="dod-row"><span class="check">${x.ok?"✓":"×"}</span><span>${esc(x.label||x.type||"check")}</span></div>`).join("");
  $("#latestResult").className="";$("#latestResult").innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px"><div><div class="item-title">${esc(latest.title||latest.pack_name||latest.id)}</div><div class="item-meta">${fmtDuration(r.duration_ms)} · ${r.changes?.length||0} files changed</div></div>${statusChip(r.status||latest.status)}</div>${dod||""}${r.planner_feedback?`<pre>${esc(r.planner_feedback)}</pre>`:""}`;
}
function scheduleCard(s,compactMode=false){
  const opts=state.devices.map(d=>`<option value="${esc(d.device_id)}" ${d.device_id===s.device_id?"selected":""}>${esc(d.device_name||d.device_id)}</option>`).join("");
  const approval=s.owner==="device"?(s.approved_local?" · locally approved":" · local approval required"):"";
  return `<div class="schedule-card"><div class="schedule-glyph">⌁</div><div class="grow"><div class="item-title">${esc(s.title||s.pack_name||"Scheduled task")}</div><div class="item-meta">${esc(s.owner)} · ${fmtDate(s.next_run_at)}${s.every_seconds?` · every ${esc(s.every_seconds)}s`:""}${approval}</div></div>${compactMode?statusChip(s.enabled===false?"paused":"scheduled"):`<div class="schedule-actions"><select data-schedule-device="${esc(s.id)}">${opts}</select><button class="btn ghost" data-move-schedule="${esc(s.id)}">Move</button><button class="btn danger-btn" data-delete-schedule="${esc(s.id)}">Delete</button></div>`}</div>`;
}
function renderSchedules(){
  $("#schedules").innerHTML=state.schedules.slice(0,30).map(s=>scheduleCard(s)).join("")||'<div class="empty">No schedules yet.</div>';
  $("#homeSchedules").innerHTML=state.schedules.filter(s=>s.enabled!==false).slice(0,4).map(s=>scheduleCard(s,true)).join("")||'<div class="empty">Nothing scheduled.</div>';
}
function renderMetrics(){
  const m={...(state.metrics||{}),...(telemetry.metrics||{})};const runs=num(m.runs),passed=num(m.passed);const needs=state.jobs.filter(j=>j.status==="approval_required"||j.status==="failed").length;
  $("#mRuns").textContent=fmtNum(runs);$("#mPass").textContent=runs?Math.round(passed/runs*100)+"%":"—";$("#mTokens").textContent=fmtNum(m.net_tokens_saved_est??m.tokens_avoided_est);$("#mAvg").textContent=fmtDuration(m.avg_work_session_ms);$("#mPatches").textContent=fmtNum(m.patches_applied);$("#mResolved").textContent=fmtNum(m.bugs_resolved);
  $("#calm").textContent=needs?`${needs} item${needs===1?"":"s"} need attention.`:"All systems relaxed.";$("#calm").classList.toggle("danger",Boolean(needs));$("#calmDetail").textContent=needs?"A failed run or approval request is waiting in your execution ledger.":"No failed run or approval request currently needs you.";
  $("#aConnections").textContent=fmtNum(m.connections);$("#aSends").textContent=fmtNum(m.cloud_sends??m.sends);$("#aReceives").textContent=fmtNum(m.node_receives??m.receives);$("#aReturns").textContent=fmtNum(m.device_returns??m.device_sends);$("#aGross").textContent=fmtNum(m.tokens_avoided_est);$("#aLocal").textContent=fmtNum(m.local_tokens_est);
  $("#bReported").textContent=fmtNum(m.bugs_reported);$("#bOpen").textContent=fmtNum(m.bugs_open);$("#bResolved").textContent=fmtNum(m.bugs_resolved);$("#bReopened").textContent=fmtNum(m.bugs_reopened);
}
function renderBugs(){
  const rows=telemetry.bugs||report.bugs||[];$("#bugs").innerHTML=rows.slice(0,30).map(b=>`<div class="bug-row"><span class="bug-status status-chip ${esc(b.status)}">${esc(b.status)}</span><code>${esc(b.bug_id)}</code><div class="item-meta">${esc(b.sample_error||"No sample retained")} · ${num(b.occurrences)} occurrence${num(b.occurrences)===1?"":"s"}</div></div>`).join("")||'<div class="empty">No Quillgeist product bugs reported.</div>';
}
function eventLabel(e){return({connection_open:"Node connected",connection_close:"Node disconnected",cloud_send:"Cloud dispatched job",cloud_receive:"Node received job",device_send:"Node returned result",run_complete:"Execution completed",error:"Error reported"})[e.type]||String(e.type||"Event").replaceAll("_"," ")}
function renderActivity(){
  const events=report.events||[];$("#activityList").innerHTML=events.slice(0,250).map(e=>{const cls=e.status==="failed"||e.type==="error"?"error":e.status==="passed"?"success":"";const sym=cls==="error"?"!":cls==="success"?"✓":"→";return `<div class="activity-row ${cls}"><div class="activity-time">${fmtDate(e.ts)}</div><div class="activity-symbol">${sym}</div><div><div class="item-title">${esc(eventLabel(e))}</div><div class="item-meta">${esc(e.device_id||"")}${e.duration_ms?` · ${fmtDuration(e.duration_ms)}`:""}${e.net_tokens_saved_est?` · ${fmtNum(e.net_tokens_saved_est)} net tokens saved`:""}${e.error_message?` · ${esc(e.error_message)}`:""}</div></div>${statusChip(e.status||e.type)}</div>`}).join("")||'<div class="empty">No telemetry events match these filters.</div>';
}
function helpRows(){
  const query=$("#helpSearch")?.value.trim().toLowerCase()||"";const sections=activeHelpSection==="all"?["getting_started","setup_removal","faq","glossary"]:[activeHelpSection];const rows=[];
  for(const section of sections)for(const row of helpData[section]||[]){const blob=JSON.stringify(row).toLowerCase();if(query&&!blob.includes(query))continue;rows.push({section,row})}
  return rows;
}
function renderHelp(){
  const rows=helpRows();$("#helpResults").innerHTML=rows.map(({section,row})=>{let title,body;if(section==="faq"){title=row.q;body=row.a}else if(section==="glossary"){title=row.term;body=row.definition}else{title=row.title;body=row.body}return `<article class="help-card"><div class="kicker">${esc(section.replaceAll("_"," "))}</div><h3>${esc(title)}</h3><p>${esc(body)}</p></article>`}).join("")||'<div class="empty">No Help Center matches.</div>';
  const fixes=[...(helpData.fixes||[])].reverse();$("#fixFeed").innerHTML=fixes.map(f=>`<div class="fix-item"><small>${esc(f.date||"")} · ${esc(f.version||"")}</small><b>${esc(f.title||f.id)}</b><p>${esc(f.body||"")}</p></div>`).join("")||'<div class="empty">No fix history yet.</div>';
}

async function loadHelp(){const out=await api("/api/help");helpData=out.help||helpData;renderHelp();return helpData}
function reportQuery(includeFormat){const q=new URLSearchParams({limit:"1000"});const d=$("#reportDevice").value,s=$("#reportStatus").value,f=$("#reportFrom").value,t=$("#reportTo").value;if(d)q.set("device_id",d);if(s)q.set("status",s);if(f)q.set("from",String(new Date(f+"T00:00:00").getTime()));if(t)q.set("to",String(new Date(t+"T23:59:59.999").getTime()));if(includeFormat)q.set("format",includeFormat);return q}
async function loadReport(){report=await api(`/api/telemetry/report?${reportQuery().toString()}`);renderActivity();return report}
async function refresh(){
  if(!token())return;
  const [s,t,h,r]=await Promise.all([
    api("/api/state"),
    api("/api/telemetry/summary").catch(()=>({metrics:{},bugs:[]})),
    api("/api/help").catch(()=>({help:helpData})),
    api(`/api/telemetry/report?${reportQuery().toString()}`).catch(()=>report)
  ]);
  state=s;telemetry=t||{metrics:{},bugs:[]};helpData=h.help||helpData;report=r||report;
  renderDevices();renderJobs();renderSchedules();renderMetrics();renderBugs();renderActivity();renderHelp();
}
async function filePayload(input){const f=input.files[0];if(!f)return{};if(f.name.toLowerCase().endsWith(".abpack")){const bytes=new Uint8Array(await f.arrayBuffer());let bin="";for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return{pack_name:f.name,pack_b64:btoa(bin)}}return{pack_name:f.name,pack_text:await f.text()}}
async function exportReport(format){
  const q=reportQuery(format==="csv"?"csv":null);const headers={authorization:`Bearer ${token()}`};const r=await fetch(`/api/telemetry/report?${q}`,{headers});if(!r.ok)throw new Error(`Export failed (${r.status})`);
  const blob=format==="csv"?await r.blob():new Blob([JSON.stringify(await r.json(),null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`quillgeist-report-${new Date().toISOString().slice(0,10)}.${format}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

const commands=[
  ["Home","System health and machines","home"],["Run something","Send an Execution Pack","run"],["Automate","Schedules and device ownership","automate"],["Activity","Metrics, errors, bugs, reports","activity"],["Help Center","Setup, FAQ, glossary, fixes","help"]
];
function renderCommands(query=""){const q=query.toLowerCase();$("#commandList").innerHTML=commands.filter(x=>!q||x.join(" ").toLowerCase().includes(q)).map(([title,sub,view])=>`<button class="command-item" data-command-view="${view}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14m-5-5 5 5-5 5"/></svg><span><strong>${esc(title)}</strong><small class="muted" style="display:block">${esc(sub)}</small></span></button>`).join("")}
function openCommand(){renderCommands();$("#commandInput").value="";$("#commandDialog").showModal();setTimeout(()=>$("#commandInput").focus(),20)}
function openAccount(){$("#existingKey").value="";$("#accountDialog").showModal()}

// Delegated UI actions
document.addEventListener("click",async e=>{
  const nav=e.target.closest("[data-view]");if(nav){setView(nav.dataset.view);return}
  const jump=e.target.closest("[data-view-jump]");if(jump){setView(jump.dataset.viewJump);return}
  const close=e.target.closest("[data-close-dialog]");if(close){$("#"+close.dataset.closeDialog)?.close();return}
  const command=e.target.closest("[data-command-view]");if(command){$("#commandDialog").close();setView(command.dataset.commandView);return}
  const tab=e.target.closest("[data-help-section]");if(tab){activeHelpSection=tab.dataset.helpSection;$$('[data-help-section]').forEach(x=>x.classList.toggle("active",x===tab));renderHelp();return}
  const approve=e.target.closest("[data-approve]");if(approve){try{await api(`/api/jobs/${approve.dataset.approve}/approve`,{method:"POST",body:{}});toast("Job released to local policy.");await refresh()}catch(err){toast(err.message,"error")}return}
  const bug=e.target.closest("[data-report-bug]");if(bug){try{const out=await api("/api/telemetry/report-bug",{method:"POST",body:{job_id:bug.dataset.reportBug}});toast(`Product bug ${out.bug_id||"reported"}.`);await refresh()}catch(err){toast(err.message,"error")}return}
  const mv=e.target.closest("[data-move-schedule]");if(mv){const current=state.schedules.find(x=>x.id===mv.dataset.moveSchedule);const sel=document.querySelector(`[data-schedule-device="${CSS.escape(mv.dataset.moveSchedule)}"]`);if(current&&sel)try{await api("/api/schedules",{method:"POST",body:{...current,device_id:sel.value}});toast("Schedule moved.");await refresh()}catch(err){toast(err.message,"error")}return}
  const del=e.target.closest("[data-delete-schedule]");if(del){try{await api(`/api/schedules/${del.dataset.deleteSchedule}`,{method:"DELETE"});toast("Schedule removed.");await refresh()}catch(err){toast(err.message,"error")}return}
});

$("#createAccount").onclick=async()=>{try{const a=await api("/api/account/bootstrap",{method:"POST",body:{}});localStorage.setItem(TOKEN_KEY,a.account_token);show();await refresh();toast("Quillgeist Cloud ready.")}catch(e){toast(e.message,"error")}};
$("#restoreAccount").onclick=openAccount;$("#accountButton").onclick=openAccount;$("#railAccount").onclick=openAccount;
$("#useKey").onclick=async()=>{const k=$("#existingKey").value.trim();if(!k)return toast("Paste a control key first.","error");localStorage.setItem(TOKEN_KEY,k);$("#accountDialog").close();show();try{await refresh();toast("Control key restored.")}catch(e){localStorage.removeItem(TOKEN_KEY);show();toast("That key could not open a Quillgeist account.","error")}};
$("#copyKey").onclick=async()=>{try{await navigator.clipboard.writeText(token());toast("Control key copied.")}catch{toast("Clipboard permission was denied.","error")}};
$("#resetKey").onclick=()=>{if(confirm("Forget this browser's Quillgeist control key?")){localStorage.removeItem(TOKEN_KEY);location.hash="";location.reload()}};
$("#refresh").onclick=()=>refresh().then(()=>toast("Dashboard refreshed.")).catch(e=>toast(e.message,"error"));
$("#claim").onclick=async()=>{const code=$("#pairCode").value.trim().toUpperCase();if(!code)return toast("Enter the pairing code shown by the Node.","error");try{await api("/api/pair/claim",{method:"POST",body:{pair_code:code}});$("#pairCode").value="";toast("Device paired.");await refresh()}catch(e){toast(e.message,"error")}};
$("#sendJob").onclick=async()=>{try{if(!$("#jobDevice").value)throw new Error("Pair a device first.");const fp=await filePayload($("#packFile"));const text=$("#packText").value.trim();const body={device_id:$("#jobDevice").value,workspace:$("#workspace").value.trim()||undefined,title:"Quillgeist task",...fp};if(!fp.pack_name&&text){body.pack_name="task.md";body.pack_text=text}if(!body.pack_name)throw new Error("Choose a pack file or paste pack text.");await api("/api/jobs",{method:"POST",body});toast("Execution Pack sent.");await refresh()}catch(e){toast(e.message,"error")}};
$("#createSchedule").onclick=async()=>{try{const at=$("#scheduleAt").value;if(!at)throw new Error("Choose the first run time.");if(!$("#scheduleDevice").value)throw new Error("Pair a device first.");const pack=$("#schedulePack").value.trim();if(!pack)throw new Error("Add Execution Pack text.");const repeat=num($("#scheduleEvery").value)||null;if(repeat!==null&&repeat<60)throw new Error("Repeat interval must be at least 60 seconds.");const body={device_id:$("#scheduleDevice").value,owner:$("#scheduleOwner").value,next_run_at:new Date(at).getTime(),every_seconds:repeat,pack_name:"scheduled-task.md",pack_text:pack,approved:false,enabled:true};await api("/api/schedules",{method:"POST",body});toast("Schedule created.");await refresh()}catch(e){toast(e.message,"error")}};
$("#applyFilters").onclick=()=>loadReport().catch(e=>toast(e.message,"error"));$("#exportCsv").onclick=()=>exportReport("csv").catch(e=>toast(e.message,"error"));$("#exportJson").onclick=()=>exportReport("json").catch(e=>toast(e.message,"error"));
$("#syncHelp").onclick=()=>loadHelp().then(()=>toast("Help Center synchronized.")).catch(e=>toast(e.message,"error"));$("#helpSearch").addEventListener("input",renderHelp);
$("#commandTrigger").onclick=openCommand;$("#commandInput").addEventListener("input",e=>renderCommands(e.target.value));
addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openCommand()}if(e.key==="Escape"){for(const d of $$('dialog[open]'))d.close()}});
addEventListener("unhandledrejection",e=>toast(e.reason?.message||String(e.reason),"error"));addEventListener("error",e=>{if(e.error)toast(e.error.message||String(e.error),"error")});

(async()=>{
  show();
  try{const h=await api("/api/health");for(const id of ["#health","#publicHealth"]){const el=$(id);if(el)el.innerHTML=`<span class="status-dot"></span><span>${h.ok?"Cloud healthy":"Cloud issue"}</span>`}}catch{for(const id of ["#health","#publicHealth"]){const el=$(id);if(el){el.innerHTML='<span class="status-dot" style="background:var(--red)"></span><span>Cloud unavailable</span>';el.classList.add("danger")}}}
  const hash=location.hash.slice(1);if(["home","run","automate","activity","help"].includes(hash))setView(hash);
  if(token())try{await refresh()}catch(e){localStorage.removeItem(TOKEN_KEY);show();toast("Control key could not be restored. Create a new account or paste a valid key.","error")}
  if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});
  setInterval(()=>{if(token()&&!document.hidden)refresh().catch(()=>{})},20000);
})();
