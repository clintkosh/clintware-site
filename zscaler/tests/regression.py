from pathlib import Path
import re,base64,gzip
root=Path(__file__).resolve().parents[1]
worker=(root/'src/worker.js').read_text()
assert '2$C\\@L3RK0S$H2026' not in worker
assert '0758948c6837fc67872c56f1c95668556f9d755e654a65e6ff8de8973a045dc6' in worker
parts=[]
for p in sorted((root/'src').glob('app-part*.js')):
    text=p.read_text()
    assert '2$C\\@L3RK0S$H2026' not in text
    parts.append(re.search(r'"([A-Za-z0-9+/=]+)"',text).group(1))
html=gzip.decompress(base64.b64decode(''.join(parts))).decode()
for text in ['Seed Demo Accounts','Clear Accounts','Add your first account','Contacts','Meetings','Notes','Start date','End date','Renewal date','Executive review pack']:
    assert text in html, text
assert 'AI Insights' not in html
assert html.count('Chief Information') >= 2
assert 'VP, IT Operations' in html
assert 'clear-accounts' in html and 'seed-accounts' in html
assert 'data.accounts=[]' in html and "setRoute('accounts')" in html
print('regression checks passed')
