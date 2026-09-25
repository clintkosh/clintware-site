/* DPLR interview-grade enrichment: no-login UX, evidence vocabulary, training resources, richer prep PDF. */
(()=>{
  const resources=[
    {label:"Doppel Platform Overview",kind:"Doppel product",format:"Video",url:"https://www.doppel.com/videos/doppel-platform-overview",why:"Refresh the platform story, product surfaces, and shared intelligence layer before a customer conversation."},
    {label:"Live Demo: Disrupt Digital Impersonation at Scale",kind:"Doppel workflow",format:"Video",url:"https://www.doppel.com/videos/live-demo-how-doppel-disrupts-digital-impersonation-at-scale",why:"See detection, attacker-infrastructure mapping, investigation context, and takedown motion in one end-to-end flow."},
    {label:"Scaling Threat Response with OpenAI",kind:"SOC + AI",format:"Video",url:"https://www.doppel.com/videos/webinar-scaling-threat-response-with-openai-doppels-impact-on-the-modern-soc",why:"Refresh how automation and human oversight can fit a scalable security-response workflow."},
    {label:"Doppel Okta Setup Instructions",kind:"Doppel identity",format:"Guide",url:"https://www.doppel.com/docs/doppel-okta-setup-instructions",why:"Use Doppel's current supported Okta flow as the first source of truth for SSO implementation or troubleshooting."},
    {label:"Doppel Jira Integration",kind:"Doppel workflow",format:"Guide",url:"https://www.doppel.com/docs/jira-integration",why:"Review supported Jira setup, alert synchronization, field mapping, status behavior, and troubleshooting boundaries."},
    {label:"Doppel + Splunk",kind:"Doppel SIEM",format:"Integration",url:"https://www.doppel.com/integrations/splunk",why:"Refresh the intended investigation and response context across Doppel and Splunk before debugging downstream normalization."},
    {label:"Doppel + Microsoft Sentinel",kind:"Doppel SIEM",format:"Integration",url:"https://www.doppel.com/integrations/microsoft-sentinel",why:"Refresh how Doppel findings fit a Sentinel-centered investigation and response model."},
    {label:"Okta Single Sign-On Overview",kind:"Identity fundamentals",format:"Official training",url:"https://developer.okta.com/docs/concepts/sso-overview/",why:"Review SAML, OIDC, OAuth, identity-provider, service-provider, and SSO concepts using Okta's own terminology."},
    {label:"Okta: Create a SAML App Integration",kind:"Identity implementation",format:"Official lab",url:"https://developer.okta.com/docs/guides/create-an-app-integration/saml2/main/",why:"Refresh the SAML integration path, NameID, attributes, assignments, metadata, and testing sequence."},
    {label:"Splunk: Get Started",kind:"SIEM fundamentals",format:"Official training",url:"https://help.splunk.com/en/splunk-enterprise/get-started",why:"Refresh data ingestion, search, fields, events, and the raw-to-indexed troubleshooting path before customer SIEM work."},
    {label:"Postman Quick Start",kind:"API fundamentals",format:"Official training",url:"https://learning.postman.com/docs/getting-started/quick-start",why:"Use a repeatable client for controlled API requests, headers, authentication, payloads, and response inspection."},
    {label:"Postman: Send API Requests",kind:"API troubleshooting",format:"Official guide",url:"https://learning.postman.com/docs/sending-requests/requests/",why:"Practice a smallest-repro request path and inspect response status, headers, body, latency, and protocol behavior."},
    {label:"Atlassian Incident Management Best Practices",kind:"Operating practice",format:"Official guide",url:"https://support.atlassian.com/jira-service-management-cloud/docs/best-practices-for-incident-management/",why:"Use common incident-management language for ownership, communication, resolution, and learning without treating every customer issue as an incident."},
    {label:"Jira Service Management Incident Workflow",kind:"Operating practice",format:"Official workflow",url:"https://support.atlassian.com/jira-service-management-cloud/docs/the-incident-management-workflow-for-service-projects/",why:"Refresh incident states, ownership flow, and transition discipline that can improve specialist handoffs and customer communication."}
  ];

  const glossary=[
    ["Known-good control","A comparable user, alert, request, tenant, or event that works and helps isolate the failing variable."],
    ["Last known good / change window","The last confirmed working state plus changes immediately before the failure."],
    ["Expected vs. actual","The supported or agreed behavior compared with what is reproducibly observed."],
    ["First point of divergence","The earliest layer where the affected path stops matching the known-good path."],
    ["Scope / blast radius","Exactly who or what is affected: user, group, tenant, alert type, integration, region, or workflow."],
    ["Correlation evidence","Request ID, alert ID, event ID, timestamp, trace/log reference, payload, or screenshot tying observations together."],
    ["Raw vs. normalized data","Source payload before field extraction, mapping, transform, enrichment, routing, or customer-side normalization."],
    ["Authentication (authn)","Proof of identity: can the user or client establish who it is?"],
    ["Authorization (authz)","Permission after identity is established: is that identity allowed to perform this action?"],
    ["IdP / SP","Identity Provider authenticates the user; Service Provider consumes the identity assertion or token for application access."],
    ["SAML assertion","Signed identity statement carrying authentication and attribute information from an IdP to a service provider."],
    ["OIDC / OAuth 2.0","OIDC adds identity on top of OAuth 2.0 authorization. Keep login/identity questions separate from API authorization scopes."],
    ["Claim / attribute mapping","Identity fields such as email, groups, or roles mapped from the IdP into application authorization behavior."],
    ["RBAC","Role-based access control: permissions are assigned through defined roles rather than ad hoc per-user grants."],
    ["Access token / JWT","Credential presented to an API. Validate issuer, audience, expiry, scopes/claims, and safe handling rather than assuming token presence equals authorization."],
    ["Endpoint / method","The API resource URL plus HTTP verb such as GET, POST, PATCH, or DELETE. Reproduce the exact supported call before broad conclusions."],
    ["HTTP status class","2xx success, 4xx client/request/auth problems, 5xx server-side failure class. Status is evidence, not a complete root cause."],
    ["429 / Retry-After","Rate-limit signal. Respect provider guidance, bound concurrency, and use controlled backoff rather than blind rapid retries."],
    ["Idempotency","Retrying the same intended operation should not create duplicate downstream work."],
    ["Webhook acknowledgement","The consumer's response to a delivery attempt. Correlate source event identity, attempt count, status, and consumer action."],
    ["Webhook signature / HMAC","Integrity/authenticity check for webhook payloads. Validate according to the provider's supported signing contract."],
    ["Pagination / cursor","Mechanism for retrieving large result sets across multiple requests. Check boundaries, duplicates, ordering, and continuation semantics."],
    ["Rate limit / backoff","Provider throughput limits and bounded retry behavior, commonly with exponential backoff and jitter."],
    ["Schema / field mapping","Contract between source fields and downstream fields. Track data type, allowed values, null behavior, transformations, and ownership."],
    ["Ingest time vs. event time","When a platform received/indexed data versus when the underlying event occurred; confusion can create false latency or ordering conclusions."],
    ["Severity vs. priority","Severity describes technical/customer impact; priority is the chosen response order. Do not assume one system's labels map directly to another's."],
    ["False positive / false negative","A benign item incorrectly treated as malicious versus a malicious item incorrectly missed. Both require a clear denominator and validation method."],
    ["IOC / TTP","Indicator of Compromise is an observable artifact; Tactics, Techniques, and Procedures describe adversary behavior patterns. They support different investigation questions."],
    ["Enrichment","Adding context to an event/finding from trusted sources so an analyst can classify, route, or act with less manual lookup."],
    ["Takedown","Operational action to disrupt or remove malicious infrastructure/content through supported provider or platform processes."],
    ["MTTD / MTTR","Mean time to detect and mean time to resolve/respond. Define start/stop points before using them as performance measures."],
    ["Reproducible defect","Behavior that still differs from the supported expectation after configuration and downstream transforms are isolated."],
    ["Bounded specialist ask","Precise SA/Product/Engineering question that can be acted on without restarting customer discovery."],
    ["Workaround / rollback","Safe temporary path or prior-known-good state that protects the customer while root cause is resolved."],
    ["Shift left / Support graduation","Move deterministic, safe, well-documented recurring work to frontline Support, automation, or self-service."],
    ["Source of truth","Authoritative location for a fact, metric definition, configuration contract, or current work state."],
    ["Human gate","Deliberate approval before AI suggestions, research, or proposed changes become commitments or CRM writes."]
  ];

  const gates=[
    ["Configuration","Exact setting + affected scope + known-good comparison + last change + safe rollback","TCE / customer technical owner"],
    ["Identity / access","IdP result + app result + user/group assignment + claims/role mapping + authn/authz classification","TCE + customer IAM"],
    ["Integration / data flow","Raw payload + delivery acknowledgement + mapping/transform + timestamp + retry/idempotency evidence","TCE + integration owner"],
    ["Expected behavior","Current supported contract + feature scope + version/tenant context","TCE / Product as needed"],
    ["Product defect","Smallest reproducible case + expected vs actual + control + IDs/logs + impact + workaround","Engineering after TCE gate"],
    ["Custom architecture","Validated need + constraints + supported options + unresolved design choice","Solutions Architecture"],
    ["Recurring request","Frequency + deterministic diagnosis + safe remediation + exceptions + measurable outcome","Support / Enablement after graduation"]
  ];

  const issuePlaybooks=[
    {name:"SSO / identity",prepare:"Affected user + known-good user, tenant/app, IdP sign-in result, assignments, claims/groups/roles, last change.",test:"Separate authn from authz. Compare the same user path across IdP and application logs. Validate one supported configuration before changing production.",handoff:"Escalate only with exact failing step, error/request ID, expected role, actual role, relevant metadata/config, and safe rollback."},
    {name:"API / webhook",prepare:"Exact endpoint/event, method, auth/scopes, request/event ID, timestamp, payload, response/ack, retry count, consumer action.",test:"Reproduce outside downstream automation where possible. Check 4xx/5xx/429, schema, pagination, idempotency, signatures, backoff, and acknowledgements.",handoff:"Provide the smallest request/event that reproduces, response evidence, supported contract, impact, workaround, and one bounded question."},
    {name:"SIEM / data flow",prepare:"One canonical finding/event ID, raw source payload, ingest timestamp, event timestamp, mapping/normalization, rule, routing result.",test:"Walk source -> connector -> raw indexed event -> normalization -> detection/rule -> automation. Stop at the first divergence.",handoff:"Do not call it a platform defect until customer-side transforms and rules are excluded with evidence."},
    {name:"Alert / product behavior",prepare:"Affected object ID, known-good control, feature/config state, expected behavior source, reproducible steps, scope/blast radius.",test:"Hold environment and configuration constant, vary one factor, and reproduce before/after the first suspected divergence.",handoff:"Engineering receives expected vs actual, exact reproduction, controls, IDs/logs, impact, workaround, and the canonical-behavior question."},
    {name:"Reporting / metrics",prepare:"Metric name, business question, definition, source system, calculation, time window, owner, cadence, approver.",test:"Reconcile raw source values to transformed/report values. Separate data-quality issues from definition disagreements.",handoff:"Do not automate executive reporting until the metric contract and source of truth are approved."},
    {name:"Custom architecture",prepare:"Customer outcome, constraints, supported platform capabilities, security requirements, scale/volume, systems, decision owner.",test:"Confirm the request is outside a supported implementation pattern rather than a configuration or integration issue.",handoff:"Give Solutions Architecture a bounded design decision with validated constraints instead of an open-ended customer problem."}
  ];

  const supportGraduation=[
    "The trigger and symptoms are recognizable without specialist intuition.",
    "The diagnostic path is deterministic and uses evidence frontline Support can access safely.",
    "The remediation is supported, bounded, reversible where needed, and has explicit stop/escalate criteria.",
    "Known exceptions and customer-specific dependencies are documented.",
    "The playbook preserves the original customer context so discovery is not repeated.",
    "Success can be measured through resolution quality, repeat rate, time-to-resolution, or avoided specialist escalation."
  ];

  function esc(x){return typeof e==='function'?e(String(x??'')):String(x??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

  function resourceSection(){
    return '<div class="section"><div><h2>Official training + product refresh</h2><div class="muted">Doppel product videos first; vendor training second. Training defines the supported-path vocabulary. Customer evidence still defines what is happening in this environment.</div></div></div>'+
      '<div class="dplr-tech-grid">'+resources.map(r=>'<article><div class="dplr-kicker">'+esc(r.kind)+' · '+esc(r.format)+'</div><h3>'+esc(r.label)+'</h3><p>'+esc(r.why)+'</p><a class="btn" href="'+esc(r.url)+'" target="_blank" rel="noreferrer">Open official resource ↗</a></article>').join('')+'</div>';
  }

  function glossarySection(){
    return '<div class="section"><div><h2>Common technical language</h2><div class="muted">Use the same vocabulary across Support, CSM, TCE, Solutions Architecture, Product, Engineering, and customer technical teams so a handoff does not change the meaning of the problem.</div></div></div>'+
      '<div class="tablewrap"><table class="table"><thead><tr><th>Term</th><th>Working definition</th></tr></thead><tbody>'+glossary.map(x=>'<tr><td><strong>'+esc(x[0])+'</strong></td><td>'+esc(x[1])+'</td></tr>').join('')+'</tbody></table></div>';
  }

  function issuePlaybookSection(){
    return '<div class="section"><div><h2>Issue-specific preparation cards</h2><div class="muted">Use the common evidence model, then switch to the checklist that matches the customer problem.</div></div></div><div class="dplr-tech-grid">'+issuePlaybooks.map(x=>'<article><div class="dplr-kicker">Troubleshooting path</div><h3>'+esc(x.name)+'</h3><p><strong>Have ready:</strong> '+esc(x.prepare)+'</p><p><strong>Test:</strong> '+esc(x.test)+'</p><p><strong>Handoff gate:</strong> '+esc(x.handoff)+'</p></article>').join('')+'</div>';
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
    window.DPLRPrep.view=function(){return baseView()+issuePlaybookSection()+glossarySection()+gateSection()+resourceSection()};
    window.DPLRPrep.prepText=function(){
      return baseText()+
        "\n\nISSUE-SPECIFIC PREPARATION\n"+issuePlaybooks.map(x=>"• "+x.name+"\n  Have ready: "+x.prepare+"\n  Test: "+x.test+"\n  Handoff gate: "+x.handoff).join("\n")+
        "\n\nCOMMON TECHNICAL LANGUAGE\n"+glossary.map(x=>"• "+x[0]+" — "+x[1]).join("\n")+
        "\n\nEVIDENCE QUALITY GATE\n"+gates.map(x=>"• "+x[0]+" | "+x[1]+" | owner: "+x[2]).join("\n")+
        "\n\nSUPPORT GRADUATION GATE\n"+supportGraduation.map(x=>"• "+x).join("\n")+
        "\n\nOFFICIAL TRAINING / PRODUCT REFRESH\n"+resources.map(x=>"• ["+x.format+"] "+x.label+" — "+x.url+"\n  "+x.why).join("\n");
    };
    window.DPLRPrep.printPrep=function(){
      const o=window.DPLRPrep.buildOverview(),txt=window.DPLRPrep.prepText(),w=window.open("","_blank","noopener,noreferrer");
      if(!w){alert("Allow pop-ups to generate the print / PDF view.");return}
      const cards=issuePlaybooks.map(x=>'<li><strong>'+esc(x.name)+'</strong><br><b>Have ready:</b> '+esc(x.prepare)+'<br><b>Test:</b> '+esc(x.test)+'<br><b>Handoff:</b> '+esc(x.handoff)+'</li>').join('');
      const links=resources.map(r=>'<li><strong>'+esc(r.label)+'</strong> · '+esc(r.kind)+' · '+esc(r.format)+'<br><a href="'+esc(r.url)+'">'+esc(r.url)+'</a><br><span>'+esc(r.why)+'</span></li>').join('');
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+esc(S.customer.name)+' Call Prep</title><style>body{font:13px/1.48 Arial,sans-serif;color:#131722;margin:30px;max-width:920px}h1{font-size:25px;margin:0 0 4px}h2{font-size:15px;margin:24px 0 8px;border-bottom:1px solid #cfd6df;padding-bottom:5px}.meta{color:#566273;margin:0 0 18px}.summary{display:grid;grid-template-columns:1fr 1fr;gap:10px}.summary div{border:1px solid #d7dee7;border-radius:8px;padding:10px}.summary b{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#59677a;margin-bottom:4px}.detail{white-space:pre-wrap;font:12px/1.5 Arial,sans-serif;background:#f7f9fb;border:1px solid #d7dee7;border-radius:8px;padding:14px}ol,ul{padding-left:21px}li{margin:0 0 10px}a{color:#125fda;word-break:break-word}footer{margin-top:24px;color:#667085;font-size:10px}@media print{body{margin:14mm}.break{break-before:page}}</style></head><body><h1>'+esc(S.customer.name)+' · Technical Customer Engineering Call Prep</h1><p class="meta">Evidence-first preparation pack generated from the current CRM workspace. Human review required before customer commitments or production changes.</p><div class="summary"><div><b>Objective</b>'+esc(o.objective)+'</div><div><b>Attendees</b>'+esc(o.attendees)+'</div><div><b>Decisions to land</b>'+esc(o.decisions)+'</div><div><b>Escalation gate</b>'+esc(o.escalationCriteria)+'</div></div><h2>Full preparation pack</h2><div class="detail">'+esc(txt)+'</div><div class="break"><h2>Issue-specific preparation cards</h2><ol>'+cards+'</ol></div><div class="break"><h2>Official training / product refresh</h2><ol>'+links+'</ol></div><footer>Candidate operating prototype · No-login browser workspace · Validate customer-specific configuration, current product documentation, and tenant evidence before action.</footer><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>');
      w.document.close();
    };
  }

  const originalRender=typeof render==='function'?render:null;
  if(originalRender){
    render=function(){originalRender();sanitizeNoLogin()};
    render();
  }else sanitizeNoLogin();
  window.DPLREnrichment={resources,glossary,gates,issuePlaybooks,supportGraduation,sanitizeNoLogin};
})();
