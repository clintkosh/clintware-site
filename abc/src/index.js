import { APP_GZ_B64 } from "./app.js";

const GA_HEAD = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-DCY144YM9P"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments)};gtag('js',new Date());gtag('config','G-DCY144YM9P',{anonymize_ip:true,demo_name:'abnormal_enterprise_customer_success',hostname:location.hostname,page_path:location.pathname});</script>`;

const ABNORMAL_GATE_CSS = `<style id="abnormal-gate-css">
:root{--ab-pink:#ff3b88;--ab-coral:#ff6957;--ab-purple:#a565ff;--ab-bg:#07070b;--ab-panel:#111019;--ab-line:#2b2833;--ab-text:#f7f6f8;--ab-muted:#aaa6b4}
#gate{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 48% -18%,rgba(255,59,136,.18),transparent 35%),radial-gradient(circle at 88% 18%,rgba(165,101,255,.10),transparent 28%),radial-gradient(circle at 8% 90%,rgba(255,105,87,.08),transparent 30%),var(--ab-bg);color:var(--ab-text)}.gate-card{width:min(460px,100%);padding:32px;border:1px solid var(--ab-line);background:linear-gradient(180deg,rgba(17,16,25,.98),rgba(11,10,16,.98));border-radius:22px;box-shadow:0 36px 110px rgba(0,0,0,.55);position:relative;overflow:hidden}.gate-card:before{content:"";position:absolute;inset:0 0 auto;height:2px;background:linear-gradient(90deg,var(--ab-pink),var(--ab-coral),var(--ab-purple))}.gate-mark{display:flex;gap:6px;margin:0 0 24px}.gate-mark span{height:5px;border-radius:99px}.gate-mark span:nth-child(1){width:42px;background:var(--ab-pink)}.gate-mark span:nth-child(2){width:22px;background:var(--ab-coral)}.gate-mark span:nth-child(3){width:12px;background:var(--ab-purple)}.gate-kicker{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#c9c4d0;font-weight:900}.gate-card h1{font-size:28px;line-height:1.05;letter-spacing:-.045em;margin:8px 0 10px}.gate-card p{color:var(--ab-muted);line-height:1.6;margin:0 0 22px}.gate-card label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:900;color:#d9d4df;margin-bottom:7px}.gate-card input{width:100%;background:#09090e;border:1px solid #34303d;color:#fff;border-radius:11px;padding:13px 14px;outline:none}.gate-card input:focus{border-color:#8b6388;box-shadow:0 0 0 3px rgba(255,59,136,.10)}.gate-card button{width:100%;border:0;border-radius:11px;padding:13px;margin-top:12px;background:linear-gradient(90deg,#f23b7e,#e65468);color:#fff;font-weight:900;cursor:pointer}.gate-error{min-height:18px;color:#ff9aa4;font-size:12px;margin-top:9px}.gate-fine{font-size:10px;color:#77717e;margin-top:17px;line-height:1.55;border-top:1px solid #27242d;padding-top:14px}
#app{display:none}.unlocked #gate{display:none}.unlocked #app{display:block}
</style>`;

const ABNORMAL_GATE_HTML = `<main id="gate"><section class="gate-card"><div class="gate-kicker">Clintware private interview review</div><h1>Enterprise Customer Success Command Center</h1><div class="gate-mark" aria-hidden="true"><span></span><span></span><span></span></div><p>A synthetic enterprise cybersecurity Customer Success workspace built for interview review. Enter the existing Abnormal demo password to continue.</p><form id="access-form" autocomplete="off"><label for="pw">Access password</label><input id="pw" type="password" autocomplete="current-password" autofocus><button type="submit">Unlock demo</button><div id="gate-error" class="gate-error" role="alert"></div></form><div class="gate-fine">Synthetic data only. Human-reviewed, deterministic account health and readiness workflows. No generated customer recommendations.</div></section></main>`;

