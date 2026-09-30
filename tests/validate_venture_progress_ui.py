from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
errors = []

registry = json.loads((ROOT / "public" / "data" / "venture-progress.json").read_text(encoding="utf-8"))
ventures = registry.get("ventures", [])

if not ventures:
    errors.append("venture progress registry is empty")

ids = [v.get("id") for v in ventures]
if len(ids) != len(set(ids)):
    errors.append("venture progress registry IDs must be unique")

for venture in ventures:
    mode = venture.get("surface_mode")
    if mode not in {"live", "scaffold"}:
        errors.append(f"{venture.get('id')} has invalid surface_mode")
    if not venture.get("current_proof") or not venture.get("next_gate"):
        errors.append(f"{venture.get('id')} must state current proof and next gate")
    if mode == "scaffold" and venture.get("metrics"):
        errors.append(f"{venture.get('id')} scaffold must not publish metric cards before a live evidence surface exists")
    if mode == "live" and not venture.get("progress_url"):
        errors.append(f"{venture.get('id')} live surface is missing progress_url")

portfolio = (ROOT / "public" / "startup" / "evidence" / "index.html").read_text(encoding="utf-8")
if '<details class="venture"' not in portfolio:
    errors.append("portfolio evidence journal must use progressive disclosure rows")
if "progress-card" in portfolio or "impact-card" in portfolio:
    errors.append("portfolio evidence journal must not become a KPI-card dashboard")
if "Empty metrics stay hidden" not in portfolio:
    errors.append("portfolio evidence journal must state the empty-metric boundary")

startup = (ROOT / "public" / "startup" / "index.html").read_text(encoding="utf-8")
if 'href="/startup/evidence/"' not in startup:
    errors.append("startup index must link the unified evidence journal")

ltp = (ROOT / "landtheplane-worker" / "src" / "index.js").read_text(encoding="utf-8")
for marker in ["progressRuns", "progressCoverage", "progressDelta", "progressEvidence"]:
    if f'id="{marker}"' not in ltp:
        errors.append(f"LandThePlane progress summary missing {marker}")
if ltp.count('class="progressMetric"') != 4:
    errors.append("LandThePlane progress summary must keep exactly four glanceable top metrics")
if 'class="progressDetails"' not in ltp:
    errors.append("LandThePlane provenance/history controls must use progressive disclosure")
if "source:'landtheplane-web'" not in ltp:
    errors.append("LandThePlane web prep runs must preserve generator provenance")

qg = (ROOT / "agentbridge-cloud" / "public" / "progress.html").read_text(encoding="utf-8")
if qg.count('class="progress-card"') != 4:
    errors.append("Quillgeist progress journal must keep exactly four top summary metrics")
if '<details class="architecture">' not in qg or '<details class="boundary">' not in qg:
    errors.append("Quillgeist secondary architecture/evidence detail must be progressively disclosed")

if errors:
    raise SystemExit("Venture progress UI validation failed:\n- " + "\n- ".join(errors))

print(f"Venture progress UI aligned: {len(ventures)} ventures checked.")
