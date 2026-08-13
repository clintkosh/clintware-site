from pathlib import Path
import re,base64,gzip
root=Path(__file__).resolve().parents[1]
worker=(root/'src/index.js').read_text()
config=(root/'wrangler.jsonc').read_text()

# ABC is an exact ZS application baseline with an Abnormal-specific presentation,
# customer model, health weighting, and the existing Abnormal demo credential.
for marker in [
    "const PASS='@BN0Rm@LK0$H2026',SESSION_KEY='abnormal_enterprise_demo_access'",
    'abnormal-enterprise-customer-success',
    'abc.clintware.com',
    'Enterprise Customer Success Command Center',
    'Lone Mesa Energy',
    'Trinity Ridge Financial',
    'Crescent City Hospitality',
    'Natural State Utilities',
    'Metroplex Media Group',
    'Email Security',
    'Identity Threat Protection',
    'AI Security Mailbox',
    'AI Phishing Coach',
    'AI Governance',
    'adoption:30',
    'valueRealization:25',
    'stakeholderAlignment:20',
    'riskAndEscalation:15',
    'renewalAndGrowth:10',
    'Velocity',
    'Ownership',
    'Intellectual Honesty',
    'Customer Obsession',
    'Excellence',
    'Voice of Customer',
    'Customer Cadence',
    'Engagement Coverage',
    'Value & Growth',
    '#ff3b88',
    '#ff6957',
    '#a565ff',
    '#07070b',
    'No generated customer recommendations',
    'dtex-client-gate-abnormal',
]:
    assert marker in worker, marker

assert "2$C@L3RK0S$H2026" not in worker
assert 'PASSWORD_SHA256' not in worker
assert 'request.formData()' not in worker
assert 'Set-Cookie' not in worker
assert '"name": "abnormal-enterprise-customer-success"' in config
assert '"main": "src/index.js"' in config

# Twenty fictional TOLA enterprise profiles are required.
profile_names=[
'Lone Mesa Energy','Trinity Ridge Financial','Bluebonnet Health Network','Red River Logistics',
'Hill Country Software','GulfStar Manufacturing','Alamo Retail Group','Brazos Research Systems',
'SoonerCloud Systems','Tulsa Industrial Partners','Prairie Health Cooperative','Crescent City Hospitality',
'Pelican Financial Services','Bayou Energy Services','DeltaPort Logistics','Ozark Regional Health',
'River Valley Manufacturing','Natural State Utilities','Cypress Education Network','Metroplex Media Group']
for name in profile_names:
    assert name in worker, name
assert len(profile_names)==20
assert '.example' in worker

# The compressed application remains the current ZS/DTEX operating baseline so
# account editing, stakeholders, success plans, technical lifecycle, meetings,
# notes, commercial records, risks, meeting brief PDF, and persistence stay intact.
parts=[]
for p in sorted((root/'src').glob('app-part*.js')):
    text=p.read_text()
    parts.append(re.search(r'"([A-Za-z0-9+/=]+)"',text).group(1))
html=gzip.decompress(base64.b64decode(''.join(parts))).decode()
for text in [
    'Post-Sales Business Operations','Command Center','Seed Demo Accounts','Clear Accounts',
    'Add your first account','Stakeholders','Meetings','Notes','Start date','End date','Renewal date',
    'Generate meeting brief','Renewal & Readiness','Playbook library','Business Rhythm','Capacity',
    'Finance','Intake','KPIs','Edit technical details','Edit commercial details','download-brief-pdf',
    'data-edit-account','data-edit-contact','data-edit-success','data-edit-meeting','data-edit-note',
    'data-edit-commercial','data-add-risk','data-edit-risk','localStorage'
]:
    assert text in html, text
assert 'AI Insights' not in html
assert html.count('Chief Information') >= 2
assert 'VP, IT Operations' in html
assert 'clear-accounts' in html and 'seed-accounts' in html
assert 'data.accounts=[]' in html and "route='accounts'" in html
assert "THEME='zs_ops_theme_v2'" in html
assert "document.documentElement.dataset.theme" in html
assert 'function top(){' not in html
assert 'function renderTopBar(){' in html
assert 'renderTopBar()}<main class="shell">${page()}' in html
assert not re.search(r'\btop\s*\(', html)

print('PASS: ABC preserves ZS functionality while applying Abnormal visual, TOLA, VOICE, and enterprise-CS model')
