from pathlib import Path
import base64
import hashlib

PARTS = Path('payloads/teamsgallery')
OUTPUT = Path('public/teamsgallery/austin-corner-office-01.jpg')
EXPECTED_SHA256 = '94b9e99c5dce6c791970fe864c50b9121984573420101d1b210cefd1b3db0efc'

part_paths = [PARTS / f'austin-corner-office-01.part{i}.txt' for i in range(1, 7)]
missing = [str(path) for path in part_paths if not path.is_file()]
if missing:
    raise SystemExit('Missing Teams gallery image payload part(s): ' + ', '.join(missing))

encoded = ''.join(path.read_text(encoding='ascii').strip() for path in part_paths)
# Base64 padding belongs only at the end. Normalize any padding that may have
# landed on a chunk boundary before validating the reconstructed payload.
encoded = encoded.replace('=', '')
encoded += '=' * (-len(encoded) % 4)
try:
    payload = base64.b64decode(encoded, validate=True)
except Exception as exc:
    raise SystemExit(f'Invalid Teams gallery image payload: {exc}') from exc

if not payload.startswith(b'\xff\xd8\xff') or not payload.endswith(b'\xff\xd9'):
    raise SystemExit('Decoded Teams gallery asset is not a complete JPEG')

actual_sha256 = hashlib.sha256(payload).hexdigest()
if actual_sha256 != EXPECTED_SHA256:
    raise SystemExit(f'Teams gallery JPEG checksum mismatch: {actual_sha256}')

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_bytes(payload)
print(f'Materialized {OUTPUT} ({len(payload)} bytes, sha256={actual_sha256}).')
