const API="/api";
let S={customer:null,customers:[],records:[],access:{}};
let view=localStorage.getItem("cpl-crm-view")||"overview";
let accountQuery="";
let drawerOpen=false;
let theme=localStorage.getItem("cpl-theme")||"light";
document.documentElement.dataset.theme=theme;

const e=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n||0));
const num=n=>Number(n||0);
const p=c=>c&&c.portfolio?c.portfolio:{};
const R=t=>(S.records||[]).filter(r=>r.type===t);
const open=v=>!/(done|closed|resolved|complete|archived)/i.test(String(v||""));
const healthClass=h=>String(h||"").toLowerCase().replace(/\s+/g,"-");
const daysUntil=d=>d?Math.ceil((new Date(d+"T12:00:00")-new Date())/86400000):null;
const external=(href,label)=>'<a href="'+e(href)+'" target="_blank" rel="noopener noreferrer">'+e(label)+'</a>';

async function api(path,opt={}){
  const r=await fetch(API+path,{...opt,headers:{"content-type":"application/json",...(opt.headers||{})}});
  let x={};try{x=await r.json()}catch{}
  if(!r.ok)throw new Error(x.error||("Request failed: "+r.status));
  return x;
}
async function load(id){
  const q=id?"?customer="+encodeURIComponent(id):"";
  S=await api("/state"+q);
  render();
}
function toast(msg){
  const n=document.createElement("div");n.className="toast";n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),2200);
}
function current(){
  return S.customer||S.customers[0]||null;
}
function selectedRecords(type){
  return type?R(type):S.records||[];
}
function statusBadge(text,kind=""){
  return '<span class="badge '+e(kind)+'">'+e(text||"Not set")+'</span>';
}
function healthBadge(h){
  return '<span class="health '+healthClass(h)+'"><i></i>'+e(h||"Unknown")+'</span>';
}
function initials(name){
  return String(name||"?").split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();
}
function tabButton(id,label){
  return '<button class="tab '+(view===id?"active":"")+'" data-view="'+e(id)+'">'+e(label)+'</button>';
}
function accountRows(){
  const q=accountQuery.trim().toLowerCase();
  return (S.customers||[]).filter(c=>!q||[c.name,c.industry,p(c).segment,p(c).health,p(c).renewalForecast].join(" ").toLowerCase().includes(q));
}
function appHeader(){
  const c=current(),pp=p(c);
  return '<header class="appbar">'+
    '<div class="brand"><div class="brand-dot">C</div><div><b>Customer Success CRM</b><span>Candidate-built Compyl operating prototype</span></div></div>'+
    '<div class="appbar-center">'+(c?'<span class="selected-account">'+e(c.name)+'</span>'+healthBadge(pp.health):'')+'</div>'+
    '<div class="appbar-actions">'+
      '<button class="btn ghost" data-action="reset">Reset demo</button>'+
      '<button class="btn ghost" data-action="theme">'+(theme==="dark"?"Light":"Dark")+'</button>'+
      '<button class="btn" data-action="application">Application</button>'+
    '</div></header>';
}
function accountRail(){
  const rows=accountRows();
  return '<aside class="account-rail">'+
    '<div class="rail-head"><div><b>Accounts</b><span>'+S.customers.length+' simulated</span></div><button class="square" data-action="new-account" title="Add account">+</button></div>'+
    '<label class="account-search"><span>⌕</span><input id="accountSearch" value="'+e(accountQuery)+'" placeholder="Find account"></label>'+
    '<div class="account-list">'+rows.map(c=>{
      const pp=p(c),active=S.customer&&S.customer.id===c.id;
      return '<button class="account-row '+(active?"active":"")+'" data-customer="'+e(c.id)+'">'+
        '<span class="avatar">'+e(initials(c.name))+'</span>'+
        '<span class="account-copy"><b>'+e(c.name)+'</b><small>'+e(pp.segment||c.industry||"Account")+'</small></span>'+
        '<span class="account-health '+healthClass(pp.health)+'" title="'+e(pp.health||"Unknown")+'"></span>'+
      '</button>';
    }).join("")+'</div>'+
    '<div class="rail-foot"><span class="demo-dot"></span> Synthetic portfolio · changes persist in this browser</div>'+
  '</aside>';
}
function accountHeader(){
  const c=current();if(!c)return '<div class="empty">No account selected.</div>';
  const pp=p(c),days=daysUntil(pp.renewalDate);
  return '<section class="account-head">'+
    '<div><div class="account-kicker">'+e(pp.segment||"Account")+' · '+e(c.industry||"Industry not set")+'</div><h1>'+e(c.name)+'</h1>'+
      '<div class="account-meta">'+healthBadge(pp.health)+statusBadge((pp.healthScore??"")+" / 100","neutral")+statusBadge(pp.renewalForecast+" forecast",pp.renewalForecast==="Commit"?"good":pp.renewalForecast==="Risk"?"bad":"warn")+'</div>'+
    '</div>'+
    '<div class="account-head-right">'+
      '<div class="renewal-chip"><span>Renewal</span><b>'+e(pp.renewalDate||"Not set")+'</b><small>'+(days==null?"":(days>=0?days+" days":"past due"))+'</small></div>'+
      '<button class="btn" data-action="edit-account">Edit account</button>'+
    '</div>'+
  '</section>'+
  '<nav class="tabs">'+
    tabButton("overview","Overview")+tabButton("tasks","Tasks")+tabButton("risks","Risks")+tabButton("people","People")+tabButton("renewal","Renewal")+tabButton("notes","Notes")+
  '</nav>';
}
function kpi(label,value,sub,cls=""){
  return '<article class="kpi '+cls+'"><span>'+e(label)+'</span><b>'+e(value)+'</b><small>'+e(sub||"")+'</small></article>';
}
function taskRow(r){
  const d=r.data||{},done=!open(d.status);
  return '<div class="work-row '+(done?"done":"")+'">'+
    '<button class="check" data-action="toggle-task" data-id="'+e(r.id)+'" title="'+(done?"Reopen":"Complete")+'">'+(done?"✓":"")+'</button>'+
    '<div class="work-copy"><b>'+e(d.title||"Untitled task")+'</b><small>'+e(d.owner||"Unassigned")+(d.due?" · due "+e(d.due):"")+'</small></div>'+
    statusBadge(d.status||"Open",done?"good":"neutral")+
    '<button class="row-menu" data-action="edit-record" data-id="'+e(r.id)+'">Edit</button>'+
  '</div>';
}
function riskRow(r){
  const d=r.data||{},closed=!open(d.escalationStatus);
  return '<div class="work-row">'+
    '<span class="risk-icon '+(closed?"closed":"open")+'">!</span>'+
    '<div class="work-copy"><b>'+e(d.title||"Untitled risk")+'</b><small>'+e(d.impact||d.mitigation||"No impact captured")+'</small></div>'+
    statusBadge(d.escalationStatus||"Open",closed?"good":"warn")+
    '<button class="row-menu" data-action="edit-record" data-id="'+e(r.id)+'">Edit</button>'+
  '</div>';
}
function personCard(r){
  const d=r.data||{};
  return '<article class="person-card"><div class="avatar large">'+e(initials(d.name))+'</div><div><b>'+e(d.name||"Unnamed stakeholder")+'</b><span>'+e(d.role||"Role not set")+'</span><small>'+e(d.decisionRole||d.status||"")+'</small></div><button class="row-menu" data-action="edit-record" data-id="'+e(r.id)+'">Edit</button></article>';
}
function noteRow(r){
  const d=r.data||{};
  return '<article class="note-card"><div class="note-top"><div><b>'+e(d.title||"Note")+'</b><span>'+e(d.status||r.provenance||"")+'</span></div><button class="row-menu" data-action="edit-record" data-id="'+e(r.id)+'">Edit</button></div><p>'+e(d.body||d.note||d.value||"")+'</p></article>';
}
function overview(){
  const c=current(),pp=p(c);
  const tasks=R("action").filter(r=>open(r.data?.status)).slice(0,5);
  const risks=R("risk").filter(r=>open(r.data?.escalationStatus)).slice(0,4);
  const people=R("stakeholder").slice(0,4);
  const milestones=R("milestone").filter(r=>open(r.data?.status)).slice(0,4);
  const renewal=R("renewal")[0]?.data||{};
  return '<div class="kpi-grid">'+
    kpi("Health",String(pp.healthScore??"—")+"/100",pp.health||"Not set","health-kpi")+
    kpi("Adoption",String(pp.adoption??"—")+"%","Core workflow usage")+
    kpi("ARR",money(pp.arr||0),pp.segment||"Segment not set")+
    kpi("Expansion",money(pp.expansionPotential||0),"Qualified potential")+
  '</div>'+
  '<div class="main-grid">'+
    '<section class="panel"><div class="panel-head"><div><h2>Next actions</h2><p>Work that needs an owner now.</p></div><button class="text-btn" data-action="add-task">+ Add task</button></div>'+
      (tasks.length?tasks.map(taskRow).join(""):'<div class="empty small">No open tasks.</div>')+
    '</section>'+
    '<section class="panel"><div class="panel-head"><div><h2>Account pulse</h2><p>What the CSM should know at a glance.</p></div><button class="text-btn" data-action="edit-account">Edit</button></div>'+
      '<dl class="pulse"><div><dt>Forecast</dt><dd>'+e(pp.renewalForecast||"Not set")+'</dd></div><div><dt>Sentiment</dt><dd>'+e(pp.sentiment||"Not set")+'</dd></div><div><dt>Primary risk</dt><dd>'+e(pp.risk||"None recorded")+'</dd></div><div><dt>Next action</dt><dd>'+e(pp.nextAction||"None recorded")+'</dd></div><div><dt>Next review</dt><dd>'+e(pp.nextReview||"Not set")+'</dd></div><div><dt>Products</dt><dd>'+e(pp.products||"Not set")+'</dd></div></dl>'+
    '</section>'+
    '<section class="panel"><div class="panel-head"><div><h2>Open risks</h2><p>Current blockers and recovery work.</p></div><button class="text-btn" data-action="add-risk">+ Add risk</button></div>'+
      (risks.length?risks.map(riskRow).join(""):'<div class="empty small">No open risks.</div>')+
    '</section>'+
    '<section class="panel"><div class="panel-head"><div><h2>Renewal</h2><p>Commercial plan tied to value.</p></div><button class="text-btn" data-action="edit-renewal">Edit renewal</button></div>'+
      '<div class="renewal-summary"><div><span>Date</span><b>'+e(pp.renewalDate||renewal.renewalDate||"Not set")+'</b></div><div><span>Forecast</span><b>'+e(pp.renewalForecast||"Not set")+'</b></div><div><span>Value proof</span><p>'+e(renewal.valueRealized||"Not recorded")+'</p></div><div><span>Plan</span><p>'+e(renewal.renewalPlan||"Not recorded")+'</p></div></div>'+
    '</section>'+
    '<section class="panel"><div class="panel-head"><div><h2>Stakeholders</h2><p>People who influence value and renewal.</p></div><button class="text-btn" data-action="add-person">+ Add person</button></div>'+
      '<div class="people-grid">'+(people.length?people.map(personCard).join(""):'<div class="empty small">No stakeholders.</div>')+'</div>'+
    '</section>'+
    '<section class="panel"><div class="panel-head"><div><h2>Milestones</h2><p>Outcome checkpoints still in motion.</p></div><button class="text-btn" data-action="add-milestone">+ Add milestone</button></div>'+
      (milestones.length?milestones.map(r=>'<div class="work-row"><span class="milestone-dot"></span><div class="work-copy"><b>'+e(r.data?.title||"Milestone")+'</b><small>'+e(r.data?.owner||"Unassigned")+(r.data?.due?" · "+e(r.data.due):"")+'</small></div>'+statusBadge(r.data?.status||"Planned","neutral")+'<button class="row-menu" data-action="edit-record" data-id="'+e(r.id)+'">Edit</button></div>').join(""):'<div class="empty small">No active milestones.</div>')+
    '</section>'+
  '</div>';
}
function listPage(kind,title,sub,addAction,renderRow){
  const rows=R(kind);
  return '<section class="page-panel"><div class="page-title"><div><h2>'+e(title)+'</h2><p>'+e(sub)+'</p></div><button class="btn" data-action="'+e(addAction)+'">+ Add</button></div><div class="list-body">'+(rows.length?rows.map(renderRow).join(""):'<div class="empty">Nothing recorded yet.</div>')+'</div></section>';
}
function tasksView(){return listPage("action","Tasks","Owned follow-up work for this account.","add-task",taskRow)}
function risksView(){return listPage("risk","Risks","Customer, product, commercial, and delivery risks.","add-risk",riskRow)}
function peopleView(){return listPage("stakeholder","Stakeholders","Sponsors, champions, users, blockers, and approvers.","add-person",personCard)}
function notesView(){return listPage("note","Notes","Account history, decisions, customer signals, and internal context.","add-note",noteRow)}
function renewalView(){
  const c=current(),pp=p(c),r=R("renewal")[0],d=r?.data||{};
  return '<section class="page-panel"><div class="page-title"><div><h2>Renewal</h2><p>Keep value proof, forecast, timing, and next commercial action in one place.</p></div><button class="btn" data-action="edit-renewal">Edit renewal</button></div>'+
    '<div class="renewal-page">'+
      '<div class="renewal-main"><div class="field-block"><span>Renewal date</span><b>'+e(pp.renewalDate||d.renewalDate||"Not set")+'</b></div><div class="field-block"><span>Forecast</span><b>'+e(pp.renewalForecast||"Not set")+'</b></div><div class="field-block"><span>ARR</span><b>'+money(pp.arr||0)+'</b></div><div class="field-block"><span>Expansion signal</span><b>'+money(pp.expansionPotential||0)+'</b></div></div>'+
      '<div class="renewal-detail"><h3>Value realized</h3><p>'+e(d.valueRealized||"Not recorded")+'</p><h3>Renewal plan</h3><p>'+e(d.renewalPlan||"Not recorded")+'</p><h3>Expansion signals</h3><p>'+e(d.expansionSignals||"Not recorded")+'</p><h3>Notes</h3><p>'+e(d.notes||"Not recorded")+'</p></div>'+
    '</div>'+
  '</section>';
}
function center(){
  if(!current())return '<main class="workspace"><div class="empty">No account selected.</div></main>';
  let body=overview();
  if(view==="tasks")body=tasksView();
  if(view==="risks")body=risksView();
  if(view==="people")body=peopleView();
  if(view==="renewal")body=renewalView();
  if(view==="notes")body=notesView();
  return '<main class="workspace">'+accountHeader()+'<div class="view-body">'+body+'</div></main>';
}
function rightRail(){
  const c=current();if(!c)return '<aside class="right-rail"></aside>';
  const pp=p(c),tasks=R("action").filter(r=>open(r.data?.status)),risks=R("risk").filter(r=>open(r.data?.escalationStatus)),days=daysUntil(pp.renewalDate);
  return '<aside class="right-rail">'+
    '<section><div class="rail-label">Quick add</div><div class="quick-grid"><button data-action="add-task">Task</button><button data-action="add-risk">Risk</button><button data-action="add-note">Note</button><button data-action="add-person">Person</button></div></section>'+
    '<section><div class="rail-label">Account</div><dl class="rail-dl"><div><dt>Owner</dt><dd>'+e(pp.owner||"CS")+'</dd></div><div><dt>Lifecycle</dt><dd>'+e(pp.lifecycle||c.stage||"Not set")+'</dd></div><div><dt>Open tasks</dt><dd>'+tasks.length+'</dd></div><div><dt>Open risks</dt><dd>'+risks.length+'</dd></div><div><dt>Renewal</dt><dd>'+(days==null?"Not set":days+" days")+'</dd></div></dl></section>'+
    '<section><div class="rail-label">Next action</div><p class="rail-next">'+e(pp.nextAction||"None recorded")+'</p><button class="btn full" data-action="edit-account">Update pulse</button></section>'+
    '<section class="rail-proof"><div class="rail-label">Candidate proof</div><p>This is the working CRM. The application narrative is secondary.</p><button class="text-btn" data-action="application">Open application →</button></section>'+
  '</aside>';
}
function applicationDrawer(){
  return '<div class="drawer-backdrop '+(drawerOpen?"open":"")+'" data-action="close-application"></div>'+
    '<aside class="application-drawer '+(drawerOpen?"open":"")+'" id="applicationDrawer">'+
      '<div class="drawer-head"><div><span>APPLICATION</span><h2>Why I built this</h2></div><button class="square" data-action="close-application">×</button></div>'+
      '<p>You asked for a zero-to-one Customer Success builder. The CRM behind this drawer is the answer: a small operating system that a team could actually use on day one, not a marketing mockup.</p>'+
      '<h3>Relevant operating evidence</h3>'+
      '<div class="proof-item"><b>20–40 named accounts · ≈$3M ARR</b><span>Portfolio ownership at Check Point / Avanan, with usable portfolio visibility improved from roughly 40% to 99%.</span></div>'+
      '<div class="proof-item"><b>Onboarding standardized to ≈1 month</b><span>At Dedrone, alongside approximately 25% higher engagement and approximately 20% higher renewals.</span></div>'+
      '<div class="proof-item"><b>Retention playbooks + operational discipline</b><span>Verified result: churn under 30% within one year and team efficiency improved 30%.</span></div>'+
      '<h3>What this CRM demonstrates</h3>'+
      '<ul><li>Portfolio segmentation and account ownership</li><li>Editable health, adoption, ARR, renewal forecast, and next action</li><li>Persistent tasks, risks, stakeholders, notes, milestones, and renewal plans</li><li>Simple operator workflow instead of dashboard theater</li><li>Synthetic data with visible provenance</li></ul>'+
      '<h3>Recent related proof</h3><p>'+external("https://dplrcrm.clintware.com","DPLR technical customer operating system")+' · '+external("https://renewnudge.clintware.com","RenewNudge")+' · '+external("https://clintware.com","Clintware")+'</p>'+
      '<p class="drawer-foot">Candidate-built prototype. No target-company logo. All default customer data is fictional simulation data.</p>'+
    '</aside>';
}
function render(){
  const app=document.getElementById("app");
  app.className="";
  app.innerHTML=appHeader()+'<div class="crm-shell">'+accountRail()+center()+rightRail()+'</div>'+applicationDrawer();
}
function field(name,label,value,type="text",extra=""){
  return '<label class="form-field"><span>'+e(label)+'</span><input name="'+e(name)+'" type="'+e(type)+'" value="'+e(value??"")+'" '+extra+'></label>';
}
function selectField(name,label,value,options){
  return '<label class="form-field"><span>'+e(label)+'</span><select name="'+e(name)+'">'+options.map(x=>'<option '+(String(x)===String(value)?"selected":"")+'>'+e(x)+'</option>').join("")+'</select></label>';
}
function textareaField(name,label,value){
  return '<label class="form-field wide"><span>'+e(label)+'</span><textarea name="'+e(name)+'" rows="4">'+e(value??"")+'</textarea></label>';
}
function openModal(title,body,onSubmit,submitLabel="Save"){
  const wrap=document.createElement("div");
  wrap.className="modal-layer";
  wrap.innerHTML='<div class="modal-backdrop" data-modal-close></div><form class="modal"><div class="modal-head"><h2>'+e(title)+'</h2><button type="button" class="square" data-modal-close>×</button></div><div class="modal-body">'+body+'</div><div class="modal-foot"><button type="button" class="btn ghost" data-modal-close>Cancel</button><button class="btn" type="submit">'+e(submitLabel)+'</button></div></form>';
  document.body.appendChild(wrap);
  const close=()=>wrap.remove();
  wrap.querySelectorAll("[data-modal-close]").forEach(x=>x.addEventListener("click",close));
  wrap.querySelector("form").addEventListener("submit",async ev=>{
    ev.preventDefault();
    const btn=wrap.querySelector('button[type="submit"]');btn.disabled=true;
    const data=Object.fromEntries(new FormData(ev.currentTarget).entries());
    try{await onSubmit(data);close()}catch(err){toast(err.message);btn.disabled=false}
  });
}
async function switchCustomer(id){
  await load(id);window.scrollTo({top:0,behavior:"smooth"});
}
async function patchCustomer(portfolio,data={}){
  const c=current();if(!c)return;
  await api("/customers/"+encodeURIComponent(c.id),{method:"PATCH",body:JSON.stringify({...data,portfolio})});
  await load(c.id);
}
async function createRecord(type,data){
  const c=current();if(!c)return;
  await api("/records",{method:"POST",body:JSON.stringify({customerId:c.id,type,provenance:"internal_record",data})});
  await load(c.id);
}
async function patchRecord(id,data){
  const c=current();
  await api("/records/"+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify({data,provenance:"internal_record"})});
  await load(c?.id);
}
async function archiveRecord(id){
  const c=current();
  await api("/records/"+encodeURIComponent(id),{method:"DELETE"});
  await load(c?.id);
}
function accountEditor(){
  const c=current(),pp=p(c);
  openModal("Edit account",'<div class="form-grid">'+
    selectField("segment","Segment",pp.segment||"Enterprise",["Strategic","Enterprise","Growth"])+
    selectField("health","Health",pp.health||"Watch",["Healthy","Watch","At Risk"])+
    field("healthScore","Health score",pp.healthScore??70,"number",'min="0" max="100"')+
    field("adoption","Adoption %",pp.adoption??0,"number",'min="0" max="100"')+
    field("arr","ARR",pp.arr??0,"number",'min="0" step="1000"')+
    field("expansionPotential","Expansion potential",pp.expansionPotential??0,"number",'min="0" step="1000"')+
    field("renewalDate","Renewal date",pp.renewalDate||"","date")+
    selectField("renewalForecast","Renewal forecast",pp.renewalForecast||"Likely",["Commit","Likely","Risk"])+
    selectField("sentiment","Sentiment",pp.sentiment||"Engaged",["Advocate","Engaged","Neutral","Concerned"])+
    field("owner","Owner",pp.owner||"CS Lead")+
    textareaField("risk","Primary risk",pp.risk||"")+
    textareaField("nextAction","Next action",pp.nextAction||"")+
    field("nextReview","Next review",pp.nextReview||"","date")+
  '</div>',async d=>{
    const numeric=["healthScore","adoption","arr","expansionPotential"];
    for(const k of numeric)d[k]=Number(d[k]||0);
    await patchCustomer(d);
    toast("Account updated");
  });
}
function taskEditor(r=null){
  const d=r?.data||{};
  openModal(r?"Edit task":"Add task",'<div class="form-grid">'+
    field("title","Task",d.title||"")+
    field("owner","Owner",d.owner||"Customer Success")+
    field("due","Due",d.due||"","date")+
    selectField("status","Status",d.status||"Open",["Open","In Progress","Planned","Done"])+
    field("audience","Audience",d.audience||"Internal")+
  '</div>',async x=>{
    if(r)await patchRecord(r.id,x);else await createRecord("action",x);
    toast(r?"Task updated":"Task added");
  });
}
function riskEditor(r=null){
  const d=r?.data||{};
  openModal(r?"Edit risk":"Add risk",'<div class="form-grid">'+
    field("title","Risk",d.title||"")+
    field("owner","Owner",d.owner||"Customer Success")+
    selectField("escalationStatus","Status",d.escalationStatus||"Open",["Open","Watch","Escalated","Closed"])+
    textareaField("impact","Impact",d.impact||"")+
    textareaField("mitigation","Mitigation",d.mitigation||"")+
    textareaField("nextDecision","Next decision",d.nextDecision||"")+
  '</div>',async x=>{
    if(r)await patchRecord(r.id,x);else await createRecord("risk",x);
    toast(r?"Risk updated":"Risk added");
  });
}
function personEditor(r=null){
  const d=r?.data||{};
  openModal(r?"Edit stakeholder":"Add stakeholder",'<div class="form-grid">'+
    field("name","Name",d.name||"")+
    field("role","Role",d.role||"")+
    field("organization","Organization",d.organization||current()?.name||"")+
    selectField("status","Relationship",d.status||"Engaged",["Advocate","Engaged","Neutral","Concerned","New sponsor"])+
    textareaField("decisionRole","Decision role",d.decisionRole||"")+
    textareaField("notes","Notes",d.notes||"")+
  '</div>',async x=>{
    if(r)await patchRecord(r.id,x);else await createRecord("stakeholder",x);
    toast(r?"Stakeholder updated":"Stakeholder added");
  });
}
function noteEditor(r=null){
  const d=r?.data||{};
  openModal(r?"Edit note":"Add note",'<div class="form-grid">'+
    field("title","Title",d.title||"")+
    selectField("status","Status",d.status||"Current",["Current","Proposed","Decision","Follow-up","Archived"])+
    textareaField("body","Note",d.body||d.note||"")+
    field("owner","Owner",d.owner||"Customer Success")+
  '</div>',async x=>{
    if(r)await patchRecord(r.id,x);else await createRecord("note",x);
    toast(r?"Note updated":"Note added");
  });
}
function milestoneEditor(r=null){
  const d=r?.data||{};
  openModal(r?"Edit milestone":"Add milestone",'<div class="form-grid">'+
    field("title","Milestone",d.title||"")+
    field("owner","Owner",d.owner||"Customer Success")+
    field("due","Due",d.due||"","date")+
    selectField("status","Status",d.status||"Planned",["Planned","In Progress","Blocked","Complete"])+
    textareaField("dependencies","Dependencies",d.dependencies||"")+
  '</div>',async x=>{
    if(r)await patchRecord(r.id,x);else await createRecord("milestone",x);
    toast(r?"Milestone updated":"Milestone added");
  });
}
function renewalEditor(){
  const c=current(),pp=p(c),r=R("renewal")[0],d=r?.data||{};
  openModal("Edit renewal",'<div class="form-grid">'+
    field("renewalDate","Renewal date",pp.renewalDate||d.renewalDate||"","date")+
    selectField("renewalForecast","Forecast",pp.renewalForecast||"Likely",["Commit","Likely","Risk"])+
    field("arr","ARR",pp.arr||0,"number",'min="0" step="1000"')+
    field("expansionPotential","Expansion potential",pp.expansionPotential||0,"number",'min="0" step="1000"')+
    textareaField("valueRealized","Value realized",d.valueRealized||"")+
    textareaField("renewalPlan","Renewal plan",d.renewalPlan||"")+
    textareaField("expansionSignals","Expansion signals",d.expansionSignals||"")+
    textareaField("notes","Notes",d.notes||"")+
  '</div>',async x=>{
    const portfolio={renewalDate:x.renewalDate,renewalForecast:x.renewalForecast,arr:Number(x.arr||0),expansionPotential:Number(x.expansionPotential||0)};
    await api("/customers/"+encodeURIComponent(c.id),{method:"PATCH",body:JSON.stringify({portfolio})});
    const recordData={renewalDate:x.renewalDate,arr:money(x.arr),valueRealized:x.valueRealized,renewalPlan:x.renewalPlan,expansionSignals:x.expansionSignals,notes:x.notes};
    if(r)await api("/records/"+encodeURIComponent(r.id),{method:"PATCH",body:JSON.stringify({data:recordData,provenance:"internal_record"})});
    else await api("/records",{method:"POST",body:JSON.stringify({customerId:c.id,type:"renewal",provenance:"internal_record",data:recordData})});
    await load(c.id);toast("Renewal updated");
  });
}
function newAccount(){
  openModal("Add account",'<div class="form-grid">'+field("name","Account name","")+field("industry","Industry","")+
    selectField("segment","Segment","Enterprise",["Strategic","Enterprise","Growth"])+field("arr","ARR",100000,"number",'min="0" step="1000"')+
  '</div>',async d=>{
    const x=await api("/customers",{method:"POST",body:JSON.stringify({name:d.name,industry:d.industry})});
    const id=x.customer.id;
    await api("/customers/"+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify({portfolio:{segment:d.segment,arr:Number(d.arr||0),health:"Watch",healthScore:70,adoption:0,automation:0,sentiment:"Engaged",expansionPotential:0,renewalForecast:"Likely",risk:"",lifecycle:"Onboarding",owner:"Customer Success",nextAction:"Define success plan",nextReview:""}})});
    await load(id);toast("Account added");
  },"Add account");
}
function editRecord(id){
  const r=(S.records||[]).find(x=>x.id===id);if(!r)return;
  if(r.type==="action")return taskEditor(r);
  if(r.type==="risk")return riskEditor(r);
  if(r.type==="stakeholder")return personEditor(r);
  if(r.type==="note")return noteEditor(r);
  if(r.type==="milestone")return milestoneEditor(r);
  toast("This record is read-only in the simplified view");
}
document.addEventListener("click",async ev=>{
  const customer=ev.target.closest("[data-customer]");
  if(customer){await switchCustomer(customer.dataset.customer);return}
  const v=ev.target.closest("[data-view]");
  if(v){view=v.dataset.view;localStorage.setItem("cpl-crm-view",view);render();return}
  const a=ev.target.closest("[data-action]");
  if(!a)return;
  const action=a.dataset.action,id=a.dataset.id;
  if(action==="theme"){theme=theme==="dark"?"light":"dark";localStorage.setItem("cpl-theme",theme);document.documentElement.dataset.theme=theme;render();return}
  if(action==="application"){drawerOpen=true;render();return}
  if(action==="close-application"){drawerOpen=false;render();return}
  if(action==="edit-account")return accountEditor();
  if(action==="new-account")return newAccount();
  if(action==="add-task")return taskEditor();
  if(action==="add-risk")return riskEditor();
  if(action==="add-person")return personEditor();
  if(action==="add-note")return noteEditor();
  if(action==="add-milestone")return milestoneEditor();
  if(action==="edit-renewal")return renewalEditor();
  if(action==="edit-record")return editRecord(id);
  if(action==="toggle-task"){
    const r=(S.records||[]).find(x=>x.id===id);if(!r)return;
    await patchRecord(id,{status:open(r.data?.status)?"Done":"Open"});toast(open(r.data?.status)?"Task completed":"Task reopened");return;
  }
  if(action==="reset"){
    a.disabled=true;
    try{await api("/customers/reset-samples",{method:"POST",body:"{}"});await load();toast("Synthetic CRM reset")}catch(err){toast(err.message)}finally{a.disabled=false}
  }
});
document.addEventListener("input",ev=>{
  if(ev.target?.id==="accountSearch"){
    accountQuery=ev.target.value;const pos=ev.target.selectionStart;render();const input=document.getElementById("accountSearch");if(input){input.focus();input.setSelectionRange(pos,pos)}
  }
});
load().catch(err=>{
  document.getElementById("app").innerHTML='<main class="fatal"><h1>CRM could not load</h1><p>'+e(err.message)+'</p><button class="btn" onclick="location.reload()">Retry</button></main>';
});