const ABNORMAL_GATE_JS = `<script id="dtex-gate-js">
const PASS='@BN0Rm@LK0$H2026',SESSION_KEY='abnormal_enterprise_demo_access',DEMO_ID='abnormal_enterprise_2026';
function sendEvent(n,p={}){if(typeof gtag==='function')gtag('event',n,Object.assign({demo_id:DEMO_ID,host:location.hostname},p))}
function unlock(){sessionStorage.setItem(SESSION_KEY,'1');document.body.classList.add('unlocked');document.title='Enterprise Customer Success Command Center'}
function lock(){sessionStorage.removeItem(SESSION_KEY);document.body.classList.remove('unlocked');document.title='Private Enterprise Customer Success Demo';document.getElementById('pw').value=''}
function bindGate(){const form=document.getElementById('access-form'),pw=document.getElementById('pw'),err=document.getElementById('gate-error');form.onsubmit=e=>{e.preventDefault();if(pw.value===PASS){err.textContent='';unlock();sendEvent('crm_unlock_success')}else{err.textContent='Incorrect password.';pw.select();sendEvent('crm_unlock_failed')}};if(sessionStorage.getItem(SESSION_KEY)==='1')unlock();sendEvent('crm_gate_view')}
document.addEventListener('DOMContentLoaded',bindGate);
</script>`;

const ABNORMAL_APP_CSS = `<style id="abnormal-app-theme">
html[data-theme="dark"]{--bg:#07070b!important;--bg2:#0b0a10!important;--panel:#111019!important;--panel2:#0d0b12!important;--surface:#111019!important;--surface2:#0d0b12!important;--card:#111019!important;--text:#f7f6f8!important;--ink:#f7f6f8!important;--muted:#aaa6b4!important;--line:#2b2833!important;--border:#2b2833!important;--accent:#ff3b88!important;--primary:#ff3b88!important;--accent2:#ff6957!important;--accent3:#a565ff!important;--good:#49e5b3!important;--warn:#ffb765!important;--bad:#ff7b86!important}
html[data-theme="light"]{--bg:#f8f6f9!important;--bg2:#f1edf3!important;--panel:#ffffff!important;--panel2:#fbf9fc!important;--surface:#ffffff!important;--surface2:#fbf9fc!important;--card:#ffffff!important;--text:#211a23!important;--ink:#211a23!important;--muted:#6f6573!important;--line:#ddd5e0!important;--border:#ddd5e0!important;--accent:#e52f75!important;--primary:#e52f75!important;--accent2:#e65b4d!important;--accent3:#8650d9!important;--good:#168f6c!important;--warn:#a96618!important;--bad:#bf3f50!important}
html[data-theme="dark"] body{background:radial-gradient(circle at 48% -20%,rgba(255,59,136,.10),transparent 30%),radial-gradient(circle at 92% 8%,rgba(165,101,255,.08),transparent 24%),#07070b!important;color:#f7f6f8!important}html[data-theme="light"] body{background:linear-gradient(180deg,#fbf9fc,#f5f1f6)!important;color:#211a23!important}
html[data-theme="dark"] .sidebar,html[data-theme="dark"] .topbar,html[data-theme="dark"] [class*="card"],html[data-theme="dark"] [class*="panel"],html[data-theme="dark"] [class*="modal"],html[data-theme="dark"] [class*="drawer"]{border-color:#2b2833!important}html[data-theme="dark"] button:focus-visible,html[data-theme="dark"] input:focus,html[data-theme="dark"] select:focus,html[data-theme="dark"] textarea:focus{outline-color:#ff3b88!important;box-shadow:0 0 0 3px rgba(255,59,136,.10)!important}
#abc-role-context{margin:0;padding:9px 16px;border-bottom:1px solid rgba(255,59,136,.24);background:linear-gradient(90deg,rgba(255,59,136,.08),rgba(255,105,87,.05),rgba(165,101,255,.07));font:700 10px/1.4 Inter,system-ui,sans-serif;letter-spacing:.01em;color:inherit}#abc-role-context b{color:#ff6ea7}#abc-role-context .abc-values{font-weight:600;opacity:.72;margin-left:8px}
#app [data-open]{color:#ff6ea7!important;font-weight:800}
#app [data-open]:hover{color:#ff97bd!important}
#app .abc-primary-action{background:linear-gradient(90deg,#f23b7e,#e65468)!important;border-color:transparent!important;color:#fff!important}
#app .abc-brand-mark{filter:hue-rotate(115deg) saturate(1.45) brightness(1.05)}
#app .abc-accent-link{color:#ff6ea7!important}
#app progress::-webkit-progress-value{background:linear-gradient(90deg,#ff3b88,#a565ff)!important}
#app [class*="progress"]>span,#app [class*="meter"]>span{background:linear-gradient(90deg,#ff3b88,#a565ff)!important}

</style>`;

