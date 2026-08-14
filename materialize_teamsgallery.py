from pathlib import Path
import base64
import hashlib

PARTS = Path('payloads/teamsgallery/v2')
OUTPUT = Path('public/teamsgallery/austin-corner-office-01.jpg')
EXPECTED_SHA256 = '94b9e99c5dce6c791970fe864c50b9121984573420101d1b210cefd1b3db0efc'
EXPECTED_PART_SHA256 = [
    '8751d733a8d9c31e24d7f575b0ca1e6230039c6e36b6a256ec656577b17d39d5',
    'd13cc48ba57d1aadc4f0860da910c4ef780a721355eae426a8ec6a16b07ecfc4',
    '990d1f471bdbc8babf1fef07f8f24fe89f29ee0300c27019e4eb59ca074214c2',
    'b5dbde23a318007f5bfd50698cadddaf36f578d132d5968a7a6ed0c935e2da0f',
    '35ef2194e04a6cc86de0f8c39782546bb8a68c9ac210a5beeef44703862dfe62',
    'e093ca19cc3f0dc4cb429deb4c5e9aa6be4bda863516b5304869651a1fc9725d',
    'e3c62972fc862d18412d33baea9cf954f3999ada9f89951078bde230a0d068d7',
    '57e296875972d38d07b2ff71b97fd39f4428fff3b8caf47627d40b017e55c4fd',
]

part_paths = [PARTS / f'austin-corner-office-01.part{i}.txt' for i in range(1, 9)]
missing = [str(path) for path in part_paths if not path.is_file()]
if missing:
    raise SystemExit('Missing Teams gallery image payload part(s): ' + ', '.join(missing))

chunks = []
for index, (path, expected_sha256) in enumerate(zip(part_paths, EXPECTED_PART_SHA256), start=1):
    encoded = path.read_text(encoding='ascii').strip()
    try:
        chunk = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise SystemExit(f'Invalid Teams gallery image payload part {index}: {exc}') from exc
    actual_part_sha256 = hashlib.sha256(chunk).hexdigest()
    if actual_part_sha256 != expected_sha256:
        raise SystemExit(
            f'Teams gallery payload part {index} checksum mismatch: {actual_part_sha256}'
        )
    chunks.append(chunk)

payload = b''.join(chunks)
if not payload.startswith(b'\xff\xd8\xff') or not payload.endswith(b'\xff\xd9'):
    raise SystemExit('Decoded Teams gallery asset is not a complete JPEG')

actual_sha256 = hashlib.sha256(payload).hexdigest()
if actual_sha256 != EXPECTED_SHA256:
    raise SystemExit(f'Teams gallery JPEG checksum mismatch: {actual_sha256}')

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_bytes(payload)
print(f'Materialized {OUTPUT} ({len(payload)} bytes, sha256={actual_sha256}).')
