from pathlib import Path
import base64
import hashlib
import zlib

EXPECTED_PARTS = 8
EXPECTED_SHA256 = "f45b27a553d1a2b533868a3668688b1b480aa6a540406e3c1e5866d249f3261f"

parts = [Path(f"payload/part{i:02}.txt") for i in range(1, EXPECTED_PARTS + 1)]
missing = [str(path) for path in parts if not path.exists()]
if missing:
    raise SystemExit(f"Missing payload parts: {', '.join(missing)}")

payload = "".join(path.read_text().strip() for path in parts)
site_bytes = zlib.decompress(base64.b64decode(payload))
actual_sha256 = hashlib.sha256(site_bytes).hexdigest()
if actual_sha256 != EXPECTED_SHA256:
    raise SystemExit(f"Artifact hash mismatch: {actual_sha256}")

out = Path("dist")
out.mkdir(exist_ok=True)
(out / "index.html").write_bytes(site_bytes)
(out / ".nojekyll").write_text("")
print(f"Built {out / 'index.html'} from {len(parts)} verified payload parts ({actual_sha256})")
