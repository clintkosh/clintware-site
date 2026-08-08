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
    """Inject only shared presentation/analytics plumbing.

    Deliberately does NOT inject recommendation engines, classifiers,
    signal analyzers, next-best-action logic, or free-text pattern inference.
    CRM business logic must remain explicit in the CRM source itself.
    """
    text = path.read_text(encoding="utf-8", errors="ignore")
    demo_id = demo_id_for(path)

    ga_head = f'''\n<!-- Clintware CRM analytics -->\n<script async src="https://www.googletagmanager.com/gtag/js?id={ANALYTICS_ID}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{ANALYTICS_ID}',{{'anonymize_ip':true}});</script>\n'''

    theme_css = '''\n<style id="clintware-crm-theme">\n:root{color-scheme:light dark}.theme-toggle{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:112px}\nbody.crm-dark{background:#0d1020;color:#f4f5f8}body.crm-light{background:#f6f7f4;color:#11121c}\n@media(prefers-reduced-motion:no-preference){body,.card,.kpi,.btn,input,select,textarea{transition:background-color .18s ease,color .18s ease,border-color .18s ease}}\n</style>\n'''

    theme_js = '''\n<script id="clintware-crm-theme-js">(function(){const KEY='clintware-crm-theme',DEFAULT='dark';function apply(mode){const dark=mode==='dark';document.body.classList.toggle('crm-dark',dark);document.body.classList.toggle('crm-light',!dark);const b=document.getElementById('theme-toggle');if(b){b.setAttribute('aria-pressed',String(dark));b.title=dark?'Switch to light mode':'Switch to dark mode';b.textContent=dark?'Light mode':'Dark mode';}}document.addEventListener('DOMContentLoaded',function(){const a=document.querySelector('.top-actions');if(a&&!document.getElementById('theme-toggle')){const b=document.createElement('button');b.type='button';b.id='theme-toggle';b.className='btn theme-toggle';a.insertBefore(b,a.firstChild);}apply(localStorage.getItem(KEY)||DEFAULT);const b=document.getElementById('theme-toggle');if(b)b.onclick=function(){const n=document.body.classList.contains('crm-dark')?'light':'dark';localStorage.setItem(KEY,n);apply(n);if(typeof gtag==='function')gtag('event','crm_theme_toggle',{theme:n});};});})();</script>\n'''

    crm_events = f'''\n<script id="clintware-crm-analytics">(function(){{const demoId={demo_id!r};let unlocked=document.body.classList.contains('unlocked'),engagedSent=false;const send=(name,params={{}})=>{{if(typeof gtag==='function')gtag('event',name,Object.assign({{demo_id:demoId,host:location.hostname}},params));}};const engaged=()=>{{if(!engagedSent&&document.body.classList.contains('unlocked')){{engagedSent=true;send('crm_session_engaged');}}}};document.addEventListener('DOMContentLoaded',()=>{{send('crm_gate_view');const bo=new MutationObserver(()=>{{const now=document.body.classList.contains('unlocked');if(now&&!unlocked){{send('crm_unlock_success');engaged();}}unlocked=now;}});bo.observe(document.body,{{attributes:true,attributeFilter:['class']}});const ge=document.getElementById('gate-error');if(ge){{let last=ge.textContent.trim();new MutationObserver(()=>{{const cur=ge.textContent.trim();if(cur&&cur!==last)send('crm_unlock_failed');last=cur;}}).observe(ge,{{childList:true,characterData:true,subtree:true}});}}document.addEventListener('click',e=>{{const t=e.target.closest('a,button,tr.account,tr.account-row');if(!t)return;if(t.matches('a[href*="csm-guide.pdf"]')){{send('crm_guide_open',{{guide_name:'csm_field_guide'}});engaged();}}if(t.matches('tr.account,tr.account-row')){{send('crm_account_open',{{account_segment:t.dataset.segment||'synthetic'}});engaged();}}}});document.addEventListener('change',e=>{{if(e.target.matches('.filters input,.filters select,.table-tools input,.table-tools select')){{send('crm_filter_use',{{filter_type:e.target.id||e.target.name||e.target.tagName.toLowerCase()}});engaged();}}}});}});}})();</script>\n'''

    if ANALYTICS_ID not in text:
        text = text.replace("</head>", ga_head + theme_css + "</head>", 1)
    elif 'id="clintware-crm-theme"' not in text:
        text = text.replace("</head>", theme_css + "</head>", 1)
    if 'id="clintware-crm-theme-js"' not in text:
        text = text.replace("</body>", theme_js + "</body>", 1)
    if 'id="clintware-crm-analytics"' not in text:
        text = text.replace("</body>", crm_events + "</body>", 1)

    # Guard against accidental reintroduction of the removed suggestion engine.
    forbidden_code_markers = (
        'id="clintware-signal-engine"',
        'const signalRules=',
        'function recommendSignal(',
        'crm_signal_recommendation',
        'crm_recommendation_approved',
    )
    found = [marker for marker in forbidden_code_markers if marker in text]
    if found:
        raise SystemExit(f"Forbidden recommendation/signal-engine code found in {path}: {', '.join(found)}")

    path.write_text(text, encoding="utf-8")


for crm_index in PUBLIC.glob("*crmdemo/index.html"):
    instrument_crm(crm_index)

published_html = [Path("index.html")]
for section in ("blog", "consulting", "public", "ranchledger", "tools"):
    published_html.extend(Path(section).rglob("*.html"))

missing_analytics = []
analytics_checked = 0
for path in published_html:
    analytics_checked += 1
    text = path.read_text(encoding="utf-8", errors="ignore")
    if ANALYTICS_ID not in text or "gtag('config'" not in text:
        missing_analytics.append(str(path))
if missing_analytics:
    raise SystemExit("Google Analytics is missing or incomplete in: " + ", ".join(missing_analytics))

print(f"Validated Clintware homepage bundle in {PUBLIC} ({len(REQUIRED)} required files, {analytics_checked} analytics-enabled pages).")
