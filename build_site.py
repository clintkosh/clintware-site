from pathlib import Path

PUBLIC = Path("public")
ANALYTICS_ID = "G-DCY144YM9P"
REQUIRED = [
    PUBLIC / "index.html",
    PUBLIC / "tools" / "index.html",
    PUBLIC / "blog" / "index.html",
    PUBLIC / "privacy" / "index.html",
    PUBLIC / "contact" / "index.html",
    PUBLIC / "robots.txt",
    PUBLIC / "sitemap.xml",
]

missing = [str(path) for path in REQUIRED if not path.is_file() or not path.stat().st_size]
if missing:
    raise SystemExit(f"Missing Clintware production files: {', '.join(missing)}")

for path in PUBLIC.rglob("*"):
    if path.is_file() and path.suffix.lower() in {".html", ".txt", ".xml", ".json", ".js", ".css"}:
        text = path.read_text(encoding="utf-8", errors="ignore")
        if "aggieland" in text.lower():
            raise SystemExit(f"Retired Aggieland name found in {path}")

published_html = [Path("index.html")]
for section in ("blog", "consulting", "public", "ranchledger", "tools"):
    published_html.extend(Path(section).rglob("*.html"))

# Interview/demo surfaces intentionally remain outside production analytics.
analytics_exempt = {"dtex-crmdemo"}
missing_analytics = []
analytics_checked = 0
for path in published_html:
    if any(part in analytics_exempt for part in path.parts):
        continue
    analytics_checked += 1
    text = path.read_text(encoding="utf-8", errors="ignore")
    if ANALYTICS_ID not in text or "gtag('config'" not in text:
        missing_analytics.append(str(path))

if missing_analytics:
    raise SystemExit(
        "Google Analytics is missing or incomplete in: " + ", ".join(missing_analytics)
    )

print(
    f"Validated Clintware homepage bundle in {PUBLIC} "
    f"({len(REQUIRED)} required files, {analytics_checked} analytics-enabled pages)."
)
