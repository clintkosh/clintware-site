from pathlib import Path
import re,base64,gzip
root=Path(__file__).resolve().parents[1]
worker=(root/'src/index.js').read_text()
config=(root/'wrangler.jsonc').read_text()
assert 'ZSClint2026' not in worker
assert '2$C\\@L3RK0S$H2026' not in worker
assert 'f6acf1768cd83f94d0a8b4c84e11c087612d11084e3dd829a6106617593102b2' in worker
for marker in ['SESSION_COOKIE', 'makeSession', 'verifySession', 'Set-Cookie', 'HttpOnly', 'SameSite=Strict', 'url.pathname === "/health/auth"', 'mode: "crm-redirect"', 'return redirect("/", `${SESSION_COOKIE}=', 'status: 302']:
    assert marker in worker, marker
assert 'history.replaceState' not in worker
assert 'mode: "direct-render"' not in worker
assert '"main": "src/index.js"' in config
parts=[]
for p in sorted((root/'src').glob('app-part*.js')):
    text=p.read_text()
    assert 'ZSClint2026' not in text
    assert '2$C\\@L3RK0S$H2026' not in text
    parts.append(re.search(r'"([A-Za-z0-9+/=]+)"',text).group(1))
html=gzip.decompress(base64.b64decode(''.join(parts))).decode()
for text in ['Command Center','Seed Demo Accounts','Clear Accounts','Add your first account','Stakeholders','Meetings','Notes','Start date','End date','Renewal date','Generate meeting brief','Renewal & Readiness','Playbook library','Business Rhythm','Capacity','Finance','Intake','KPIs']:
    assert text in html, text
assert 'AI Insights' not in html
assert html.count('Chief Information') >= 2
assert 'VP, IT Operations' in html
assert 'clear-accounts' in html and 'seed-accounts' in html
assert 'data.accounts=[]' in html and "route='accounts'" in html
assert "THEME='zs_ops_theme_v2'" in html
assert "document.documentElement.dataset.theme" in html
print('DTex-modeled regression and CRM-style redirect auth checks passed')
