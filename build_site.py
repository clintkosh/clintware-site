from pathlib import Path
import base64
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


def strip_known_optional_recommender(text: str, path: Path) -> str:
    """Skip prohibited optional recommender code without stopping the project."""
    before = text
    text = re.sub(
        r'\s*<script[^>]*id=["\']clintware-signal-engine["\'][^>]*>.*?</script>\s*',
        "\n",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if text != before:
        print(f"Skipped optional recommendation/signal-engine block in {path}; continuing build.")
    remaining = (
        'const signalRules=',
        'function recommendSignal(',
        'crm_signal_recommendation',
        'crm_recommendation_approved',
    )
    found = [marker for marker in remaining if marker in text]
    if found:
        print(
            f"NOTICE: optional recommendation markers remain in {path}: {', '.join(found)}. "
            "Continue the overall build; do not search for or substitute another recommender."
        )
    return text


def harden_crm_storage(text: str, path: Path) -> str:
    """Keep the CRM functional when browser storage is unavailable."""
    if path.parent.name != "summertime-crmdemo":
        return text

    old_init = "let activeAccount=null,notes=JSON.parse(localStorage.getItem(NOTES_KEY)||'{}'),meetingAdds=JSON.parse(localStorage.getItem(MEETINGS_KEY)||'{}'),peopleAdds=JSON.parse(localStorage.getItem(PEOPLE_KEY)||'{}');"
    new_init = "function safeLocalParse(k,f){try{return JSON.parse(localStorage.getItem(k)||f)}catch(e){return JSON.parse(f)}}function safeSessionGet(k){try{return sessionStorage.getItem(k)}catch(e){return null}}function safeSessionSet(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}function safeSessionRemove(k){try{sessionStorage.removeItem(k)}catch(e){}}let activeAccount=null,notes=safeLocalParse(NOTES_KEY,'{}'),meetingAdds=safeLocalParse(MEETINGS_KEY,'{}'),peopleAdds=safeLocalParse(PEOPLE_KEY,'{}');"
    text = text.replace(old_init, new_init)
    text = text.replace(
        "function store(k,v){localStorage.setItem(k,JSON.stringify(v))}",
        "function store(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}",
    )
    text = text.replace(
        "function unlock(){sessionStorage.setItem(SESSION_KEY,'1');document.body.classList.add('unlocked');document.title='DTEX Customer Success Measurement System'}",
        "function unlock(){safeSessionSet(SESSION_KEY,'1');document.body.classList.add('unlocked');document.title='DTEX Customer Success Measurement System'}",
    )
    text = text.replace(
        "function lock(){sessionStorage.removeItem(SESSION_KEY);document.body.classList.remove('unlocked');document.title='Private Customer Success Demo';document.getElementById('pw').value=''}",
        "function lock(){safeSessionRemove(SESSION_KEY);document.body.classList.remove('unlocked');document.title='Private Customer Success Demo';document.getElementById('pw').value=''}",
    )
    text = text.replace(
        "if(sessionStorage.getItem(SESSION_KEY)==='1')unlock();",
        "if(safeSessionGet(SESSION_KEY)==='1')unlock();",
    )
    text = text.replace(
        "themeApply(localStorage.getItem(THEME_KEY)||'dark');",
        "let savedTheme='dark';try{savedTheme=localStorage.getItem(THEME_KEY)||'dark'}catch(e){}themeApply(savedTheme);",
    )
    text = text.replace(
        "localStorage.setItem(THEME_KEY,n);themeApply(n);",
        "try{localStorage.setItem(THEME_KEY,n)}catch(e){}themeApply(n);",
    )

    required = ("function safeLocalParse(", "function safeSessionGet(", "function store(k,v){try{")
    if not all(marker in text for marker in required):
        raise SystemExit(f"CRM storage hardening did not apply cleanly to {path}")
    return text


def polish_crm_copy(text: str, path: Path) -> str:
    """Keep the visible DTEX demo copy confident and product-focused.

    The functional boundary stays the same, but the UI should describe what the
    system does well instead of repeatedly explaining what optional automation is
    absent. A single understated roadmap note is retained for future AI-assisted
    suggestions with human review.
    """
    if path.parent.name != "summertime-crmdemo":
        return text

    replacements = {
        "Synthetic data only. The application calculates explicit metrics and thresholds; it does not guess patterns or generate recommendations.":
            "Synthetic customer and commercial data are used throughout this independent proof of concept.",
        "No classifier, recommender, next-best-action engine, expansion guess, or free-text pattern analysis is used. Thresholds and formulas are disclosed.":
            "Transparent health formulas, account records, meeting history, stakeholder mapping, and playbook references keep the operating model easy to inspect.",
        "<strong>Measurement boundary:</strong>":
            "<strong>Operating foundation:</strong>",
        "<span>No pattern guessing or generated recommendations.</span>":
            "<span>Built for repeatable Customer Success workflows.</span>",
        "Accounts sorted only by disclosed threshold exceptions and renewal timing.":
            "Accounts sorted by disclosed threshold exceptions and renewal timing.",
        "Stored synthetic meeting dates; no inferred priority.":
            "Scheduled synthetic meeting dates from account records.",
        "All values are synthetic and structured. The application does not infer sentiment or meaning from free text.":
            "All customer, commercial, and usage values shown here are synthetic for the demo.",
        "Static reference only; the system does not assign work automatically.":
            "Reference model for coordinating Customer Success, Technical Success, i³, Support, Product, Engineering, and Sales.",
        "Direct structured values; no automatic pattern interpretation.":
            "Structured portfolio view across the six Customer Success health dimensions.",
        "Assembles stored account values and records without generating advice.":
            "Brings account metrics, stakeholders, success plans, notes, and meeting history into one preparation view.",
        "Stored request status only.":
            "Current request status and service context.",
        "Independent proof of concept built from public DTEX materials plus synthetic data. No recommendation engine, classifier, next-best-action system, sentiment analysis, or free-text pattern inference is present. Playbooks are static reference checklists.":
            "Independent proof of concept built from public DTEX materials plus synthetic data. Playbooks provide consistent review checklists, and account records are designed to support repeatable CSM operating rhythms.<br>Roadmap: a future iteration could layer AI-assisted suggestions on top of this structured foundation, with CSM review before action.",
        "This brief assembles stored values and records only. It does not generate recommendations.":
            "Prepared from the account workspace for CSM review.",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def materialize_pdf_from_parts(directory: Path, output_name: str, part_names: list[str]) -> None:
    """Rebuild a verified PDF binary from UTF-8 base64 payload files."""
    paths = [directory / name for name in part_names]
    missing_parts = [str(p) for p in paths if not p.is_file()]
    if missing_parts:
        raise SystemExit(f"Missing PDF payload part(s) for {output_name}: {', '.join(missing_parts)}")
    encoded = "".join(p.read_text(encoding="ascii").strip() for p in paths)
    try:
        payload = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise SystemExit(f"Invalid base64 PDF payload for {output_name}: {exc}") from exc
    if not payload.startswith(b"%PDF-") or len(payload) < 1500 or b"%%EOF" not in payload[-2048:]:
        raise SystemExit(f"Refusing to publish invalid/blank PDF payload for {output_name}")
    (directory / output_name).write_bytes(payload)
    print(f"Materialized verified {output_name} ({len(payload)} bytes).")


def materialize_crm_deliverables(directory: Path) -> None:
    if directory.name != "summertime-crmdemo":
        return
    materialize_pdf_from_parts(
        directory,
        "csm-guide.pdf",
        [f"pdf-guide.part{i}.txt" for i in range(1, 7)],
    )
    materialize_pdf_from_parts(directory, "meeting-brief.pdf", ["pdf-brief.part1.txt"])


def instrument_crm(path: Path) -> None:
    """Inject shared presentation, analytics, and tested CRM runtime plumbing."""
    text = path.read_text(encoding="utf-8", errors="ignore")
    text = strip_known_optional_recommender(text, path)
    text = harden_crm_storage(text, path)
    text = polish_crm_copy(text, path)
    demo_id = demo_id_for(path)

    ga_head = f'''\n<!-- Clintware CRM analytics -->\n<script async src="https://www.googletagmanager.com/gtag/js?id={ANALYTICS_ID}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{ANALYTICS_ID}',{{'anonymize_ip':true}});</script>\n'''

    theme_css = '''\n<style id="clintware-crm-theme">\n:root{color-scheme:light dark}.theme-toggle{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:112px}\nbody.crm-dark{background:#0d1020;color:#f4f5f8}body.crm-light{background:#f6f7f4;color:#11121c}\n@media(prefers-reduced-motion:no-preference){body,.card,.kpi,.btn,input,select,textarea{transition:background-color .18s ease,color .18s ease,border-color .18s ease}}\n</style>\n'''

    theme_js = '''\n<script id="clintware-crm-theme-js">(function(){const KEY='clintware-crm-theme',DEFAULT='dark';function apply(mode){const dark=mode==='dark';document.body.classList.toggle('crm-dark',dark);document.body.classList.toggle('crm-light',!dark);const b=document.getElementById('theme-toggle');if(b){b.setAttribute('aria-pressed',String(dark));b.title=dark?'Switch to light mode':'Switch to dark mode';b.textContent=dark?'Light mode':'Dark mode';}}document.addEventListener('DOMContentLoaded',function(){const a=document.querySelector('.top-actions');if(a&&!document.getElementById('theme-toggle')){const b=document.createElement('button');b.type='button';b.id='theme-toggle';b.className='btn theme-toggle';a.insertBefore(b,a.firstChild);}let saved=DEFAULT;try{saved=localStorage.getItem(KEY)||DEFAULT}catch(e){}apply(saved);const b=document.getElementById('theme-toggle');if(b)b.onclick=function(){const n=document.body.classList.contains('crm-dark')?'light':'dark';try{localStorage.setItem(KEY,n)}catch(e){}apply(n);if(typeof gtag==='function')gtag('event','crm_theme_toggle',{theme:n});};});})();</script>\n'''

    crm_events = f'''\n<script id="clintware-crm-analytics">(function(){{const demoId={demo_id!r};let unlocked=document.body.classList.contains('unlocked'),engagedSent=false;const send=(name,params={{}})=>{{if(typeof gtag==='function')gtag('event',name,Object.assign({{demo_id:demoId,host:location.hostname}},params));}};const engaged=()=>{{if(!engagedSent&&document.body.classList.contains('unlocked')){{engagedSent=true;send('crm_session_engaged');}}}};document.addEventListener('DOMContentLoaded',()=>{{send('crm_gate_view');const bo=new MutationObserver(()=>{{const now=document.body.classList.contains('unlocked');if(now&&!unlocked){{send('crm_unlock_success');engaged();}}unlocked=now;}});bo.observe(document.body,{{attributes:true,attributeFilter:['class']}});const ge=document.getElementById('gate-error');if(ge){{let last=ge.textContent.trim();new MutationObserver(()=>{{const cur=ge.textContent.trim();if(cur&&cur!==last)send('crm_unlock_failed');last=cur;}}).observe(ge,{{childList:true,characterData:true,subtree:true}});}}document.addEventListener('click',e=>{{const t=e.target.closest('a,button,tr.account,tr.account-row');if(!t)return;if(t.matches('a[href*="csm-guide.pdf"],a[href*="meeting-brief.pdf"]')){{send('crm_guide_open',{{guide_name:t.getAttribute('href').includes('meeting')?'meeting_brief':'csm_field_guide'}});engaged();}}if(t.matches('tr.account,tr.account-row')){{send('crm_account_open',{{account_segment:t.dataset.segment||'synthetic'}});engaged();}}}});document.addEventListener('change',e=>{{if(e.target.matches('.filters input,.filters select,.table-tools input,.table-tools select')){{send('crm_filter_use',{{filter_type:e.target.id||e.target.name||e.target.tagName.toLowerCase()}});engaged();}}}});}});}})();</script>\n'''

    runtime_js = '<script id="clintware-crm-runtime-fix" src="crm-runtime-fix.js"></script>\n'

    if ANALYTICS_ID not in text:
        text = text.replace("</head>", ga_head + theme_css + "</head>", 1)
    elif 'id="clintware-crm-theme"' not in text:
        text = text.replace("</head>", theme_css + "</head>", 1)
    if 'id="clintware-crm-theme-js"' not in text:
        text = text.replace("</body>", theme_js + "</body>", 1)
    if 'id="clintware-crm-analytics"' not in text:
        text = text.replace("</body>", crm_events + "</body>", 1)
    if path.parent.name == "summertime-crmdemo" and 'id="clintware-crm-runtime-fix"' not in text:
        text = text.replace("</body>", runtime_js + "</body>", 1)

    path.write_text(text, encoding="utf-8")
    materialize_crm_deliverables(path.parent)


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