const ABNORMAL_MODEL_SCRIPT = `<script id="abnormal-model-script">
(function(){
'use strict';
const KEY='zs_ops_dtex_model_v2',THEME='zs_ops_theme_v2',VERSION=4,RELOAD='abc_abnormal_model_reload_v4';
const profiles=[
['Lone Mesa Energy','Houston, TX','Energy',1850000,84,82,92,86,79,108,['Email Security','Identity Threat Protection'],'Reduce business email compromise exposure while proving executive-level security value.'],
['Trinity Ridge Financial','Dallas, TX','Financial Services',2400000,91,94,96,93,91,76,['Email Security','Identity Threat Protection','AI Security Mailbox'],'Sustain high adoption, quantify prevented-loss value, and expand identity protection coverage.'],
['Bluebonnet Health Network','Austin, TX','Healthcare',1320000,72,67,84,73,64,61,['Email Security','AI Security Mailbox'],'Increase advanced feature adoption and close an executive sponsorship gap before renewal.'],
['Red River Logistics','Fort Worth, TX','Logistics',970000,65,61,70,68,57,42,['Email Security'],'Recover adoption after a security-operations ownership change and stabilize renewal confidence.'],
['Hill Country Software','Austin, TX','SaaS',1180000,88,91,90,89,84,135,['Email Security','AI Governance'],'Connect AI-era security outcomes to roadmap adoption and measurable platform value.'],
['GulfStar Manufacturing','Houston, TX','Manufacturing',1560000,76,73,82,77,71,95,['Email Security','Identity Threat Protection'],'Improve stakeholder coverage and convert threat reduction evidence into an outcome-led EBR.'],
['Alamo Retail Group','San Antonio, TX','Retail',890000,81,79,88,83,75,119,['Email Security','AI Phishing Coach'],'Expand user-risk education while maintaining strong operational adoption and renewal readiness.'],
['Brazos Research Systems','College Station, TX','Technology',720000,69,64,76,70,62,54,['Email Security','AI Governance'],'Resolve a product workflow concern, rebuild trust, and restore measurable adoption momentum.'],
['SoonerCloud Systems','Oklahoma City, OK','SaaS',1040000,86,89,90,87,80,147,['Email Security','AI Security Mailbox'],'Scale automated remediation and document ROI for the next executive value review.'],
['Tulsa Industrial Partners','Tulsa, OK','Industrial',1260000,74,71,81,76,67,83,['Email Security','Identity Threat Protection'],'Multi-thread security and IT stakeholders while reducing unresolved technical risk.'],
['Prairie Health Cooperative','Norman, OK','Healthcare',840000,79,83,84,81,72,124,['Email Security','AI Security Mailbox'],'Increase administrative adoption and turn support history into a clear success plan.'],
['Crescent City Hospitality','New Orleans, LA','Hospitality',680000,63,58,69,61,51,36,['Email Security'],'Lead a coordinated risk-recovery plan after engagement and adoption declined.'],
['Pelican Financial Services','Baton Rouge, LA','Financial Services',1490000,90,92,94,91,88,156,['Email Security','Identity Threat Protection'],'Protect executive trust, quantify security outcomes, and identify responsible expansion paths.'],
['Bayou Energy Services','Lafayette, LA','Energy',1110000,77,74,85,79,70,68,['Email Security','AI Security Mailbox'],'Improve technical enablement and strengthen value evidence ahead of a near-term renewal.'],
['DeltaPort Logistics','Shreveport, LA','Logistics',760000,71,69,78,72,63,101,['Email Security'],'Build executive visibility around threat prevention, adoption gaps, and next measurable outcomes.'],
['Ozark Regional Health','Fayetteville, AR','Healthcare',930000,83,86,87,85,77,143,['Email Security','AI Phishing Coach'],'Broaden stakeholder participation and reinforce value through feature education and enablement.'],
['River Valley Manufacturing','Fort Smith, AR','Manufacturing',810000,68,62,75,69,59,49,['Email Security','Identity Threat Protection'],'Coordinate escalation recovery across Support and Product while restoring customer confidence.'],
['Natural State Utilities','Little Rock, AR','Utilities',1380000,87,85,91,88,82,132,['Email Security','Identity Threat Protection'],'Maintain executive alignment and validate measurable protection across critical operations.'],
['Cypress Education Network','Tyler, TX','Education',590000,75,78,80,76,66,115,['Email Security','AI Phishing Coach'],'Improve feature engagement and capture customer feedback for the next success-plan milestone.'],
['Metroplex Media Group','Dallas, TX','Media',1020000,82,80,86,84,74,88,['Email Security','AI Security Mailbox','AI Governance'],'Tie adoption to measurable security outcomes and prepare a data-rich renewal narrative.']
];
function dateIn(days){const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
function emailSlug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'account'}
function contact(id,name,title,level,lane,email,status='Active'){return{id,name,title,level,lane,email,status}}
function retune(force=false){
  let data;try{data=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return false}
  if(!data||!Array.isArray(data.accounts)||data.accounts.length===0)return false;
  if(!force&&data.abcAbnormalModelVersion===VERSION)return false;
  const original=data.accounts.slice(0,20);
  data.accounts=original.map((a,i)=>{
    const p=profiles[i%profiles.length],slug=emailSlug(p[0]),health=p[4],adoption=p[5],tech=p[6],value=p[7],stakeholder=p[8];
    a.name=p[0];a.segment='Enterprise';a.region=p[1];a.industry=p[2];a.arr=p[3];a.health=health;a.adoption=adoption;a.renewal=dateIn(p[9]);a.renewalDate=a.renewal;a.renewalDays=p[9];a.status=health<68?'At Risk':health<78?'Watch':'Healthy';
    a.summary=p[2]+' enterprise customer in '+p[1]+'. Success focus: '+p[11]+' Primary platform motion: '+p[10].join(', ')+'.';
    a.serviceOwner='Customer Success + Technical Success';a.technicalCoverage=tech;a.activeModules=p[10];a.valueEvidence=value;a.stakeholderStrength=stakeholder;a.commercialReadiness=Math.round((value+stakeholder+health)/3);a.accountExec='Enterprise AE — '+p[1];
    a.contacts=[
      contact('abc-ciso-'+i,'Jordan '+['Lee','Patel','Brooks','Nguyen'][i%4],'Chief Information Security Officer','C-Level','Executive sponsor','ciso@'+slug+'.example','Engaged'),
      contact('abc-vpit-'+i,'Morgan '+['Reed','Chen','Martinez','Howard'][i%4],'VP, IT Operations','VP','Business / IT sponsor','vp-it@'+slug+'.example','Active'),
      contact('abc-sec-'+i,'Taylor '+['Morgan','Davis','Ramirez','Collins'][i%4],'Director, Security Operations','Technical','Technical owner','security-ops@'+slug+'.example',health<68?'At Risk':'Active')
    ];
    a.successPlans=[
      {id:'abc-sp-'+i+'-1',objective:p[11],progress:Math.max(35,Math.min(94,adoption)),owner:'Customer Success + Customer Champion',proof:'Adoption trend, documented customer outcome, stakeholder validation, and next success milestone.'},
      {id:'abc-sp-'+i+'-2',objective:'Deliver an outcome-oriented executive review tied to security value.',progress:Math.max(30,Math.min(92,value)),owner:'CSM + Executive Sponsor',proof:'EBR/QBR connects platform usage and prevented threats to customer priorities and agreed next actions.'}
    ];
    a.risks=health<78?[{id:'abc-risk-'+i,title:health<68?'Adoption and renewal confidence below target':'Success-plan dependency requires follow-through',severity:health<68?'High':'Medium',owner:'CSM + Cross-functional team',status:'Open',mitigation:'Confirm owner and due date, coordinate required Product/Support/Engineering action, and communicate progress until customer confidence is restored.'}]:[];
    a.notes=[{id:'abc-note-'+i,date:new Date().toISOString().slice(0,10),text:'VOICE review: validate customer outcome, adoption signal, risk, stakeholder coverage, and next commitment before the next customer touchpoint.'}];
    a.meetings=[{id:'abc-mtg-'+i,date:new Date().toISOString().slice(0,10),type:'Executive Business Review',title:'Customer value and success review',attendees:'CSM, CISO, IT/Security leaders',notes:'Review measurable security outcomes, adoption, open risks, roadmap context, and next agreed customer actions.'}];
    return a;
  });
  data.abcAbnormalModelVersion=VERSION;
  data.abcRole='Sr. Customer Success Manager, Enterprise (TOLA)';
  data.abcValues=['Velocity','Ownership','Intellectual Honesty','Customer Obsession','Excellence'];
  data.healthModel={adoption:30,valueRealization:25,stakeholderAlignment:20,riskAndEscalation:15,renewalAndGrowth:10};
  if(data.settings&&data.settings.weights){Object.keys(data.settings.weights).forEach(k=>{const x=k.toLowerCase();if(x.includes('adoption'))data.settings.weights[k]=30;else if(x.includes('value'))data.settings.weights[k]=25;else if(x.includes('stakeholder')||x.includes('executive'))data.settings.weights[k]=20;else if(x.includes('risk')||x.includes('technical')||x.includes('support'))data.settings.weights[k]=15;else if(x.includes('renewal')||x.includes('commercial'))data.settings.weights[k]=10})}
  localStorage.setItem(KEY,JSON.stringify(data));return true;
}

function applyAbnormalVisualClasses(){document.querySelectorAll('#app button,#app a').forEach(el=>{const t=(el.textContent||'').trim();if(['Open all accounts','Add account','Generate meeting brief','Download PDF'].some(x=>t.includes(x)))el.classList.add('abc-primary-action');if(el.hasAttribute('data-open'))el.classList.add('abc-accent-link')});const brand=document.querySelector('#app header svg,#app nav svg,#app [class*="brand"] svg,#app [class*="logo"] svg');if(brand)brand.classList.add('abc-brand-mark')}
function applyAbnormalRuntimeCopy(){
  const root=document.getElementById('app');
  if(!root)return;
  const replacements=[
    ['CUSTOMER SUCCESS BUSINESS OPERATIONS','ENTERPRISE CUSTOMER SUCCESS'],
    ['Customer Success Business Operations','Enterprise Customer Success'],
    ['Post-Sales Business Operations','Enterprise Customer Success'],
    ['Business Rhythm','Value Realization'],
    ['Resource Rigor','Adoption & Enablement'],
    ['Finance Partnership','Renewal & Expansion'],
    ['Prioritization','Risk & Escalation'],
    ['Customer Outcomes','Voice of Customer'],
    ['Capacity & resource planning','Customer engagement coverage'],
    ['Resource planning should expose trade-offs, not hide them.','Customer coverage planning should expose risks and trade-offs, not hide them.'],
    ['A concise resource picture across Support, Technical Success, Professional Services, and Business Operations.','A concise coverage picture across enterprise CSM ownership, technical engagement, executive sponsorship, and customer-facing dependencies.'],
    ['Headcount plan','Customer coverage plan'],
    ['Modeled on the DTex Command Center flow: portfolio health → account drill-down → working records → meeting readiness, with the resource, finance, cadence, and prioritization layers required for a Business Operations leader.','Turn account health, success criteria, stakeholder context, product adoption, risk, and customer feedback into the next measurable customer action.'],
    ['DTex-style portfolio table with the business-operations signals this role needs.','Enterprise portfolio view of health, adoption, executive coverage, renewal timing, and value evidence.'],
    ['Open any account into a DTex-style working workspace: contract and metrics, stakeholders, success plan, technical/service context, meetings, notes, and commercial readiness.','Open any account into an enterprise Customer Success workspace: contract and metrics, stakeholders, success criteria, technical context, meetings, notes, risk, and renewal readiness.'],
  ];
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    let text=node.nodeValue||'',next=text;
    for(const [from,to] of replacements){if(next.includes(from))next=next.split(from).join(to)}
    if(next!==text)node.nodeValue=next;
  }
}

function observeAbnormalPresentation(){
  const root=document.getElementById('app');
  if(!root||root.dataset.abcObserver==='1')return;
  root.dataset.abcObserver='1';
  let applying=false,timer=null;
  const apply=()=>{
    if(applying)return;
    applying=true;
    try{applyAbnormalVisualClasses();applyAbnormalRuntimeCopy()}finally{applying=false}
  };
  const observer=new MutationObserver(()=>{
    if(applying)return;
    clearTimeout(timer);
    timer=setTimeout(apply,20);
  });
  observer.observe(root,{childList:true,subtree:true,characterData:true});
  apply();
}

function addContext(){const app=document.getElementById('app');if(!app||document.getElementById('abc-role-context'))return;const bar=document.createElement('div');bar.id='abc-role-context';bar.innerHTML='<b>Enterprise CS health model:</b> Adoption 30% · Value realization 25% · Stakeholder alignment 20% · Risk & escalation 15% · Renewal/growth 10% <span class="abc-values">VOICE: Velocity · Ownership · Intellectual Honesty · Customer Obsession · Excellence</span>';app.prepend(bar)}
if(!localStorage.getItem(THEME))localStorage.setItem(THEME,'dark');
document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{const changed=retune(false);addContext();observeAbnormalPresentation();applyAbnormalVisualClasses();applyAbnormalRuntimeCopy();[120,350,900,1600].forEach(ms=>setTimeout(()=>{applyAbnormalVisualClasses();applyAbnormalRuntimeCopy()},ms));if(changed&&sessionStorage.getItem(RELOAD)!=='1'){sessionStorage.setItem(RELOAD,'1');location.reload()}else if(!changed){sessionStorage.removeItem(RELOAD)}},40)});
document.addEventListener('click',e=>{[40,180,500].forEach(ms=>setTimeout(()=>{applyAbnormalVisualClasses();applyAbnormalRuntimeCopy()},ms));const t=e.target&&e.target.closest&&e.target.closest('#seed-top,#seed-accounts,[data-action="seed-accounts"],.seed-accounts');if(t)setTimeout(()=>{if(retune(true)){sessionStorage.setItem(RELOAD,'1');location.reload()}},180)},true);
})();
</script>`;

