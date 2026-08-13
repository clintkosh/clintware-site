#!/usr/bin/env python3
"""Fail CI when a Clintware CRM is published without the shared GA4 tag."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MEASUREMENT_ID = "G-DCY144YM9P"
CRM_MARKERS = re.compile(
    r"customer success|command center|\bcrm[_-]|-cs-|crmdemo",
    re.IGNORECASE,
)
STATIC_CRM_MARKERS = re.compile(
    r"private customer success|"
    r"clintware-crm-analytics|crm_(?:gate|unlock|session|account)|crmdemo",
    re.IGNORECASE,
)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def worker_targets() -> list[tuple[str, str]]:
    targets: list[tuple[str, str]] = []
    for config_path in ROOT.rglob("wrangler.jsonc"):
        if any(part.startswith(".") or part == "node_modules" for part in config_path.relative_to(ROOT).parts):
            continue
        project = config_path.parent
        config = read_text(config_path)
        sources = [config]
        sources.extend(read_text(path) for path in sorted((project / "src").rglob("*.js")))
        combined = "\n".join(sources)
        if CRM_MARKERS.search(combined):
            targets.append((str(project.relative_to(ROOT)), combined))
    return targets


def static_targets() -> list[tuple[str, str]]:
    targets: list[tuple[str, str]] = []
    for path in sorted((ROOT / "public").rglob("index.html")):
        text = read_text(path)
        relative = str(path.relative_to(ROOT))
        if STATIC_CRM_MARKERS.search(relative) or STATIC_CRM_MARKERS.search(text):
            targets.append((relative, text))
    return targets


def analytics_errors(name: str, text: str) -> list[str]:
    errors: list[str] = []
    if MEASUREMENT_ID not in text:
        errors.append(f"{name}: missing GA4 measurement ID {MEASUREMENT_ID}")
    if "https://www.googletagmanager.com/gtag/js?id=" not in text:
        errors.append(f"{name}: missing the Google tag loader")
    if not re.search(r"gtag\(\s*['\"]config['\"]\s*,", text):
        errors.append(f"{name}: missing gtag config initialization")
    if "Content-Security-Policy" in text:
        if "https://www.googletagmanager.com" not in text:
            errors.append(f"{name}: CSP blocks Google Tag Manager")
        if "google-analytics.com" not in text:
            errors.append(f"{name}: CSP blocks Google Analytics collection")
    return errors


def main() -> int:
    targets = worker_targets() + static_targets()
    if not targets:
        raise SystemExit("No CRM targets were discovered; analytics coverage cannot be verified")

    errors: list[str] = []
    for name, text in targets:
        errors.extend(analytics_errors(name, text))

    if errors:
        raise SystemExit("CRM analytics validation failed:\n- " + "\n- ".join(errors))

    print(
        json.dumps(
            {
                "status": "PASS",
                "measurement_id": MEASUREMENT_ID,
                "crm_targets": [name for name, _ in targets],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
