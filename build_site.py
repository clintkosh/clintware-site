from pathlib import Path
import re

PUBLIC = Path("public")
ANALYTICS_ID = "G-DCY144YM9P"
REQUIRED = [
    PUBLIC / "index.html",
    PUBLIC / "tools" / "index.html",
    PUBLIC / "blog" / "index.html",
    PUBLIC / "privacy" / "index.html",
    PUBLIC / "contact" / "index.html",
    PUBLIC / "robots.txt",
    PUBLIC / "sitemap.xml",
]

missing = [str(p) for p in REQUIRED if not p.is_file() or not p.stat().st_size]
if missing:
    raise SystemExit(f"Missing Clintware production files: {', '.join(missing)}")

for path in PUBLIC.rglob("*"):
    if path.is_file() and path.suffix.lower() in {".html", ".txt", ".xml", ".json", ".js", ".css"}:
        text = path.read_text(encoding="utf-8", errors="ignore")
        if "aggieland" in text.lower():
            raise SystemExit(f"Retired Aggieland name found in {path}")


def demo_id_for(path: Path) -> str:
    slug = path.parent.name.lower()
    overrides = {"summertime-crmdemo": "summertime_2026"}
    if slug in overrides:
        return overrides[slug]
    slug = re.sub(r"-?crmdemo$", "", slug)
    slug = re.sub(r"[^a-z0-9]+", "_", slug).strip("_") or "crm"
    return f"{slug}_2026"


