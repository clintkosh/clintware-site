/* Candidate-demo presentation layer for the Doppel-tailored CRM. */
(()=>{
  const baseHead=head,baseTopbar=topbar,baseBind=bind;
  const sourceType=c=>c?.isPublicReference||c?.provenance==='public_research'?'public':(c?.isSynthetic||c?.provenance==='synthetic_sample'||/synthetic/i.test(c?.nameStatus||''))?'synthetic':'user';
  const sourceLabel=c=>sourceType(c)==='public'?'Public Doppel source':sourceType(c)==='synthetic'?'Synthetic scenario':'User / imported';
  const sourceLong=c=>sourceType(c)==='public'?'Public Doppel customer story':sourceType(c)==='synthetic'?'Synthetic role-training scenario':'User / imported account';
  const themeTools=()=>'<div class="view-tools"><button class="btn" data-goto="live_prompt">AI + Exa research</button><div class="view-theme" aria-label="View theme"><span class="theme-dot" aria-hidden="true"></span><button data-view-theme="light" '+(theme==='light'?'class="active"':'')+'>Light</button><button data-view-theme="dark" '+(theme==='dark'?'class="active"':'')+'>Dark</button><button data-view-theme="system" '+(theme==='system'?'class="active"':'')+'>Auto</button></div></div>';

  head=function(k,t,s,a=''){
    return baseHead(k,t,s,(a?a:'')+themeTools());
  };

  topbar=function(){
    let out=baseTopbar();
    out=out.replace('Sign in to keep data','SSO: save permanently');
    const research=I?.ai?.research||{},ready=Boolean(research.configured);
    const chip='<span class="access-pill '+(ready?'saved':'guest')+'" title="Public research runs through the Clintware control plane; customer context is scrubbed before external search">'+(ready?'Exa ready':'Research pending')+'</span>';
    out=out.replace('<details class="top-more',chip+'<details class="top-more');
    return out;
  };

  customers=function(){
    const cards=S.customers.map(c=>{
      const kind=sourceType(c),url=kind==='public'?safeUrl(c.sourceFile):'';
      return '<article class="customer-card '+(c.isGoldenExample?'golden ':'')+(kind==='public'?'public-ref':'')+'" data-customer-open="'+e(c.id)+'">'+
        '<div class="split source-row"><span class="source-chip '+kind+'">'+e(sourceLabel(c))+'</span><span class="status '+(kind==='public'?'good':kind==='synthetic'?'warn':'good')+'">'+e(c.stage||'Account')+'</span></div>'+
        '<h3>'+e(c.name)+'</h3><p>'+e(c.industry||'Industry not provided')+'</p>'+
        '<div class="customer-meta"><span>'+e(c.facts?.businessGoal||c.facts?.product||'Use case not provided')+'</span><span>'+e(c.facts?.committedTimeline||'Timeline not provided')+'</span></div>'+
        (url?'<a class="public-source" href="'+e(url)+'" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">Open public Doppel source ↗</a>':'')+
      '</article>';
    }).join('');
    const publicCount=S.customers.filter(c=>sourceType(c)==='public').length,synthetic=S.customers.filter(c=>sourceType(c)==='synthetic').length,user=S.customers.filter(c=>sourceType(c)==='user').length;
    return head('Customer Engineering workspace','Customers','A hybrid operating dataset: public Doppel customer stories are preserved as public evidence, synthetic accounts demonstrate likely Technical Customer Engineering work, and your own imports remain separate.','<button class="btn primary" id="import-customers">Import PDF / CSV / ZIP</button><button class="btn" id="newc2">New blank customer</button>')+
      persistenceBanner()+
      '<div class="dataset-strip"><div class="card"><div class="eyebrow">Public references</div><div class="metric">'+publicCount+'</div><div class="muted">Doppel-published customer stories only</div></div><div class="card"><div class="eyebrow">Synthetic scenarios</div><div class="metric">'+synthetic+'</div><div class="muted">Clearly marked role-training data</div></div><div class="card"><div class="eyebrow">User accounts</div><div class="metric">'+user+'</div><div class="muted">Imported or entered by the operator</div></div><div class="card"><div class="eyebrow">Persistence</div><div class="metric metric-text">'+(S.access?.authenticated?'SSO durable':'Guest session')+'</div><div class="muted">No login required to explore</div></div></div>'+
      '<div class="customer-grid">'+(cards||'<div class="empty">No customers yet. Populate the demo dataset or import your own customer source.</div>')+'</div>';
  };

  accounts=function(){
    const golden=S.customers.find(c=>c.isGoldenExample),publicCount=S.customers.filter(c=>sourceType(c)==='public').length,synthetic=S.customers.filter(c=>sourceType(c)==='synthetic').length;
    return head('Workspace administration','Data & persistence','Guest mode is immediate and session-scoped. SSO turns this into a durable account workspace while keeping privileged provider credentials behind the Clintware control plane.','<button class="btn primary" id="reset-samples">Populate / refresh demo data</button><button class="btn" id="import-customers">Import customer data</button>')+
      persistenceBanner()+
      '<div class="dataset-strip"><div class="card '+(golden?'golden-panel':'')+'"><div class="eyebrow">Golden scenario</div><div class="metric metric-text">'+e(golden?.name||'Not populated')+'</div><div class="muted">Protected example for advanced investigation + Technical Services workflows.</div></div><div class="card"><div class="eyebrow">Public references</div><div class="metric">'+publicCount+'</div><div class="muted">Never presented as private account data.</div></div><div class="card"><div class="eyebrow">Synthetic scenarios</div><div class="metric">'+synthetic+'</div><div class="muted">Realistic but explicitly fictional customer configurations.</div></div><div class="card"><div class="eyebrow">Retention mode</div><div class="metric metric-text">'+(S.access?.authenticated?'Durable SSO':'Guest session')+'</div><div class="muted">'+(S.access?.authenticated?'Account workspace persists across sessions.':'Sign in when you want durable retention.')+'</div></div></div>'+
      '<div class="callout"><strong>Least privilege</strong><span>Exa, Jira, Confluence, AI and other provider credentials stay server-side behind the MCP/control-plane capability boundary. The browser receives results, not reusable provider secrets.</span></div>'+
      '<div class="danger-zone"><div><h2>Dataset controls</h2><p class="muted">Populate restores the curated hybrid demo. Clear all data removes every customer in the current workspace, including the golden scenario. This does not delete provider credentials or another user workspace.</p></div><div class="actions"><button class="btn" id="clear-non-golden">Clear all except golden</button><input id="override-golden" type="checkbox" checked hidden><button class="btn danger" id="clear-all">Clear all data</button></div></div>'+
      '<div class="section"><h2>Current accounts</h2></div><div class="tablewrap"><table class="table"><thead><tr><th>Customer</th><th>Data type</th><th>Stage</th><th>Source</th></tr></thead><tbody>'+S.customers.map(c=>{let kind=sourceType(c),url=kind==='public'?safeUrl(c.sourceFile):'';return '<tr><td><strong>'+e(c.name)+'</strong>'+(c.isGoldenExample?'<div class="prov">Golden scenario</div>':'')+'</td><td>'+e(sourceLong(c))+'</td><td>'+e(c.stage||'Not provided')+'</td><td>'+(url?'<a class="public-source" href="'+e(url)+'" target="_blank" rel="noreferrer">Public source ↗</a>':e(c.sourceFile||c.provenance||'Internal'))+'</td></tr>'}).join('')+'</tbody></table></div>';
  };

  bind=function(){
    baseBind();
    document.querySelectorAll('[data-view-theme]').forEach(btn=>btn.onclick=()=>{
      theme=btn.dataset.viewTheme;
      localStorage.setItem('dpltheme',theme);
      applyTheme();
      render();
    });
    const clear=document.querySelector('#clear-all');
    if(clear)clear.onclick=async()=>{
      if(!confirm('Clear ALL customer data in this workspace? This includes the golden scenario.'))return;
      await api('/customers/clear',{method:'POST',body:JSON.stringify({overrideGolden:true})});
      tab='customers';await load();
    };
  };

  if(document.querySelector('#app .top'))render();
})();
