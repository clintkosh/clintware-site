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

missing_analytics = []
for path in published_html:
    text = path.read_text(encoding="utf-8", errors="ignore")
    if ANALYTICS_ID not in text or f"gtag('config', '{ANALYTICS_ID}')" not in text:
        missing_analytics.append(str(path))

if missing_analytics:
    raise SystemExit(
        "Google Analytics is missing or incomplete in: " + ", ".join(missing_analytics)
    )

print(
    f"Validated Clintware homepage bundle in {PUBLIC} "
    f"({len(REQUIRED)} required files, {len(published_html)} analytics-enabled pages)."
)
