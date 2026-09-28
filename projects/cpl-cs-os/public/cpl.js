const API="/api";
let S={customer:null,customers:[],records:[],access:{}};
let route=localStorage.getItem("cpl-route")||"command";
let searchText="";
let theme=localStorage.getItem("cpl-theme")||"light";
document.documentElement.dataset.theme=theme;

const NAV=[
  ["RUN",[["command","Command Center"],["portfolio","Portfolio"],["account","Account Workspace"]]],
  ["BUILD",[["segmentation","Segmentation"],["health","Health Engine"],["onboarding","Onboarding"],["renewal","Renewal + Growth"],["voc","Voice of Customer"]]],
  ["SCALE",[["playbooks","Playbooks"],["cadence","Operating Cadence"],["team","Team Build"],["tooling","Tooling Blueprint"]]],
  ["PROOF",[["proof","Why Me / Proof"]]]
];

const e=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n||0));
const pct=n=>Number(n||0).toFixed(1)+"%";
const p=c=>c&&c.portfolio?c.portfolio:{};
const hc=s=>String(s||"").toLowerCase().replace(/\s+/g,"-");
const daysUntil=d=>Math.ceil((new Date(d+"T12:00:00")-new Date())/86400000);
const external=(href,label)=>'<a href="'+e(href)+'" target="_blank" rel="noopener noreferrer">'+e(label)+'</a>';
async function api(path,opt){
  const r=await fetch(API+path,Object.assign({headers:{"content-type":"application/json"}},opt||{}));
  if(!r.ok){let x={};try{x=await r.json()}catch{}throw new Error(x.error||r.statusText)}
  return r.json();
}
async function load(id){
  const q=id?"?customer="+encodeURIComponent(id):"";
  S=await api("/state"+q);
  if(route==="account"&&!S.customer)route="command";
  render();
}
function recs(type){return (S.records||[]).filter(r=>r.type===type)}
function getTitle(r){
  const d=r.data||{};
  return d.title||d.name||d.metric||d.renewalDate||r.type;
}
function valueOf(d){
  for(const k of ["value","currentValue","status","renewalForecast","body","objective","impact","nextAction","notes"]){
    if(d&&d[k])return d[k];
  }
  return "";
}
function portfolio(){
  return (S.customers||[]).map(c=>Object.assign({customer:c},p(c))).filter(x=>x.segment);
}
function forecast(){
  const rows=portfolio();
  const total=rows.reduce((a,x)=>a+Number(x.arr||0),0);
  const retained=rows.reduce((a,x)=>{
    const f=x.renewalForecast==="Commit"?1:x.renewalForecast==="Likely"?.95:.75;
    return a+Number(x.arr||0)*f;
  },0);
  const weightedExpansion=rows.reduce((a,x)=>{
    const f=x.health==="Healthy"?.65:x.health==="Watch"?.4:.2;
    return a+Number(x.expansionPotential||0)*f;
  },0);
  const atRisk=rows.filter(x=>x.health==="At Risk").reduce((a,x)=>a+Number(x.arr||0),0);
  const pipeline=rows.reduce((a,x)=>a+Number(x.expansionPotential||0),0);
  const avg=rows.length?rows.reduce((a,x)=>a+Number(x.healthScore||0),0)/rows.length:0;
  return {total,grr:total?retained/total*100:0,nrr:total?(retained+weightedExpansion)/total*100:0,atRisk,pipeline,avg,rows};
}
function metric(label,value,detail){
  return '<section class="card metric"><div class="metric-label">'+e(label)+'</div><div class="metric-value">'+e(value)+'</div><div class="metric-detail">'+e(detail)+'</div></section>';
}
function badge(text,kind){
  return '<span class="badge '+e(kind||"")+'">'+e(text)+'</span>';
}
function health(h){
  return '<span class="health '+hc(h)+'"><span class="dot"></span>'+e(h)+'</span>';
}
function bar(v){
  const n=Math.max(0,Math.min(100,Number(v||0)));
  return '<div class="bar"><span style="width:'+n+'%"></span></div>';
}
function pageHead(eyebrow,title,sub,actions){
  return '<header class="page-head"><div><div class="eyebrow">'+e(eyebrow)+'</div><h1>'+e(title)+'</h1><p>'+e(sub)+'</p></div><div class="head-actions">'+(actions||"")+'</div></header>';
}
function topbar(){
  return '<header class="topbar">'+
    '<div class="wordmark"><b>CPL // CS OPERATING SYSTEM</b><span>Candidate-built zero-to-one Customer Success model</span></div>'+
    '<span class="pill synthetic">SYNTHETIC DEMO DATA</span>'+
    '<div class="topbar-spacer"></div>'+
    '<div class="top-actions">'+
      '<a class="btn desktop-only" href="https://jobs.ashbyhq.com/compyl/0bd65432-1911-430f-8666-f0aaab76fa0e" target="_blank" rel="noopener noreferrer">Role brief ↗</a>'+
      '<button class="btn desktop-only" data-action="reset">Reset demo</button>'+
      '<button class="icon-btn" data-action="theme" aria-label="Toggle theme">'+(theme==="dark"?"☀":"◐")+'</button>'+
      '<button class="btn letter-toggle" data-action="letter">Application</button>'+
    '</div></header>';
}
function nav(){
  let out='<aside class="side-nav" aria-label="Application navigation">';
  for(const g of NAV){
    out+='<div class="nav-group"><div class="nav-label">'+e(g[0])+'</div>';
    for(const item of g[1]){
      out+='<button class="nav-item '+(route===item[0]?"active":"")+'" data-route="'+e(item[0])+'">'+e(item[1])+'</button>';
    }
    out+='</div>';
  }
  out+='<div class="nav-foot"><b>Boundary</b><br>Candidate prototype. All account names, people, ARR, dates, health scores, and outcomes in the CRM are fictional simulation data.</div></aside>';
  return out;
}
function applicationNarrative(){
  return '<aside class="application-panel" id="applicationPanel" aria-label="Application Narrative">'+
    '<div class="eyebrow">Application Narrative</div>'+
    '<h2>You asked for a zero-to-one builder. This URL is my answer.</h2>'+
    '<p>Compyl is hiring a Director of Customer Success to build the function while staying close to customers, renewals, adoption, risk, expansion, data, tooling, and executive conversations. Rather than describe what I would build, I translated those requirements into the operating prototype beside this letter.</p>'+
    '<p>The system is intentionally more than a dashboard. It includes segmentation, coverage, explainable health scoring, onboarding and time-to-value, adoption, value, renewal forecasting, expansion signals, executive escalation, Voice of Customer, playbooks, operating cadence, team design, and a proposed systems architecture. The default portfolio is fictional so the operating model can be explored safely.</p>'+
    '<h3>Relevant evidence</h3>'+
    '<div class="letter-proof"><b>Portfolio ownership</b><p>At Check Point / Avanan, I managed 20–40 named accounts representing approximately $3M ARR. I improved usable portfolio visibility from roughly 40% to 99%.</p></div>'+
    '<div class="letter-proof"><b>Retention + operating discipline</b><p>Retention playbooks, proactive health checks, and risk workflows reduced churn to under 30% within one year while team efficiency improved 30%.</p></div>'+
    '<div class="letter-proof"><b>Onboarding + renewals</b><p>At Dedrone, I standardized enterprise onboarding to approximately one month. Customer engagement increased approximately 25%, and renewals improved approximately 20%.</p></div>'+
    '<p>My background combines Customer Success, customer operations, Support, cybersecurity, technical escalation, and cross-functional work with Sales, Product, and Engineering. That combination is directly relevant to a GRC company where customer outcomes depend on both executive value and operational execution.</p>'+
    '<h3>A recent proof point</h3>'+
    '<p>I recently built a role-specific Technical Customer Engineering operating system for another cybersecurity company. It turned a job specification into a working, persistent CRM with synthetic customer scenarios, preparation workflows, risk and escalation paths, value tracking, and production verification. '+external("https://dplrcrm.clintware.com","Open the recent case")+'.</p>'+
    '<p>This CPL build reuses the mature persistence, audit, security, and approval patterns from that work, then changes the operating model around the exact Customer Success responsibilities Compyl is hiring for.</p>'+
    '<h3>How I would use the first 90 days</h3>'+
    '<ul><li><b>0–30:</b> Baseline the portfolio, define segments and service levels, validate renewal exposure, instrument adoption and success criteria, and establish one source of operating truth.</li>'+
    '<li><b>31–60:</b> Put health, onboarding, renewal, escalation, and executive-review playbooks into use; establish forecast definitions and a closed Voice-of-Customer loop.</li>'+
    '<li><b>61–90:</b> Refine capacity and hiring needs from real portfolio data, tighten expansion qualification with Sales, and automate repeatable work while keeping judgment with the CSM.</li></ul>'+
    '<p>I also built '+external("https://renewnudge.clintware.com","RenewNudge")+', a working AI-powered Customer Success CRM for renewal tracking, health scoring, risk management, and retention workflows. I am not approaching this role with a slide about what Customer Success could become. I am showing the operating system I would start pressure-testing on day one.</p>'+
    '<hr class="letter-rule">'+
    '<p class="signature">Clinton Kosh</p>'+
    '<p>'+external("https://clintware.com","clintware.com")+'</p>'+
    '<p>This candidate prototype is not an official Compyl product. No Compyl logo is used. Public company and role context informed the proposed operating model; CRM account data is synthetic.</p>'+
  '</aside>';
}
function commandView(){
  const f=forecast();
  const priorities=f.rows.slice().sort((a,b)=>Number(a.healthScore)-Number(b.healthScore)).slice(0,5);
  const upcoming=f.rows.slice().sort((a,b)=>String(a.renewalDate).localeCompare(String(b.renewalDate))).slice(0,6);
  let q="";
  for(const x of priorities){
    q+='<div class="queue-item" data-customer="'+e(x.customer.id)+'"><div class="row between"><div class="queue-title">'+e(x.customer.name)+'</div>'+health(x.health)+'</div><div class="queue-meta">'+e(x.risk)+' · '+e(x.nextAction)+' · '+money(x.arr)+' ARR</div></div>';
  }
  let r="";
  for(const x of upcoming){
    r+='<div class="timeline-item" data-customer="'+e(x.customer.id)+'"><div class="row between"><div class="queue-title">'+e(x.customer.name)+'</div>'+badge(x.renewalForecast,x.renewalForecast==="Commit"?"green":x.renewalForecast==="Risk"?"red":"amber")+'</div><div class="queue-meta">'+e(x.renewalDate)+' · '+money(x.arr)+' · '+e(String(daysUntil(x.renewalDate)))+' days from today</div></div>';
  }
  return pageHead("Executive operating view","Customer Success Command Center","A simulated portfolio view built around retention, growth, customer value, and early risk visibility.",'<button class="btn blue" data-route="portfolio">Open portfolio</button>')+
    '<div class="grid metrics">'+
      metric("Simulated ARR",money(f.total),"12 fictional accounts · operating-model demonstration")+
      metric("Modeled GRR",pct(f.grr),"Scenario forecast, not a real company metric")+
      metric("Modeled NRR",pct(f.nrr),"Includes risk-weighted synthetic expansion")+
      metric("ARR at risk",money(f.atRisk),"Accounts currently marked At Risk")+
      metric("Expansion pipeline",money(f.pipeline),"Unweighted synthetic opportunity signals")+
      metric("Average health",f.avg.toFixed(0)+"/100","Explainable five-component health model")+
    '</div>'+
    '<div class="grid two">'+
      '<section class="card"><div class="row between"><div><h2>Intervention queue</h2><p class="card-sub">Lowest-health accounts first. Every item has a reason and next action.</p></div>'+badge("HUMAN REVIEW","blue")+'</div>'+q+'</section>'+
      '<section class="card"><h2>Renewal horizon</h2><p class="card-sub">Commercial timing stays connected to value, adoption, risk, and sponsor state.</p>'+r+'</section>'+
    '</div>'+
    '<section class="card section"><div class="row between"><div><h2>Build sequence</h2><p class="card-sub">What I would institutionalize first instead of adding process everywhere at once.</p></div>'+badge("0 → OPERATING RHYTHM","blue")+'</div>'+
      '<div class="flow"><div class="flow-card"><b>1 · Instrument</b><p>Portfolio, renewal dates, success outcomes, usage, stakeholders, support risk.</p></div><div class="flow-card"><b>2 · Focus</b><p>Segmentation, health, intervention triggers, onboarding milestones, renewal rules.</p></div><div class="flow-card"><b>3 · Prove</b><p>Executive value reviews, forecast definitions, risk closure, expansion qualification.</p></div><div class="flow-card"><b>4 · Scale</b><p>Playbooks, automation, capacity model, team hiring, repeatable Voice-of-Customer loop.</p></div></div>'+
    '</section>'+
    '<section class="card section"><div class="row between"><div><h2>Approval queue</h2><p class="card-sub">Automation can prepare the next action; a human retains authority.</p></div>'+badge("AI-PREPARED / HUMAN-APPROVED","blue")+'</div>'+
      '<div class="callout"><b>Prepared recommendation:</b> '+e((S.customer&&p(S.customer).nextAction)||"Select a portfolio account.")+' <button class="btn" data-action="approve" style="margin-left:8px">Approve into account record</button></div></section>';
}
function portfolioView(){
  const f=forecast();
  const q=searchText.trim().toLowerCase();
  const rows=f.rows.filter(x=>!q||[x.customer.name,x.customer.industry,x.segment,x.health,x.products,x.framework].join(" ").toLowerCase().includes(q)).sort((a,b)=>Number(b.arr)-Number(a.arr));
  let body="";
  for(const x of rows){
    body+='<tr data-customer="'+e(x.customer.id)+'"><td class="name-cell"><b>'+e(x.customer.name)+'</b><span>'+e(x.customer.industry)+'</span></td><td>'+badge(x.segment,"blue")+'</td><td>'+money(x.arr)+'</td><td>'+health(x.health)+' <span class="queue-meta">'+e(x.healthScore)+'/100</span></td><td><div class="row"><span>'+e(x.adoption)+'%</span><div style="width:72px">'+bar(x.adoption)+'</div></div></td><td>'+e(x.renewalDate)+'</td><td>'+badge(x.renewalForecast,x.renewalForecast==="Commit"?"green":x.renewalForecast==="Risk"?"red":"amber")+'</td><td>'+money(x.expansionPotential)+'</td><td>'+e(x.nextAction)+'</td></tr>';
  }
  return pageHead("Portfolio management","One operating view for every customer","Segment, commercial context, health, adoption, renewal posture, expansion signal, and next action are visible together.",'<button class="btn" data-action="reset">Reset synthetic data</button>')+
    '<div class="filter-row"><input class="search" id="portfolioSearch" value="'+e(searchText)+'" placeholder="Search account, segment, industry, framework…" aria-label="Search portfolio"><span class="badge">'+e(rows.length)+' accounts</span></div>'+
    '<div class="table-wrap"><table><thead><tr><th>Account</th><th>Segment</th><th>ARR</th><th>Health</th><th>Adoption</th><th>Renewal</th><th>Forecast</th><th>Expansion</th><th>Next action</th></tr></thead><tbody>'+body+'</tbody></table></div>'+
    '<div class="callout section"><b>Source-of-truth rule:</b> this portfolio is synthetic. In production, commercial fields would come from the revenue system, usage from product telemetry, cases from Support, and approved outcomes from the Customer Success workspace rather than duplicate manual entry.</div>';
}
function recordCard(r){
  const d=r.data||{};
  const keys=Object.keys(d).filter(k=>d[k]!==""&&d[k]!=null).slice(0,8);
  let kv="";
  for(const k of keys){
    if(["title","name"].includes(k))continue;
    const v=typeof d[k]==="object"?JSON.stringify(d[k]):String(d[k]);
    kv+='<div class="kv"><dt>'+e(k.replace(/([A-Z])/g," $1"))+'</dt><dd>'+e(v)+'</dd></div>';
  }
  return '<article class="record-card"><div class="record-type">'+e(r.type)+' · '+e(r.provenance)+'</div><h3>'+e(getTitle(r))+'</h3><div class="record-list">'+kv+'</div></article>';
}
function accountView(){
  const c=S.customer;
  if(!c)return pageHead("Account workspace","Select an account","Choose a portfolio account first.","");
  const pp=p(c);
  const records=(S.records||[]).filter(r=>!["document","raci","integration"].includes(r.type));
  let cards=records.map(recordCard).join("");
  return pageHead("Account workspace",c.name,"One customer record combining outcomes, adoption, stakeholders, risk, renewal posture, actions, and product feedback.",'<button class="btn" data-route="portfolio">Back to portfolio</button>')+
    '<section class="card account-hero"><div><div class="eyebrow">'+e(pp.segment||"Synthetic account")+'</div><h2>'+e(c.name)+'</h2><div class="kicker">'+e(c.industry)+' · '+e(c.stage)+'</div><div class="account-meta">'+health(pp.health)+badge(money(pp.arr)+" ARR","blue")+badge(pp.renewalForecast+" renewal",pp.renewalForecast==="Commit"?"green":pp.renewalForecast==="Risk"?"red":"amber")+badge(e(pp.sentiment||""))+'</div></div><div class="score-ring" style="--score:'+e(pp.healthScore||0)+'"><b>'+e(pp.healthScore||0)+'</b></div></section>'+
    '<div class="grid three section"><div class="mini-stat"><b>'+e(pp.adoption||0)+'%</b><span>Adoption</span></div><div class="mini-stat"><b>'+e(pp.automation||0)+'%</b><span>Automation coverage</span></div><div class="mini-stat"><b>'+money(pp.expansionPotential||0)+'</b><span>Expansion signal</span></div></div>'+
    '<section class="card section"><div class="row between"><div><h2>Current operating context</h2><p class="card-sub">Why this account needs attention and what happens next.</p></div>'+badge("SYNTHETIC","blue")+'</div><div class="grid two"><div><div class="eyebrow">Risk</div><p class="kicker">'+e(pp.risk)+'</p></div><div><div class="eyebrow">Next action</div><p class="kicker">'+e(pp.nextAction)+'</p></div></div></section>'+
    '<section class="section"><div class="row between" style="margin-bottom:10px"><div><h2 style="font-size:17px">Account records</h2><div class="kicker">Provenance remains visible so examples, proposals, and operator-approved records do not blur together.</div></div><button class="btn blue" data-action="approve">Approve prepared next action</button></div><div class="record-grid">'+cards+'</div></section>';
}
function segmentationView(){
  const f=forecast();
  const defs={
    Strategic:["Named CS lead + executive sponsorship","Monthly value/risk review","120-day renewal motion","High-touch onboarding / complex change"],
    Enterprise:["Named CSM","Monthly/bi-monthly outcome cadence","90-day renewal motion","Trigger-based executive intervention"],
    Growth:["Pooled or scaled coverage","Digital education + office hours","90-day renewal trigger","Human engagement from risk/value signals"]
  };
  let cards="";
  for(const seg of ["Strategic","Enterprise","Growth"]){
    const rows=f.rows.filter(x=>x.segment===seg),arr=rows.reduce((a,x)=>a+x.arr,0);
    cards+='<article class="matrix-card"><div class="eyebrow">'+e(seg)+'</div><div class="big">'+e(rows.length)+' accounts</div><div class="kicker">'+money(arr)+' simulated ARR</div><ul>'+defs[seg].map(x=>'<li>'+e(x)+'</li>').join("")+'</ul></article>';
  }
  return pageHead("Coverage design","Segmentation that changes the service motion","Segment is not a vanity label. It defines capacity, cadence, executive engagement, onboarding depth, and renewal lead time.","")+
    '<div class="matrix">'+cards+'</div>'+
    '<section class="card section"><h2>Capacity model</h2><p class="card-sub">Start with actual portfolio complexity, then hire against workload rather than arbitrary account counts.</p>'+
      '<div class="flow"><div class="flow-card"><b>Portfolio demand</b><p>ARR, product breadth, lifecycle, stakeholder complexity, risk, implementation load.</p></div><div class="flow-card"><b>Service design</b><p>Required human moments, digital motions, technical depth, executive cadence.</p></div><div class="flow-card"><b>Capacity signal</b><p>Hours and intervention load by segment; forecast where quality will break.</p></div><div class="flow-card"><b>Hiring trigger</b><p>Add role capacity only when demand and expected service level justify it.</p></div></div>'+
    '</section>';
}
function healthView(){
  const f=forecast();
  const weights=[["Adoption",30],["Outcomes / value",25],["Relationship",20],["Support / risk",15],["Commercial / renewal",10]];
  let w="";
  for(const x of weights)w+='<div class="weight-row"><span>'+e(x[0])+'</span>'+bar(x[1]*3.333)+'<strong>'+e(x[1])+'%</strong></div>';
  let rows="";
  for(const x of f.rows.slice().sort((a,b)=>a.healthScore-b.healthScore)){
    rows+='<tr data-customer="'+e(x.customer.id)+'"><td class="name-cell"><b>'+e(x.customer.name)+'</b><span>'+e(x.segment)+'</span></td><td>'+health(x.health)+'</td><td>'+e(x.healthScore)+'</td><td>'+e(x.adoption)+'%</td><td>'+e(x.sentiment)+'</td><td>'+e(x.risk)+'</td><td>'+e(x.nextAction)+'</td></tr>';
  }
  return pageHead("Health model","Explainable health, not a mystery number","The score creates attention and consistency. CSM judgment still owns the decision, reason, action, and review date.","")+
    '<div class="grid two"><section class="card"><h2>Proposed weights</h2><p class="card-sub">Tune only after correlating the components with real retention and expansion outcomes.</p>'+w+'</section>'+
    '<section class="card"><h2>Intervention bands</h2><p class="card-sub">Simple enough that every CSM can explain them.</p><div class="stack"><div class="mini-stat"><b style="color:var(--green)">80–100</b><span>Healthy · protect value and find earned advocacy / growth</span></div><div class="mini-stat"><b style="color:var(--amber)">65–79</b><span>Watch · named risk, owner, next action, review date</span></div><div class="mini-stat"><b style="color:var(--red)">&lt;65</b><span>At Risk · recovery plan and executive escalation where needed</span></div></div></section></div>'+
    '<div class="table-wrap section"><table><thead><tr><th>Account</th><th>Status</th><th>Score</th><th>Adoption</th><th>Sentiment</th><th>Primary risk</th><th>Next action</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function onboardingView(){
  return pageHead("Time to value","Onboarding built around customer outcomes","The first operating objective is not a completed checklist. It is the first customer-approved value milestone, with ownership and acceptance evidence.","")+
    '<section class="card"><div class="flow"><div class="flow-card"><b>1 · Handoff</b><p>Contracted scope, business case, promised timeline, stakeholders, assumptions, risk.</p></div><div class="flow-card"><b>2 · Success plan</b><p>Outcome, metric, baseline, target, source, owner, acceptance definition.</p></div><div class="flow-card"><b>3 · Configuration</b><p>Integrations and workflows mapped to the outcome, not setup for setup’s sake.</p></div><div class="flow-card"><b>4 · First value</b><p>Customer approves the first measurable milestone and next adoption objective.</p></div></div></section>'+
    '<div class="grid three section">'+
      '<article class="card"><h2>Kickoff gate</h2><p class="card-sub">No kickoff without a named business outcome, executive/operational ownership, and known dependencies.</p>'+badge("OWNER + OUTCOME","blue")+'</article>'+
      '<article class="card"><h2>30-day gate</h2><p class="card-sub">Working integration or workflow, measurable adoption baseline, blockers surfaced early.</p>'+badge("USAGE + BLOCKERS","blue")+'</article>'+
      '<article class="card"><h2>Value gate</h2><p class="card-sub">A customer-approved outcome, not an internal declaration that implementation is finished.</p>'+badge("CUSTOMER APPROVAL","blue")+'</article>'+
    '</div>'+
    '<section class="card section"><h2>Selected-account time-to-value evidence</h2><p class="card-sub">'+e(S.customer?S.customer.name:"Select an account")+'</p>'+recs("kpi").filter(r=>String(r.data&&r.data.name).toLowerCase().includes("time")).map(recordCard).join("")+'</section>';
}
function renewalView(){
  const f=forecast();
  const groups=["Commit","Likely","Risk"];
  let cols="";
  for(const g of groups){
    const rows=f.rows.filter(x=>x.renewalForecast===g).sort((a,b)=>String(a.renewalDate).localeCompare(String(b.renewalDate)));
    cols+='<article class="matrix-card"><div class="row between"><h3>'+e(g)+'</h3>'+badge(String(rows.length),g==="Commit"?"green":g==="Risk"?"red":"amber")+'</div><div class="stack" style="margin-top:8px">'+rows.map(x=>'<div class="queue-item" data-customer="'+e(x.customer.id)+'"><div class="queue-title">'+e(x.customer.name)+'</div><div class="queue-meta">'+e(x.renewalDate)+' · '+money(x.arr)+' · '+money(x.expansionPotential)+' expansion signal</div></div>').join("")+'</div></article>';
  }
  return pageHead("Retention + growth","Renewal forecasting tied to value evidence","GRR and NRR become operating outputs when every renewal has value proof, risks, stakeholders, forecast criteria, and an explicit next action.","")+
    '<div class="grid metrics">'+metric("Modeled GRR",pct(f.grr),"Commit 100% · Likely 95% · Risk 75% in this simulation")+metric("Modeled NRR",pct(f.nrr),"Retained base plus health-weighted synthetic expansion")+metric("Expansion pipeline",money(f.pipeline),"Qualification signal, not booked revenue")+'</div>'+
    '<div class="matrix">'+cols+'</div>'+
    '<section class="card section"><h2>120 / 90 / 60 / 30 operating motion</h2><div class="flow" style="margin-top:12px"><div class="flow-card"><b>120 days</b><p>Refresh outcomes, sponsor map, usage, open risk, value evidence.</p></div><div class="flow-card"><b>90 days</b><p>Executive proof, risk closure plan, preliminary forecast.</p></div><div class="flow-card"><b>60 days</b><p>Scope and commercial alignment; expansion only when value supports it.</p></div><div class="flow-card"><b>30 days</b><p>Decision path, close plan, blockers, executive escalation where necessary.</p></div></div></section>';
}
function vocView(){
  const selected=recs("note").filter(r=>/voice of customer/i.test(getTitle(r)));
  const f=forecast();
  const signals=f.rows.filter(x=>x.risk&&x.risk!=="Low").slice(0,8);
  return pageHead("Customer -> Product","Voice of Customer with evidence and closure","Feedback becomes more useful when it carries workflow, frequency, segment, ARR context, workaround, and the customer outcome at stake.","")+
    '<div class="grid two"><section class="card"><h2>Selected-account signal</h2><p class="card-sub">'+e(S.customer?S.customer.name:"Select an account")+'</p>'+(selected.length?selected.map(recordCard).join(""):'<div class="empty">No detailed signal loaded for this account.</div>')+'</section>'+
    '<section class="card"><h2>Pattern candidates</h2><p class="card-sub">Portfolio risks worth testing for recurrence before Product prioritization.</p>'+signals.map(x=>'<div class="signal-item"><div class="row between"><div class="queue-title">'+e(x.risk)+'</div>'+badge(x.segment,"blue")+'</div><div class="queue-meta">'+e(x.customer.name)+' · '+money(x.arr)+' · '+e(x.nextAction)+'</div></div>').join("")+'</section></div>'+
    '<section class="card section"><div class="flow"><div class="flow-card"><b>Capture</b><p>Customer workflow, evidence, business impact, workaround.</p></div><div class="flow-card"><b>Pattern</b><p>Account count, segments, recurring use case, ARR context.</p></div><div class="flow-card"><b>Decide</b><p>Product evaluates the pattern with strategy and engineering cost.</p></div><div class="flow-card"><b>Close loop</b><p>CS receives decision and returns rationale to affected customers.</p></div></div></section>';
}
function playbooksView(){
  const items=[
    ["01","Stalled onboarding","Trigger: milestone blocked >7 days or owner missing. Reconfirm outcome, isolate dependency, assign decision owner, preserve new target evidence."],
    ["02","Red-account recovery","Trigger: health <65. Name one recovery owner, business impact, 30-day action set, executive path, and exit criteria."],
    ["03","Executive sponsor change","Trigger: sponsor leaves/changes. Rebuild stakeholder map and re-approve success narrative before assuming renewal confidence."],
    ["04","Adoption decline","Trigger: material usage drop. Separate product access, workflow fit, role change, and value ambiguity before prescribing enablement."],
    ["05","120-day renewal","Trigger: renewal enters horizon. Refresh outcomes, usage, risk, sponsor map, forecast, commercial scope, and expansion qualification."],
    ["06","Expansion-ready","Trigger: healthy account + realized value + validated adjacent need. CS qualifies outcome; Sales owns commercial close."],
    ["07","Escalation","Trigger: customer-impacting blocker. Capture severity, owner, evidence, workaround, business impact, update cadence, and decision request."],
    ["08","Advocacy","Trigger: sustained value + advocate sentiment. Ask at the right moment for reference, case study, review, or peer connection."]
  ];
  return pageHead("Repeatable motions","Playbooks turn good judgment into a scalable system","Playbooks should reduce avoidable variance without forcing every customer into the same sequence.","")+
    '<div class="grid two">'+items.map(x=>'<article class="playbook"><div class="playbook-num">'+e(x[0])+'</div><div><h3>'+e(x[1])+'</h3><p>'+e(x[2])+'</p></div></article>').join("")+'</div>';
}
function cadenceView(){
  const rows=[
    ["Daily","Risk/event queue","New severe support issues, executive escalations, renewal blockers, stale ownerless actions."],
    ["Weekly","Portfolio + forecast review","Health changes, upcoming renewals, adoption drops, expansion qualification, next-action hygiene."],
    ["Biweekly","Sales / CS / Product loop","Handoffs, renewals, expansion, repeated customer patterns, decision closure."],
    ["Monthly","Executive CS operating review","GRR/NRR trend, churn reasons, forecast accuracy, TTV, adoption, CSAT/sentiment, capacity."],
    ["Quarterly","Model calibration","Segment thresholds, health correlation, playbook effectiveness, hiring/capacity assumptions."]
  ];
  return pageHead("Operating rhythm","Enough cadence to create control, not meeting debt","The function scales when the right decisions recur on purpose and the data required for those decisions is already visible.","")+
    '<section class="card">'+rows.map(x=>'<div class="timeline-item"><div class="row between"><div class="queue-title">'+e(x[0])+' · '+e(x[1])+'</div>'+badge("DECISION CADENCE","blue")+'</div><div class="queue-meta">'+e(x[2])+'</div></div>').join("")+'</section>'+
    '<section class="card section"><h2>Metrics with owners and definitions</h2><p class="card-sub">GRR, NRR, churn, expansion, time-to-value, adoption, health distribution, renewal forecast accuracy, sentiment/advocacy, and capacity. A metric without definition, source, owner, and cadence is not an operating metric.</p></section>';
}
function teamView(){
  return pageHead("Org design","Hire from the operating data","The first team structure should follow customer complexity and workload. The system should make the next hire obvious before quality degrades.","")+
    '<div class="flow"><div class="flow-card"><b>Director / builder</b><p>Own model, strategic accounts, forecast, escalations, cross-functional rhythm, hiring.</p></div><div class="flow-card"><b>Strategic CS</b><p>Complex high-value accounts, executive outcomes, multi-threading, renewal and growth.</p></div><div class="flow-card"><b>Enterprise / Growth CS</b><p>Scaled repeatable outcomes with trigger-based high-touch intervention.</p></div><div class="flow-card"><b>CS Ops / enablement</b><p>Data quality, automation, tooling, capacity, playbook governance, insight production.</p></div></div>'+
    '<div class="grid three section"><section class="card"><div class="eyebrow">0–30</div><h2>Baseline</h2><p class="card-sub">Map portfolio, service load, renewal exposure, gaps, customer moments, current tools.</p></section><section class="card"><div class="eyebrow">31–60</div><h2>Standardize</h2><p class="card-sub">Deploy health, playbooks, forecast rules, executive reviews, Voice-of-Customer loop.</p></section><section class="card"><div class="eyebrow">61–90</div><h2>Scale deliberately</h2><p class="card-sub">Use actual intervention volume and segment load to justify roles, ratios, and automation.</p></section></div>'+
    '<section class="card section"><div class="callout"><b>Hiring principle:</b> do not use a universal “accounts per CSM” number. Measure demand by segment, implementation load, product breadth, renewal concentration, technical complexity, and required executive moments, then set a service-level capacity target.</div></section>';
}
function toolingView(){
  return pageHead("Systems architecture","One operating truth, not another data island","Tool selection follows the operating model. Source systems keep authority; the CS layer brings the decision context together.","")+
    '<section class="card"><div class="arch"><div class="arch-box"><b>Authoritative systems</b><p>Revenue / commercial record<br>Product telemetry<br>Support / issue data<br>Billing / contract dates<br>Customer communications</p></div><div class="arch-arrow">→</div><div class="arch-box"><b>CS operating layer</b><p>Segment<br>Success plan<br>Health + reason<br>Risk + action<br>Renewal forecast<br>Expansion signal<br>Executive narrative</p></div><div class="arch-arrow">→</div><div class="arch-box"><b>Decision outputs</b><p>Intervention queue<br>Forecast review<br>QBR / EBR<br>Product patterns<br>Capacity plan<br>Executive metrics</p></div></div></section>'+
    '<div class="grid two section"><section class="card"><h2>Automation rule</h2><p class="card-sub">Automate retrieval, normalization, reminders, summaries, and draft recommendations. Keep human approval for customer commitments, health overrides, forecasts, renewal decisions, executive messages, and product promises.</p>'+badge("PREPARE → REVIEW → APPROVE","blue")+'</section>'+
    '<section class="card"><h2>Selection criteria</h2><p class="card-sub">API access, data model fit, identity/security, auditability, workflow flexibility, reporting, integration cost, operator adoption, and ability to avoid duplicating source truth.</p>'+badge("MODEL BEFORE VENDOR","blue")+'</section></div>'+
    '<section class="card section"><h2>Prototype boundary</h2><p class="card-sub">This demo uses a server-side Worker + Durable Objects SQLite foundation with same-origin mutation controls and an operator-owned control-plane binding. Provider credentials are not shipped to the browser. External bridges remain disabled in the no-login candidate demo.</p></section>';
}
function proofView(){
  return pageHead("Candidate evidence","The operating system is the application","The point of this build is to show how I turn ambiguous post-sales requirements into a working, measurable operating model.","")+
    '<div class="grid two">'+
      '<section class="card"><h2>Check Point / Avanan</h2><p class="card-sub">Verified application facts</p><div class="stack"><div class="mini-stat"><b>20–40</b><span>named accounts managed</span></div><div class="mini-stat"><b>≈ $3M ARR</b><span>portfolio represented</span></div><div class="mini-stat"><b>~40% → 99%</b><span>usable portfolio visibility</span></div><div class="mini-stat"><b>&lt;30%</b><span>churn within one year under the verified retention-workflow result</span></div><div class="mini-stat"><b>+30%</b><span>team efficiency in that operating model</span></div></div></section>'+
      '<section class="card"><h2>Dedrone</h2><p class="card-sub">Verified application facts</p><div class="stack"><div class="mini-stat"><b>≈ 1 month</b><span>standardized enterprise onboarding</span></div><div class="mini-stat"><b>+25%</b><span>customer engagement</span></div><div class="mini-stat"><b>+20%</b><span>renewals</span></div></div></section>'+
    '</div>'+
    '<section class="card section"><h2>Built proof, not hypothetical proof</h2><p class="card-sub">Two relevant working systems.</p><div class="grid two">'+
      '<div class="record-card"><div class="record-type">RECENT CYBERSECURITY CASE</div><h3>DPLR Technical Customer Engineering OS</h3><p>Role-specific persistent operating system with synthetic customer scenarios, technical workflows, risk, value, preparation, and production verification.</p><p>'+external("https://dplrcrm.clintware.com","Open dplrcrm.clintware.com ↗")+'</p></div>'+
      '<div class="record-card"><div class="record-type">CUSTOMER SUCCESS PRODUCT</div><h3>RenewNudge</h3><p>Working AI-powered Customer Success CRM for renewal tracking, health scoring, risk management, and retention workflows.</p><p>'+external("https://renewnudge.clintware.com","Open renewnudge.clintware.com ↗")+'</p></div>'+
    '</div></section>'+
    '<section class="card section"><h2>What this CPL build demonstrates</h2><p class="card-sub">I can take the public role requirements, identify the actual operating decisions underneath them, build the minimum system that supports those decisions, populate it with safe examples, and carry it through deployment and verification.</p><div class="callout">Candidate-built prototype · no target-company logo · all CRM account data synthetic · public role/product context separated from account truth.</div></section>';
}
function content(){
  if(route==="portfolio")return portfolioView();
  if(route==="account")return accountView();
  if(route==="segmentation")return segmentationView();
  if(route==="health")return healthView();
  if(route==="onboarding")return onboardingView();
  if(route==="renewal")return renewalView();
  if(route==="voc")return vocView();
  if(route==="playbooks")return playbooksView();
  if(route==="cadence")return cadenceView();
  if(route==="team")return teamView();
  if(route==="tooling")return toolingView();
  if(route==="proof")return proofView();
  return commandView();
}
function render(){
  const app=document.getElementById("app");
  app.className="";
  app.innerHTML=topbar()+'<div class="shell">'+nav()+'<main class="workspace" id="workspace">'+content()+'</main>'+applicationNarrative()+'</div>';
}
function toast(msg){
  const n=document.createElement("div");n.className="toast";n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),2200);
}
async function setCustomer(id){
  route="account";localStorage.setItem("cpl-route",route);await load(id);window.scrollTo({top:0,behavior:"smooth"});
}
document.addEventListener("click",async ev=>{
  const routeEl=ev.target.closest("[data-route]");
  if(routeEl){route=routeEl.dataset.route;localStorage.setItem("cpl-route",route);render();window.scrollTo({top:0,behavior:"smooth"});return}
  const row=ev.target.closest("[data-customer]");
  if(row){await setCustomer(row.dataset.customer);return}
  const act=ev.target.closest("[data-action]");
  if(!act)return;
  const action=act.dataset.action;
  if(action==="theme"){theme=theme==="dark"?"light":"dark";localStorage.setItem("cpl-theme",theme);document.documentElement.dataset.theme=theme;render()}
  if(action==="letter"){document.getElementById("applicationPanel")?.classList.toggle("open")}
  if(action==="reset"){
    act.disabled=true;
    try{await api("/customers/reset-samples",{method:"POST",body:"{}"});toast("Synthetic portfolio reset");await load()}catch(err){toast("Reset failed: "+err.message)}finally{act.disabled=false}
  }
  if(action==="approve"){
    if(!S.customer){toast("Select an account first");return}
    const next=p(S.customer).nextAction||"Review the account operating plan";
    act.disabled=true;
    try{
      await api("/records",{method:"POST",body:JSON.stringify({customerId:S.customer.id,type:"note",provenance:"internal_record",data:{title:"Human-approved next action",body:next,status:"Approved",approvedAt:new Date().toISOString(),owner:"Candidate demo operator",note:"Created from the candidate prototype approval queue."}})});
      toast("Approved into the account audit record");
      await load(S.customer.id);
    }catch(err){toast("Approval failed: "+err.message)}finally{act.disabled=false}
  }
});
document.addEventListener("input",ev=>{
  if(ev.target&&ev.target.id==="portfolioSearch"){searchText=ev.target.value;const pos=ev.target.selectionStart;render();const input=document.getElementById("portfolioSearch");if(input){input.focus();input.setSelectionRange(pos,pos)}}
});
load().catch(err=>{
  document.getElementById("app").innerHTML='<main class="loading-card"><div class="brand-mark">CPL // CS OPERATING SYSTEM</div><h1>Application could not load.</h1><p>'+e(err.message)+'</p><button class="btn" onclick="location.reload()">Retry</button></main>';
});
