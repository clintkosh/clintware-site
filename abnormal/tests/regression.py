from pathlib import Path
src=Path('src/index.js').read_text(encoding='utf-8')
config=Path('wrangler.jsonc').read_text(encoding='utf-8')
assert '@BN0Rm@LK0$H2026' not in src
assert '04df7e1d9915c05c8b9af3f7ebedddccdd48361b04c382706c38d9bb072b7abb' in src
assert 'HttpOnly; SameSite=Strict' in src
assert 'noindex, nofollow, noarchive' in src
assert 'G-DCY144YM9P' in src
assert 'an.clintware.com' in config
assert 'custom_domain' in config
print('PASS: password/privacy/analytics/custom-domain guardrails')
