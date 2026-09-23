#!/usr/bin/env python3
"""Fail CI when a Clintware CRM is published without the shared GA4 tag."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MEASUREMENT_ID = "G-DCY144YM9P"
CRM_CONFIG_MARKERS = re.compile(
    r'"name"\s*:\s*"[^"]*(?:crm|customer-value|customer-success|cs-command|cs-business|enterprise-customer-success)[^"]*"',
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
        # A Worker is a CRM target because its Wrangler service identity says so,
        # not because arbitrary source text happens to mention Customer Success.
        # This prevents unrelated HTML products (for example ProofOS) and API
        # infrastructure (for example the Control Plane) from becoming false
        # positives when they discuss CRM/CS concepts in copy, manifests, or docs.
        if not CRM_CONFIG_MARKERS.search(config):
            continue
        sources = [config]
        for suffix in ("*.js", "*.ts", "*.tsx", "*.html"):
            sources.extend(read_text(path) for path in sorted((project / "src").rglob(suffix)))
        combined = "\n".join(sources)
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
    first_party = "CRM_ANALYTICS_MODE" in text and "first-party-control-plane" in text
    if first_party:
        if "/api/v1/events" not in text:
            errors.append(f"{name}: first-party analytics declared but no Control Plane event path is present")
        if "googletagmanager.com" in text or "google-analytics.com" in text:
            errors.append(f"{name}: first-party analytics mode must not also load Google analytics")
        return errors
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
    if "n7-customer-value-os" in name:
        required = [
            "send_page_view:false",
            "trackN7PageView",
            "live_prompt_proposal_approved",
            "live_assist_started",
            "live_assist_session_saved",
            "meeting_prep_pdf_prepared",
            "meeting_checkpoint_recorded",
            "jira_deployment_issue_created",
            "jira_engineering_issue_created",
            "jira_oauth_started",
        ]
        for marker in required:
            if marker not in text:
                errors.append(f"{name}: missing required N7 analytics marker {marker}")
        forbidden_payload_terms = [
            'customer_name:',
            'transcript:',
            'prompt:',
            'issue_description:',
            'document_content:',
        ]
        analytics_source = ""
        analytics_path = ROOT / name / "src" / "lib" / "n7" / "analytics.ts"
        if analytics_path.exists():
            analytics_source = read_text(analytics_path).lower()
        for marker in forbidden_payload_terms:
            if marker in analytics_source:
                errors.append(f"{name}: analytics helper appears to accept sensitive payload marker {marker}")
    return errors


def main() -> int:
    targets = worker_targets() + static_targets()
    discovered_names = {name for name, _ in targets}
    forbidden_false_positives = {"control-plane", "proofos"} & discovered_names
    if forbidden_false_positives:
        raise SystemExit(
            "CRM discovery regression: unrelated projects were classified as CRM targets: "
            + ", ".join(sorted(forbidden_false_positives))
        )
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