const STATIC_REPLACEMENTS = [
  ["Post-Sales Business Operations","Enterprise Customer Success"],
  ["Private role-mapped prototype.","Private role-mapped interview prototype."],
  ["Open critical roles","Open customer risks"],
  ["Business Rhythm","Customer Cadence"],
  ["Capacity","Engagement Coverage"],
  ["Finance","Value & Growth"],
  ["Intake","Voice of Customer"],
  ["Playbook library","Success playbook library"]
];

const ABNORMAL_ROLE_REPLACEMENTS = [
  ["CUSTOMER SUCCESS BUSINESS OPERATIONS","ENTERPRISE CUSTOMER SUCCESS"],
  ["Run the post-sales business with one operating picture.","Manage enterprise customer value, adoption, risk, and renewal readiness in one operating picture."],
  ["Modeled on the DTex Command Center flow: portfolio health → account drill-down → working records → meeting readiness, with the resource, finance, cadence, and prioritization layers required for a Business Operations leader.","Turn account health, success criteria, stakeholder context, product adoption, risk, and customer feedback into the next measurable customer action."],
  ["Impact over activity","Customer outcomes over activity"],
  ["Make operating signals easy to inspect, update, and carry into the next leadership decision.","Make customer signals easy to inspect, update, and carry into the next measurable customer action."],
  ["Accountability","Intellectual Honesty"],
  ["Headcount planning signal","Accounts requiring coordinated mitigation"],
  ["Commercial readiness window","Renewal and expansion readiness"],
  ["DTex-style portfolio table with the business-operations signals this role needs.","Enterprise portfolio view of health, adoption, executive coverage, renewal timing, and value evidence."],
  ["Renewal & commercial readiness","Renewal & growth readiness"],
  ["Timing together with evidence, coverage, and health.","Value evidence, stakeholder confidence, adoption, and timing together."],
  ["Lowest-health accounts and operating dependencies.","Accounts requiring coordinated risk mitigation and customer follow-through."],
  ["Role operating model","Enterprise Customer Success motion"],
  ["Structure across the core responsibilities in the listing.","Mapped to customer outcomes, adoption, risk, retention, and growth responsibilities in the role."],
  ["BUSINESS RHYTHM","VALUE REALIZATION"],
  ["MBR, QBR, AOP and executive reviews","Success criteria, ROI, QBRs/EBRs and measurable customer outcomes"],
  ["RESOURCE RIGOR","ADOPTION & ENABLEMENT"],
  ["Engagement Coverage, workload and headcount visibility","Feature engagement, best practices, roadmap education and technical coverage"],
  ["VALUE & GROWTH PARTNERSHIP","RENEWAL & EXPANSION"],
  ["Budget, forecast and investment visibility","Value evidence, executive confidence and commercial readiness"],
  ["PRIORITIZATION","RISK & ESCALATION"],
  ["Structured intake and decision transparency","Proactive health signals, coordinated mitigation and commitment follow-through"],
  ["CUSTOMER OUTCOMES","VOICE OF CUSTOMER"],
  ["Account context, evidence and readiness","Stakeholder feedback, product requests, success criteria and next actions"],
  ["Open any account into a DTex-style working workspace: contract and metrics, stakeholders, success plan, technical/service context, meetings, notes, and commercial readiness.","Open any account into an enterprise Customer Success workspace: contract and metrics, stakeholders, success criteria, technical context, meetings, notes, risk, and renewal readiness."],
];

