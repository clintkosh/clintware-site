/* DPLR interview-grade enrichment: no-login UX, evidence vocabulary, training resources, richer prep PDF. */
(()=>{
  const resources=[
    {label:"Doppel Platform Overview",kind:"Product orientation",url:"https://www.doppel.com/videos/doppel-platform-overview",why:"Refresh the current DRP, Human Risk Management, Email Security, and shared intelligence-layer story before a customer conversation."},
    {label:"Live Demo: Disrupt Digital Impersonation at Scale",kind:"Platform workflow",url:"https://www.doppel.com/videos/live-demo-how-doppel-disrupts-digital-impersonation-at-scale",why:"See detection, attacker-infrastructure mapping, investigation context, and takedown motion in one end-to-end flow."},
    {label:"Scaling Threat Response with OpenAI",kind:"SOC + AI operating model",url:"https://www.doppel.com/videos/webinar-scaling-threat-response-with-openai-doppels-impact-on-the-modern-soc",why:"Refresh how Doppel combines AI automation with human oversight and what that means for scalable customer operations."},
    {label:"Doppel Okta Setup Instructions",kind:"Identity / SSO",url:"https://www.doppel.com/docs/doppel-okta-setup-instructions",why:"Use Doppel's current supported Okta flow as the source of truth before discussing SSO implementation or troubleshooting."},
    {label:"Doppel Jira Integration",kind:"Engineering / ticket workflow",url:"https://www.doppel.com/docs/jira-integration",why:"Review alert-to-Jira synchronization, field mapping, polling, status synchronization, and troubleshooting boundaries."},
    {label:"Doppel + Splunk",kind:"SIEM workflow",url:"https://www.doppel.com/en/integrations/splunk",why:"Refresh the intended investigation and takedown context across Doppel and Splunk before debugging a customer's downstream workflow."},
    {label:"Doppel + Microsoft Sentinel",kind:"SIEM workflow",url:"https://www.doppel.com/en/integrations/microsoft-sentinel",why:"Refresh how Doppel findings fit a Sentinel-centered investigation and response model."},
    {label:"Atlassian Incident Management Best Practices",kind:"General operating practice",url:"https://support.atlassian.com/jira-service-management-cloud/docs/best-practices-for-incident-management/",why:"Use a common incident-management vocabulary for ownership, communication, resolution, and learning without turning every customer request into an incident."}
  ];

  const glossary=[
    ["Known-good control","A comparable user, alert, request, tenant, or event that is working and can isolate the failing variable."],
    ["Last known good / change window","The last confirmed working state plus what changed immediately before the failure."],
    ["Expected vs. actual","The supported or agreed behavior compared with what is reproducibly observed."],
    ["First point of divergence","The earliest layer where the affected path stops matching the known-good path."],
    ["Scope / blast radius","Exactly who, what, and how much is affected: user, group, tenant, alert type, integration, region, or workflow."],
    ["Correlation evidence","Request ID, alert ID, event ID, timestamp, trace/log reference, payload, screenshot, or other artifact tying observations together."],
    ["Raw vs. normalized data","Source payload before field extraction, mapping, transform, enrichment, routing, or customer-side normalization."],
    ["Authentication vs. authorization","Can the identity prove who the user is, and separately, is that identity allowed to do the requested action?"],
    ["Idempotency","Whether retrying the same operation produces one intended result rather than duplicate downstream work."],
    ["Rate limit / backoff","Provider throughput limits and the bounded retry behavior used when requests are throttled."],
    ["Reproducible defect","Product behavior that still differs from the supported expectation after configuration and downstream transforms are isolated."],
    ["Bounded specialist ask","A precise SA / Product / Engineering question that can be acted on without restarting customer discovery."],
    ["Workaround / rollback","The safe temporary path or prior-known-good state that protects customer operations while root cause is resolved."],
    ["Shift left / Support graduation","Move deterministic, safe, well-documented recurring work to frontline Support, automation, or self-service."],
    ["Source of truth","The authoritative location for a fact, metric definition, configuration contract, or current work state."],
    ["Human gate","A deliberate approval point before AI suggestions, external research, or proposed changes become customer commitments or CRM writes."]
  ];

  const gates=[
    ["Configuration","Exact setting + affected scope + known-good comparison + last change + safe rollback","TCE / customer technical owner"],
    ["Identity / access","IdP result + app result + user/group assignment + claims/role mapping + authn vs authz classification","TCE + customer IAM"],
    ["Integration / data flow","Raw payload + delivery acknowledgement + transform/mapping + timestamp + retry/idempotency evidence","TCE + customer integration owner"],
    ["Expected behavior","Current documentation / supported contract + feature scope + version/tenant context","TCE / Product as needed"],
    ["Product defect","Smallest reproducible case + expected vs actual + known-good control + IDs/logs + impact + workaround","Engineering after TCE gate"],
    ["Custom architecture","Validated need + constraints + supported options + unresolved design decision","Solutions Architecture"],
    ["Recurring request","Frequency + deterministic diagnosis + safe remediation + exceptions + measurable outcome","Support / Enablement after graduation"]
  ];

  const supportGraduation=[
    "The trigger and symptoms are recognizable without specialist intuition.",
    "The diagnostic path is deterministic and uses evidence frontline Support can access safely.",
    "The remediation is supported, bounded, reversible where needed, and has explicit stop / escalate criteria.",
    "Known exceptions and customer-specific dependencies are documented.",
    "The playbook preserves the original customer context so the customer is not asked to repeat discovery.",
    "Success can be measured through resolution quality, repeat rate, time-to-resolution, or avoided specialist escalation."
  ];

  function esc(x){return typeof e==='function'?e(String(x??'')):String(x??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

  function resourceSection(){
    return '<div class="section"><div><h2>Official product + workflow refresh</h2><div class="muted">Use these before the call to refresh product behavior and the supported integration path. External links are learning sources, never substitutes for tenant-specific evidence.</div></div></div>'+
      '<div class="dplr-tech-grid">'+resources.map(r=>'<article><div class="dplr-kicker">'+esc(r.kind)+'</div><h3>'+esc(r.label)+'</h3><p>'+esc(r.why)+'</p><a class="btn" href="'+esc(r.url)+'" target="_blank" rel="noreferrer">Open official resource ↗</a></article>').join('')+'</div>';
  }

  function glossarySection(){
    return '<div class="section"><div><h2>Common technical language</h2><div class="muted">The terms I would use consistently across Support, CSM, TCE, SA, Product, Engineering, and customer technical teams.</div></div></div>'+
      '<div class="tablewrap"><table class="table"><thead><tr><th>Term</th><th>Working definition</th></tr></thead><tbody>'+glossary.map(x=>'<tr><td><strong>'+esc(x[0])+'</strong></td><td>'+esc(x[1])+'</td></tr>').join('')+'</tbody></table></div>';
  }

  function gateSection(){
    return '<div class="section"><div><h2>Evidence quality gate</h2><div class="muted">Classify the problem before routing it. The goal is direct resolution when possible and a clean specialist handoff only when necessary.</div></div></div>'+
      '<div class="tablewrap"><table class="table"><thead><tr><th>Root-cause class</th><th>Minimum evidence before routing</th><th>Likely owner</th></tr></thead><tbody>'+gates.map(x=>'<tr><td><strong>'+esc(x[0])+'</strong></td><td>'+esc(x[1])+'</td><td>'+esc(x[2])+'</td></tr>').join('')+'</tbody></table></div>'+
      '<div class="dplr-panel" style="margin-top:16px"><div class="dplr-panel-head"><h2>Support graduation gate</h2></div><ol class="dplr-guide-list">'+supportGraduation.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></div>';
  }

  function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}
  function sanitizeNoLogin(){
    document.querySelectorAll('a[href="/auth/login"],form[action="/auth/logout"]').forEach(x=>x.remove());
    document.querySelectorAll('.dplr-chip.guest').forEach(x=>{setText(x,'Browser saved');x.title='No sign-in required; anonymous workspace persists in this browser.'});
    document.querySelectorAll('.dplr-persistence.guest').forEach(x=>{
      const strong=x.querySelector('strong'),span=x.querySelector('span');
      setText(strong,'Browser-persistent workspace');
      setText(span,'No sign-in required. This anonymous workspace is retained in this browser for up to 180 days unless site data is cleared. Export a backup before moving browsers or devices.');
    });
    document.querySelectorAll('.dplr-kpis article').forEach(a=>{
      if(a.querySelector('span')?.textContent.trim()==='Retention'){
        const b=a.querySelector('b'),sm=a.querySelector('small');setText(b,'Browser-persistent');setText(sm,'No login required');
      }
    });
    document.querySelectorAll('.dplr-admin-grid article').forEach(a=>{
      if(a.querySelector('span')?.textContent.trim()==='Workspace mode'){
        const st=a.querySelector('strong'),p=a.querySelector('p');setText(st,'No-login / browser-persistent');setText(p,'Records stay in this browser for up to 180 days unless site data is cleared. Export/import provides portability across browsers or devices.');
      }
    });
  }

  if(window.DPLRPrep){
    const baseView=window.DPLRPrep.view;
    const baseText=window.DPLRPrep.prepText;
    window.DPLRPrep.view=function(){return baseView()+glossarySection()+gateSection()+resourceSection()};
    window.DPLRPrep.prepText=function(){
      return baseText()+"\n\nCOMMON TECHNICAL LANGUAGE\n"+glossary.map(x=>"• "+x[0]+" — "+x[1]).join("\n")+
        "\n\nEVIDENCE QUALITY GATE\n"+gates.map(x=>"• "+x[0]+" | "+x[1]+" | owner: "+x[2]).join("\n")+
        "\n\nSUPPORT GRADUATION GATE\n"+supportGraduation.map(x=>"• "+x).join("\n")+
        "\n\nOFFICIAL TRAINING / PRODUCT REFRESH\n"+resources.map(x=>"• "+x.label+" — "+x.url+"\n  "+x.why).join("\n");
    };
    window.DPLRPrep.printPrep=function(){
      const o=window.DPLRPrep.buildOverview(),txt=window.DPLRPrep.prepText(),w=window.open("","_blank","noopener,noreferrer");
      if(!w){alert("Allow pop-ups to generate the print / PDF view.");return}
      const links=resources.map(r=>'<li><strong>'+esc(r.label)+'</strong> · '+esc(r.kind)+'<br><a href="'+esc(r.url)+'">'+esc(r.url)+'</a><br><span>'+esc(r.why)+'</span></li>').join('');
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+esc(S.customer.name)+' Call Prep</title><style>body{font:13px/1.48 Arial,sans-serif;color:#131722;margin:30px;max-width:920px}h1{font-size:25px;margin:0 0 4px}h2{font-size:15px;margin:24px 0 8px;border-bottom:1px solid #cfd6df;padding-bottom:5px}.meta{color:#566273;margin:0 0 18px}.summary{display:grid;grid-template-columns:1fr 1fr;gap:10px}.summary div{border:1px solid #d7dee7;border-radius:8px;padding:10px}.summary b{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#59677a;margin-bottom:4px}.detail{white-space:pre-wrap;font:12px/1.5 Arial,sans-serif;background:#f7f9fb;border:1px solid #d7dee7;border-radius:8px;padding:14px}ol,ul{padding-left:21px}li{margin:0 0 8px}a{color:#125fda;word-break:break-word}footer{margin-top:24px;color:#667085;font-size:10px}@media print{body{margin:14mm}.break{break-before:page}}</style></head><body><h1>'+esc(S.customer.name)+' · Technical Customer Engineering Call Prep</h1><p class="meta">Evidence-first preparation pack generated from the current CRM workspace. Human review required before customer commitments or production changes.</p><div class="summary"><div><b>Objective</b>'+esc(o.objective)+'</div><div><b>Attendees</b>'+esc(o.attendees)+'</div><div><b>Decisions to land</b>'+esc(o.decisions)+'</div><div><b>Escalation gate</b>'+esc(o.escalationCriteria)+'</div></div><h2>Full preparation pack</h2><div class="detail">'+esc(txt)+'</div><div class="break"><h2>Official training / product refresh</h2><ol>'+links+'</ol></div><footer>Candidate operating prototype · No-login browser workspace · Validate customer-specific configuration, current product documentation, and tenant evidence before action.</footer><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>');
      w.document.close();
    };
  }

  const originalRender=typeof render==='function'?render:null;
  if(originalRender){
    render=function(){originalRender();sanitizeNoLogin()};
    render();
  }else sanitizeNoLogin();
  window.DPLREnrichment={resources,glossary,gates,supportGraduation,sanitizeNoLogin};
})();
