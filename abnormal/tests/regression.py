from pathlib import Path
import base64, gzip, re
src=Path('src/index.js').read_text(encoding='utf-8')
worker=Path('src/worker.js').read_text(encoding='utf-8')
enhancer=Path('src/enhancer.js').read_text(encoding='utf-8')

assert '@BN0Rm@LK0$H2026' not in src
assert '@BN0Rm@LK0$H2026' not in worker
assert '@BN0Rm@LK0$H2026' not in enhancer
assert '04df7e1d9915c05c8b9af3f7ebedddccdd48361b04c382706c38d9bb072b7abb' in worker
assert 'noindex, nofollow, noarchive' in worker
assert 'enhanceApp' in worker
assert 'an_demo_attribution_v1' in worker

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

# Editable demo workspace guardrails
for required in [
    'an_demo_workspace_v2',
    'localStorage.setItem',
    'localStorage.getItem',
    'demo_account_updated',
    'demo_account_added',
    'demo_account_removed',
    'demo_account_watch_toggled',
    'demo_account_exec_toggled',
    'demo_data_regenerated',
    'demo_daily_regenerated',
    'demo_daily_refresh_changed',
    'Regenerate',
    '+ Add account',
    'Additional information',
    'Changes persist after locking',
]:
    assert required in enhancer, f'missing workspace feature: {required}'

# Analytics / Google Ads compatible dataLayer variables. No account names or notes are sent.
for required in [
    'window.dataLayer',
    'window.gtag',
    'window.clintwareDemoTracking',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'gclid',
    'gbraid',
    'wbraid',
    'demo_account_count',
    'demo_modified_count',
    'demo_daily_refresh',
]:
    assert required in enhancer or required in worker, f'missing tracking variable: {required}'

assert "demo_account_name" not in enhancer
assert "demo_notes" not in enhancer
print('PASS: privacy/product/editable-persistence/daily-reset/analytics guardrails')