def instrument_crm(path: Path) -> None:
    text = path.read_text(encoding="utf-8", errors="ignore")
    demo_id = demo_id_for(path)

    ga_head = f'''\n<!-- Clintware CRM analytics -->\n<script async src="https://www.googletagmanager.com/gtag/js?id={ANALYTICS_ID}"></script>\n<script>\nwindow.dataLayer=window.dataLayer||[];\nfunction gtag(){{dataLayer.push(arguments);}}\ngtag('js',new Date());\ngtag('config','{ANALYTICS_ID}',{{'anonymize_ip':true}});\n</script>\n'''

    theme_css = '''\n<style id="clintware-crm-theme">\n:root{color-scheme:light dark}.theme-toggle{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:112px}.theme-toggle .theme-icon{font-size:14px;line-height:1}\nbody.crm-dark{--paper:#0d1020;--white:#15182a;--ink:#f4f5f8;--muted:#a8adbc;--line:#2b3045;--shadow:0 16px 44px rgba(0,0,0,.28);background:var(--paper);color:var(--ink)}\nbody.crm-dark .main,body.crm-dark .detail{background:var(--paper)}body.crm-dark .card,body.crm-dark .kpi,body.crm-dark .play,body.crm-dark .renew,body.crm-dark .detail-box,body.crm-dark .modal-box,body.crm-dark .filters input,body.crm-dark .filters select,body.crm-dark .btn{background:var(--white);color:var(--ink);border-color:var(--line)}body.crm-dark .table th{background:#111528;color:#aeb4c6}body.crm-dark .table td{border-color:var(--line)}body.crm-dark .table tr.account:hover{background:#1b2035}body.crm-dark .notice{background:#28230f;border-color:#61531d;color:#f5df8a}body.crm-dark .bar{background:#2a2f43}body.crm-dark .pill{background:#262b3d;color:#d9ddea}body.crm-dark .pill.red{background:#3a2026;color:#ffadb5}body.crm-dark .pill.amber{background:#3a311d;color:#ffd77f}body.crm-dark .pill.green{background:#17362c;color:#8de1bd}body.crm-dark .pill.blue{background:#202a4c;color:#aebcff}body.crm-dark .btn.dark{background:#080a13;color:#fff;border-color:#30364e}body.crm-dark .btn.accent{background:var(--accent);border-color:var(--accent);color:#171721}\n.signal-result{display:grid;gap:7px}.signal-result b{font-size:12px}.signal-result span{display:block;font-size:11px;line-height:1.45}.signal-result .signal-meta{font-size:9px;text-transform:uppercase;letter-spacing:.08em;opacity:.72}\n@media(prefers-reduced-motion:no-preference){body,#crm,.main,.card,.kpi,.play,.renew,.detail-box,.modal-box,.btn,.filters input,.filters select{transition:background-color .18s ease,color .18s ease,border-color .18s ease}}\n</style>\n'''

    theme_js = '''\n<script id="clintware-crm-theme-js">\n(function(){const KEY='clintware-crm-theme',DEFAULT='dark';function apply(mode){const dark=mode==='dark';document.body.classList.toggle('crm-dark',dark);document.body.classList.toggle('crm-light',!dark);const b=document.getElementById('theme-toggle');if(b){b.setAttribute('aria-pressed',String(dark));b.title=dark?'Switch to light mode':'Switch to dark mode';b.innerHTML='<span class="theme-icon" aria-hidden="true">'+(dark?'☀':'◐')+'</span><span>'+(dark?'Light mode':'Dark mode')+'</span>';}}document.addEventListener('DOMContentLoaded',function(){const a=document.querySelector('.top-actions');if(a&&!document.getElementById('theme-toggle')){const b=document.createElement('button');b.type='button';b.id='theme-toggle';b.className='btn theme-toggle';a.insertBefore(b,a.firstChild);}apply(localStorage.getItem(KEY)||DEFAULT);const b=document.getElementById('theme-toggle');if(b)b.onclick=function(){const n=document.body.classList.contains('crm-dark')?'light':'dark';localStorage.setItem(KEY,n);apply(n);if(typeof gtag==='function')gtag('event','crm_theme_toggle',{theme:n});};});})();\n</script>\n'''

    signal_js = '''\n<script id="clintware-signal-engine">\n(function(){\n const rules=[\n  {id:'exec',w:10,keys:['sponsor','executive','leadership','champion left','reorg','re-org','stakeholder'],title:'Executive alignment reset',action:'Re-map the buying and operating committee, confirm the new executive owner, restate business outcomes, and get explicit agreement on the next proof point.',proof:'Updated stakeholder map + executive success criteria + dated follow-up.'},\n  {id:'renewal',w:10,keys:['renew','contract','procurement','budget','commercial','expiration','expires'],title:'Renewal recovery',action:'Build a renewal recovery plan now: isolate adoption and value gaps, assign owners and dates, quantify proof of value, and surface procurement dependencies before commercial negotiation dominates.',proof:'Renewal plan with risk owner, value evidence, dates, and decision path.'},\n  {id:'telemetry',w:9,keys:['telemetry','coverage','endpoint','sensor','agent offline','vdi','deployment gap','data missing'],title:'Coverage recovery',action:'Establish the current technical baseline, identify the affected population, assign a technical owner, set a recovery target, and verify progress on a short cadence.',proof:'Before/after coverage baseline + owner + recovery date.'},\n  {id:'support',w:9,keys:['support','sev','outage','bug','broken','incident','escalat','ticket','case'],title:'Escalation ownership',action:'Create one accountable owner, a status cadence, resolution criteria, executive communication plan, and a post-resolution trust-recovery checkpoint.',proof:'Incident timeline + resolution criteria + customer communication cadence.'},\n  {id:'ai',w:8,keys:['ai','shadow ai','copilot','chatgpt','agentic','llm','genai'],title:'AI risk discovery',action:'Map AI use cases, visibility gaps, policy concerns, stakeholders, and measurable success criteria, then scope the smallest evaluation that proves value.',proof:'AI use-case inventory + governance gaps + scoped evaluation criteria.'},\n  {id:'adoption',w:8,keys:['adoption','usage','inactive','not using','low use','stalled','rollout','enablement','training'],title:'Adoption recovery',action:'Identify the exact workflow or user cohort that stalled, determine the blocker, define a 30-day adoption milestone, and pair it with enablement and an accountable owner.',proof:'Usage baseline + target cohort + 30-day adoption metric.'},\n  {id:'value',w:7,keys:['qbr','ebr','value','roi','outcome','time saved','reduced','improved','success story'],title:'Value evidence package',action:'Convert the result into an executive-ready before/after story tied to the original objective, then use it to reinforce renewal confidence and open relevant expansion discovery.',proof:'One-page outcome story with baseline, result, business impact, and next objective.'},\n  {id:'leaver',w:7,keys:['leaver','departing','termination','terminated','offboarding','insider','exfiltration'],title:'High-risk user / leaver workflow',action:'Confirm the policy trigger, stakeholder handoff, investigative workflow, escalation criteria, and measurable response outcome for the affected user population.',proof:'Documented trigger-to-response workflow + ownership + outcome metric.'},\n  {id:'integration',w:6,keys:['integration','siem','soc','api','splunk','sentinel','connector'],title:'Integration workflow recovery',action:'Map the broken or missing handoff, validate data flow and ownership, define acceptance criteria, and confirm the downstream SOC workflow works end-to-end.',proof:'Verified integration path + acceptance test + operational owner.'},\n  {id:'privacy',w:6,keys:['privacy','legal','works council','compliance','gdpr','policy'],title:'Governance alignment',action:'Bring the privacy/legal stakeholder into the success plan, document the operating constraint, and redesign the rollout milestone so adoption can continue within approved controls.',proof:'Approved constraint + decision owner + compliant rollout milestone.'}\n ];\n function score(rule,text){return rule.keys.reduce((n,k)=>n+(text.includes(k)?rule.w:0),0);}\n function escapeHtml(s){return s.replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}\n document.addEventListener('DOMContentLoaded',function(){\n  const run=document.getElementById('modal-run'),tx=document.getElementById('modal-text'),res=document.getElementById('modal-result'),title=document.getElementById('modal-title');if(!run||!tx||!res)return;\n  run.onclick=function(){\n   const raw=tx.value.trim(),context=((title&&title.textContent)||'')+' '+raw,lower=context.toLowerCase();\n   if(!raw){res.innerHTML='<div class="signal-result"><b>Add a customer signal first.</b><span>Include what changed, who is affected, any timing or metric, and the customer outcome at risk.</span></div>';res.style.display='block';return;}\n   const ranked=rules.map(r=>({r,score:score(r,lower)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);\n   const nums=[...raw.matchAll(/(\\d{1,3})\\s*(days?|%)/gi)].map(m=>m[1]+m[2]);\n   const urgent=/urgent|today|immediately|critical|blocked|stopped|down|failed/.test(lower)||lower.match(/([1-8]?[0-9])\\s*days?/);\n   let primary,secondary;\n   if(ranked.length){primary=ranked[0].r;secondary=ranked[1]&&ranked[1].r;}else{primary={id:'discovery',title:'Signal clarification + success milestone',action:'Clarify the affected workflow, customer impact, stakeholder owner, timing, and measurable success condition. Then convert those facts into one dated next action instead of a generic follow-up.',proof:'Named owner + current baseline + target outcome + due date.'};}\n   let action=primary.action;\n   if(secondary&&secondary.id!==primary.id)action+=' In parallel: '+secondary.action.charAt(0).toLowerCase()+secondary.action.slice(1);\n   const urgency=urgent?'Priority: act today / next business day.':'Priority: schedule within the next customer-success cadence.';\n   const metrics=nums.length?'Detected timing/metric: '+nums.slice(0,3).join(', ')+'.':'Add a numeric baseline or deadline at the next touchpoint.';\n   res.innerHTML='<div class="signal-result"><div class="signal-meta">'+escapeHtml(primary.title)+(secondary?' + '+escapeHtml(secondary.title):'')+'</div><b>Recommended next move</b><span>'+escapeHtml(action)+'</span><b>Evidence to capture</b><span>'+escapeHtml(primary.proof)+'</span><span>'+escapeHtml(urgency+' '+metrics)+'</span></div>';\n   res.style.display='block';\n   if(typeof gtag==='function')gtag('event','crm_signal_recommendation',{signal_type:primary.id,secondary_signal:secondary?secondary.id:'none'});\n  };\n });\n})();\n</script>\n'''

    crm_events = f'''\n<script id="clintware-crm-analytics">\n(function(){{const demoId={demo_id!r};let unlocked=document.body.classList.contains('unlocked'),engagedSent=false;const send=(name,params={{}})=>{{if(typeof gtag==='function')gtag('event',name,Object.assign({{demo_id:demoId,host:location.hostname}},params));}};const engaged=()=>{{if(!engagedSent&&document.body.classList.contains('unlocked')){{engagedSent=true;send('crm_session_engaged');}}}};document.addEventListener('DOMContentLoaded',()=>{{send('crm_gate_view');const bo=new MutationObserver(()=>{{const now=document.body.classList.contains('unlocked');if(now&&!unlocked){{send('crm_unlock_success');engaged();}}unlocked=now;}});bo.observe(document.body,{{attributes:true,attributeFilter:['class']}});const ge=document.getElementById('gate-error');if(ge){{let last=ge.textContent.trim();new MutationObserver(()=>{{const cur=ge.textContent.trim();if(cur&&cur!==last)send('crm_unlock_failed');last=cur;}}).observe(ge,{{childList:true,characterData:true,subtree:true}});}}document.addEventListener('click',e=>{{const t=e.target.closest('a,button,tr.account');if(!t)return;if(t.matches('a[href*="csm-guide.pdf"]')){{send('crm_guide_open',{{guide_name:'csm_field_guide'}});engaged();}}if(t.matches('tr.account')){{send('crm_account_open',{{account_segment:t.dataset.segment||'synthetic'}});engaged();}}if(t.matches('.play button')){{const h=t.closest('.play')?.querySelector('h3');send('crm_playbook_run',{{playbook_type:h?h.textContent.trim().slice(0,80):'playbook'}});engaged();}}}});document.addEventListener('change',e=>{{if(e.target.matches('.filters input,.filters select')){{send('crm_filter_use',{{filter_type:e.target.id||e.target.name||e.target.tagName.toLowerCase()}});engaged();}}}});}});}})();\n</script>\n'''

    if ANALYTICS_ID not in text:
        text = text.replace("</head>", ga_head + theme_css + "</head>", 1)
    elif 'id="clintware-crm-theme"' not in text:
        text = text.replace("</head>", theme_css + "</head>", 1)
    if 'id="clintware-crm-theme-js"' not in text:
        text = text.replace("</body>", theme_js + "</body>", 1)
    if 'id="clintware-signal-engine"' not in text:
        text = text.replace("</body>", signal_js + "</body>", 1)
    if 'id="clintware-crm-analytics"' not in text:
        text = text.replace("</body>", crm_events + "</body>", 1)
    path.write_text(text, encoding="utf-8")


for crm_index in PUBLIC.glob("*crmdemo/index.html"):
    instrument_crm(crm_index)

published_html = [Path("index.html")]
for section in ("blog", "consulting", "public", "ranchledger", "tools"):
    published_html.extend(Path(section).rglob("*.html"))

missing_analytics=[]
analytics_checked=0
for path in published_html:
    analytics_checked+=1
    text=path.read_text(encoding="utf-8",errors="ignore")
    if ANALYTICS_ID not in text or "gtag('config'" not in text:
        missing_analytics.append(str(path))
if missing_analytics:
    raise SystemExit("Google Analytics is missing or incomplete in: "+", ".join(missing_analytics))
print(f"Validated Clintware homepage bundle in {PUBLIC} ({len(REQUIRED)} required files, {analytics_checked} analytics-enabled pages).")
