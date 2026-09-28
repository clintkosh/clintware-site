(function(){
"use strict";
const STAGES=["Applied","Responded","Recruiter / Interview","Hiring Manager","Panel","Final","Offer","Paused","Closed / Rejected"];
const state={view:"board",data:{customers:[],records:[]},me:null,google:null,atlassian:null,query:"",stage:"all",selected:null};
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const date=v=>{if(!v)return "—";const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"—"};
const shortDate=v=>{if(!v)return "—";const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{month:"short",day:"numeric"}):"—"};
const n=v=>Number(v||0);
const api=async(path,opt={})=>{const r=await fetch(path,{credentials:"same-origin",headers:{"content-type":"application/json",...(opt.headers||{})},...opt,body:opt.body&&typeof opt.body!=="string"?JSON.stringify(opt.body):opt.body});const x=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(x.error||("Request failed: "+r.status));e.status=r.status;e.data=x;throw e}return x};
function toast(msg){const old=$(".toast");if(old)old.remove();const e=document.createElement("div");e.className="toast";e.textContent=msg;document.body.appendChild(e);setTimeout(()=>e.remove(),3600)}
function records(type){return state.data.records.filter(r=>r.type===type)}
function profiles(){return records("job_profile").map(r=>({...r.data,_recordId:r.id,_customerId:r.customerId})).filter(x=>x.company)}
function digest(){return records("search_digest")[0]?.data||null}\nfunction jiraConfig(){return records("jira_config")[0]?.data||null}
function activeRole(){return records("active_role").find(r=>r.data?.status!=="archived")||null}
function customer(id){return state.data.customers.find(c=>c.id===id)}
function median(values){const a=values.filter(v=>Number.isFinite(v)).sort((a,b)=>a-b);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function statusClass(stage){if(stage==="Offer")return "good";if(stage==="Closed / Rejected")return "bad";if(stage==="Paused")return "warn";return ""}
function metrics(){
 const p=profiles(),applied=p.filter(x=>x.applicationDate),responded=p.filter(x=>x.firstResponseDate),active=p.filter(x=>!["Closed / Rejected","Offer"].includes(x.stage)),loops=p.filter(x=>x.firstInterviewDate&&!["Closed / Rejected","Offer"].includes(x.stage)),offers=p.filter(x=>x.stage==="Offer"),med=median(p.map(x=>Number(x.responseTimeDays)).filter(Number.isFinite));
 return {applications:applied.length,active:active.length,loops:loops.length,offers:offers.length,responseRate:applied.length?Math.round(responded.length/applied.length*100):0,median:med};
}
function visibleProfiles(){
 const q=state.query.toLowerCase(),stage=state.stage;
 return profiles().filter(x=>(!q||[x.company,x.role,x.stage,x.estimatedPay,x.nextAction].join(" ").toLowerCase().includes(q))&&(stage==="all"||x.stage===stage));
}
function nav(){
 const items=[["board","Board"],["companies","Companies"],["interviews","Interviews"],["sync","Google Sync"],["atlassian","Jira + KB"],["active","Active Job"],["settings","Settings"]];
 return items.map(([id,label])=>`<button data-nav="${id}" class="${state.view===id?"active":""}">${label}</button>`).join("");
}
function shell(content){
 const email=state.me?.user?.email||"Authorized Google identity";
 return `<div class="shell">
 <aside class="side"><div class="brand"><div class="eyebrow">CLINTWARE // LANDTHEPLANE</div><strong>Command Center</strong><small>Application pipeline → interviews → offer → active role.</small></div><nav class="nav">${nav()}</nav><div class="side-foot"><span class="pill good">PRIVATE WORKSPACE</span><small class="muted">${esc(email)}</small><button class="btn small" data-action="new">+ New opportunity</button></div></aside>
 <section class="main"><header class="top"><div><div class="eyebrow">LANDTHEPLANE</div><strong>Career Operating System</strong></div><div class="spacer"></div><span class="pill status-text ${state.google?.connected?"good":"warn"}">${state.google?.connected?"GOOGLE EVIDENCE READY":"GOOGLE EVIDENCE NEEDS ACCESS"}</span><span class="pill status-text ${state.atlassian?.connected&&!state.atlassian?.reauthorizationRequired?"good":"warn"}">${state.atlassian?.connected&&!state.atlassian?.reauthorizationRequired?"ATLASSIAN READY":"ATLASSIAN SETUP"}</span><button class="btn small" data-action="sync">Sync</button><form method="post" action="/auth/logout"><button class="btn small" type="submit">Sign out</button></form></header><main class="content">${content}</main></section>
 <nav class="mobile-nav">${nav()}</nav></div>`;
}
function reportedStats(){
 const r=digest()?.fieldReport;
 if(!r)return '<div class="empty">No full Job Search field report has been synchronized yet.</div>';
 const v=x=>x==null?"—":Number(x).toLocaleString()+"+";
 const offers=r.offers==null?"—":Number(r.offers).toLocaleString();
 return `<section class="grid metrics">
 <article class="card metric"><b>${v(r.applicationActions)}</b><span>application actions in latest field report</span></article>
 <article class="card metric"><b>${v(r.distinctApplications)}</b><span>distinct company-role applications</span></article>
 <article class="card metric"><b>${v(r.interviewStageProcesses)}</b><span>interview-stage processes</span></article>
 <article class="card metric"><b>${v(r.completedLiveProcesses)}</b><span>completed live processes</span></article>
 <article class="card metric"><b>${v(r.round2Plus)}</b><span>round 2 / manager / panel</span></article>
 <article class="card metric"><b>${offers}</b><span>offers in report</span></article></section>
 <div class="split" style="margin-top:14px"><article class="card"><div class="eyebrow">LATEST FULL FIELD REPORT</div><h3>${esc(r.subject||"Job Search Field Report")}</h3><p class="muted">Report date ${date(r.date)} · Search start ${date(r.searchStart+"T12:00:00")}${r.searchDays!=null?" · "+esc(r.searchDays+" days"):""}${r.searchMonths!=null?" · "+esc(r.searchMonths+" months"):""}</p><p>${esc(r.funnelRead||"Historical funnel totals synchronized from the latest full job-search update.")}</p></article>
 <article class="card"><div class="eyebrow">HIGH-SIGNAL BOARD AT REPORT DATE</div><p>${esc(r.highSignalBoard||"No high-signal summary was parsed from the report.")}</p></article></div>`;
}
function searchStats(){
 const d=digest();
 if(!d)return `<div class="empty">No Daily Job Finder digest has been synchronized yet.</div>`;
 return `<div class="grid searchstats">
 <article class="card digest-main"><div class="eyebrow">LATEST DAILY JOB FINDER DIGEST</div><h3>${esc(d.subject||"Daily Job Finder Digest")}</h3><p>${esc(d.snippet||"Search throughput source synchronized from Gmail.")}</p><div style="margin-top:10px" class="muted">${date(d.date)}</div></article>
 <article class="card metric"><b>${d.jobsScanned??"—"}</b><span>jobs scanned in latest digest</span></article>
 <article class="card metric"><b>${d.spreadsheetsMaintained??"—"}</b><span>maintained search sheets</span></article>
 <article class="card metric"><b>${esc(d.cadence||"—")}</b><span>daily search cadence</span></article></div>`;
}
function boardView(){
 const m=metrics(),p=visibleProfiles();
 const cards=STAGES.map(stage=>{const list=p.filter(x=>x.stage===stage);return `<section class="col"><header><span>${esc(stage)}</span><span>${list.length}</span></header>${list.map(ticket).join("")||'<div class="muted" style="font-size:11px;padding:6px">No records</div>'}</section>`}).join("");
 return `<div class="title"><div class="eyebrow">BIG PICTURE</div><h1>Interview Pipeline</h1><p>Discovery throughput is separated from the actual application funnel. Company-role tickets carry the evidence timeline, response speed, interview progression, pay context, fit estimate, and next action.</p></div>
 <section class="grid metrics">
 <article class="card metric"><b>${m.applications}</b><span>verified applications</span></article>
 <article class="card metric"><b>${m.active}</b><span>active processes</span></article>
 <article class="card metric"><b>${m.loops}</b><span>active interview loops</span></article>
 <article class="card metric"><b>${m.offers}</b><span>offers</span></article>
 <article class="card metric"><b>${m.responseRate}%</b><span>response rate</span></article>
 <article class="card metric"><b>${m.median==null?"—":m.median+"d"}</b><span>median first response</span></article></section>
 <div class="section"><div><h2>Reported search history</h2><p>Aggregate funnel totals from the latest full Job Search field report. These are kept separate from the reconstructed evidence tickets below.</p></div></div>${reportedStats()}
 <div class="section"><div><h2>Search engine telemetry</h2><p>Latest acquisition digest, not application count.</p></div></div>${searchStats()}
 <div class="toolbar"><input class="input" id="search" value="${esc(state.query)}" placeholder="Search company, role, stage, next action…"><select class="select" id="stageFilter"><option value="all">All stages</option>${STAGES.map(x=>`<option ${state.stage===x?"selected":""}>${esc(x)}</option>`).join("")}</select><button class="btn" data-action="new">+ Add company-role</button></div>
 <div class="section"><div><h2>Application board</h2><p>${p.length} company-role tickets in current filter.</p></div></div><div class="kanban">${cards}</div>`;
}
function ticket(x){
 return `<article class="ticket" data-profile="${esc(x._recordId)}"><div class="eyebrow">${esc(x.company)}</div><h3>${esc(x.role||"Role not identified")}</h3><p>${esc(x.estimatedPay||"Pay not observed")} · Fit ${esc(x.fitScore??"—")}${x.fitScore!=null?"%":""}</p><div class="ticket-meta"><span class="pill ${statusClass(x.stage)}">${esc(x.stage)}</span>${x.jiraKey?`<span class="pill">${esc(x.jiraKey)}</span>`:""}<span class="pill">Applied ${shortDate(x.applicationDate)}</span><span class="pill">1st interview ${shortDate(x.firstInterviewDate)}</span></div>${x.nextAction?`<div class="next">Next: ${esc(x.nextAction)}</div>`:""}</article>`;
}
function companiesView(){
 const p=visibleProfiles().sort((a,b)=>String(b.lastActivityDate||"").localeCompare(String(a.lastActivityDate||"")));
 return `<div class="title"><div class="eyebrow">COMPANY TICKETS</div><h1>Applications & Processes</h1><p>One record per company-role process with source-aware dates and status history.</p></div>
 <div class="toolbar"><input class="input" id="search" value="${esc(state.query)}" placeholder="Search companies and roles…"><select class="select" id="stageFilter"><option value="all">All stages</option>${STAGES.map(x=>`<option ${state.stage===x?"selected":""}>${esc(x)}</option>`).join("")}</select><button class="btn primary" data-action="new">New ticket</button></div>
 <div class="section"><div><h2>${p.length} records</h2></div></div><div class="tablewrap"><table class="table"><thead><tr><th>Jira</th><th>Company</th><th>Role</th><th>Stage</th><th>Applied</th><th>First response</th><th>Response</th><th>First interview</th><th>Pay</th><th>Fit</th><th>Next action</th></tr></thead><tbody>
 ${p.map(x=>`<tr data-profile="${esc(x._recordId)}" style="cursor:pointer"><td>${x.jiraUrl?`<a class="source-link" href="${esc(x.jiraUrl)}" target="_blank" rel="noopener">${esc(x.jiraKey||"Open")}</a>`:esc(x.jiraKey||"—")}</td><td><strong>${esc(x.company)}</strong></td><td>${esc(x.role)}</td><td><span class="pill ${statusClass(x.stage)}">${esc(x.stage)}</span></td><td>${date(x.applicationDate)}</td><td>${date(x.firstResponseDate)}</td><td>${x.responseTimeDays==null?"—":esc(x.responseTimeDays+"d")}</td><td>${date(x.firstInterviewDate)}</td><td>${esc(x.estimatedPay||"—")}</td><td>${esc(x.fitScore??"—")}</td><td>${esc(x.nextAction||"—")}</td></tr>`).join("")||'<tr><td colspan="11">No company tickets yet.</td></tr>'}</tbody></table></div>`;
}
function interviewsView(){
 const p=profiles().filter(x=>x.firstInterviewDate).sort((a,b)=>String(b.firstInterviewDate).localeCompare(String(a.firstInterviewDate)));
 const explicit=records("interview");
 return `<div class="title"><div class="eyebrow">INTERVIEW HISTORY</div><h1>Interview Timeline</h1><p>First-interview dates are reconciled from Gmail and Google Calendar. Add manual rounds when a source signal is missing.</p></div>
 <div class="section"><div><h2>Company-role loops</h2><p>${p.length} processes with interview evidence.</p></div><button class="btn" data-action="interview">+ Add interview</button></div>
 <div class="tablewrap"><table class="table"><thead><tr><th>First interview</th><th>Company</th><th>Role</th><th>Current stage</th><th>Applied</th><th>Time to interview</th><th>Fit</th></tr></thead><tbody>${p.map(x=>{const d=x.applicationDate&&x.firstInterviewDate?Math.round((new Date(x.firstInterviewDate)-new Date(x.applicationDate))/86400000*10)/10:null;return `<tr data-profile="${esc(x._recordId)}" style="cursor:pointer"><td>${date(x.firstInterviewDate)}</td><td><strong>${esc(x.company)}</strong></td><td>${esc(x.role)}</td><td>${esc(x.stage)}</td><td>${date(x.applicationDate)}</td><td>${d==null?"—":d+"d"}</td><td>${esc(x.fitScore??"—")}</td></tr>`}).join("")}</tbody></table></div>
 ${explicit.length?`<div class="section"><div><h2>Manual interview notes</h2></div></div><div class="grid">${explicit.map(r=>`<article class="card"><strong>${esc(r.data.title||"Interview")}</strong><p class="muted">${date(r.data.date)} · ${esc(customer(r.customerId)?.name||"")}</p><p>${esc(r.data.notes||"")}</p></article>`).join("")}</div>`:""}`;
}
function syncView(){
 const g=state.google||{},d=digest();
 return `<div class="title"><div class="eyebrow">SOURCE RECONCILIATION</div><h1>Google Evidence Sync</h1><p>Identity and mailbox access stay separate. Sign-in proves who can enter the workspace; the delegated Google boundary provides scoped Gmail and Calendar evidence for synchronization.</p></div>
 <div class="split" style="margin-top:22px"><article class="card"><h2>Connection</h2><p class="muted">${g.connected?"Required Gmail read and Calendar read scopes are available.":"Evidence access needs authorization or renewed scopes."}</p><div class="actions"><button class="btn primary" data-action="sync">${g.connected?"Sync all evidence":"Connect Google evidence"}</button><a class="btn" href="/api/google/connect">Renew access</a></div><div class="callout" style="margin-top:14px">Raw mailbox content is not committed to the source repository. The private workspace stores only the job-search evidence needed to reconcile company-role processes.</div></article>
 <article class="card"><h2>What the sync builds</h2><div class="timeline"><div class="event"><strong>Company-role tickets</strong><small>Application receipt, first response, response time, first interview, stage, pay context, fit estimate, and next action.</small></div><div class="event"><strong>Calendar reconciliation</strong><small>Interview events supplement Gmail when scheduling evidence is more precise.</small></div><div class="event"><strong>Search history + throughput</strong><small>The latest full field report supplies aggregate application/interview history, while the daily job-finder digest remains a separate acquisition metric.</small></div></div></article></div>
 <div class="section"><div><h2>Latest digest</h2></div></div>${d?searchStats():'<div class="empty">Sync to load the latest job-search digest.</div>'}`;
}
function activeView(){
 const a=activeRole();
 if(!a)return `<div class="title"><div class="eyebrow">NEXT LIFECYCLE</div><h1>Active Job Workspace</h1><p>When an offer is accepted, the same system pivots from landing the role to managing it: 30/60/90 outcomes, stakeholders, projects, wins, feedback, and evidence for future reviews.</p></div><div class="card activehero" style="margin-top:22px"><h2>No active role yet</h2><p class="muted">Open a company ticket and choose “Activate accepted role” when appropriate. The application history remains intact.</p></div>`;
 const p=profiles().find(x=>x._customerId===a.customerId),goals=records("role_goal").filter(r=>r.customerId===a.customerId),wins=records("performance_evidence").filter(r=>r.customerId===a.customerId);
 return `<div class="title"><div class="eyebrow">ACTIVE ROLE</div><h1>${esc(a.data.company||p?.company||"Current role")}</h1><p>${esc(a.data.role||p?.role||"")} · Started ${date(a.data.startDate)}</p></div>
 <article class="card activehero" style="margin-top:22px"><div class="eyebrow">ROLE OPERATING SYSTEM</div><h2>30 / 60 / 90 + ongoing evidence</h2><div class="actions"><button class="btn primary" data-action="goal">+ Goal</button><button class="btn" data-action="win">+ Win / evidence</button></div></article>
 <div class="section"><div><h2>Goals & milestones</h2></div></div><div class="grid">${goals.map(r=>`<article class="card"><div class="eyebrow">${esc(r.data.horizon||"Goal")}</div><h3>${esc(r.data.title||"")}</h3><p class="muted">${esc(r.data.status||"Planned")} · Due ${date(r.data.due)}</p><p>${esc(r.data.outcome||"")}</p></article>`).join("")||'<div class="empty">No role goals recorded yet.</div>'}</div>
 <div class="section"><div><h2>Wins & performance evidence</h2></div></div><div class="grid">${wins.map(r=>`<article class="card"><div class="eyebrow">${date(r.data.date)}</div><h3>${esc(r.data.title||"Evidence")}</h3><p>${esc(r.data.impact||"")}</p><p class="muted">${esc(r.data.metric||"")}</p></article>`).join("")||'<div class="empty">No performance evidence recorded yet.</div>'}</div>`;
}
function settingsView(){
 return `<div class="title"><div class="eyebrow">SYSTEM</div><h1>Settings & Continuity</h1><p>Persistent career data lives in the authenticated workspace. Source provenance and audit history remain attached to the same account boundary.</p></div>
 <div class="split" style="margin-top:22px"><article class="card"><h2>Access policy</h2><div class="kv"><div>Signed in</div><div>${esc(state.me?.user?.email||"")}</div><div>Identity provider</div><div>Google only</div><div>Allowed</div><div>clint.kosh@gmail.com or verified @clintware.com</div><div>Guest mode</div><div>Disabled</div></div></article>
 <article class="card"><h2>Data continuity</h2><p class="muted">Export the current private workspace as JSON for backup or migration.</p><button class="btn" data-action="export">Download workspace export</button></article></div>`;
}
function render(){
 let content=state.view==="companies"?companiesView():state.view==="interviews"?interviewsView():state.view==="sync"?syncView():state.view==="atlassian"?atlassianView():state.view==="active"?activeView():state.view==="settings"?settingsView():boardView();
 $("#app").innerHTML=shell(content);bind();
}
function bind(){
 document.querySelectorAll("[data-nav]").forEach(b=>b.onclick=()=>{state.view=b.dataset.nav;render()});
 document.querySelectorAll("[data-profile]").forEach(e=>e.onclick=()=>openProfile(e.dataset.profile));
 document.querySelectorAll("[data-action]").forEach(e=>{const a=e.dataset.action;if(a==="new")e.onclick=openNew;if(a==="sync")e.onclick=syncAll;if(a==="reconcile-atlassian")e.onclick=reconcileAtlassian;if(a==="interview")e.onclick=()=>openRecord("interview");if(a==="goal")e.onclick=()=>openRecord("role_goal");if(a==="win")e.onclick=()=>openRecord("performance_evidence");if(a==="export")e.onclick=exportData});
 const s=$("#search");if(s)s.oninput=()=>{state.query=s.value;render()};
 const f=$("#stageFilter");if(f)f.onchange=()=>{state.stage=f.value;render()};
}
function modal(html){const e=document.createElement("div");e.className="modalback";e.innerHTML=`<section class="modal">${html}</section>`;document.body.appendChild(e);e.onclick=x=>{if(x.target===e)e.remove()};return e}
function closeModal(e){e.closest(".modalback")?.remove()}
function openProfile(id){
 const p=profiles().find(x=>x._recordId===id);if(!p)return;state.selected=p;
 const ev=(p.evidence||[]).slice().sort((a,b)=>String(b.at).localeCompare(String(a.at)));
 const m=modal(`<div class="modalhead"><div><div class="eyebrow">${esc(p.company)}</div><h2>${esc(p.role)}</h2></div><button class="btn small" data-close>Close</button></div>
 <div class="split"><div><div class="kv"><div>Stage</div><div><span class="pill ${statusClass(p.stage)}">${esc(p.stage)}</span></div><div>Applied</div><div>${date(p.applicationDate)}</div><div>First response</div><div>${date(p.firstResponseDate)} ${p.responseTimeDays!=null?esc("("+p.responseTimeDays+"d)"):""}</div><div>First interview</div><div>${date(p.firstInterviewDate)}</div><div>Estimated pay</div><div>${esc(p.estimatedPay||"—")} <span class="muted">· ${esc(p.paySource||"")}</span></div><div>Fit estimate</div><div>${esc(p.fitScore??"—")}% · ${esc(p.fitLabel||"")}</div><div>Next action</div><div>${esc(p.nextAction||"—")}</div><div>Jira ticket</div><div>${p.jiraUrl?`<a class="source-link" target="_blank" rel="noopener" href="${esc(p.jiraUrl)}">${esc(p.jiraKey||"Open Jira")} ↗</a>`:esc(p.jiraKey||"—")}</div><div>Job link</div><div>${p.jobUrl?`<a class="source-link" target="_blank" rel="noopener" href="${esc(p.jobUrl)}">Open source ↗</a>`:"—"}</div></div>
 <div class="actions" style="margin-top:18px"><button class="btn primary" data-edit>Edit ticket</button><button class="btn" data-add-interview>Add interview</button><button class="btn good" data-activate>Activate accepted role</button></div>${p.jobDescription?`<div class="section"><div><h2>Job / interview context</h2></div></div><p class="muted">${esc(p.jobDescription)}</p>`:""}</div>
 <div><h3>Source timeline</h3><div class="timeline">${ev.map(x=>`<div class="event"><strong>${esc(String(x.status||"").toUpperCase())} · ${date(x.at)}</strong><small>${esc(x.subject||"")}</small><small>${esc(x.from||"")}</small>${x.url?`<a class="source-link" href="${esc(x.url)}" target="_blank" rel="noopener">Source ↗</a>`:""}</div>`).join("")||'<div class="muted">No source events.</div>'}</div></div></div>`);
 m.querySelector("[data-close]").onclick=()=>m.remove();m.querySelector("[data-edit]").onclick=()=>{m.remove();editProfile(p)};m.querySelector("[data-add-interview]").onclick=()=>{m.remove();openRecord("interview",p._customerId)};m.querySelector("[data-activate]").onclick=()=>activateRole(p);
}
function profileForm(title,p={}){
 const m=modal(`<div class="modalhead"><h2>${esc(title)}</h2><button class="btn small" data-close>Close</button></div><form id="profileForm"><div class="formgrid">
 <div class="field"><label>Company</label><input class="input" name="company" required value="${esc(p.company||"")}"></div>
 <div class="field"><label>Role</label><input class="input" name="role" required value="${esc(p.role&&p.role!=="Role not identified"?p.role:"")}"></div>
 <div class="field"><label>Stage</label><select class="select" name="stage">${STAGES.map(x=>`<option ${p.stage===x?"selected":""}>${esc(x)}</option>`).join("")}</select></div>
 <div class="field"><label>Estimated / observed pay</label><input class="input" name="estimatedPay" value="${esc(p.estimatedPay||"")}"></div>
 <div class="field"><label>Fit estimate 0–100</label><input class="input" name="fitScore" type="number" min="0" max="100" value="${esc(p.fitScore??"")}"></div>
 <div class="field"><label>Application date</label><input class="input" name="applicationDate" type="date" value="${p.applicationDate?esc(p.applicationDate.slice(0,10)):""}"></div>
 <div class="field"><label>First response date</label><input class="input" name="firstResponseDate" type="date" value="${p.firstResponseDate?esc(p.firstResponseDate.slice(0,10)):""}"></div>
 <div class="field"><label>First interview date</label><input class="input" name="firstInterviewDate" type="date" value="${p.firstInterviewDate?esc(p.firstInterviewDate.slice(0,10)):""}"></div>
 <div class="field full"><label>Next action</label><input class="input" name="nextAction" value="${esc(p.nextAction||"")}"></div>
 <div class="field full"><label>Job URL</label><input class="input" name="jobUrl" value="${esc(p.jobUrl||"")}"></div>
 <div class="field full"><label>Job description / application notes</label><textarea class="textarea" name="jobDescription">${esc(p.jobDescription||"")}</textarea></div>
 </div><div class="actions" style="margin-top:14px"><button class="btn primary" type="submit">Save</button></div></form>`);
 m.querySelector("[data-close]").onclick=()=>m.remove();return m;
}
function recalcDates(x){
 if(x.applicationDate&&x.firstResponseDate){x.responseTimeDays=Math.round((new Date(x.firstResponseDate)-new Date(x.applicationDate))/86400000*10)/10;if(x.responseTimeDays<0)x.responseTimeDays=null}return x;
}
function openNew(){
 const m=profileForm("New company-role ticket");
 m.querySelector("form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),d=Object.fromEntries(f.entries());d.fitScore=d.fitScore?Number(d.fitScore):null;d.key=(d.company+"|"+d.role).toLowerCase();d.fitLabel=d.fitScore>=85?"High":d.fitScore>=70?"Strong":d.fitScore>=55?"Moderate":"Review";d.paySource=d.estimatedPay?"manual":"needs job description";d.fitSource="manual";d.evidence=[];d.lastSyncedAt=new Date().toISOString();recalcDates(d);try{const c=await api("/api/customers",{method:"POST",body:{name:d.company+" · "+d.role,industry:"Job opportunity"}});await api("/api/records",{method:"POST",body:{customerId:c.customer.id,type:"job_profile",provenance:"internal_record",data:d}});m.remove();await reload();toast("Company-role ticket created.")}catch(err){toast(err.message)}}}
function editProfile(p){
 const m=profileForm("Edit company-role ticket",p);
 m.querySelector("form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),d={...p,...Object.fromEntries(f.entries())};delete d._recordId;delete d._customerId;d.fitScore=d.fitScore?Number(d.fitScore):null;d.key=(d.company+"|"+d.role).toLowerCase();recalcDates(d);try{await api("/api/records/"+encodeURIComponent(p._recordId),{method:"PATCH",body:{data:d,provenance:"internal_record"}});m.remove();await reload();toast("Ticket updated.")}catch(err){toast(err.message)}}}
function openRecord(type,customerId){
 const active=activeRole(),ps=profiles();const choices=ps.map(p=>`<option value="${esc(p._customerId)}" ${customerId===p._customerId||(!customerId&&active?.customerId===p._customerId)?"selected":""}>${esc(p.company+" · "+p.role)}</option>`).join("");
 if(!choices){toast("Create a company-role ticket first.");return}
 let fields="";
 if(type==="interview")fields=`<div class="field"><label>Date</label><input class="input" name="date" type="datetime-local"></div><div class="field"><label>Round</label><input class="input" name="title" placeholder="Hiring manager / panel / final"></div><div class="field full"><label>Notes</label><textarea class="textarea" name="notes"></textarea></div>`;
 if(type==="role_goal")fields=`<div class="field"><label>Horizon</label><select class="select" name="horizon"><option>30 Day</option><option>60 Day</option><option>90 Day</option><option>Quarter</option><option>Annual</option></select></div><div class="field"><label>Due</label><input class="input" name="due" type="date"></div><div class="field full"><label>Goal</label><input class="input" name="title" required></div><div class="field full"><label>Outcome / measure</label><textarea class="textarea" name="outcome"></textarea></div><input type="hidden" name="status" value="Planned">`;
 if(type==="performance_evidence")fields=`<div class="field"><label>Date</label><input class="input" name="date" type="date"></div><div class="field"><label>Evidence title</label><input class="input" name="title" required></div><div class="field full"><label>Impact</label><textarea class="textarea" name="impact"></textarea></div><div class="field full"><label>Metric / proof</label><input class="input" name="metric"></div>`;
 const m=modal(`<div class="modalhead"><h2>Add ${type==="interview"?"interview":type==="role_goal"?"role goal":"performance evidence"}</h2><button class="btn small" data-close>Close</button></div><form><div class="formgrid"><div class="field full"><label>Company-role</label><select class="select" name="customerId">${choices}</select></div>${fields}</div><div class="actions" style="margin-top:14px"><button class="btn primary">Save</button></div></form>`);
 m.querySelector("[data-close]").onclick=()=>m.remove();m.querySelector("form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),d=Object.fromEntries(f.entries()),cid=d.customerId;delete d.customerId;try{await api("/api/records",{method:"POST",body:{customerId:cid,type,provenance:"internal_record",data:d}});if(type==="interview"){const p=profiles().find(x=>x._customerId===cid);if(p&&d.date&&(!p.firstInterviewDate||new Date(d.date)<new Date(p.firstInterviewDate))){await api("/api/records/"+encodeURIComponent(p._recordId),{method:"PATCH",body:{data:{firstInterviewDate:new Date(d.date).toISOString(),stage:p.stage==="Applied"?"Recruiter / Interview":p.stage},provenance:"internal_record"}})}}m.remove();await reload();toast("Record saved.")}catch(err){toast(err.message)}}}
async function activateRole(p){
 const start=prompt("Accepted-role start date (YYYY-MM-DD):",new Date().toISOString().slice(0,10));if(start===null)return;
 try{const old=activeRole();if(old)await api("/api/records/"+encodeURIComponent(old.id),{method:"PATCH",body:{data:{status:"archived"},provenance:"internal_record"}});
 await api("/api/records",{method:"POST",body:{customerId:p._customerId,type:"active_role",provenance:"internal_record",data:{company:p.company,role:p.role,startDate:start,status:"active",activatedAt:new Date().toISOString()}}});await api("/api/records/"+encodeURIComponent(p._recordId),{method:"PATCH",body:{data:{stage:"Offer",nextAction:"Active role workspace started"},provenance:"internal_record"}});document.querySelector(".modalback")?.remove();state.view="active";await reload();toast("Active job workspace enabled.")}catch(err){toast(err.message)}}
async function syncAll(){
 try{
  if(!state.google?.connected){location.href="/api/google/connect";return}
  let cursor="",pages=0,total=0;
  do{const q=cursor?"?cursor="+encodeURIComponent(cursor):"";const x=await api("/api/google/sync"+q,{method:"POST",body:{}});pages++;total+=n(x.created)+n(x.updated);cursor=x.nextCursor||"";toast("Sync page "+pages+" complete · "+total+" tickets created/updated.");if(pages>=60)break}while(cursor);
  await reload();toast("Google evidence sync complete · "+total+" ticket updates.");
 }catch(err){if(err.status===428&&err.data?.connectUrl){location.href=err.data.connectUrl;return}toast("Sync failed: "+err.message)}
}
async function exportData(){try{const x=await api("/api/export");const blob=new Blob([JSON.stringify(x,null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="landtheplane-command-center-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}catch(e){toast(e.message)}}
async function reload(){state.data=await api("/api/career-board");state.google=await api("/api/google/status").catch(e=>({connected:false,error:e.message}));state.atlassian=await api("/api/atlassian/status").catch(e=>({connected:false,error:e.message}));render()}
async function init(){
 try{state.me=await api("/me");state.data=await api("/api/career-board");state.google=await api("/api/google/status").catch(e=>({connected:false,error:e.message}));state.atlassian=await api("/api/atlassian/status").catch(e=>({connected:false,error:e.message}));render();const q=new URLSearchParams(location.search);if(q.get("google")==="connected"){history.replaceState({},document.title,"/");state.google=await api("/api/google/status").catch(()=>({connected:false}));if(state.google.connected)syncAll()}}catch(e){location.href="/auth/login"}
}
init();
})();