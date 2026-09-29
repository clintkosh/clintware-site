const API="/api";
let S={customers:[],customer:null,records:[]};
let route=localStorage.getItem("nsm-route")||"portfolio";
let briefDraft=null;

const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const p=c=>c&&c.portfolio?c.portfolio:{};
const recs=t=>(S.records||[]).filter(r=>r.type===t);
const byId=id=>(S.records||[]).find(r=>r.id===id);
const today=()=>new Date().toISOString().slice(0,10);
const money=n=>"$"+Number(n||0).toLocaleString("en-US",{maximumFractionDigits:0});

async function api(path,opt){
  const cfg=Object.assign({headers:{"content-type":"application/json"}},opt||{});
  const r=await fetch(API+path,cfg);
  if(!r.ok){let msg="Request failed";try{const x=await r.json();msg=x.error||JSON.stringify(x)}catch{msg=await r.text()}throw new Error(msg||r.statusText)}
  return r.json();
}
async function load(id){
  S=await api("/state"+(id?"?customer="+encodeURIComponent(id):""));
  render();
}
async function createRecord(type,data){
  if(!S.customer)throw new Error("Select an account first.");
  const r=await api("/records",{method:"POST",body:JSON.stringify({customerId:S.customer.id,type,provenance:"internal_record",data})});
  await load(S.customer.id);
  return r;
}
async function patchRecord(id,data){
  await api("/records/"+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify({data,provenance:"internal_record"})});
  await load(S.customer&&S.customer.id);
}
function toast(msg,kind){
  const n=document.createElement("div");n.className="toast "+(kind||"");n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),2400);
}
function health(h){return '<span class="health '+e(String(h||"Unknown").replace(/\s/g,"-"))+'">'+e(h||"Unknown")+'</span>'}
function metric(a,b,c){return '<div class="metric"><span>'+e(a)+'</span><b>'+e(b)+'</b><span>'+e(c)+'</span></div>'}
function head(i,t,s,actions){return '<header class="head"><div><div class="eyebrow">[ '+e(i)+' ]</div><h1>'+e(t)+'</h1><p>'+e(s)+'</p></div><div class="head-actions">'+(actions||"")+'</div></header>'}
function topbar(){
  return '<header class="top"><div class="brand">NSM // SERVICE OUTCOMES<span>Candidate-built · ServiceNow-first</span></div><span class="badge">SYNTHETIC DATA</span><div class="grow"></div><button class="btn" data-action="new-account">+ Account</button><a class="btn" href="https://jobs.ashbyhq.com/norsemanservices/f91b6ebf-8017-43fd-9618-ceffe8953dda" target="_blank" rel="noopener">Role ↗</a><button class="btn" data-reset>Reset</button></header>';
}
const NAV=[
  ["portfolio","Portfolio"],
  ["account","Account Workspace"],
  ["health","Platform Health"],
  ["adoption","Adoption + License"],
  ["escalation","Escalation"],
  ["meeting","Meeting Brief"],
  ["executive","Executive Brief"],
  ["application","Why This Build"]
];
function nav(){
  return '<nav><div class="navlabel">OPERATING SURFACES</div>'+NAV.map(x=>'<button class="nav '+(route===x[0]?"active":"")+'" data-route="'+x[0]+'">'+e(x[1])+'</button>').join("")+'<div class="boundary">Persistent browser workspace. No private customer data. No live tenant connection. ServiceNow compatibility model only.</div></nav>';
}
function portfolio(){
  const rows=(S.customers||[]).map(c=>({c,...p(c)}));
  const total=rows.reduce((a,x)=>a+Number(x.arr||0),0);
  const avg=rows.length?Math.round(rows.reduce((a,x)=>a+Number(x.platformHealth||x.healthScore||0),0)/rows.length):0;
  const watch=rows.filter(x=>x.health&&x.health!=="Healthy").length;
  const util=rows.length?Math.round(rows.reduce((a,x)=>a+Number(x.utilization||x.adoption||0),0)/rows.length):0;
  return head("00","Post-implementation command view","A working account portfolio: open an account to manage contacts, KPIs, actions, escalation context and meeting prep.",'<button class="btn primary" data-action="new-account">Add account</button>')+
    '<div class="metrics">'+
      metric("Accounts",String(rows.length),"persistent browser workspace")+
      metric("Synthetic ARR",money(total),"seeded examples only")+
      metric("Platform health",avg+"/100","portfolio average")+
      metric("Needs intervention",String(watch),"watch / at-risk")+
    '</div>'+
    '<div class="card"><div class="section-title"><div><h2>Account portfolio</h2><p class="sub">Select an account to work it, not just view it.</p></div><span class="badge">'+e(util)+"% avg utilization</span></div>"+
    '<div class="table"><table><thead><tr><th>Account</th><th>Terrain</th><th>Health</th><th>Release</th><th>Adoption</th><th>License use</th><th>Priority</th><th>Next action</th></tr></thead><tbody>'+
    rows.map(x=>'<tr data-id="'+e(x.c.id)+'"><td><strong>'+e(x.c.name)+'</strong><div class="muted-line">'+e(x.c.stage||x.lifecycle||"Account")+'</div></td><td>'+e(x.c.industry||"—")+'</td><td>'+health(x.health)+' · '+e(x.platformHealth||x.healthScore||"—")+'</td><td>'+e(x.release||"—")+'</td><td>'+e(x.adoption==null?"—":x.adoption+"%")+'</td><td>'+e(x.utilization==null?"—":x.utilization+"%")+'</td><td>'+e(x.priority||x.risk||"—")+'</td><td>'+e(x.nextAction||"Open workspace")+'</td></tr>').join("")+
    '</tbody></table></div></div>';
}
function accountHero(){
  const c=S.customer;if(!c)return '<div class="card empty">Select an account from Portfolio.</div>';
  const q=p(c);
  return '<div class="card account-hero"><div><div class="eyebrow">'+e(q.segment||c.stage||"ACCOUNT")+'</div><h2>'+e(c.name)+'</h2><p class="sub">'+e(c.industry||"Industry not entered")+' · '+e(q.lifecycle||c.stage||"Post-implementation")+'</p><div class="chips">'+health(q.health)+chip(q.release||"Release not entered")+chip(q.renewalForecast?("Renewal: "+q.renewalForecast):"Persistent workspace")+'</div></div><div class="hero-actions"><button class="btn primary" data-route="meeting">Prepare meeting</button><button class="btn" data-route="executive">Executive brief</button></div></div>';
}
function chip(v){return '<span class="badge">'+e(v||"—")+'</span>'}
function progress(current,target){
  const c=parseFloat(String(current||"").replace(/[^\d.-]/g,"")),t=parseFloat(String(target||"").replace(/[^\d.-]/g,""));
  if(!Number.isFinite(c)||!Number.isFinite(t)||t===0)return "";
  const pct=Math.max(0,Math.min(100,Math.round(c/t*100)));
  return '<div class="progress"><i style="width:'+pct+'%"></i></div>';
}
function contactCard(r){
  const d=r.data||{};
  return '<article class="contact-card"><div class="contact-top"><div><strong>'+e(d.name||"Unnamed contact")+'</strong><span>'+e(d.role||"Role not entered")+'</span></div>'+chip(d.status||"Tracked")+'</div><div class="contact-meta"><span>'+e(d.decisionRole||"")+'</span><span>'+e(d.email||"")+'</span><span>'+e(d.phone||"")+'</span></div><p>'+e(d.notes||"")+'</p></article>';
}
function kpiCard(r){
  const d=r.data||{};
  return '<article class="kpi-card"><div class="kpi-head"><div><div class="type">KPI</div><strong>'+e(d.name||"Metric")+'</strong></div><button class="mini-btn" data-kpi-update="'+e(r.id)+'">Update</button></div><div class="kpi-value"><b>'+e(d.currentValue||"—")+'</b><span>target '+e(d.target||"—")+'</span></div>'+progress(d.currentValue,d.target)+'<div class="kpi-foot"><span>'+e(d.owner||"Owner not set")+'</span><span>'+e(d.cadence||"Cadence not set")+'</span></div></article>';
}
function actionRow(r){
  const d=r.data||{},done=/complete|done|closed/i.test(String(d.status||""));
  return '<div class="action-row '+(done?"done":"")+'"><div><strong>'+e(d.title||"Action")+'</strong><span>'+e(d.owner||"Owner not set")+' · '+e(d.due||"No due date")+'</span></div><div class="action-tools">'+chip(d.status||"Open")+(done?"":'<button class="mini-btn" data-action-done="'+e(r.id)+'">Complete</button>')+'</div></div>';
}
function accountView(){
  if(!S.customer)return head("01","Account Workspace","Select an account from Portfolio.","")+accountHero();
  const contacts=recs("stakeholder"),kpis=recs("kpi"),actions=recs("action"),notes=recs("note").slice(-5).reverse(),q=p(S.customer);
  return head("01","Account Workspace","Contacts, customer outcomes, KPIs and execution live in one persistent record.",'<button class="btn primary" data-route="meeting">Prepare meeting</button>')+
    accountHero()+
    '<div class="grid2">'+
      '<section class="card"><div class="section-title"><div><h2>Key contacts</h2><p class="sub">Executive sponsor, platform owner and operational champions.</p></div>'+chip(contacts.length+" tracked")+'</div><div class="contact-grid">'+contacts.map(contactCard).join("")+'</div>'+
        '<details class="editor"><summary>+ Add contact</summary><form id="contact-form" class="form-grid"><label>Name<input name="name" required placeholder="Contact name"></label><label>Role<input name="role" required placeholder="ServiceNow Platform Owner"></label><label>Decision role<input name="decisionRole" placeholder="Technical owner / Sponsor"></label><label>Status<select name="status"><option>Engaged</option><option>Advocate</option><option>Neutral</option><option>At Risk</option></select></label><label>Email<input name="email" type="email" placeholder="optional"></label><label>Phone<input name="phone" placeholder="optional"></label><label class="span2">Notes<textarea name="notes" rows="2" placeholder="What matters to this person?"></textarea></label><button class="btn primary" type="submit">Save contact</button></form></details>'+
      '</section>'+
      '<section class="card"><div class="section-title"><div><h2>KPIs / success criteria</h2><p class="sub">Measurable customer outcomes and platform signals.</p></div>'+chip(kpis.length+" tracked")+'</div><div class="kpi-grid">'+kpis.map(kpiCard).join("")+'</div>'+
        '<details class="editor"><summary>+ Add KPI</summary><form id="kpi-form" class="form-grid"><label>KPI name<input name="name" required placeholder="Critical CI ownership"></label><label>Current value<input name="currentValue" required placeholder="83%"></label><label>Target<input name="target" required placeholder="95%"></label><label>Owner<input name="owner" placeholder="Platform Owner"></label><label>Cadence<select name="cadence"><option>Weekly</option><option>Biweekly</option><option>Monthly</option><option>Quarterly</option></select></label><label>Source<input name="sourceSystem" placeholder="ServiceNow telemetry"></label><button class="btn primary" type="submit">Save KPI</button></form></details>'+
      '</section>'+
    '</div>'+
    '<div class="grid2">'+
      '<section class="card"><div class="section-title"><div><h2>Open actions</h2><p class="sub">'+e(q.nextAction||"Customer plan execution")+'</p></div></div><div class="action-list">'+actions.map(actionRow).join("")+'</div>'+
        '<details class="editor"><summary>+ Add action</summary><form id="action-form" class="form-grid"><label class="span2">Action<input name="title" required placeholder="Run release-readiness checkpoint"></label><label>Owner<input name="owner" required placeholder="Customer Success Advocate"></label><label>Due<input name="due" type="date"></label><button class="btn primary" type="submit">Add action</button></form></details>'+
      '</section>'+
      '<section class="card"><div class="section-title"><div><h2>Account notes</h2><p class="sub">Recent context retained with the account.</p></div></div><div class="note-list">'+(notes.length?notes.map(r=>'<div class="note"><strong>'+e((r.data||{}).title||"Note")+'</strong><p>'+e((r.data||{}).body||"")+'</p></div>').join(""):'<p class="sub">No notes yet.</p>')+'</div>'+
        '<details class="editor"><summary>+ Add note</summary><form id="note-form" class="form-grid"><label class="span2">Title<input name="title" required placeholder="Sponsor update"></label><label class="span2">Note<textarea name="body" required rows="3"></textarea></label><button class="btn primary" type="submit">Save note</button></form></details>'+
      '</section>'+
    '</div>';
}
function healthView(){
  const q=p(S.customer||{}),risks=recs("risk"),incidents=recs("incident"),problems=recs("problem"),changes=recs("change");
  return head("02","Platform health, not account vibes.","Current-release posture, CMDB/CSDM trust, incidents, problems, changes and business outcomes stay connected.",'<button class="btn" data-route="account">Account workspace</button>')+
    accountHero()+
    '<div class="metrics">'+metric("Platform health",(q.platformHealth||q.healthScore||"—")+"/100",q.risk||"No risk entered")+metric("Release",q.release||"—","current-release posture")+metric("Adoption",(q.adoption==null?"—":q.adoption+"%"),q.products||"")+metric("License use",(q.utilization==null?"—":q.utilization+"%"),q.priority||"")+'</div>'+
    '<div class="grid2"><section class="card"><h2>Risk / health gates</h2>'+risks.map(record).join("")+'</section><section class="card"><h2>Operational evidence</h2>'+incidents.concat(problems,changes).map(record).join("")+'</section></div>';
}
function adoptionView(){
  const q=p(S.customer||{}),lic=recs("license")[0]?.data||{},plays=recs("success_play"),kpis=recs("kpi");
  return head("03","Adoption follows entitlement.","Utilization becomes useful only when it connects to a customer outcome and a next play.",'<button class="btn" data-route="meeting">Prepare meeting</button>')+
    accountHero()+
    '<div class="grid2"><section class="card"><h2>License / capability map</h2><div class="kv"><span>Entitled</span><span>'+e(lic.entitled||q.products||"—")+'</span></div><div class="kv"><span>Active</span><span>'+e(lic.active||q.products||"—")+'</span></div><div class="kv"><span>Utilization</span><span>'+e(lic.utilization||(q.utilization==null?"—":q.utilization+"%"))+'</span></div><div class="kv"><span>Gap</span><span>'+e(lic.gap||"Validate with telemetry")+'</span></div></section><section class="card"><h2>Success Plays</h2>'+plays.map(record).join("")+'</section></div>'+
    '<section class="card"><h2>Outcome KPIs</h2><div class="kpi-grid">'+kpis.map(kpiCard).join("")+'</div></section>';
}
function escalationView(){
  return head("04","Escalate with context already attached.","Business impact, technical evidence, named owners and the next decision remain in one thread.",'<button class="btn" data-route="meeting">Build customer update</button>')+
    accountHero()+
    '<div class="grid3"><div class="card"><h2>Incident</h2>'+recs("incident").map(record).join("")+'</div><div class="card"><h2>Problem</h2>'+recs("problem").map(record).join("")+'</div><div class="card"><h2>Change</h2>'+recs("change").map(record).join("")+'</div></div>'+
    '<div class="card"><h2>Architect / delivery handoff</h2>'+recs("architect_handoff").map(record).join("")+'</div>';
}
function record(r){
  const d=r&&r.data?r.data:{};
  return '<div class="record"><div class="type">'+e(r&&r.type?r.type:"record")+'</div><h3>'+e(d.title||d.number||d.name||"Record")+'</h3>'+Object.entries(d).filter(([k,v])=>v&&!["title","name"].includes(k)).slice(0,8).map(([k,v])=>'<div class="kv"><span>'+e(k.replace(/([A-Z])/g," $1"))+'</span><span>'+e(typeof v==="object"?JSON.stringify(v):v)+'</span></div>').join("")+'</div>';
}
function buildBrief(){
  const c=S.customer;if(!c)return null;
  const q=p(c),contacts=recs("stakeholder"),kpis=recs("kpi"),actions=recs("action").filter(r=>!/complete|done|closed/i.test(String((r.data||{}).status||"")));
  const risk=recs("risk")[0]?.data||{},inc=recs("incident")[0]?.data||{},prob=recs("problem")[0]?.data||{},chg=recs("change")[0]?.data||{},play=recs("success_play")[0]?.data||{},lic=recs("license")[0]?.data||{};
  const objective=(document.getElementById("meeting-objective")?.value||q.nextAction||"Review platform health, customer outcomes, risks and next decisions").trim();
  const date=document.getElementById("meeting-date")?.value||today();
  const type=document.getElementById("meeting-type")?.value||"Customer Success Review";
  const selected=[...document.querySelectorAll('input[name="meeting-attendee"]:checked')].map(x=>x.value);
  const attendeeRecords=contacts.filter(r=>selected.includes(r.id));
  const attendees=(attendeeRecords.length?attendeeRecords:contacts.slice(0,3)).map(r=>((r.data||{}).name||"")+" — "+((r.data||{}).role||""));
  const lines=[
    "CUSTOMER MEETING BRIEF",
    c.name,
    type+" | "+date,
    "",
    "OBJECTIVE",
    objective,
    "",
    "ACCOUNT SNAPSHOT",
    "Industry: "+(c.industry||"Not entered"),
    "Lifecycle: "+(q.lifecycle||c.stage||"Not entered"),
    "Platform health: "+(q.platformHealth||q.healthScore||"Not entered")+"/100",
    "Release: "+(q.release||"Not entered"),
    "Adoption: "+(q.adoption==null?"Not entered":q.adoption+"%"),
    "License utilization: "+(q.utilization==null?"Not entered":q.utilization+"%"),
    "Priority: "+(q.priority||q.risk||"Not entered"),
    "",
    "ATTENDEES",
    ...attendees.map(x=>"- "+x),
    "",
    "SUCCESS KPIS",
    ...kpis.map(r=>{const d=r.data||{};return "- "+(d.name||"KPI")+": "+(d.currentValue||"—")+" | target "+(d.target||"—")+" | "+(d.owner||"owner not set")}),
    "",
    "LICENSE / ADOPTION",
    "Entitled: "+(lic.entitled||q.products||"Not entered"),
    "Active: "+(lic.active||q.products||"Not entered"),
    "Gap: "+(lic.gap||"No gap entered"),
    "",
    "OPEN ACTIONS",
    ...actions.slice(0,8).map(r=>{const d=r.data||{};return "- "+(d.title||"Action")+" | "+(d.owner||"owner not set")+" | due "+(d.due||"not set")}),
    "",
    "CURRENT RISK / ESCALATION",
    "Risk: "+(risk.title||q.risk||"No material risk entered"),
    "Impact: "+(risk.impact||inc.businessImpact||"Not entered"),
    "Incident: "+(inc.number||"None")+" "+(inc.title||""),
    "Problem: "+(prob.number||"None")+" "+(prob.title||""),
    "Change: "+(chg.number||"None")+" "+(chg.title||""),
    "",
    "SUCCESS PLAY",
    (play.title||"No active play entered"),
    "Trigger: "+(play.trigger||"Not entered"),
    "Exit criteria: "+(play.exitCriteria||"Not entered"),
    "",
    "DECISIONS / QUESTIONS",
    "- Are the current platform-health and adoption signals consistent with the customer's experience?",
    "- What decision or owner is needed to remove the highest-impact blocker?",
    "- Which licensed capability is underused because of readiness, governance or enablement?",
    "- Is the next technical handoff bounded enough for the Architect / delivery team to act without rediscovery?",
    "- What outcome should be visibly different before the next review?",
    "",
    "PROPOSED AGENDA",
    "1. Outcome and platform-health check",
    "2. KPI / adoption review",
    "3. Incident, problem, change or architecture decisions",
    "4. Success Play and license-utilization opportunity",
    "5. Owners, due dates and next checkpoint",
    "",
    "Generated from the persistent candidate-built ServiceNow customer outcomes workspace. Synthetic demo data only."
  ];
  return {customerId:c.id,customerName:c.name,date,type,objective,attendees,lines};
}
function meetingView(){
  if(!S.customer)return head("05","Meeting Brief","Select an account before preparing a meeting.","")+accountHero();
  const contacts=recs("stakeholder"),lastPrep=recs("call_prep").slice(-1)[0];
  return head("05","Meeting Brief","Build a pre-call pack from the current account record, save it to prep history, and download an actual PDF.",'<button class="btn" data-route="account">Account workspace</button>')+
    accountHero()+
    '<div class="grid2"><section class="card"><h2>Call details</h2><form id="meeting-form" class="form-grid"><label class="span2">Objective<input id="meeting-objective" name="objective" value="'+e(p(S.customer).nextAction||"Review platform health, adoption, risks and next decisions")+'"></label><label>Meeting type<select id="meeting-type" name="type"><option>Customer Success Review</option><option>Executive Business Review</option><option>Escalation Review</option><option>Renewal / Value Review</option><option>Platform Health Review</option></select></label><label>Date<input id="meeting-date" name="date" type="date" value="'+today()+'"></label><div class="span2"><span class="field-label">Attendees</span><div class="check-list">'+contacts.map((r,i)=>'<label><input type="checkbox" name="meeting-attendee" value="'+e(r.id)+'" '+(i<3?"checked":"")+'> '+e((r.data||{}).name||"Contact")+' <span>'+e((r.data||{}).role||"")+'</span></label>').join("")+'</div></div><div class="button-row span2"><button class="btn primary" type="submit">Generate briefing</button><button class="btn" type="button" data-action="download-pdf">Download PDF</button><button class="btn" type="button" data-action="save-prep">Save prep record</button></div></form><p class="sub">'+(lastPrep?"Last saved prep: "+e((lastPrep.data||{}).date||""):"No saved prep record yet.")+'</p></section><section class="card"><h2>What the brief uses</h2><div class="source-list"><span>Account lifecycle + priority</span><span>Key stakeholders</span><span>KPIs / targets</span><span>License utilization</span><span>Open actions</span><span>Risk + incident/problem/change</span><span>Success Play</span><span>Architect handoff context</span></div><div class="callout"><strong>No invented detail:</strong> missing fields are shown as missing. The PDF is deterministic from the current workspace.</div></section></div>'+
    '<section class="card" id="brief-preview"><h2>Current preview</h2>'+briefHtml(buildBrief())+'</section>';
}
function briefHtml(doc){
  if(!doc)return '<p class="sub">Select an account.</p>';
  const groups=[];let g={title:"",items:[]};
  for(const raw of doc.lines){
    if(!raw){if(g.items.length){groups.push(g);g={title:"",items:[]}};continue}
    const isHead=raw===raw.toUpperCase()&&!/^\d/.test(raw)&&!raw.startsWith("-");
    if(isHead){if(g.items.length||g.title)groups.push(g);g={title:raw,items:[]}}else g.items.push(raw);
  }
  if(g.items.length||g.title)groups.push(g);
  return '<div class="brief-sheet">'+groups.map(x=>'<section><h3>'+e(x.title)+'</h3>'+x.items.map(v=>'<p>'+e(v)+'</p>').join("")+'</section>').join("")+'</div>';
}
function executiveView(){
  const c=S.customer,q=p(c||{}),risk=recs("risk")[0]?.data||{},kpis=recs("kpi"),contacts=recs("stakeholder");
  return head("06","Engineer detail in. CIO signal out.","One page that a leader can use: outcomes, platform state, customer relationships, decisions and next commitments.",'<button class="btn primary" data-route="meeting">Prepare customer meeting</button>')+
    accountHero()+
    '<div class="grid2"><section class="card"><h2>Executive signal</h2><div class="quote">“'+e(q.priority||q.risk||"Select an account")+'”</div><hr class="rule"><div class="kv"><span>Customer objective</span><span>'+e(c&&c.facts?(c.facts.businessGoal||c.facts.successMetrics||"Not entered"):"Not entered")+'</span></div><div class="kv"><span>Risk</span><span>'+e(risk.title||q.risk||"Not entered")+'</span></div><div class="kv"><span>Decision</span><span>'+e(risk.nextDecision||q.nextAction||"Not entered")+'</span></div><div class="kv"><span>Expansion signal</span><span>'+money(q.expansionPotential||0)+' synthetic</span></div></section><section class="card"><h2>Relationship map</h2>'+contacts.slice(0,5).map(contactCard).join("")+'</section></div>'+
    '<section class="card"><h2>KPI scorecard</h2><div class="kpi-grid">'+kpis.map(kpiCard).join("")+'</div></section>';
}
function applicationView(){
  return head("07","Why I built this.","The role needs an independent post-implementation owner who can connect ServiceNow telemetry, people, execution and executive outcomes.","")+
    '<div class="card application"><p>I built this as a working account system rather than a static dashboard.  The portfolio opens into persistent customer records with stakeholder maps, KPI tracking, actions, ServiceNow-oriented operational context, meeting preparation and downloadable briefing PDFs.</p><p>The goal is to show the bridge I would expect this role to own: <strong>account signal → platform health → customer outcome → coordinated action → executive communication.</strong></p><p>All built-in customers, contacts, ARR, incidents and metrics are fictional simulation data.  There is no real ServiceNow tenant or private Norseman customer data behind the demo.</p><hr class="rule"><p><strong>Clinton Kosh</strong><br><a href="https://clintware.com" target="_blank" rel="noopener">clintware.com</a></p></div>';
}
function content(){
  if(route==="portfolio")return portfolio();
  if(route==="account")return accountView();
  if(route==="health")return healthView();
  if(route==="adoption")return adoptionView();
  if(route==="escalation")return escalationView();
  if(route==="meeting")return meetingView();
  if(route==="executive")return executiveView();
  return applicationView();
}
function modal(title,body){
  let m=document.getElementById("modal");
  if(!m){m=document.createElement("div");m.id="modal";document.body.appendChild(m)}
  m.className="modal open";m.innerHTML='<div class="modal-card"><div class="section-title"><h2>'+e(title)+'</h2><button class="mini-btn" data-close-modal>Close</button></div>'+body+'</div>';
}
function closeModal(){const m=document.getElementById("modal");if(m){m.className="modal";m.innerHTML=""}}
function newAccountModal(){
  modal("Add account",'<form id="account-form" class="form-grid"><label class="span2">Account name<input name="name" required placeholder="Customer account"></label><label>Industry<input name="industry" placeholder="Healthcare"></label><label>Primary objective<input name="goal" placeholder="Improve platform health"></label><button class="btn primary" type="submit">Create workspace</button></form>');
}
function sanitizePdfText(s){return String(s||"").normalize("NFKD").replace(/[^\x20-\x7E]/g,"-").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)")}
function wrapLine(s,max){
  const text=String(s||"");if(!text)return [""];
  const words=text.split(/\s+/),out=[];let line="";
  for(const w of words){const next=line?line+" "+w:w;if(next.length>max&&line){out.push(line);line=w}else line=next}
  if(line)out.push(line);return out.length?out:[""];
}
function pdfBlob(lines){
  const expanded=[];
  for(const line of lines){for(const w of wrapLine(line,92))expanded.push(w)}
  const pages=[];for(let i=0;i<expanded.length;i+=50)pages.push(expanded.slice(i,i+50));
  const objects=[];const pageIds=[],contentIds=[];
  for(let i=0;i<pages.length;i++){pageIds.push(4+i*2);contentIds.push(5+i*2)}
  objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objects[2]='<< /Type /Pages /Kids ['+pageIds.map(id=>id+' 0 R').join(" ")+'] /Count '+pages.length+' >>';
  objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  pages.forEach((pg,i)=>{
    const stream='BT\n/F1 9 Tf\n54 738 Td\n13 TL\n'+pg.map(line=>'('+sanitizePdfText(line)+') Tj\nT*').join("")+'ET';
    objects[pageIds[i]]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents '+contentIds[i]+' 0 R >>';
    objects[contentIds[i]]='<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream';
  });
  let pdf='%PDF-1.4\n';const offsets=[0];
  for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n'}
  const xref=pdf.length;pdf+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';
  for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,"0")+' 00000 n \n';
  pdf+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
  return new Blob([pdf],{type:"application/pdf"});
}
async function savePrep(doc){
  if(!doc)return;
  await createRecord("call_prep",{title:doc.type+" · "+doc.date,date:doc.date,type:doc.type,objective:doc.objective,attendees:doc.attendees.join("; "),briefText:doc.lines.join("\n"),generatedAt:new Date().toISOString(),generationMode:"deterministic-workspace"});
}
async function downloadBriefPdf(){
  const doc=buildBrief();if(!doc){toast("Select an account first.","bad");return}
  briefDraft=doc;
  const blob=pdfBlob(doc.lines),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=doc.customerName.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()+"-"+doc.date+"-meeting-brief.pdf";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  await savePrep(doc);toast("Meeting brief PDF downloaded and prep saved.","good");
}
function render(){
  const app=document.getElementById("app");app.className="";app.innerHTML=topbar()+'<div class="shell">'+nav()+'<main class="work">'+content()+'</main></div>';
}
document.addEventListener("click",async ev=>{
  const n=ev.target.closest("[data-route]");
  if(n){route=n.dataset.route;localStorage.setItem("nsm-route",route);render();window.scrollTo({top:0,behavior:"smooth"});return}
  const row=ev.target.closest("[data-id]");
  if(row){route="account";localStorage.setItem("nsm-route",route);await load(row.dataset.id);window.scrollTo({top:0,behavior:"smooth"});return}
  if(ev.target.closest("[data-reset]")){await api("/customers/reset-samples",{method:"POST",body:"{}"});route="portfolio";localStorage.setItem("nsm-route",route);await load();toast("Synthetic workspace reset.","good");return}
  if(ev.target.closest('[data-action="new-account"]')){newAccountModal();return}
  if(ev.target.closest("[data-close-modal]")){closeModal();return}
  const k=ev.target.closest("[data-kpi-update]");
  if(k){const r=byId(k.dataset.kpiUpdate),d=r?.data||{};const v=prompt("Update current value for "+(d.name||"KPI"),d.currentValue||"");if(v!==null){await patchRecord(r.id,{currentValue:v,lastUpdated:today()});toast("KPI updated.","good")}return}
  const a=ev.target.closest("[data-action-done]");
  if(a){await patchRecord(a.dataset.actionDone,{status:"Complete",completedAt:today()});toast("Action completed.","good");return}
  if(ev.target.closest('[data-action="download-pdf"]')){await downloadBriefPdf();return}
  if(ev.target.closest('[data-action="save-prep"]')){const doc=buildBrief();if(doc){await savePrep(doc);toast("Meeting prep saved.","good")}return}
});
document.addEventListener("submit",async ev=>{
  ev.preventDefault();const form=ev.target;
  try{
    if(form.id==="account-form"){
      const fd=new FormData(form),r=await api("/customers",{method:"POST",body:JSON.stringify({name:fd.get("name"),industry:fd.get("industry")})}),id=r.customer.id;
      if(fd.get("goal"))await api("/records",{method:"POST",body:JSON.stringify({customerId:id,type:"handoff",provenance:"internal_record",data:{title:"Primary customer objective",value:String(fd.get("goal")),validation:"User-entered"}})});
      closeModal();route="account";localStorage.setItem("nsm-route",route);await load(id);toast("Account workspace created.","good");return
    }
    if(form.id==="contact-form"){
      const fd=new FormData(form);await createRecord("stakeholder",{name:fd.get("name"),role:fd.get("role"),decisionRole:fd.get("decisionRole"),status:fd.get("status"),email:fd.get("email"),phone:fd.get("phone"),notes:fd.get("notes"),organization:S.customer.name});toast("Contact saved.","good");return
    }
    if(form.id==="kpi-form"){
      const fd=new FormData(form);await createRecord("kpi",{name:fd.get("name"),currentValue:fd.get("currentValue"),target:fd.get("target"),owner:fd.get("owner"),cadence:fd.get("cadence"),sourceSystem:fd.get("sourceSystem"),metricDefinition:"User-entered customer success KPI",approval:"Internal record"});toast("KPI saved.","good");return
    }
    if(form.id==="action-form"){
      const fd=new FormData(form);await createRecord("action",{title:fd.get("title"),owner:fd.get("owner"),due:fd.get("due"),status:"Open",audience:"Customer / Internal"});toast("Action added.","good");return
    }
    if(form.id==="note-form"){
      const fd=new FormData(form);await createRecord("note",{title:fd.get("title"),body:fd.get("body"),status:"Recorded",owner:"Customer Success Advocate"});toast("Note saved.","good");return
    }
    if(form.id==="meeting-form"){
      briefDraft=buildBrief();const target=document.getElementById("brief-preview");if(target)target.innerHTML='<h2>Current preview</h2>'+briefHtml(briefDraft);toast("Brief refreshed from current account data.","good");return
    }
  }catch(err){toast(err.message||"Could not save.","bad")}
});
load().catch(err=>{document.getElementById("app").innerHTML='<main class="loading"><main><div class="index">[ ERR ]</div><h1>Prototype did not load.</h1><p>'+e(err.message)+'</p></main></main>'});