from pathlib import Path
import base64, gzip, re
src=Path('src/index.js').read_text(encoding='utf-8')
worker=Path('src/worker.js').read_text(encoding='utf-8')
assert '@BN0Rm@LK0$H2026' not in src
assert '@BN0Rm@LK0$H2026' not in worker
assert '04df7e1d9915c05c8b9af3f7ebedddccdd48361b04c382706c38d9bb072b7abb' in worker
assert 'noindex, nofollow, noarchive' in worker
m=re.search(r'const APP_GZ_B64="([A-Za-z0-9+/=]+)"',src)
assert m, 'compressed app bundle missing'
html=gzip.decompress(base64.b64decode(m.group(1))).decode('utf-8')
assert 'G-DCY144YM9P' in html
assert 'Identity Threat Protection' in html
assert 'AI Governance' in html
assert 'Infiltration Prevention' in html
assert 'AI App Store' in html
assert 'Human approval' in html and 'Next decision' in html
assert 'synthetic data only' in html.lower()
print('PASS: password/privacy/product/analytics guardrails')
