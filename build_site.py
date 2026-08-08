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

missing = [str(path) for path in REQUIRED if not path.is_file() or not path.stat().st_size]
if missing:
    raise SystemExit(f"Missing Clintware production files: {', '.join(missing)}")

for path in PUBLIC.rglob("*"):
    if path.is_file() and path.suffix.lower() in {".html", ".txt", ".xml", ".json", ".js", ".css"}:
        text = path.read_text(encoding="utf-8", errors="ignore")
        if "aggieland" in text.lower():
            raise SystemExit(f"Retired Aggieland name found in {path}")


def demo_id_for(path: Path) -> str:
    slug = path.parent.name.lower()
    overrides = {
        "summertime-crmdemo": "summertime_2026",
    }
    if slug in overrides:
        return overrides[slug]
    slug = re.sub(r"-?crmdemo$", "", slug)
    slug = re.sub(r"[^a-z0-9]+", "_", slug).strip("_") or "crm"
    return f"{slug}_2026"


def instrument_crm(path: Path) -> None:
    text = path.read_text(encoding="utf-8", errors="ignore")
    demo_id = demo_id_for(path)

    ga_head = f'''\n<!-- Clintware CRM analytics -->\n<script async src="https://www.googletagmanager.com/gtag/js?id={ANALYTICS_ID}"></script>\n<script>\nwindow.dataLayer = window.dataLayer || [];\nfunction gtag(){{dataLayer.push(arguments);}}\ngtag('js', new Date());\ngtag('config', '{ANALYTICS_ID}', {{'anonymize_ip': true}});\n</script>\n'''

    crm_events = f'''\n<script id="clintware-crm-analytics">\n(function(){{\n  const demoId = {demo_id!r};\n  let unlocked = document.body.classList.contains('unlocked');\n  let engagedSent = false;\n  const send = (name, params={{}}) => {{\n    if (typeof window.gtag === 'function') {{\n      window.gtag('event', name, Object.assign({{demo_id: demoId, host: location.hostname}}, params));\n    }}\n  }};\n  const engaged = () => {{\n    if (!engagedSent && document.body.classList.contains('unlocked')) {{\n      engagedSent = true;\n      send('crm_session_engaged');\n    }}\n  }};\n\n  document.addEventListener('DOMContentLoaded', () => {{\n    send('crm_gate_view');\n\n    const bodyObserver = new MutationObserver(() => {{\n      const nowUnlocked = document.body.classList.contains('unlocked');\n      if (nowUnlocked && !unlocked) {{\n        send('crm_unlock_success');\n        engaged();\n      }}\n      unlocked = nowUnlocked;\n    }});\n    bodyObserver.observe(document.body, {{attributes:true, attributeFilter:['class']}});\n\n    const gateError = document.getElementById('gate-error');\n    if (gateError) {{\n      let lastError = gateError.textContent.trim();\n      new MutationObserver(() => {{\n        const current = gateError.textContent.trim();\n        if (current && current !== lastError) send('crm_unlock_failed');\n        lastError = current;\n      }}).observe(gateError, {{childList:true, characterData:true, subtree:true}});\n    }}\n\n    document.addEventListener('click', (event) => {{\n      const target = event.target.closest('a,button,tr.account');\n      if (!target) return;\n      if (target.matches('a[href*="csm-guide.pdf"]')) {{\n        send('crm_guide_open', {{guide_name:'csm_field_guide'}});\n        engaged();\n      }}\n      if (target.matches('tr.account')) {{\n        send('crm_account_open', {{account_segment: target.dataset.segment || 'synthetic'}});\n        engaged();\n      }}\n      if (target.matches('.play button')) {{\n        const card = target.closest('.play');\n        const heading = card && card.querySelector('h3');\n        send('crm_playbook_run', {{playbook_type: heading ? heading.textContent.trim().slice(0,80) : 'playbook'}});\n        engaged();\n      }}\n    }});\n\n    document.addEventListener('change', (event) => {{\n      if (event.target.matches('.filters input,.filters select')) {{\n        send('crm_filter_use', {{filter_type: event.target.id || event.target.name || event.target.tagName.toLowerCase()}});\n        engaged();\n      }}\n    }});\n  }});\n}})();\n</script>\n'''

    if ANALYTICS_ID not in text:
        text = text.replace("</head>", ga_head + "</head>", 1)
    if 'id="clintware-crm-analytics"' not in text:
        text = text.replace("</body>", crm_events + "</body>", 1)
    path.write_text(text, encoding="utf-8")


# Every neutral CRM demo is instrumented consistently at build time.
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
    raise SystemExit(
        "Google Analytics is missing or incomplete in: " + ", ".join(missing_analytics)
    )

print(
    f"Validated Clintware homepage bundle in {PUBLIC} "
    f"({len(REQUIRED)} required files, {analytics_checked} analytics-enabled pages)."
)
