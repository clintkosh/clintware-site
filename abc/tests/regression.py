from pathlib import Path
import re,base64,gzip
root=Path(__file__).resolve().parents[1]
worker=(root/'src/index.js').read_text()
config=(root/'wrangler.jsonc').read_text()

# Exact DTEX client-side gate markers, with the DTEX password preserved.
for marker in [
    "const PASS='DT3XK0$H2026',SESSION_KEY='summertime_demo_access',DEMO_ID='summertime_2026';",
    '<main id="gate"><section class="gate-card">',
    '<div class="gate-kicker">Restricted preview</div>',
    '<h1>Private Customer Success Demo</h1>',
    '<form id="access-form" autocomplete="off">',
    '<input id="pw" type="password" autocomplete="current-password" autofocus>',
    '<button type="submit">Unlock demo</button>',
    "function unlock(){sessionStorage.setItem(SESSION_KEY,'1');document.body.classList.add('unlocked');document.title='DTEX Customer Success Measurement System'}",
    "function lock(){sessionStorage.removeItem(SESSION_KEY);document.body.classList.remove('unlocked');document.title='Private Customer Success Demo';document.getElementById('pw').value=''}",
    "if(pw.value===PASS){err.textContent='';unlock();sendEvent('crm_unlock_success')}else{err.textContent='Incorrect password.';pw.select();sendEvent('crm_unlock_failed')}",
    "if(sessionStorage.getItem(SESSION_KEY)==='1')unlock();",
    '#app{display:none}.unlocked #gate{display:none}.unlocked #app{display:block}',
    'mode: "dtex-client-gate"',
]:
    assert marker in worker, marker

# Old server-side authentication must be gone.
for forbidden in [
    'PASSWORD_SHA256','request.formData()','url.pathname === "/login"','Set-Cookie',
    'SESSION_COOKIE','makeSession','verifySession','crm-direct-render','crm-redirect'
]:
    assert forbidden not in worker, forbidden

assert '"main": "src/index.js"' in config
parts=[]
for p in sorted((root/'src').glob('app-part*.js')):
    text=p.read_text()
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

# Browser-global regression: window.top already exists in browsers.  The app must
# never define a global top() function again or its initial render will abort.
assert 'function top(){' not in html
assert 'function renderTopBar(){' in html
assert 'renderTopBar()}<main class="shell">${page()}' in html
assert not re.search(r'\btop\s*\(', html)

print('ABC regression passed with exact DTEX client-side gate architecture and browser-safe app render')