function responseHeaders(type = "text/html; charset=utf-8") {
  return {
    "Content-Type": type,
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://*.google-analytics.com; img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
  };
}

async function gunzipBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

function applyAbnormalExperience(html) {
  let out = html;
  for (const [from,to] of STATIC_REPLACEMENTS) out = out.split(from).join(to);
  for (const [from,to] of ABNORMAL_ROLE_REPLACEMENTS) out = out.split(from).join(to);
  out = out.split('#ff00d4').join('#ff3b88').split('#061a52').join('#211a23').split('#4ac7ff').join('#ff6957');
  out = out.replace("</title>", `</title>${GA_HEAD}`);
  out = out.replace("</head>", `${ABNORMAL_GATE_CSS}${ABNORMAL_APP_CSS}${ABNORMAL_MODEL_SCRIPT}</head>`);
  out = out.replace(/<body([^>]*)>/i, `<body$1>${ABNORMAL_GATE_HTML}`);
  const bodyClose = out.toLowerCase().lastIndexOf("</body>");
  out = bodyClose >= 0 ? `${out.slice(0, bodyClose)}${ABNORMAL_GATE_JS}${out.slice(bodyClose)}` : `${out}${ABNORMAL_GATE_JS}`;
  return out;
}

async function loadApp() {
  return applyAbnormalExperience(await gunzipBase64(APP_GZ_B64));
}

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ ok: true, service: "abnormal-enterprise-customer-success", host: "abc.clintware.com" }), {
          headers: responseHeaders("application/json; charset=utf-8")
        });
      }

      if (url.pathname === "/health/auth") {
        const html = await loadApp();
        const appOk = html.includes("Enterprise Customer Success") && html.includes("Command Center") && html.includes("Seed Demo Accounts") && html.includes("Voice of Customer") && html.length > 10000;
        const gateOk = html.includes("Enterprise Customer Success Command Center") && html.includes("Unlock demo") && html.includes("SESSION_KEY='abnormal_enterprise_demo_access'") && html.includes("pw.value===PASS");
        const modelOk = html.includes("Lone Mesa Energy") && html.includes("Adoption 30%") && html.includes("Customer Obsession") && html.includes("AI Security Mailbox");
        return new Response(JSON.stringify({ ok: appOk && gateOk && modelOk, app: appOk, gate: gateOk, model: modelOk, mode: "dtex-client-gate-abnormal" }), {
          headers: responseHeaders("application/json; charset=utf-8")
        });
      }

      if (url.pathname === "/robots.txt") {
        return new Response("User-agent: *\nDisallow: /\n", { headers: responseHeaders("text/plain; charset=utf-8") });
      }

      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405, headers: responseHeaders("text/plain; charset=utf-8") });
      }

      return new Response(await loadApp(), { status: 200, headers: responseHeaders() });
    } catch (error) {
      console.error(JSON.stringify({ event: "worker_error", message: String(error) }));
      return new Response("Service temporarily unavailable.", { status: 500, headers: responseHeaders("text/plain; charset=utf-8") });
    }
  }
};
