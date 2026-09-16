const JSON_HEADERS = {"content-type":"application/json; charset=utf-8"};
const GA_ID = "G-DCY144YM9P";

function json(data, status=200, extra={}) { return new Response(JSON.stringify(data), {status, headers:{...JSON_HEADERS,...extra}}); }
function html(body, status=200, extra={}) { return new Response(body, {status, headers:{"content-type":"text/html; charset=utf-8",...extra}}); }
function now(){ return new Date().toISOString(); }
function id(prefix="id"){ return `${prefix}_${crypto.randomUUID()}`; }
async function sha256(s){ const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join(""); }
async function hmac(key,msg){ const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-256"},false,["sign"]); const sig=await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(msg)); return btoa(String.fromCharCode(...new Uint8Array(sig))).replaceAll("+","-").replaceAll("/","_").replaceAll("=",""); }
async function makeSession(env){ const exp=Date.now()+8*60*60*1000; const payload=`${exp}`; return `${payload}.${await hmac(env.VIDCRM_SESSION_SECRET,payload)}`; }
async function validSession(req,env){ if(!env.VIDCRM_SESSION_SECRET) return false; const m=(req.headers.get("cookie")||"").match(/(?:^|; )vidcrm_session=([^;]+)/); if(!m) return false; const [exp,sig]=decodeURIComponent(m[1]).split("."); if(!exp||Date.now()>Number(exp)) return false; return sig===await hmac(env.VIDCRM_SESSION_SECRET,exp); }

const seed = {
  account:{
    id:"acct_demo", name:"Northstar Financial", mission:"Protect customers and employees while modernizing secure digital access.",
    products:["Workforce Protection"], industry:"Financial services", stage:"Technical discovery", readiness:64,
    customer_outcomes:[{text:"Reduce external identity exposure for privileged users before expanding to the workforce.",source:"customer discovery",date:"2026-09-15",confidence:0.96}],
    internal_value_hypothesis:[{text:"A successful privileged-user rollout can establish evidence for broader workforce expansion.",source:"internal hypothesis",date:"2026-09-15",confidence:0.70}],
    communication:{style:"concise + technical",channel:"live + email recap",cadence:"weekly during implementation"},
    stakeholders:[
      {name:"Morgan Lee",role:"Procurement / vendor owner",technical:false,status:"confirmed"},
      {name:"Technical IAM owner",role:"IAM",technical:true,status:"missing"},
      {name:"Security program owner",role:"Security",technical:true,status:"needed"}
    ],
    environment:{idp:"Okta",sso:"SAML planned",provisioning:"SCIM unknown",itsm:"ServiceNow",siem:"Splunk",api:"Discovery pending"},
    constraints:["Primary contact is procurement-led","Security questionnaire incomplete"],
    success_criteria:["Privileged cohort enrolled","Identity workflow validated","Executive value review completed"],
    risks:["Missing IAM owner","Provisioning requirements unknown"],
    open_questions:["Who owns Okta configuration?","Is SCIM required for launch?","What ServiceNow workflow is expected?"]
  },
  calls:[
    {id:"call_demo_1",date:"2026-09-15",title:"Technical discovery",source:"Read AI / demo adapter",score:78,
     dimensions:{discovery:84,technical_reasoning:76,stakeholder_coverage:61,expectation_setting:82,evidence_discipline:86,communication:80,follow_through:77},
     lessons:{keep:["Scoped SSO before diagnosing"],promote:["Ask for technical owner before configuration call"],shorten:["Avoid explaining architecture before confirming desired outcome"],retire:[]},
     proposals:[
       {id:"p1",type:"stakeholder",text:"Add IAM owner as required implementation stakeholder",confidence:0.94,status:"pending",source:"call_demo_1"},
       {id:"p2",type:"risk",text:"Procurement-only contact may delay technical readiness",confidence:0.88,status:"pending",source:"call_demo_1"},
       {id:"p3",type:"gap",text:"SCIM provisioning knowledge gap detected for assigned CSM",confidence:0.91,status:"pending",source:"call_demo_1"}
     ]}
  ],
  knowledge:[
    {id:"kb_scim",title:"SCIM provisioning: customer-safe ramp",level:"micro-module",status:"verified",competence:62,source_tier:"A+B",summary:"Lifecycle provisioning standard; validate supported operations, mappings, group assignment, deactivate behavior, permissions, and test evidence."},
    {id:"kb_sso",title:"SSO failure isolation",level:"runbook",status:"verified",competence:81,source_tier:"A+B",summary:"Scope affected users, recent change, IdP/SP status, trust metadata, identifiers, cert/secret, claims, assignment, time and logs."}
  ],
  advisories:[
    {id:"adv1",severity:"high",badge:"LIKELY MISCONFIGURATION",title:"Technical owner missing before SSO configuration",tier:"A+B",confidence:0.92,rationale:"Procurement can coordinate the vendor relationship but cannot usually validate IdP trust, claims, assignments, provisioning, or error evidence.",action:"Require IAM owner before configuration session; do not auto-apply changes.",sources:["Customer context","Known-good implementation pattern"]},
    {id:"adv2",severity:"medium",badge:"EMERGING PRACTICE",title:"Treat identity-risk signals as contextual inputs, not automatic lockout triggers",tier:"C + review",confidence:0.66,rationale:"Practitioner discussion increasingly favors risk-adaptive controls, but implementation varies and can create user-impact if over-automated.",action:"Research current vendor guidance + practitioner evidence before proposing; human approval required.",sources:["Community discussion placeholder","Vendor validation required"]}
  ],
  competence:{"SSO/SAML":81,"SCIM":62,"API troubleshooting":74,"Okta":68,"ServiceNow":55,"Security questionnaires":72},
  audit:[]
};

export class CrmHub {
  constructor(state, env){ this.state=state; this.env=env; }
  async load(){ let d=await this.state.storage.get("data"); if(!d){ d=structuredClone(seed); await this.state.storage.put("data",d); } return d; }
  async save(d){ await this.state.storage.put("data",d); return d; }
  async fetch(req){
    const u=new URL(req.url), d=await this.load();
    if(req.method==="GET" && u.pathname==="/state") return json(d);
    if(req.method==="POST" && u.pathname==="/proposal"){
      const b=await req.json(); const call=d.calls.find(x=>x.id===b.call_id); const p=call?.proposals.find(x=>x.id===b.proposal_id); if(!p) return json({error:"not_found"},404);
      p.status=b.decision==="approve"?"approved":"rejected"; p.reviewed_at=now();
      if(p.status==="approved"){ d.audit.unshift({id:id("audit"),ts:now(),action:"proposal.approved",proposal:p}); if(p.type==="risk"&&!d.account.risks.includes(p.text)) d.account.risks.push(p.text); if(p.type==="gap") d.knowledge.unshift({id:id("module"),title:p.text,level:"gap-card",status:"draft",competence:0,source_tier:"call evidence",summary:"Generated from approved post-call learning. Expand into definition, architecture, setup path, failure modes, troubleshooting, customer-safe explanation, verification sources and drills."}); }
      await this.save(d); return json({ok:true,proposal:p});
    }
    if(req.method==="POST" && u.pathname==="/ingest"){
      const b=await req.json();
      const dims=b.dimensions||{}; const vals=Object.values(dims).filter(Number.isFinite); const score=vals.length?Math.round(vals.reduce((a,v)=>a+v,0)/vals.length):null;
      const call={id:b.id||id("call"),date:b.date||now().slice(0,10),title:b.title||"Customer call",source:b.source||"manual",score,dimensions:dims,lessons:b.lessons||{keep:[],promote:[],shorten:[],retire:[]},proposals:b.proposals||[],transcript_ref:b.transcript_ref||null,ingested_at:now()};
      d.calls.unshift(call); d.audit.unshift({id:id("audit"),ts:now(),action:"call.ingested",call_id:call.id,source:call.source}); await this.save(d); return json({ok:true,call});
    }
    return json({error:"not_found"},404);
  }
}

function hub(env){ const obj=env.CRM_HUB.get(env.CRM_HUB.idFromName("primary")); return obj; }
async function cpResearch(env,query,context={}){
  if(!env.CONTROL_PLANE) return {available:false,reason:"control_plane_binding_missing"};
  try{
    const r=await env.CONTROL_PLANE.fetch("https://mcp.clintware.com/api/v1/research",{method:"POST",headers:{"content-type":"application/json","x-clintware-product":"vidcrm"},body:JSON.stringify({product:"vidcrm",query,context})});
    const data=await r.json().catch(()=>({})); return {available:r.ok,...data};
  }catch(e){ return {available:false,reason:"research_error",detail:String(e)}; }
}
async function emit(env,feature,action,metadata={}){
  if(!env.CONTROL_PLANE) return;
  try{ await env.CONTROL_PLANE.fetch("https://mcp.clintware.com/api/v1/events",{method:"POST",headers:{"content-type":"application/json","x-clintware-product":"vidcrm"},body:JSON.stringify({event_id:id("evt"),timestamp:now(),product:"vidcrm",environment:"demo",feature,action,success:true,metadata})}); }catch{}
}

function loginPage(msg=""){
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vanish Fluid System</title><style>body{margin:0;background:#071016;color:#e9f5f7;font:15px ui-monospace,SFMono-Regular,Consolas,monospace;display:grid;place-items:center;min-height:100vh}.box{width:min(420px,88vw);border:1px solid #1d3942;background:#0d1a21;padding:28px}.k{color:#67e8f9;font-size:12px;letter-spacing:.14em}.muted{color:#91a7ad}input,button{width:100%;box-sizing:border-box;padding:12px;margin-top:12px;background:#071016;color:#fff;border:1px solid #294953}button{background:#12343d;border-color:#38b6c8;cursor:pointer}.err{color:#ff9b9b}</style></head><body><form class="box" method="post" action="/login"><div class="k">CLINTWARE™ // GO FURTHEST.™</div><h1>Vanish Fluid System</h1><p class="muted">Customer Context + Technical Ramp</p>${msg?`<p class="err">${msg}</p>`:""}<input type="password" name="password" autocomplete="current-password" placeholder="Demo password" autofocus><button>Unlock workspace</button></form></body></html>`;
}

function appPage(){ return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vanish Fluid System — Customer Technical Ramp</title>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');</script>
<style>
:root{--bg:#071016;--panel:#0c1920;--line:#1c3740;--text:#eaf5f6;--muted:#8fa4aa;--cyan:#67e8f9;--green:#86efac;--amber:#fcd34d;--red:#fda4af;--violet:#c4b5fd}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 Inter,ui-monospace,SFMono-Regular,Consolas,monospace}header{position:sticky;top:0;z-index:4;background:#071016eb;border-bottom:1px solid var(--line);padding:13px 18px;display:flex;gap:18px;align-items:center}.brand{font-weight:800}.brand span{color:var(--cyan)}.meta{color:var(--muted);font-size:12px}nav{display:flex;gap:6px;overflow:auto;padding:10px 18px;border-bottom:1px solid var(--line)}button,.tab{font:inherit;color:var(--text);background:#0a151b;border:1px solid var(--line);padding:8px 10px;cursor:pointer}.tab.active{border-color:var(--cyan);color:var(--cyan)}main{padding:16px;max-width:1500px;margin:auto}.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:10px}.card{grid-column:span 4;background:var(--panel);border:1px solid var(--line);padding:14px}.wide{grid-column:span 8}.full{grid-column:1/-1}.half{grid-column:span 6}.label{color:var(--cyan);font-size:11px;letter-spacing:.12em;text-transform:uppercase}.muted{color:var(--muted)}h1,h2,h3{margin:.25rem 0 .6rem}h1{font-size:18px}h2{font-size:15px}h3{font-size:13px}.score{font-size:30px;font-weight:800}.good{color:var(--green)}.warn{color:var(--amber)}.bad{color:var(--red)}.pill{display:inline-block;padding:2px 6px;border:1px solid var(--line);margin:2px 3px 2px 0;font-size:11px}.bar{height:7px;background:#13252c;margin:5px 0 9px}.bar i{display:block;height:100%;background:var(--cyan)}ul{margin:.3rem 0;padding-left:18px}.proposal{border-left:2px solid var(--violet);padding:8px 10px;margin:7px 0;background:#0a151b}.actions{display:flex;gap:6px;margin-top:6px}.approve{border-color:#2e7d4b;color:var(--green)}.reject{border-color:#7d3946;color:var(--red)}.advisory{padding:10px;border:1px solid var(--line);margin:7px 0}.high{border-left:3px solid var(--red)}.medium{border-left:3px solid var(--amber)}pre{white-space:pre-wrap;background:#071016;border:1px solid var(--line);padding:10px;color:#d8f3f5}.hidden{display:none}textarea,input{width:100%;background:#071016;border:1px solid var(--line);color:var(--text);padding:8px;font:inherit}@media(max-width:900px){.card,.wide,.half{grid-column:1/-1}header{align-items:flex-start;flex-direction:column;gap:3px}}
</style></head><body><header><div class="brand">Clintware™ <span>VANISH FLUID</span></div><div class="meta">Living Customer Success system // verified context → technical ramp → learn</div></header><nav id="tabs"></nav><main id="app">Loading…</main>
<script>
const tabs=['Account Context','Pre-Call Ramp','Technical Ramp','Post-Call Learn','Shared Knowledge'];let state=null,active=tabs[0];const e=s=>s==null?'—':String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function load(){state=await fetch('/api/state').then(r=>r.json());renderTabs();render()}
function renderTabs(){tabsEl=document.getElementById('tabs');tabsEl.innerHTML=tabs.map(t=>`<button class="tab ${t===active?'active':''}" onclick="active=${JSON.stringify('${T}').replace('${T}','')} ">${e(t)}</button>`).join('');[...tabsEl.children].forEach((b,i)=>b.onclick=()=>{active=tabs[i];renderTabs();render()})}
function card(label,body,cls=''){return `<section class="card ${cls}"><div class="label">${label}</div>${body}</section>`}
function list(a){return `<ul>${(a||[]).map(x=>`<li>${e(typeof x==='string'?x:x.text)}</li>`).join('')}</ul>`}
function scoreClass(n){return n>=80?'good':n>=65?'warn':'bad'}
function account(){const a=state.account;return `<div class="grid">${card('Account',`<h1>${e(a.name)}</h1><div class="muted">${e(a.industry)} · ${e(a.stage)}</div><p>${e(a.mission)}</p>`,'wide')}${card('Implementation readiness',`<div class="score ${scoreClass(a.readiness)}">${a.readiness}%</div><div class="bar"><i style="width:${a.readiness}%"></i></div><div class="muted">Human-reviewed readiness, not an auto-go decision.</div>`)}${card('Customer said they want',list(a.customer_outcomes),'half')}${card('Internal value hypothesis',list(a.internal_value_hypothesis),'half')}${card('Stakeholders',`<ul>${a.stakeholders.map(s=>`<li>${e(s.name)} — ${e(s.role)} <span class="pill ${s.status==='missing'?'bad':''}">${e(s.status)}</span></li>`).join('')}</ul>`,'half')}${card('Communication',`<p>${e(a.communication.style)}</p><p class="muted">${e(a.communication.channel)} · ${e(a.communication.cadence)}</p>`,'half')}${card('Environment',Object.entries(a.environment).map(([k,v])=>`<div><b>${e(k)}</b> · ${e(v)}</div>`).join(''),'wide')}${card('Risks + open questions',`<h3>Risks</h3>${list(a.risks)}<h3>Open questions</h3>${list(a.open_questions)}`)} </div>`}
function precall(){const a=state.account,c=state.calls[0],lowest=Object.entries(state.competence).sort((x,y)=>x[1]-y[1]).slice(0,3);return `<div class="grid">${card('5-minute pre-call ramp',`<h1>${e(a.name)} — ${e(a.stage)}</h1><p><b>Why they bought:</b> ${e(a.customer_outcomes[0]?.text)}</p><p><b>Communication:</b> ${e(a.communication.style)} via ${e(a.communication.channel)}</p><p><b>Recent learning:</b> ${e(c?.lessons?.promote?.[0])}</p><p><b>Do not collapse:</b> customer outcome and internal value hypothesis remain separate.</p>`,'wide')}${card('Prior call score',`<div class="score ${scoreClass(c?.score||0)}">${e(c?.score)}</div><p class="muted">${e(c?.title)}</p><p><b>Promote:</b> ${e(c?.lessons?.promote?.join('; '))}</p>`)}${card('Prerequisites',`<ul><li class="bad">Confirm IAM owner</li><li>Confirm provisioning model</li><li>Finish security questionnaire</li><li>Validate ServiceNow scope</li></ul>`,'half')}${card('Adaptive CSM ramp',`<p>Lowest demonstrated competence:</p>${lowest.map(([k,v])=>`<div>${e(k)} <span class="pill ${scoreClass(v)}">${v}%</span></div>`).join('')}<p class="muted">Prep emphasizes these gaps instead of repeating mastered material.</p>`,'half')}${card('Customer-safe troubleshooting rail',`<pre>OUTCOME → SCOPE → ENVIRONMENT → RECENT CHANGE → EVIDENCE → TEST → VERIFY → NEXT UPDATE

If unknown: “I don’t want to guess. I’ll verify this against the supported configuration and come back with the evidence and next step.”</pre>`,'full')}</div>`}
function technical(){return `<div class="grid">${card('Environment advisory',state.advisories.map(a=>`<div class="advisory ${a.severity}"><div><span class="pill">${e(a.badge)}</span> <span class="pill">Tier ${e(a.tier)}</span> <span class="pill">${Math.round(a.confidence*100)}% confidence</span></div><h3>${e(a.title)}</h3><p>${e(a.rationale)}</p><p><b>Suggested:</b> ${e(a.action)}</p><p class="muted">Sources: ${e(a.sources.join(' · '))}</p></div>`).join(''),'wide')}${card('Evidence model',`<p><b>Tier A</b> · standards/vendor docs</p><p><b>Tier B</b> · internally verified implementation history</p><p><b>Tier C</b> · practitioner/community discussion</p><p class="muted">Emerging practice is never treated as a standard. It must be researched, labeled and human-approved.</p>`)}${card('Known-good technical map',state.knowledge.map(k=>`<div class="proposal"><b>${e(k.title)}</b><br><span class="muted">${e(k.source_tier)} · CSM competence ${e(k.competence)}%</span><p>${e(k.summary)}</p></div>`).join(''),'full')}${card('Research a pattern',`<input id="researchQ" placeholder="e.g. Okta SCIM deactivation failure patterns"><button onclick="research()">Research via Clintware Control Plane</button><pre id="researchOut">Grounded research is labeled by evidence tier and never auto-applied.</pre>`,'full')}</div>`}
function postcall(){const c=state.calls[0];return `<div class="grid">${card('Latest call grade',`<h1>${e(c.title)}</h1><div class="score ${scoreClass(c.score)}">${e(c.score)}</div>${Object.entries(c.dimensions||{}).map(([k,v])=>`<div>${e(k.replaceAll('_',' '))}<div class="bar"><i style="width:${v}%"></i></div></div>`).join('')}`,'wide')}${card('Learning loop',`<pre>Signal → Gap Card → Micro-Module → Practice → Live Use → Result → Shared Update</pre><p class="muted">Durable customer/profile/KB changes require review.</p>`)}${card('Proposed updates',c.proposals.map(p=>`<div class="proposal"><span class="pill">${e(p.type)}</span> <span class="pill">${Math.round(p.confidence*100)}%</span><p>${e(p.text)}</p><div class="actions">${p.status==='pending'?`<button class="approve" onclick="decide('${c.id}','${p.id}','approve')">Approve</button><button class="reject" onclick="decide('${c.id}','${p.id}','reject')">Reject</button>`:`<span class="pill">${e(p.status)}</span>`}</div></div>`).join(''),'full')}${card('Ingest call / transcript result',`<p class="muted">Adapters can post normalized Read AI, calendar-linked, manual, or future meeting-source output to the ingestion endpoint.</p><textarea id="ingest" rows="6">{"title":"Customer technical call","source":"manual","dimensions":{"discovery":80,"technical_reasoning":82,"stakeholder_coverage":75,"expectation_setting":84,"evidence_discipline":88,"communication":85,"follow_through":80},"proposals":[]}</textarea><button onclick="ingest()">Ingest normalized call</button>`,'full')}</div>`}
function knowledge(){return `<div class="grid">${card('Shared knowledge',state.knowledge.map(k=>`<div class="proposal"><span class="pill">${e(k.level)}</span><span class="pill">${e(k.status)}</span><h3>${e(k.title)}</h3><p>${e(k.summary)}</p></div>`).join(''),'wide')}${card('Competence map',Object.entries(state.competence).map(([k,v])=>`<div>${e(k)} <span class="pill ${scoreClass(v)}">${v}%</span><div class="bar"><i style="width:${v}%"></i></div></div>`)}${card('Evolution engine',`<p>Watches repeated manual work, recurring support issues, milestone variance, missing KB answers, Engineering escalations, skipped fields, CSM workarounds and expansion patterns.</p><p><b>May propose:</b> fields, playbooks, modules, runbooks, integrations, workflows, automations and product ideas.</p><p class="bad"><b>May not:</b> silently rewrite production behavior or perform customer-impacting actions.</p>`,'full')}</div>`}
function render(){document.getElementById('app').innerHTML=active===tabs[0]?account():active===tabs[1]?precall():active===tabs[2]?technical():active===tabs[3]?postcall():knowledge()}
async function decide(call_id,proposal_id,decision){await fetch('/api/proposal',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({call_id,proposal_id,decision})});await load()}
async function research(){const q=document.getElementById('researchQ').value.trim();if(!q)return;const el=document.getElementById('researchOut');el.textContent='Researching…';const r=await fetch('/api/research',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:q,environment:state.account.environment})}).then(r=>r.json());el.textContent=JSON.stringify(r,null,2)}
async function ingest(){try{const b=JSON.parse(document.getElementById('ingest').value);await fetch('/api/ingest',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});await load()}catch(e){alert(e.message)}}
load();
</script></body></html>`; }

export default {
  async fetch(req,env){
    const u=new URL(req.url);
    if(u.pathname==="/health") return json({ok:true,product:"vidcrm",auth_configured:Boolean(env.VIDCRM_DEMO_PASSWORD_SHA256&&env.VIDCRM_SESSION_SECRET),control_plane:Boolean(env.CONTROL_PLANE)});
    if(u.pathname==="/login"&&req.method==="GET") return html(loginPage());
    if(u.pathname==="/login"&&req.method==="POST"){
      if(!env.VIDCRM_DEMO_PASSWORD_SHA256||!env.VIDCRM_SESSION_SECRET) return html(loginPage("Authentication is not configured on this deployment."),503);
      const form=await req.formData(); const actual=await sha256(String(form.get("password")||"")); if(actual!==env.VIDCRM_DEMO_PASSWORD_SHA256) return html(loginPage("Invalid password."),401);
      const token=await makeSession(env); return new Response(null,{status:303,headers:{location:"/","set-cookie":`vidcrm_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}});
    }
    if(!(await validSession(req,env))) return u.pathname.startsWith("/api/")?json({error:"unauthorized"},401):html(loginPage());
    if(u.pathname==="/"&&req.method==="GET"){ await emit(env,"workspace","view"); return html(appPage(),200,{"content-security-policy":"default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; connect-src 'self' https://www.google-analytics.com https://analytics.google.com; img-src 'self' data: https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"}); }
    if(u.pathname==="/api/state"&&req.method==="GET") return hub(env).fetch(new Request("https://hub/state"));
    if(u.pathname==="/api/proposal"&&req.method==="POST") return hub(env).fetch(new Request("https://hub/proposal",{method:"POST",headers:req.headers,body:req.body,duplex:"half"}));
    if(u.pathname==="/api/ingest"&&req.method==="POST"){ await emit(env,"call_capture","ingest"); return hub(env).fetch(new Request("https://hub/ingest",{method:"POST",headers:req.headers,body:req.body,duplex:"half"})); }
    if(u.pathname==="/api/research"&&req.method==="POST"){ const b=await req.json(); await emit(env,"environment_advisory","research",{query_length:String(b.query||"").length}); return json(await cpResearch(env,String(b.query||""),{environment:b.environment||{},evidence_policy:{tier_a:"standards/vendor docs",tier_b:"verified internal implementation history",tier_c:"practitioner/community discussion",emerging_practice_requires_review:true}})); }
    return json({error:"not_found"},404);
  }
};
