from __future__ import annotations

import hashlib
import sys

from build_site import patch_site


source = sys.stdin.buffer.read()
built = patch_site(source)
checks = {
    "engine_embedded": b"AudioLabEngine.renderSongSamples" in built,
    "old_renderer_removed": b"const scale = [0, 3, 5, 7, 10, 12]" not in built,
    "generate_checkbox_removed": b"rightsGenerate" not in built,
    "adapt_checkbox_removed": b"rightsAdapt" not in built,
    "duration_honest": b'max="45"' in built,
    "composition_label": b"Local composition render" in built,
}
if not all(checks.values()):
    raise AssertionError(checks)

print(
    {
        "source_bytes": len(source),
        "built_bytes": len(built),
        "sha256": hashlib.sha256(built).hexdigest(),
        "checks": checks,
    }
)
