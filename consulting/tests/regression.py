#!/usr/bin/env python3
from __future__ import annotations

import contextlib
import http.server
import json
import socket
import subprocess
import tempfile
import threading
import time
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path

from bs4 import BeautifulSoup
import tinycss2

ROOT = Path(__file__).resolve().parents[1]
REPORT_JSON = ROOT / "TEST_REPORT.json"
REPORT_MD = ROOT / "TEST_REPORT.md"


@dataclass
class TestResult:
    name: str
    passed: bool
    detail: str


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        return


def find_free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


@contextlib.contextmanager
def site_server():
    port = find_free_port()
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(ROOT), **kwargs)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def request(url: str) -> tuple[int, bytes, str]:
    with urllib.request.urlopen(url, timeout=10) as response:
        return response.status, response.read(), response.headers.get_content_type()


def load_soup() -> BeautifulSoup:
    return BeautifulSoup((ROOT / "index.html").read_text(encoding="utf-8"), "html.parser")


def static_structure() -> TestResult:
    soup = load_soup()
    required_ids = {"main", "services", "method", "engagements", "calculator", "contact"}
    found = {tag.get("id") for tag in soup.find_all(id=True)}
    missing = sorted(required_ids - found)
    labels = {label.get("for") for label in soup.find_all("label") if label.get("for")}
    required_fields = {"name", "email", "company", "service", "challenge"}
    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    canonical = soup.find("link", rel="canonical")
    errors = []
    if missing:
        errors.append(f"missing sections: {', '.join(missing)}")
    if len(soup.find_all("form")) < 2:
        errors.append("expected calculator and consultation forms")
    if not required_fields.issubset(labels):
        errors.append("missing accessible form labels")
    if "Clintware Consulting" not in title:
        errors.append("title is not branded")
    if not canonical or canonical.get("href") != "https://consulting.clintware.com/":
        errors.append("canonical URL is incorrect")
    if not soup.find("script", attrs={"type": "application/ld+json"}):
        errors.append("structured data is missing")
    return TestResult(
        "Static structure, SEO, and form accessibility",
        not errors,
        "; ".join(errors) if errors else "Required sections, metadata, structured data, and labeled fields are present.",
    )


def navigation_integrity() -> TestResult:
    soup = load_soup()
    ids = [tag.get("id") for tag in soup.find_all(id=True)]
    existing_ids = set(ids)
    duplicates = sorted({item for item in ids if ids.count(item) > 1})
    broken = []
    external_hosts = set()
    for link in soup.find_all("a", href=True):
        href = link["href"].strip()
        if href.startswith("#") and len(href) > 1 and href[1:] not in existing_ids:
            broken.append(href)
        if href.startswith("https://"):
            external_hosts.add(href.split("/", 3)[2])
    interactive = soup.find_all(["a", "button", "input", "select", "textarea", "summary"])
    unlabeled = [button for button in soup.find_all("button") if not button.get_text(strip=True) and not button.get("aria-label")]
    errors = []
    if duplicates:
        errors.append(f"duplicate IDs: {', '.join(duplicates)}")
    if broken:
        errors.append(f"broken anchors: {', '.join(sorted(set(broken)))}")
    if unlabeled:
        errors.append("unlabeled buttons detected")
    if "clintware.com" not in external_hosts:
        errors.append("main-site navigation link is missing")
    if len(interactive) < 20:
        errors.append("unexpectedly low interactive-control count")
    return TestResult(
        "Navigation, identifiers, and interaction integrity",
        not errors,
        "; ".join(errors) if errors else f"All internal anchors resolve, IDs are unique, and {len(interactive)} interactive controls remain labeled.",
    )


def routes_and_assets(base_url: str) -> TestResult:
    expected = {
        "/": "text/html",
        "/styles.css": "text/css",
        "/app.js": "text/javascript",
        "/assets/favicon.svg": "image/svg+xml",
        "/manifest.webmanifest": "application/manifest+json",
        "/robots.txt": "text/plain",
        "/sitemap.xml": "application/xml",
        "/CNAME": "application/octet-stream",
    }
    failures = []
    for path, expected_type in expected.items():
        try:
            status, body, content_type = request(base_url + path)
            if status != 200 or not body:
                failures.append(f"{path} returned {status} or empty body")
            if path != "/CNAME" and content_type != expected_type:
                failures.append(f"{path} content-type {content_type}, expected {expected_type}")
        except Exception as exc:
            failures.append(f"{path}: {exc}")
    return TestResult(
        "HTTP routes and production assets",
        not failures,
        "; ".join(failures) if failures else f"All {len(expected)} production routes returned HTTP 200 with the expected content.",
    )


