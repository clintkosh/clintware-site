from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
DOMAINS = [
    "mindtoform.clintware.com",
    "buyerorigin.clintware.com",
    "quillgeist.clintware.com",
    "successos.clintware.com",
    "landtheplane.clintware.com",
    "promptiris.clintware.com",
    "renewnudge.clintware.com",
    "orgsynapse.clintware.com",
    "shouldersoldier.clintware.com",
    "portability.clintware.com",
    "mindvergent.clintware.com",
]

SURFACES = [
    ROOT / "AGENTS.md",
    ROOT / "BRAND_STANDARDS.md",
    ROOT / "docs" / "yc-venture-sites.md",
    ROOT / "docs" / "yc-venture-priority-2026-09-30.md",
    ROOT / "public" / "startup" / "index.html",
    ROOT / "public" / "data" / "venture-progress.json",
    ROOT / "public" / "tools" / "index.html",
]

ROUTE_OWNERS = {
    "mindtoform.clintware.com": ROOT / "mindtoform-worker" / "wrangler.jsonc",
    "buyerorigin.clintware.com": ROOT / "buyerorigin-worker" / "wrangler.jsonc",
    "landtheplane.clintware.com": ROOT / "landtheplane-worker" / "wrangler.jsonc",
    "successos.clintware.com": ROOT / "venture-pages-worker" / "wrangler.jsonc",
    "shouldersoldier.clintware.com": ROOT / "shouldersoldier-worker" / "wrangler.jsonc",
    "mindvergent.clintware.com": ROOT / "mindvergent-worker" / "wrangler.jsonc",
    "quillgeist.clintware.com": ROOT / "venture-pages-worker" / "wrangler.jsonc",
    "promptiris.clintware.com": ROOT / "venture-pages-worker" / "wrangler.jsonc",
    "orgsynapse.clintware.com": ROOT / "venture-pages-worker" / "wrangler.jsonc",
    "portability.clintware.com": ROOT / "venture-pages-worker" / "wrangler.jsonc",
}

errors = []
for surface in SURFACES:
    text = surface.read_text(encoding="utf-8")
    for domain in DOMAINS:
        if domain not in text:
            errors.append(f"{surface.relative_to(ROOT)} missing {domain}")

startup = (ROOT / "public" / "startup" / "index.html").read_text(encoding="utf-8")
if 'href="/tools/' in startup:
    errors.append("startup index must link YC ventures to canonical subdomains, not /tools/ routes")
if '<div class="rank">01</div><div class="name">Quillgeist</div>' not in startup:
    errors.append("Quillgeist must remain rank 01 on the current startup index until the canonical priority file changes")

registry_path = ROOT / "public" / "data" / "venture-progress.json"
registry = json.loads(registry_path.read_text(encoding="utf-8"))
registered_domains = {
    item.get("canonical_url", "").replace("https://", "").strip("/")
    for item in registry.get("ventures", [])
}
for domain in DOMAINS:
    if domain not in registered_domains:
        errors.append(f"venture progress registry missing {domain}")

registered_ids = [item.get("id") for item in registry.get("ventures", [])]
if len(registered_ids) != len(set(registered_ids)):
    errors.append("venture progress registry contains duplicate stable ids")

for item in registry.get("ventures", []):
    if item.get("surface_mode") not in {"live", "scaffold"}:
        errors.append(f"invalid surface_mode for {item.get('id')}")
    if not item.get("current_proof") or not item.get("next_gate"):
        errors.append(f"venture progress registry entry incomplete for {item.get('id')}")


for domain, config in ROUTE_OWNERS.items():
    text = config.read_text(encoding="utf-8")
    if domain not in text:
        errors.append(f"{config.relative_to(ROOT)} does not own {domain}")

if errors:
    raise SystemExit("YC venture-domain validation failed:\n- " + "\n- ".join(errors))

print(f"YC venture domains aligned: {len(DOMAINS)} canonical venture homes and evidence contracts checked.")
