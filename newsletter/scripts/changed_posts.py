#!/usr/bin/env python3
"""Build the safe notification payloads for changed public blog posts."""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path


class MetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title_parts: list[str] = []
        self.in_title = False
        self.description = ""
        self.canonical = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {name.lower(): value or "" for name, value in attrs}
        if tag.lower() == "title":
            self.in_title = True
        if tag.lower() == "meta" and values.get("name", "").lower() == "description":
            self.description = values.get("content", "")
        if tag.lower() == "link" and values.get("rel", "").lower() == "canonical":
            self.canonical = values.get("href", "")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)


def clean(value: str, maximum: int) -> str:
    return re.sub(r"\s+", " ", html.unescape(value)).strip()[:maximum]


def git_paths(before: str, after: str) -> list[str]:
    if before and set(before) == {"0"}:
        command = ["git", "ls-tree", "-r", "--name-only", after, "--", "public/blog"]
    else:
        command = ["git", "diff", "--name-only", before, after, "--", "public/blog"]
    output = subprocess.check_output(command, text=True)
    return [path.strip() for path in output.splitlines() if path.strip()]


def post_payload(path: Path) -> dict[str, str] | None:
    if path.name != "index.html" or path.parent.name == "blog" or not path.is_file():
        return None
    parser = MetadataParser()
    parser.feed(path.read_text(encoding="utf-8"))
    title = clean("".join(parser.title_parts).replace("| Clintware", ""), 160)
    excerpt = clean(parser.description, 500)
    canonical = clean(parser.canonical, 500)
    if not title or not excerpt or not re.fullmatch(r"https://www\.clintware\.com/blog/[^/]+/?", canonical):
        return None
    return {"title": title, "excerpt": excerpt, "url": canonical}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--before", default="")
    parser.add_argument("--after", default="HEAD")
    parser.add_argument("--post", default="")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    changed = [args.post] if args.post else git_paths(args.before, args.after)
    payloads: list[dict[str, str]] = []
    for raw_path in changed:
        candidate = Path(raw_path)
        if candidate.as_posix().startswith("public/blog/"):
            payload = post_payload(candidate)
            if payload:
                payloads.append(payload)

    unique = {payload["url"]: payload for payload in payloads}
    Path(args.output).write_text(json.dumps(list(unique.values()), indent=2) + "\n", encoding="utf-8")
    print(len(unique))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