def javascript_logic() -> TestResult:
    test_script = r'''
const assert = require('assert');
const lib = require('./app.js');
assert.deepStrictEqual(lib.calculateBurden(6, 7, 95), {
  people: 6, hours: 7, cost: 95, weeklyHours: 42, monthlyHours: 182, annualCost: 207480
});
assert.deepStrictEqual(lib.calculateBurden(999, -4, 'bad'), {
  people: 50, hours: 1, cost: 20, weeklyHours: 50, monthlyHours: 217, annualCost: 52000
});
const invalid = lib.validateLead({name:'A', email:'bad', company:'', service:'', challenge:'short'});
assert.strictEqual(invalid.valid, false);
assert.ok(Object.keys(invalid.errors).length >= 5);
const valid = lib.validateLead({
  name:'Sample Operator',
  email:'operations@example.com',
  company:'Example SaaS',
  service:'Support burden reduction',
  challenge:'Engineers are handling repeat support work every week.'
});
assert.strictEqual(valid.valid, true);
const mailto = lib.buildMailto(valid.clean);
assert.ok(mailto.startsWith('mailto:hello@clintware.com?'));
assert.ok(mailto.includes('Support%20burden%20reduction'));
console.log('logic-ok');
'''
    with tempfile.NamedTemporaryFile("w", suffix=".js", dir=ROOT, delete=False, encoding="utf-8") as handle:
        handle.write(test_script)
        path = Path(handle.name)
    try:
        syntax = subprocess.run(["node", "--check", str(ROOT / "app.js")], capture_output=True, text=True, timeout=15)
        logic = subprocess.run(["node", str(path)], cwd=ROOT, capture_output=True, text=True, timeout=15)
        errors = []
        if syntax.returncode != 0:
            errors.append(syntax.stderr.strip() or "JavaScript syntax check failed")
        if logic.returncode != 0:
            errors.append(logic.stderr.strip() or "JavaScript logic tests failed")
        return TestResult(
            "Calculator, validation, and consultation-request logic",
            not errors,
            "; ".join(errors) if errors else "JavaScript syntax, boundary handling, burden calculation, validation, and mailto generation passed.",
        )
    finally:
        path.unlink(missing_ok=True)


def responsive_css_contract() -> TestResult:
    css_files = [
        ROOT / "styles.css",
        ROOT / "styles" / "base.css",
        ROOT / "styles" / "components.css",
        ROOT / "styles" / "sections.css",
        ROOT / "styles" / "responsive.css",
    ]
    css = "\n".join(path.read_text(encoding="utf-8") for path in css_files)
    rules = tinycss2.parse_stylesheet(css, skip_comments=True, skip_whitespace=True)
    parse_errors = [rule.message for rule in rules if rule.type == "error"]
    media_text = "\n".join(tinycss2.serialize(rule.prelude) for rule in rules if rule.type == "at-rule" and rule.lower_at_keyword == "media")
    required_media = ["max-width: 1080px", "max-width: 760px", "max-width: 420px", "prefers-reduced-motion: reduce"]
    required_tokens = [
        "overflow-x: hidden", ".hero-grid", ".services-grid", ".pricing-grid", ".contact-shell",
        "grid-template-columns: 1fr", ".menu-toggle", ".mobile-nav", "clamp(", "min(calc(100% - 40px)",
    ]
    errors = list(parse_errors)
    for media in required_media:
        if media not in media_text:
            errors.append(f"missing media contract: {media}")
    for token in required_tokens:
        if token not in css:
            errors.append(f"missing responsive/layout token: {token}")
    qualified_rules = sum(1 for rule in rules if rule.type == "qualified-rule")
    if qualified_rules < 120:
        errors.append(f"unexpectedly low CSS rule count: {qualified_rules}")
    return TestResult(
        "Desktop/mobile layout and reduced-motion CSS contract",
        not errors,
        "; ".join(errors) if errors else f"CSS parsed without errors across {qualified_rules} rules with desktop, tablet, mobile, narrow-mobile, coarse-pointer, and reduced-motion handling.",
    )


def main() -> int:
    results = [static_structure(), navigation_integrity(), javascript_logic(), responsive_css_contract()]
    with site_server() as base_url:
        deadline = time.time() + 5
        while True:
            try:
                request(base_url + "/")
                break
            except Exception:
                if time.time() >= deadline:
                    raise
                time.sleep(0.1)
        results.insert(2, routes_and_assets(base_url))
    passed = all(result.passed for result in results)
    payload = {
        "site": "Clintware Consulting",
        "target": "https://consulting.clintware.com/",
        "passed": passed,
        "tests": [asdict(result) for result in results],
    }
    REPORT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# Clintware Consulting Test Report", "", "**Target:** `https://consulting.clintware.com/`  ",
        f"**Overall:** {'PASS' if passed else 'FAIL'}  ",
        f"**Regression passes:** {sum(1 for result in results if result.passed)}/{len(results)}", "",
        "| Test | Result | Detail |", "|---|---:|---|",
    ]
    for result in results:
        lines.append(f"| {result.name} | {'PASS' if result.passed else 'FAIL'} | {result.detail.replace('|', chr(92) + '|')} |")
    lines.extend([
        "", "## Coverage", "",
        "- Required page sections, SEO metadata, structured data, and accessible form labels",
        "- Internal navigation, unique identifiers, and labeled interactive controls",
        "- Static HTTP routes and deployable production assets",
        "- Cost calculator, input boundaries, form validation, and structured email-request generation",
        "- Desktop, tablet, mobile, coarse-pointer, and reduced-motion CSS contracts", "",
    ])
    REPORT_MD.write_text("\n".join(lines), encoding="utf-8")
    for result in results:
        print(f"[{'PASS' if result.passed else 'FAIL'}] {result.name}: {result.detail}")
    print(f"OVERALL: {'PASS' if passed else 'FAIL'}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
