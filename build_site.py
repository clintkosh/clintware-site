from pathlib import Path
import base64
import hashlib
import zlib

EXPECTED_PARTS = 8
EXPECTED_SHA256 = "f45b27a553d1a2b533868a3668688b1b480aa6a540406e3c1e5866d249f3261f"
CUSTOM_DOMAIN = "audiolab.clintware.com"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one {label} match, found {count}")
    return text.replace(old, new, 1)


def patch_site(site_bytes: bytes) -> bytes:
    html = site_bytes.decode("utf-8")
    engine_source = Path("audio-engine.js").read_text()
    old_start = html.index("async function synthesizeDemo(payload) {")
    old_end = html.index("\nasync function processSourceDemo", old_start)
    browser_adapter = f"""{engine_source}

async function synthesizeDemo(payload) {{
  const song = AudioLabEngine.renderSongSamples(payload);
  const buffer = audioContext.createBuffer(2, song.channels[0].length, song.sampleRate);
  buffer.copyToChannel(song.channels[0], 0);
  buffer.copyToChannel(song.channels[1], 1);
  return buffer;
}}
"""
    html = html[:old_start] + browser_adapter + html[old_end:]

    html = replace_once(
        html,
        '<input id="duration" name="duration" type="range" min="10" max="180" step="5" value="30" />',
        '<input id="duration" name="duration" type="range" min="10" max="45" step="5" value="30" />',
        "duration limit",
    )
    html = replace_once(
        html,
        '<option value="instrumental">Instrumental</option><option value="vocal-texture">Vocal texture</option><option value="lead-vocals">Lead vocals</option>',
        '<option value="instrumental">Instrumental</option><option value="vocal-texture">Vocal texture</option><option value="lead-vocals">Lead-style vocal synth</option>',
        "vocal option",
    )
    html = replace_once(
        html,
        '<label class="check-row"><input id="rightsGenerate" type="checkbox" required /><span>I will use the output lawfully and understand generated results may require review before commercial release.</span></label>',
        '<p class="check-row">No legal checkbox. Generate, listen, and decide whether the result fits your project.</p>',
        "generation legal checkbox",
    )
    html = replace_once(
        html,
        "if (!prompt || !$('#rightsGenerate').checked) return showFormError($('#generateForm'));",
        "if (!prompt) return showFormError($('#generateForm'));",
        "generation checkbox guard",
    )
    html = replace_once(
        html,
        '<label class="check-row"><input id="rightsAdapt" type="checkbox" required /><span>I own this audio or have permission to adapt it.</span></label>',
        '<p class="check-row">Only upload audio you own or have permission to adapt.</p>',
        "adaptation legal checkbox",
    )
    html = replace_once(
        html,
        "if (!state.file || !$('#rightsAdapt').checked) return showFormError($('#adaptForm'));",
        "if (!state.file) return showFormError($('#adaptForm'));",
        "adaptation checkbox guard",
    )
    html = html.replace("Local demo engine ready", "Local composition engine ready")
    html = html.replace("Local demo preview", "Local composition render")
    return html.encode("utf-8")


def main() -> None:
    parts = [Path(f"payload/part{i:02}.txt") for i in range(1, EXPECTED_PARTS + 1)]
    missing = [str(path) for path in parts if not path.exists()]
    if missing:
        raise SystemExit(f"Missing payload parts: {', '.join(missing)}")

    payload = "".join(path.read_text().strip() for path in parts)
    source_bytes = zlib.decompress(base64.b64decode(payload))
    actual_sha256 = hashlib.sha256(source_bytes).hexdigest()
    if actual_sha256 != EXPECTED_SHA256:
        raise SystemExit(f"Artifact hash mismatch: {actual_sha256}")

    cname_path = Path("CNAME")
    if not cname_path.exists():
        raise SystemExit("Missing CNAME file")

    configured_domain = cname_path.read_text().strip()
    if configured_domain != CUSTOM_DOMAIN:
        raise SystemExit(
            f"CNAME mismatch: expected {CUSTOM_DOMAIN}, found {configured_domain or '<empty>'}"
        )

    site_bytes = patch_site(source_bytes)
    patched_sha256 = hashlib.sha256(site_bytes).hexdigest()
    out = Path("dist")
    out.mkdir(exist_ok=True)
    (out / "index.html").write_bytes(site_bytes)
    (out / "CNAME").write_text(f"{CUSTOM_DOMAIN}\n")
    (out / ".nojekyll").write_text("")
    print(
        f"Built {out / 'index.html'} from {len(parts)} verified payload parts "
        f"(source {actual_sha256}, patched {patched_sha256}) for https://{CUSTOM_DOMAIN}"
    )


if __name__ == "__main__":
    main()
