/* DPLR presentation shell: N7 Customer Value OS interaction model with restrained Doppel accents. */
(()=>{
  const baseBody=body;
  const baseBind=bind;
  const baseDrawer=drawer;
  const basePersistence=persistenceBanner;

  if(!TABS.some(([id])=>id==='prep')) TABS.push(['prep','Call Prep']);
  if(!TABS.some(([id])=>id==='operating_model')) TABS.push(['operating_model','Operating Model']);
  const operateGroup=NAV_GROUPS.find(([label])=>label==='Operate');
  if(operateGroup&&!operateGroup[1].includes('prep')){
    const at=Math.max(0,operateGroup[1].indexOf('command')+1);
    operateGroup[1].splice(at,0,'prep');
  }
  const scaleGroup=NAV_GROUPS.find(([label])=>label==='Scale');
  if(scaleGroup&&!scaleGroup[1].includes('operating_model')) scaleGroup[1].unshift('operating_model');

  const sourceType=c=>c?.isPublicReference||c?.provenance==='public_research'?'public':(c?.isSynthetic||c?.provenance==='synthetic_sample'||/synthetic/i.test(c?.nameStatus||''))?'synthetic':'workspace';
  const sourceLabel=c=>sourceType(c)==='public'?'Public reference':sourceType(c)==='synthetic'?'Synthetic training':'Workspace data';
  const openLike=x=>!/(closed|resolved|done|complete|archived)/i.test(String(x||''));
  const countOpen=(type,field='status')=>R(type).filter(r=>openLike(r.data?.[field])).length;
  const aiResearchReady=()=>Boolean(I?.ai?.research?.configured);
  const currentLabel=()=>TABS.find(([id])=>id===tab)?.[1]||'Workspace';
  const portfolioView=()=>{try{return localStorage.getItem('dplrPortfolioView')==='tiles'?'tiles':'list'}catch{return 'list'}};
  const setPortfolioView=v=>{try{localStorage.setItem('dplrPortfolioView',v==='tiles'?'tiles':'list')}catch{}};

  function appHeader(){
    const auth=S.access?.authenticated===true;
    const opts=S.customers.length?S.customers.map(c=>'<option value="'+e(c.id)+'" '+(S.customer&&c.id===S.customer.id?'selected':'')+'>'+(c.isGoldenExample?'★ ':'')+e(c.name)+'</option>').join(''):'<option value="">No customers</option>';
    return '<header class="dplr-appbar">'+
      '<div class="dplr-brand"><span class="dplr-mark" aria-hidden="true">D</span><span><strong>Technical Customer Engineering</strong><small>Customer OS · candidate operating prototype</small></span></div>'+
      '<nav class="dplr-primary" aria-label="Primary"><button data-tab="customers" '+(tab==='customers'?'class="active"':'')+'>Portfolio</button><button data-tab="command" '+(tab==='command'?'class="active"':'')+'>Command Center</button></nav>'+
      '<div class="dplr-header-tools">'+
        '<label class="dplr-search"><span class="sr-only">Find customer</span><input id="dplr-search" type="search" placeholder="Find customer…" autocomplete="off"></label>'+
        '<select id="cust" class="select dplr-customer-select" aria-label="Selected customer" '+(S.customers.length?'':'disabled')+'>'+opts+'</select>'+
        '<span class="dplr-chip '+(aiResearchReady()?'ok':'neutral')+'">'+(aiResearchReady()?'Exa ready':'Research pending')+'</span>'+
        '<span class="dplr-chip '+(auth?'ok':'guest')+'">'+(auth?'SSO durable':'Guest session')+'</span>'+
        '<details class="dplr-more"><summary aria-label="Workspace tools">•••</summary><div class="dplr-menu">'+
          '<button id="whatif">Scenario overlay'+(scen.size?' · '+scen.size:'')+'</button><button id="export">Export backup</button>'+
          '<label>Theme<select id="theme" class="select"><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label>'+
          (auth?'<form method="post" action="/auth/logout"><button type="submit">Sign out</button></form>':'<a href="/auth/login">Sign in for durable workspace</a>')+
        '</div></details>'+
      '</div></header>';
  }

  function breadcrumb(){
    return '<div class="dplr-contextbar"><div class="dplr-crumbs"><button data-tab="customers">Customer Portfolio</button><span>›</span>'+(S.customer&&tab!=='customers'?'<button data-tab="command">'+e(S.customer.name)+'</button><span>›</span>':'')+'<strong>'+e(currentLabel())+'</strong></div><div class="dplr-context-actions"><button class="btn" id="newc">Add customer</button><button class="btn primary" id="import">Import</button></div></div>';
  }

  function leftNav(){
    const byId=new Map(TABS.map(x=>[x[0],x]));
    return '<aside class="dplr-left"><div class="dplr-account-mini">'+(S.customer?'<div class="dplr-source '+sourceType(S.customer)+'">'+e(sourceLabel(S.customer))+'</div><strong>'+e(S.customer.name)+'</strong><span>'+e(S.customer.stage||'Stage not recorded')+'</span>':'<strong>No customer selected</strong><span>Choose an account from Portfolio.</span>')+'</div><nav aria-label="Customer workspace">'+NAV_GROUPS.map(([label,ids])=>'<section><h3>'+e(label)+'</h3>'+ids.map(id=>{const t=byId.get(id);return t?'<button data-tab="'+e(id)+'" '+(tab===id?'class="active" aria-current="page"':'')+'>'+e(t[1])+'</button>':''}).join('')+'</section>').join('')+'</nav></aside>';
  }

  function rightRail(){
    if(!S.customer)return '<aside class="dplr-right"><section><h3>Workspace</h3><p>Select a customer to expose technical context, risks, integrations, stakeholders, and actions.</p></section></aside>';
    const risks=countOpen('risk','escalationStatus');
    const incidents=countOpen('incident');
    const engineering=countOpen('engineering_issue');
    const integrations=R('integration').length;
    const stakeholders=R('stakeholder').length;
    const actions=R('action').filter(r=>openLike(r.data?.status)).slice(0,4);
    const d=typeof deploymentState==='function'?deploymentState():{pct:0,label:'Not recorded'};
    return '<aside class="dplr-right">'+
      '<section><div class="dplr-rail-label">Account context</div><h2>'+e(S.customer.name)+'</h2><div class="dplr-source '+sourceType(S.customer)+'">'+e(sourceLabel(S.customer))+'</div><dl><div><dt>Stage</dt><dd>'+e(S.customer.stage||'Not recorded')+'</dd></div><div><dt>Technical progress</dt><dd>'+e(d.pct)+'%</dd></div><div><dt>Current work</dt><dd>'+e(d.label||'Not recorded')+'</dd></div></dl></section>'+
      '<section><div class="dplr-rail-label">Technical pulse</div><div class="dplr-mini-grid"><button data-tab="risks"><b>'+risks+'</b><span>open risks</span></button><button data-tab="triage"><b>'+incidents+'</b><span>investigations</span></button><button data-tab="issues"><b>'+engineering+'</b><span>eng handoffs</span></button><button data-tab="handoff"><b>'+integrations+'</b><span>integrations</span></button></div></section>'+
      '<section><div class="dplr-rail-label">People & ownership</div><button class="dplr-rail-link" data-tab="meetings">'+stakeholders+' stakeholders <span>→</span></button><button class="dplr-rail-link" data-tab="raci">Open RACI <span>→</span></button></section>'+
      '<section><div class="dplr-rail-label">Next actions</div>'+(actions.length?actions.map(r=>'<button class="dplr-action" data-edit="'+e(r.id)+'"><strong>'+e(r.data.title||'Action')+'</strong><span>'+e(r.data.owner||'Unassigned')+(r.data.due?' · '+e(r.data.due):'')+'</span></button>').join(''):'<p>No open actions recorded.</p>')+'<div class="dplr-quick"><button class="btn" data-add="risk">+ Risk</button><button class="btn" data-add="stakeholder">+ Stakeholder</button><button class="btn" data-add="action">+ Action</button></div></section>'+
      '</aside>';
  }

  function pager(){
    const ids=TABS.map(x=>x[0]).filter(x=>!['customers','accounts'].includes(x));
    const i=ids.indexOf(tab);if(i<0)return '';
    const prev=i>0?TABS.find(x=>x[0]===ids[i-1]):null,next=i<ids.length-1?TABS.find(x=>x[0]===ids[i+1]):null;
    return '<div class="dplr-pager">'+(prev?'<button data-tab="'+e(prev[0])+'"><small>Previous</small><strong>← '+e(prev[1])+'</strong></button>':'<span></span>')+(next?'<button data-tab="'+e(next[0])+'"><small>Next</small><strong>'+e(next[1])+' →</strong></button>':'')+'</div>';
  }

  head=function(k,t,s,a=''){
    return '<div class="dplr-section-head"><div><div class="dplr-kicker">'+e(k)+'</div><h1>'+e(t)+'</h1><p>'+e(s)+'</p></div>'+(a?'<div class="actions">'+a+'</div>':'')+'</div>';
  };

  table=function(type,cols){
    const q=R(type);if(!q.length)return '<div class="empty">No '+e(type.replaceAll('_',' '))+' records yet.</div>';
    return '<div class="tablewrap"><table class="table dplr-clickable"><thead><tr>'+cols.map(c=>'<th>'+e(c[1])+'</th>').join('')+'<th>Source</th><th></th></tr></thead><tbody>'+q.map(r=>'<tr data-row-edit="'+e(r.id)+'">'+cols.map(c=>'<td>'+e(r.data[c[0]]||'Not provided')+'</td>').join('')+'<td><span class="prov">'+e(P(r.provenance))+'</span></td><td><div class="actions"><button class="btn" data-edit="'+e(r.id)+'">Edit</button><button class="btn" data-del="'+e(r.id)+'">Archive</button></div></td></tr>').join('')+'</tbody></table></div>';
  };

  persistenceBanner=function(){
    const auth=S.access?.authenticated===true;
    return '<div class="dplr-persistence '+(auth?'saved':'guest')+'"><div><strong>'+(auth?'Durable SSO workspace':'Guest session workspace')+'</strong><span>'+(auth?'This account workspace persists across sessions and devices.':'No login is required. Guest records are scoped to this browser session and do not automatically migrate into the signed-in workspace.')+'</span></div>'+(auth?'':'<a class="btn primary" href="/auth/login">Sign in for durable workspace</a>')+'</div>';
  };

  customers=function(){
    const publicCount=S.customers.filter(c=>sourceType(c)==='public').length;
    const syntheticCount=S.customers.filter(c=>sourceType(c)==='synthetic').length;
    const userCount=S.customers.filter(c=>sourceType(c)==='workspace').length;
    const auth=S.access?.authenticated===true;
    const view=portfolioView();
    const cards=S.customers.map(c=>{
      const type=sourceType(c),facts=c.facts||{},sourceUrl=type==='public'?safeUrl(c.sourceFile):'';
      return '<article class="dplr-customer" data-customer-open="'+e(c.id)+'"><div class="dplr-card-top"><div><span class="dplr-source '+type+'">'+e(sourceLabel(c))+'</span><h2>'+e(c.name)+'</h2><p>'+e(c.industry||'Industry not recorded')+'</p></div><span class="dplr-stage">'+e(c.stage||'Unstaged')+'</span></div><div class="dplr-customer-grid"><div><span>Use case</span><strong>'+e(facts.product||facts.businessGoal||facts.users||'Not recorded')+'</strong></div><div><span>Timeline</span><strong>'+e(facts.committedTimeline||'Not recorded')+'</strong></div><div><span>Success target</span><strong>'+e(facts.roiTarget||facts.successMetrics||'Not recorded')+'</strong></div><div><span>Current systems</span><strong>'+e(facts.currentSystems||'Discovery required')+'</strong></div></div>'+(sourceUrl?'<a class="dplr-source-link" href="'+e(sourceUrl)+'" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">Open public source ↗</a>':'')+'</article>';
    }).join('');
    return head('Customer portfolio','Customer Portfolio','Operational accounts and training scenarios. Public Doppel references are labeled separately from synthetic or workspace data.','<div class="dplr-view-toggle" role="group" aria-label="Customer view"><button class="btn '+(view==='list'?'active':'')+'" data-portfolio-view="list" aria-pressed="'+(view==='list')+'">List</button><button class="btn '+(view==='tiles'?'active':'')+'" data-portfolio-view="tiles" aria-pressed="'+(view==='tiles')+'">Tiles</button></div><button class="btn primary" id="import-customers">Import customer</button><button class="btn" id="newc2">Add customer</button>')+
      '<div class="dplr-kpis"><article><span>Total accounts</span><b>'+S.customers.length+'</b><small>current workspace</small></article><article><span>Public references</span><b>'+publicCount+'</b><small>Doppel-published evidence only</small></article><article><span>Synthetic scenarios</span><b>'+syntheticCount+'</b><small>clearly labeled training data</small></article><article><span>Retention</span><b class="text">'+(auth?'SSO durable':'Guest session')+'</b><small>'+userCount+' user/imported account'+(userCount===1?'':'s')+'</small></article></div>'+persistenceBanner()+'<div class="dplr-portfolio-grid '+view+'" data-portfolio-layout="'+view+'">'+(cards||'<div class="empty">No customers yet. Import a customer or populate the curated demo from Data & Persistence.</div>')+'</div>';
  };

  accounts=function(){
    const golden=S.customers.find(c=>c.isGoldenExample),auth=S.access?.authenticated===true;
    return head('Workspace administration','Data & Persistence','Control the dataset explicitly. Demo population, cleanup, import, and retention are separate operations.','<button class="btn primary" id="reset-samples">Populate / refresh demo data</button><button class="btn" id="import-customers">Import customer data</button>')+
      persistenceBanner()+
      '<div class="dplr-admin-grid"><article><span>Workspace mode</span><strong>'+(auth?'Signed in / durable':'Guest / session-scoped')+'</strong><p>'+(auth?'Changes remain in the authenticated DPLR workspace.':'Closing the session can remove access to guest data. Signing in opens the durable account workspace; it does not silently migrate guest records.')+'</p></article><article><span>Golden scenario</span><strong>'+e(golden?.name||'Removed')+'</strong><p>Protected during standard cleanup and restorable with Populate / refresh.</p></article><article><span>External credentials</span><strong>Server-side only</strong><p>Exa, Jira, Confluence, AI, and other provider credentials stay behind the Clintware control plane.</p></article></div>'+
      '<section class="dplr-data-controls"><div><h2>Dataset controls</h2><p>Clear operations apply only to the current workspace. They do not delete provider credentials or another user workspace.</p></div><div class="actions"><button class="btn" id="clear-non-golden">Clear all except golden</button><label class="override"><input type="checkbox" id="override-golden"> Allow golden removal</label><button class="btn danger" id="clear-all">Clear all data</button></div></section>'+
      '<div class="section"><h2>Current accounts</h2></div><div class="tablewrap"><table class="table"><thead><tr><th>Customer</th><th>Data type</th><th>Stage</th><th>Source</th></tr></thead><tbody>'+S.customers.map(c=>'<tr><td><strong>'+e(c.name)+'</strong>'+(c.isGoldenExample?'<div class="prov">Golden scenario</div>':'')+'</td><td>'+e(sourceLabel(c))+'</td><td>'+e(c.stage||'Not recorded')+'</td><td>'+e(c.sourceFile||c.provenance||'Internal')+'</td></tr>').join('')+'</tbody></table></div>';
  };

  command=function(){
    if(!S.customer)return customers();
    const d=typeof deploymentState==='function'?deploymentState():{pct:0,label:'Not recorded',done:0,total:0};
    const k=R('kpi')[0],risk=R('risk').find(r=>openLike(r.data?.escalationStatus))||R('risk')[0];
    const active=R('incident').filter(r=>openLike(r.data?.status));
    const actions=R('action').filter(r=>openLike(r.data?.status)).slice(0,5);
    return head('Account command center',S.customer.name,'A compact operating view for advanced investigation, Technical Services, handoffs, customer outcomes, and work that should shift left.')+
      '<div class="dplr-kpis account"><article><span>Technical progress</span><b>'+d.pct+'%</b><small>'+e(d.label)+'</small></article><article><span>Open investigations</span><b>'+active.length+'</b><small>evidence-first triage</small></article><article><span>Open risks</span><b>'+countOpen('risk','escalationStatus')+'</b><small>owned + decision-ready</small></article><article><span>Value target</span><b class="text">'+e(k?.data?.target||S.customer.facts?.roiTarget||'Not recorded')+'</b><small>customer-approved evidence required</small></article></div>'+
      '<div class="dplr-workstream"><article><span>01</span><div><strong>Advanced Investigations</strong><p>Reproduce, isolate, establish expected vs actual, then resolve or route.</p></div><button data-tab="triage">Open →</button></article><article><span>02</span><div><strong>Technical Services</strong><p>APIs, auth, SSO, SIEM, reporting, configuration, and scoped delivery.</p></div><button data-tab="implementation">Open →</button></article><article><span>03</span><div><strong>Engineering Handoff</strong><p>Only reproducible product behavior with evidence and a bounded Engineering ask.</p></div><button data-tab="issues">Open →</button></article><article><span>04</span><div><strong>Support Scale</strong><p>Convert repeatable work into playbooks, training, automation, or self-service.</p></div><button data-tab="adoption">Open →</button></article></div>'+
      '<div class="dplr-two"><section class="dplr-panel"><div class="dplr-panel-head"><h2>Current risk</h2><button data-tab="risks">All risks</button></div><strong>'+e(risk?.data?.title||'No open risk recorded')+'</strong><p>'+e(risk?.data?.mitigation||'Record risk ownership and mitigation when identified.')+'</p></section><section class="dplr-panel"><div class="dplr-panel-head"><h2>Next actions</h2><button data-add="action">+ Add</button></div>'+(actions.length?actions.map(r=>'<button class="dplr-list-row" data-edit="'+e(r.id)+'"><span><strong>'+e(r.data.title||'Action')+'</strong><small>'+e(r.data.owner||'Unassigned')+'</small></span><b>'+e(r.data.status||'Open')+'</b></button>').join(''):'<p>No open actions recorded.</p>')+'</section></div>';
  };

  function operatingModel(){
    const routes=[
      ['Alert / workflow mismatch','Advanced Investigations','TCE reproduces one canonical example, removes customer-side transforms, compares expected vs actual, resolves or creates an evidence-complete specialist handoff.','triage'],
      ['SSO / identity failure','Technical Services','TCE validates IdP configuration, groups, roles, tenant boundaries and permissions. Customer IAM owns customer configuration; non-standard architecture is bounded before SA review.','implementation'],
      ['API / SIEM / data flow','Technical Services','Define auth, schema, mapping, freshness, dedupe, retries and downstream transforms before calling behavior a product defect.','deployment'],
      ['Customer-facing reporting','TCE + Customer Success','Define metric contract and source of truth. TCE owns technical delivery; CSM retains commercial and outcome ownership.','roi'],
      ['Recurring advanced request','Support Scale','Turn solved patterns into diagnostics, playbooks, training, automation or self-service and measure the shift-left result.','adoption'],
      ['Custom architecture request','Solutions Architecture boundary','TCE validates need and supported options, then hands SA a bounded architecture decision with known constraints.','issues']
    ];
    const teams=[
      ['Frontline Support','Known issues, standard diagnostics','Graduated playbooks + clear escalation criteria'],
      ['Customer Success','Commercial ownership, customer outcomes, stakeholder cadence','Technical risk translated into customer decisions'],
      ['Technical Customer Engineering','Advanced investigation through resolution or clean handoff','Facts, evidence, technical delivery, reusable capability'],
      ['Solutions Architecture','Non-standard architecture decisions','Bounded design problem + validated constraints'],
      ['Product','Product decisions and recurring friction','Frequency, impact, evidence, expected behavior gap'],
      ['Engineering','Code-level reproducible defects','Repro, logs, expected vs actual, scope, workaround, business impact'],
      ['Enablement','Readiness and knowledge distribution','Validated runbooks + graduation criteria']
    ];
    return head('Scale the function','Operating Model','Route each complex customer problem through the same evidence and ownership discipline without erasing team boundaries.')+
      '<div class="dplr-flow"><div><b>1</b><span><strong>Intake</strong>Support / CSM identifies a complex need.</span></div><i>→</i><div><b>2</b><span><strong>Establish facts</strong>TCE reproduces and isolates behavior.</span></div><i>→</i><div><b>3</b><span><strong>Resolve or route</strong>Deliver, resolve, or hand off with evidence.</span></div><i>→</i><div><b>4</b><span><strong>Shift left</strong>Convert recurring work into reusable capability.</span></div></div>'+
      '<div class="section"><h2>Scenario routing</h2></div><div class="tablewrap"><table class="table"><thead><tr><th>Customer problem</th><th>Primary motion</th><th>TCE operating response</th><th></th></tr></thead><tbody>'+routes.map(r=>'<tr><td><strong>'+e(r[0])+'</strong></td><td>'+e(r[1])+'</td><td>'+e(r[2])+'</td><td><button class="btn" data-tab="'+e(r[3])+'">Open</button></td></tr>').join('')+'</tbody></table></div>'+
      '<div class="section"><h2>Internal team contract</h2></div><div class="tablewrap"><table class="table"><thead><tr><th>Team</th><th>Primary ownership</th><th>What this OS should give them</th></tr></thead><tbody>'+teams.map(r=>'<tr><td><strong>'+e(r[0])+'</strong></td><td>'+e(r[1])+'</td><td>'+e(r[2])+'</td></tr>').join('')+'</tbody></table></div>'+
      '<div class="dplr-scale-rule"><strong>Scale rule</strong><p>Do not optimize for how many cases TCE personally touches. Optimize customer resolution quality, specialist handoff quality, and the percentage of recurring technical work converted into frontline or self-service capability.</p></div>';
  }

  body=function(){
    if(tab==='prep'&&window.DPLRPrep)return window.DPLRPrep.view();
    return tab==='operating_model'?operatingModel():baseBody();
  };

  function bindShell(){
    const search=document.querySelector('#dplr-search');
    if(search){search.onkeydown=ev=>{if(ev.key!=='Enter')return;const q=search.value.trim().toLowerCase();if(!q)return;const match=S.customers.find(c=>String(c.name||'').toLowerCase().includes(q)||String(c.industry||'').toLowerCase().includes(q));if(match){tab='command';void load(match.id)}else{search.setCustomValidity('No matching customer');search.reportValidity();setTimeout(()=>search.setCustomValidity(''),1200)}}}
    document.querySelectorAll('[data-row-edit]').forEach(row=>row.onclick=ev=>{if(ev.target.closest('button,a,input,select,textarea,label'))return;const rec=S.records.find(x=>x.id===row.dataset.rowEdit);if(rec)edit(rec.type,rec)});
    document.querySelectorAll('.kanban-card[data-card]').forEach(card=>card.onclick=ev=>{if(ev.target.closest('button,a,input,select,textarea,label'))return;const rec=S.records.find(x=>x.id===card.dataset.card);if(rec)edit(rec.type,rec)});
    document.querySelectorAll('.stakeholder-card').forEach(card=>card.onclick=ev=>{if(ev.target.closest('button,a,input,select,textarea,label'))return;const b=card.querySelector('[data-edit]'),rec=b?S.records.find(x=>x.id===b.dataset.edit):null;if(rec)edit(rec.type,rec)});
    document.querySelectorAll('[data-portfolio-view]').forEach(btn=>btn.onclick=()=>{
      const view=btn.dataset.portfolioView==='tiles'?'tiles':'list';
      setPortfolioView(view);
      render();
    });
    if(window.DPLRPrep)window.DPLRPrep.bind();
  }

  render=function(){
    const root=document.querySelector('#app');if(!root)return;
    const portfolio=tab==='customers';
    const main='<main class="dplr-main '+(portfolio?'portfolio':'')+'">'+body()+(!portfolio?pager():'')+'</main>';
    root.innerHTML=appHeader()+breadcrumb()+(portfolio?'<div class="dplr-portfolio-shell">'+main+'</div>':'<div class="dplr-shell">'+leftNav()+main+rightRail()+'</div>')+baseDrawer();
    baseBind();bindShell();
  };

  /* If bootstrap already completed before this file was parsed, immediately replace the old shell. */
  if(S?.customers?.length&&document.querySelector('#app')) render();
})();
