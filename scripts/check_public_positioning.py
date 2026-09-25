from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN = re.compile(r"\b(?:consulting|consultant|consultancy)\b", re.IGNORECASE)
MASTER_EXCLUDES = {
    Path("AGENTS.md"),
    Path("ASTRO_WEBSITE_SKILL.md"),
    Path("BRAND_STANDARDS.md"),
    Path("scripts/check_public_positioning.py"),
}
SKIP_PREFIXES = {
    ".git",
    ".github",
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
}
TEXT_SUFFIXES = {
    ".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".jsx",
    ".ts", ".tsx", ".json", ".jsonc", ".xml", ".svg", ".txt", ".md",
}


def rel(path: Path) -> Path:
    return path.relative_to(ROOT)


def skipped(path: Path) -> bool:
    r = rel(path)
    if r in MASTER_EXCLUDES:
        return True
    return bool(r.parts and r.parts[0] in SKIP_PREFIXES)


def is_public_source(path: Path) -> bool:
    r = rel(path)
    if skipped(path):
        return False
    parts = r.parts
    if not parts:
        return False
    if r in {Path("index.html"), Path("build_site.py"), Path("restore_resume_links.py")}:
        return True
    if "public" in parts:
        return True
    if parts[0] in {"blog", "tools", "skills", "meet-worker", "workers", "product-sites"}:
        return True
    if parts[0].endswith("-worker") and len(parts) > 1 and parts[1] in {"src", "assets"}:
        return True
    return False


def add_match(matches: list[str], path: Path, detail: str) -> None:
    matches.append(f"{rel(path)}: {detail}")


def scan_text(path: Path, matches: list[str]) -> None:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return
    for line_no, line in enumerate(text.splitlines(), start=1):
        if FORBIDDEN.search(line):
            add_match(matches, path, f"line {line_no}: {line.strip()[:240]}")


def scan_pdf(path: Path, matches: list[str]) -> None:
    try:
        from pypdf import PdfReader
    except Exception as exc:
        raise SystemExit(f"pypdf is required to validate public PDF artifacts: {exc}")
    try:
        text = "\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages)
    except Exception as exc:
        add_match(matches, path, f"could not inspect PDF text: {exc}")
        return
    m = FORBIDDEN.search(text)
    if m:
        snippet = re.sub(r"\s+", " ", text[max(0, m.start()-120):m.end()+180]).strip()
        add_match(matches, path, f"PDF text contains forbidden positioning: {snippet[:320]}")


def scan_docx(path: Path, matches: list[str]) -> None:
    try:
        with zipfile.ZipFile(path) as archive:
            xml = "\n".join(
                archive.read(name).decode("utf-8", "ignore")
                for name in archive.namelist()
                if name.startswith("word/") and name.endswith(".xml")
            )
    except Exception as exc:
        add_match(matches, path, f"could not inspect DOCX text: {exc}")
        return
    text = re.sub(r"<[^>]+>", " ", xml)
    m = FORBIDDEN.search(text)
    if m:
        snippet = re.sub(r"\s+", " ", text[max(0, m.start()-120):m.end()+180]).strip()
        add_match(matches, path, f"DOCX text contains forbidden positioning: {snippet[:320]}")


def main() -> int:
    matches: list[str] = []

    for path in ROOT.rglob("*"):
        if not path.is_file() or skipped(path):
            continue

        r = rel(path)
        if FORBIDDEN.search(str(r)):
            add_match(matches, path, "path contains forbidden positioning")

        if not is_public_source(path):
            continue

        suffix = path.suffix.lower()
        if suffix in TEXT_SUFFIXES or r in {Path("build_site.py"), Path("restore_resume_links.py")}:
            scan_text(path, matches)
        elif suffix == ".pdf":
            scan_pdf(path, matches)
        elif suffix == ".docx":
            scan_docx(path, matches)

    if matches:
        print("PUBLIC POSITIONING GUARD FAILED")
        for item in matches:
            print(f"- {item}")
        return 1

    print("PUBLIC POSITIONING GUARD PASSED")
    print("No forbidden consulting-brand positioning found in public/deployable sources or downloadable professional artifacts.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
