#!/usr/bin/env python3
"""Generate a human-reviewable Surfing the Wave weekly draft package."""

from __future__ import annotations

import argparse
from datetime import date
import json
from pathlib import Path
from typing import Any


def _clean(value: Any, limit: int = 1200) -> str:
    return " ".join(str(value or "").split())[:limit]


def _rows(items: list[dict], keys: tuple[str, ...]) -> list[dict]:
    out = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        row = {key: _clean(item.get(key), 800) for key in keys}
        if any(row.values()):
            out.append(row)
    return out


def build_package(payload: dict, *, issue_date: str | None = None) -> dict:
    issue_date = issue_date or date.today().isoformat()
    signals = _rows(payload.get("signals") or [], ("headline", "why_it_matters", "source"))
    grades = _rows(payload.get("model_grades") or [], ("model", "grade", "evidence"))
    critic = _clean(payload.get("devils_advocate"), 1800)
    image_brief = _clean(payload.get("image_brief"), 1200)

    title = _clean(payload.get("title"), 160) or f"Surfing the Wave · {issue_date}"
    lines = [
        f"# {title}",
        "",
        "## What changed",
        "",
    ]
    if signals:
        for row in signals:
            lines.append(f"- **{row['headline'] or 'Signal'}**")
            if row["why_it_matters"]:
                lines.append(f"  - Why it matters: {row['why_it_matters']}")
            if row["source"]:
                lines.append(f"  - Source: {row['source']}")
    else:
        lines.append("- No verified public signals were supplied for this draft.")
    lines += ["", "## Model pulse", ""]
    if grades:
        lines += ["| Model | Grade | Evidence |", "| --- | --- | --- |"]
        for row in grades:
            lines.append(f"| {row['model']} | {row['grade']} | {row['evidence']} |")
    else:
        lines.append("No model-grade evidence was supplied.")
    lines += ["", "## Devil's advocate", "", critic or "No critic pass supplied.", "", "## Image brief", "", image_brief or "No image brief supplied.", ""]
    lines += [
        "## Editorial gate",
        "",
        "- Human review required: **Yes**",
        "- Auto-publish: **No**",
        "- Subscriber delivery: Existing Clintware newsletter Worker only after approval.",
        "",
    ]

    markdown = "\n".join(lines).rstrip() + "\n"
    return {
        "protocol": "clintware-surfing-the-wave/v1",
        "issue_date": issue_date,
        "title": title,
        "signal_count": len(signals),
        "model_grade_count": len(grades),
        "human_review_required": True,
        "auto_publish": False,
        "markdown": markdown,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--manifest")
    parser.add_argument("--date")
    args = parser.parse_args()

    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SystemExit("Surfing the Wave input must be a JSON object.")

    package = build_package(payload, issue_date=args.date)
    Path(args.output).write_text(package["markdown"], encoding="utf-8")
    if args.manifest:
        manifest = {key: value for key, value in package.items() if key != "markdown"}
        Path(args.manifest).write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
