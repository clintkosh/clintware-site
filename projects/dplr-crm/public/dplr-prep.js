/* DPLR modular call preparation, quick-reference, PDF, and draft-email workflow. */
(()=>{
  const guides={
    okta:{name:"Okta / SAML SSO",steps:["Confirm the intended protocol and app integration.","Verify sign-on / ACS or redirect URI, entity or audience values, and tenant-specific metadata.","Check user and group assignment before debugging downstream authorization.","Confirm required claims / attributes and any role mapping.","Check signing certificate / metadata freshness and clock-related failures.","Run one controlled test-user path and capture IdP + application logs.","Know the safe rollback or prior-known-good configuration before production change."],questions:["Which exact user or group is affected?","Authentication failure or post-login authorization failure?","What changed last, and is there a known-good user for comparison?","Can we reproduce with the same assignment and claims?"]},
    entra:{name:"Microsoft Entra ID / SSO",steps:["Confirm enterprise-app registration and protocol path.","Verify redirect / reply URI, identifiers, claims, assignments, and tenant context.","Separate authentication from application-role / authorization problems.","Use one test user and compare to a known-good user or group.","Check Entra sign-in logs and the application's corresponding error / request ID.","Confirm certificate / secret validity only where that auth flow actually uses one.","Document rollback before altering production mappings."],questions:["Single user, group, or tenant-wide?","Does the identity provider show success while the app rejects access?","Are group or role claims present and expected?"]},
    splunk:{name:"Splunk / SIEM",steps:["Start with one canonical source event / alert ID.","Compare the source payload with indexed raw data before transforms.","Walk field extractions, transforms, lookups, and routing in order.","Check timestamps / timezone, dedupe keys, and ingestion latency.","Compare one affected event with a known-good control event.","Prove whether the mismatch exists before or after customer-side normalization."],questions:["Where is the first point the value diverges?","Which transform owns the field?","Is the customer routing from raw or normalized data?"]},
    sentinel:{name:"Microsoft Sentinel / SIEM",steps:["Start from a known alert/event and expected schema.","Validate connector / ingestion health and latency.","Check normalization / mapping before analytics rules.","Compare affected and known-good events.","Confirm rule logic, entity mapping, and downstream automation scope."],questions:["Source mismatch or analytics-rule mismatch?","Which normalized field drives the workflow?","Is the automation acting on the intended entity?"]},
    api:{name:"REST API / Webhooks",steps:["Confirm supported endpoint / event, auth method, tenant context, and required scopes.","Capture one request ID / event ID and exact timestamp.","Compare request, response, and platform UI for the same object.","Check pagination, rate limits, retry / idempotency behavior, and webhook delivery acknowledgements.","Remove downstream transforms before classifying a product defect.","Record expected vs actual plus the smallest reproducible request."],questions:["Can we reproduce outside the downstream integration?","Is the issue auth, schema, data freshness, rate limiting, or product behavior?","What is the exact Engineering ask if it remains reproducible?"]},
    jira:{name:"Jira / Engineering handoff",steps:["Keep the customer-facing work state in the CRM and Jira as the Engineering work-item system of record when connected.","Before creating an issue, capture actual vs expected, environment, reproduction, evidence, prior troubleshooting, workaround, business impact, and a bounded ask.","Link the Jira issue back to the customer record instead of making the customer repeat context."],questions:["Is this truly code-level / specialist work?","What can Engineering act on without another discovery call?"]},
    generic:{name:"Technology quick check",steps:["Confirm exact product / tenant / version / feature path.","Capture one affected example and one known-good control.","Separate customer configuration, integration transformation, expected behavior, and reproducible product behavior.","Record what changed, what has been tried, and the safe rollback.","Verify current vendor documentation before making a production change."],questions:["What evidence would change our conclusion?","Who owns the next technical decision?"]}
  };

  const lines=x=>String(x||"").split(/[\n;]+/).map(v=>v.trim()).filter(Boolean);
  const openLike=x=>!/(closed|resolved|done|complete|archived)/i.test(String(x||""));
  const recordText=(type,field,limit=4)=>R(type).filter(r=>openLike(r.data?.status||r.data?.escalationStatus)).slice(0,limit).map(r=>r.data?.[field]).filter(Boolean);
  const assistantProfile=()=>R("assistant_profile")[0]||null;

  function guideFor(name){
    const n=String(name||"").toLowerCase();
    if(/okta/.test(n))return guides.okta;
    if(/entra|azure ad|microsoft identity/.test(n))return guides.entra;
    if(/splunk/.test(n))return guides.splunk;
    if(/sentinel/.test(n))return guides.sentinel;
    if(/api|webhook|rest/.test(n))return guides.api;
    if(/jira/.test(n))return guides.jira;
    return guides.generic;
  }

  function integrationGuides(){
    const seen=new Set(),out=[];
    for(const r of R("integration")){
      const g=guideFor(r.data?.name||r.data?.purpose||"");
      if(seen.has(g.name))continue;seen.add(g.name);out.push({system:r.data?.name||g.name,guide:g,record:r});
    }
    return out.length?out:[{system:"Customer environment",guide:guides.generic,record:null}];
  }

  function buildOverview(){
    const c=S.customer||{},f=c.facts||{},risk=R("risk").find(r=>openLike(r.data?.escalationStatus))||R("risk")[0],inc=R("incident").find(r=>openLike(r.data?.status))||R("incident")[0],eng=R("engineering_issue").find(r=>openLike(r.data?.status))||R("engineering_issue")[0],meet=R("meeting").slice(-1)[0],stake=R("stakeholder");
    return {
      customer:c.name||"Customer",
      stage:c.stage||"Not recorded",
      objective:meet?.data?.objective||"Confirm current technical state, close the highest-risk unknowns, and leave with explicit owners and next decisions.",
      attendees:stake.length?stake.map(x=>[x.data?.name,x.data?.role].filter(Boolean).join(" — ")).join("; "):(meet?.data?.attendees||"Confirm attendees"),
      currentState:[
        "Stage: "+(c.stage||"Not recorded"),
        f.currentSystems?"Systems: "+f.currentSystems:"",
        f.unvalidatedDependencies?"Open dependency: "+f.unvalidatedDependencies:"",
        risk?.data?.title?"Risk: "+risk.data.title:"",
        inc?.data?.title?"Investigation: "+inc.data.title:"",
        eng?.data?.title?"Engineering handoff: "+eng.data.title:""
      ].filter(Boolean).join("\n"),
      evidence:[
        ...recordText("incident","nextAction",3),
        ...R("engineering_issue").slice(0,2).flatMap(r=>[r.data?.evidence,r.data?.troubleshooting]).filter(Boolean),
        ...R("integration").slice(0,4).map(r=>(r.data?.name||"Integration")+": "+(r.data?.technicalValidation||r.data?.connectorStatus||"Validate current state"))
      ].join("\n"),
      questions:[
        "What changed since the last confirmed working state?",
        "Which exact user / alert / request / event gives us the smallest reproducible example?",
        "What is customer configuration versus downstream transformation versus platform behavior?",
        "What decision must be made on this call, by whom, and what evidence is still missing?",
        "If this pattern repeats, what should become a Support playbook, automation, or self-service path?"
      ].join("\n"),
      decisions:[
        risk?.data?.nextDecision,
        ...R("action").filter(r=>openLike(r.data?.status)).slice(0,3).map(r=>r.data?.title)
      ].filter(Boolean).join("\n")||"Confirm owner, next evidence, and next checkpoint for each open item.",
      escalationCriteria:eng?"Escalate only with reproducible evidence, expected vs actual, scope, prior troubleshooting, business impact, workaround, and a bounded specialist ask.":"Do not escalate by default. First isolate configuration, integration, expected behavior, and reproducible product behavior.",
      followUp:"Send a concise recap with decisions, owners, dates / checkpoints, evidence links, and unresolved questions. Convert reusable resolution patterns into validated team guidance.",
      opening:"Confirm the call objective and customer impact, restate the known technical state, then separate facts from hypotheses before troubleshooting.",
      technologyNotes:integrationGuides().map(x=>x.guide.name+": "+x.guide.steps.slice(0,4).join(" ")).join("\n\n"),
      assistantNotes:"Use Live Assist as a silent copilot: ground on this customer record and approved playbook, surface the next useful question or evidence check, never invent a commitment, and prefer a clean handoff over a speculative answer."
    };
  }

  function readiness(){
    const o=buildOverview(),prof=assistantProfile(),checks=[
      ["Objective",Boolean(o.objective)],
      ["Stakeholders",R("stakeholder").length>0],
      ["Integrations",R("integration").length>0],
      ["Risks / decisions",R("risk").length>0||R("action").length>0],
      ["Evidence path",R("incident").length>0||R("engineering_issue").length>0],
      ["Live Assist playbook",Boolean(prof?.data?.playbook)],
      ["Follow-up path",R("action").length>0||R("meeting").length>0]
    ];
    return {checks,score:Math.round(100*checks.filter(x=>x[1]).length/checks.length)};
  }

  function latestPrep(){return R("call_prep").slice(-1)[0]||null}

  function view(){
    if(!S.customer)return '<div class="empty">Select a customer first.</div>';
    const o=buildOverview(),ready=readiness(),prof=assistantProfile(),preps=R("call_prep").slice().reverse(),drafts=R("email_draft").slice().reverse(),guidesNow=integrationGuides();
    return head("Prepare before the customer joins","Call Preparation","One flow from account context → technical refresh → evidence → talk track → Live Assist → recap. Every generated artifact remains editable and human-reviewed.",
      '<button class="btn primary" id="prep-generate">Generate + save prep pack</button><button class="btn" id="prep-pdf">Generate / save PDF</button>')+
      '<div class="dplr-readiness"><div><span>Call readiness</span><b>'+ready.score+'%</b></div><div class="dplr-readiness-bar"><i style="width:'+ready.score+'%"></i></div><div class="dplr-checks">'+ready.checks.map(x=>'<span class="'+(x[1]?'ok':'miss')+'">'+(x[1]?'✓':'○')+' '+e(x[0])+'</span>').join('')+'</div></div>'+
      '<div class="dplr-prep-flow">'+
        '<article><b>1</b><strong>Orient</strong><span>Objective, customer impact, stakeholders, ownership.</span><button data-tab="command">Account context →</button></article>'+
        '<article><b>2</b><strong>Refresh technology</strong><span>Use short reminders, then verify tenant-specific values in current documentation.</span><button data-prep-scroll="tech">Quick refresh →</button></article>'+
        '<article><b>3</b><strong>Prepare evidence</strong><span>Known facts, affected example, control example, logs, transforms, rollback.</span><button data-tab="triage">Investigations →</button></article>'+
        '<article><b>4</b><strong>Load the copilot</strong><span>Approved playbook + selected-account context. Transcript learning requires approval.</span><button data-tab="live_assistant">Live Assist →</button></article>'+
        '<article><b>5</b><strong>Run the call</strong><span>Land decisions, owners, next evidence, and escalation criteria.</span><button data-tab="meetings">Customer review →</button></article>'+
        '<article><b>6</b><strong>Close the loop</strong><span>Generate editable follow-up, save decisions, and shift reusable work left.</span><button data-prep-scroll="email">Draft follow-up →</button></article>'+
      '</div>'+
      '<div class="dplr-two"><section class="dplr-panel"><div class="dplr-panel-head"><h2>Call overview</h2><button id="prep-copy-overview">Copy</button></div><dl class="dplr-overview"><div><dt>Objective</dt><dd>'+e(o.objective)+'</dd></div><div><dt>Expected attendees</dt><dd>'+e(o.attendees)+'</dd></div><div><dt>Current state</dt><dd class="preline">'+e(o.currentState)+'</dd></div><div><dt>Decisions to land</dt><dd class="preline">'+e(o.decisions)+'</dd></div></dl></section>'+
      '<section class="dplr-panel"><div class="dplr-panel-head"><h2>Engineer-assist readiness</h2><button data-tab="live_assistant">Open Live Assist</button></div><p><strong>'+(prof?.data?.playbook?'Approved baseline loaded':'Playbook not yet saved')+'</strong></p><p>'+e(prof?.data?.updatedFrom||"Seeded TCE baseline is available after demo refresh; transcript-derived lessons require explicit approval.")+'</p><div class="callout"><strong>Human gate</strong><span>Live suggestions never write CRM records automatically. Training extracted from transcripts remains a proposal until approved into the playbook.</span></div><div class="actions"><button data-tab="kb" class="btn">Open training / playbooks</button><button data-tab="live_assistant" class="btn primary">Prepare Live Assist</button></div></section></div>'+
      '<div class="section" id="prep-tech"><div><h2>Technology quick refresh</h2><div class="muted">High-level reminders only. Verify current vendor documentation and the customer tenant before production changes.</div></div></div><div class="dplr-tech-grid">'+guidesNow.map((x,i)=>'<article><div class="dplr-kicker">'+e(x.system)+'</div><h3>'+e(x.guide.name)+'</h3><ol>'+x.guide.steps.slice(0,5).map(v=>'<li>'+e(v)+'</li>').join('')+'</ol><button class="btn" data-tech-guide="'+i+'">Open full reminder</button>'+(x.record?'<button class="btn" data-edit="'+e(x.record.id)+'">Edit integration</button>':'')+'</article>').join('')+'</div>'+
      '<div class="section"><div><h2>Evidence to have on screen</h2><div class="muted">The engineer should not need to rediscover the customer while the customer waits.</div></div></div><div class="dplr-evidence">'+lines(o.evidence).map(x=>'<span>• '+e(x)+'</span>').join('')+'</div>'+
      '<div class="section"><div><h2>Saved preparation packs</h2><div class="muted">Click any row to reopen and edit the source record.</div></div><button class="btn" data-add="call_prep">Add blank prep</button></div>'+
      (preps.length?'<div class="tablewrap"><table class="table dplr-clickable"><thead><tr><th>Prep</th><th>Meeting</th><th>Objective</th><th>Source</th></tr></thead><tbody>'+preps.map(r=>'<tr data-row-edit="'+e(r.id)+'"><td><strong>'+e(r.data?.title||"Call prep")+'</strong></td><td>'+e(r.data?.meetingDate||r.data?.meetingType||"Not set")+'</td><td>'+e(r.data?.objective||"Not set")+'</td><td><span class="prov">'+e(P(r.provenance))+'</span></td></tr>').join('')+'</tbody></table></div>':'<div class="empty">No saved preparation packs yet. Generate one from the current account state or add a blank prep.</div>')+
      '<div class="section" id="prep-email"><div><h2>Default email drafts</h2><div class="muted">Generated from confirmed CRM context, then left editable. Nothing is sent automatically.</div></div><div class="actions"><select id="email-kind" class="select"><option value="pre_call">Pre-call agenda</option><option value="post_call" selected>Post-call follow-up</option><option value="escalation">Technical escalation update</option></select><button class="btn primary" id="email-generate">Generate editable draft</button></div></div>'+
      (drafts.length?'<div class="tablewrap"><table class="table dplr-clickable"><thead><tr><th>Draft</th><th>Type</th><th>Subject</th><th>Status</th></tr></thead><tbody>'+drafts.map(r=>'<tr data-row-edit="'+e(r.id)+'"><td><strong>'+e(r.data?.title||"Email draft")+'</strong></td><td>'+e(r.data?.kind||"")+'</td><td>'+e(r.data?.subject||"")+'</td><td>'+e(r.data?.status||"Draft")+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">No saved email drafts yet.</div>');
  }

  async function savePrep(){
    const o=buildOverview();
    const data={title:"Call prep · "+S.customer.name,meetingDate:"",meetingType:"Technical customer review",objective:o.objective,attendees:o.attendees,opening:o.opening,currentState:o.currentState,evidenceReady:o.evidence,questions:o.questions,decisions:o.decisions,escalationCriteria:o.escalationCriteria,followUp:o.followUp,technologyNotes:o.technologyNotes,assistantNotes:o.assistantNotes};
    const x=await api("/records",{method:"POST",body:JSON.stringify({customerId:S.customer.id,type:"call_prep",provenance:"internal_proposal",data})});
    await load(S.customer.id);
    const id=x.id||x.record?.id||x.recordId;const rec=id?S.records.find(r=>r.id===id):R("call_prep").slice(-1)[0];if(rec)edit("call_prep",rec);
  }

  function emailData(kind){
    const o=buildOverview(),first=R("stakeholder").find(r=>r.data?.email),to=first?.data?.email||"",name=first?.data?.name?.split(/\s+/)[0]||"",actions=R("action").filter(r=>openLike(r.data?.status)).slice(0,4).map(r=>"• "+(r.data?.title||"Action")+(r.data?.owner?" — "+r.data.owner:"")).join("\n");
    if(kind==="pre_call")return {title:"Pre-call agenda · "+S.customer.name,kind,to,cc:"",subject:"Agenda | "+S.customer.name+" technical review",body:(name?"Hi "+name+",":"Hi,")+"\n\nAhead of our technical review, I want to make sure we use the time on the decisions that matter most.\n\nObjective\n"+o.objective+"\n\nCurrent focus\n"+o.currentState+"\n\nWhat I plan to leave with\n"+o.decisions+"\n\nIf there is anything else you want us to prepare, send it over and I’ll add it to the working context.\n\nBest,\nClint",status:"Draft"};
    if(kind==="escalation")return {title:"Technical escalation update · "+S.customer.name,kind,to,cc:"",subject:"Technical update | "+S.customer.name,body:(name?"Hi "+name+",":"Hi,")+"\n\nHere is the current technical status based on what we have validated so far.\n\nCurrent state\n"+o.currentState+"\n\nEvidence / next validation\n"+o.evidence+"\n\nEscalation criteria\n"+o.escalationCriteria+"\n\nI’ll keep the handoff bounded to confirmed evidence and will update you after the next validation point.\n\nBest,\nClint",status:"Draft"};
    return {title:"Post-call follow-up · "+S.customer.name,kind:"post_call",to,cc:"",subject:"Follow-up | "+S.customer.name+" technical review",body:(name?"Hi "+name+",":"Hi,")+"\n\nThanks for the time today. Here is the working recap I would send after confirming the notes.\n\nDecisions / next steps\n"+(actions||o.decisions)+"\n\nOpen technical items\n"+o.currentState+"\n\nNext checkpoint\n"+o.followUp+"\n\nPlease reply if I missed or misrepresented anything; I’ll keep the CRM record as the shared source of truth for the next technical step.\n\nBest,\nClint",status:"Draft"};
  }

  async function generateEmail(){
    const kind=document.querySelector("#email-kind")?.value||"post_call",data=emailData(kind);
    const x=await api("/records",{method:"POST",body:JSON.stringify({customerId:S.customer.id,type:"email_draft",provenance:"internal_proposal",data})});
    await load(S.customer.id);const id=x.id||x.record?.id||x.recordId,rec=id?S.records.find(r=>r.id===id):R("email_draft").slice(-1)[0];if(rec)edit("email_draft",rec);
  }

  function prepText(){
    const o=buildOverview(),g=integrationGuides();
    return [
      "CALL PREPARATION | "+S.customer.name,
      "",
      "OBJECTIVE",o.objective,
      "",
      "EXPECTED ATTENDEES",o.attendees,
      "",
      "CURRENT STATE",o.currentState,
      "",
      "EVIDENCE READY",o.evidence||"No evidence checklist recorded.",
      "",
      "QUESTIONS",o.questions,
      "",
      "DECISIONS TO LAND",o.decisions,
      "",
      "ESCALATION CRITERIA",o.escalationCriteria,
      "",
      "TECHNOLOGY QUICK REMINDERS",
      ...g.flatMap(x=>["",x.guide.name,...x.guide.steps.map(v=>"• "+v)]),
      "",
      "LIVE ASSIST",o.assistantNotes,
      "",
      "FOLLOW-UP",o.followUp,
      "",
      "NOTE: High-level technology reminders are preparation aids, not customer-specific configuration facts. Verify current documentation and tenant values before production changes."
    ].join("\n");
  }

  function printPrep(){
    const txt=prepText(),w=window.open("","_blank","noopener,noreferrer");
    if(!w){alert("Allow pop-ups to generate the print / PDF view.");return}
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+e(S.customer.name)+' Call Prep</title><style>body{font:14px/1.5 Arial,sans-serif;color:#111;margin:36px;max-width:850px}h1{font-size:24px;margin:0 0 6px}p.meta{color:#555;margin:0 0 24px}pre{white-space:pre-wrap;font:13px/1.55 Arial,sans-serif;border-top:2px solid #111;padding-top:18px}footer{margin-top:24px;color:#666;font-size:11px}@media print{body{margin:18mm}}</style></head><body><h1>'+e(S.customer.name)+' · Technical Customer Engineering Call Prep</h1><p class="meta">Generated from the current CRM workspace for human review.</p><pre>'+e(txt)+'</pre><footer>Candidate operating prototype. Validate customer-specific configuration before action.</footer><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>');
    w.document.close();
  }

  function techModal(i){
    const x=integrationGuides()[Number(i)]||integrationGuides()[0],g=x.guide;
    modal('<div class="section" style="margin:0"><div><div class="eyebrow">Technology quick reminder</div><h2>'+e(g.name)+'</h2></div><button class="btn" data-close>Close</button></div><div class="callout"><strong>Preparation aid</strong><span>Use this to refresh the engineer before the call. Verify current vendor documentation and tenant-specific values before production changes.</span></div><div class="section"><h3>Common path</h3></div><ol class="dplr-guide-list">'+g.steps.map(v=>'<li>'+e(v)+'</li>').join('')+'</ol><div class="section"><h3>Questions worth asking</h3></div><ul class="dplr-guide-list">'+g.questions.map(v=>'<li>'+e(v)+'</li>').join('')+'</ul>');
  }

  function bind(){
    let x=document.querySelector("#prep-generate");if(x)x.onclick=()=>savePrep().catch(err=>alert(err.message));
    x=document.querySelector("#prep-pdf");if(x)x.onclick=printPrep;
    x=document.querySelector("#prep-copy-overview");if(x)x.onclick=()=>navigator.clipboard.writeText(prepText());
    x=document.querySelector("#email-generate");if(x)x.onclick=()=>generateEmail().catch(err=>alert(err.message));
    document.querySelectorAll("[data-tech-guide]").forEach(b=>b.onclick=()=>techModal(b.dataset.techGuide));
    document.querySelectorAll("[data-prep-scroll]").forEach(b=>b.onclick=()=>document.querySelector("#prep-"+b.dataset.prepScroll)?.scrollIntoView({behavior:"smooth",block:"start"}));
  }

  window.DPLRPrep={view,bind,buildOverview,prepText,printPrep,emailData,guideFor};
})();