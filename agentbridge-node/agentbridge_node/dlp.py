from __future__ import annotations

from dataclasses import dataclass
import copy
import hashlib
import re
from typing import Any, Iterable


_MODES = {"off", "monitor", "standard", "strict"}
_LEVEL = {"medium": 1, "high": 2, "critical": 3}


@dataclass(frozen=True)
class Finding:
    kind: str
    severity: str
    path: str
    start: int
    end: int
    replacement: str
    fingerprint: str

    def public(self) -> dict:
        return {
            "type": self.kind,
            "severity": self.severity,
            "path": self.path,
            "replacement": self.replacement,
            "fingerprint": self.fingerprint,
        }


def _fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8", errors="ignore")).hexdigest()[:12]


def _luhn(value: str) -> bool:
    digits = [int(ch) for ch in value if ch.isdigit()]
    if not 13 <= len(digits) <= 19:
        return False
    total = 0
    parity = len(digits) % 2
    for i, digit in enumerate(digits):
        if i % 2 == parity:
            digit *= 2
            if digit > 9:
                digit -= 9
        total += digit
    return total % 10 == 0


def _add(out: list[Finding], *, kind: str, severity: str, path: str, match: re.Match[str], replacement: str, value: str | None = None) -> None:
    raw = value if value is not None else match.group(0)
    out.append(Finding(kind, severity, path, match.start(), match.end(), replacement, _fingerprint(raw)))


def scan_text(text: str, path: str = "$", *, include_contact_pii: bool = True) -> list[Finding]:
    findings: list[Finding] = []

    for match in re.finditer(r"(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)", text):
        raw = match.group(0)
        if _luhn(raw):
            _add(findings, kind="payment_card", severity="critical", path=path, match=match, replacement="[PAYMENT_CARD]", value=raw)

    for match in re.finditer(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----", text):
        _add(findings, kind="private_key", severity="critical", path=path, match=match, replacement="[PRIVATE_KEY]")

    secret_patterns: Iterable[tuple[str, re.Pattern[str]]] = (
        ("openai_api_key", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b")),
        ("github_token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b")),
        ("aws_access_key", re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b")),
        ("jwt", re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b")),
        ("credential", re.compile(r"(?i)\b(?:api[_ -]?key|access[_ -]?token|auth[_ -]?token|bearer|password|passwd|secret)\b\s*[:=]\s*['\"]?([^\s'\";,]{8,})")),
    )
    for kind, pattern in secret_patterns:
        for match in pattern.finditer(text):
            _add(findings, kind=kind, severity="critical" if kind in {"openai_api_key", "github_token", "aws_access_key"} else "high", path=path, match=match, replacement="[SECRET]")

    ssn_pattern = re.compile(r"(?<!\d)(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}(?!\d)")
    for match in ssn_pattern.finditer(text):
        _add(findings, kind="us_ssn", severity="high", path=path, match=match, replacement="[SSN]")

    if include_contact_pii:
        email_pattern = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
        for match in email_pattern.finditer(text):
            _add(findings, kind="email", severity="medium", path=path, match=match, replacement="[EMAIL]")
        phone_pattern = re.compile(r"(?<!\d)(?:\+?1[ .-]?)?(?:\(?\d{3}\)?[ .-]?)\d{3}[ .-]\d{4}(?!\d)")
        for match in phone_pattern.finditer(text):
            _add(findings, kind="phone", severity="medium", path=path, match=match, replacement="[PHONE]")

    deduped: list[Finding] = []
    seen: set[tuple[str, int, int, str]] = set()
    for finding in sorted(findings, key=lambda f: (f.start, -(f.end - f.start), f.kind)):
        key = (finding.path, finding.start, finding.end, finding.kind)
        if key not in seen:
            deduped.append(finding)
            seen.add(key)
    return deduped


def _walk(value: Any, path: str = "$") -> list[Finding]:
    if isinstance(value, str):
        return scan_text(value, path)
    if isinstance(value, dict):
        out: list[Finding] = []
        for key, child in value.items():
            out.extend(_walk(child, f"{path}.{key}"))
        return out
    if isinstance(value, list):
        out = []
        for i, child in enumerate(value):
            out.extend(_walk(child, f"{path}[{i}]"))
        return out
    return []


def scan_object(value: Any) -> list[Finding]:
    return _walk(value)


def redact_text(text: str, findings: list[Finding] | None = None, *, min_severity: str = "medium") -> str:
    findings = findings if findings is not None else scan_text(text)
    minimum = _LEVEL.get(min_severity, 1)
    selected = [f for f in findings if _LEVEL.get(f.severity, 0) >= minimum]
    out = text
    spans = sorted({(f.start, f.end, f.replacement) for f in selected}, reverse=True)
    for start, end, replacement in spans:
        out = out[:start] + replacement + out[end:]
    return out


def redact_object(value: Any, *, min_severity: str = "medium") -> Any:
    if isinstance(value, str):
        return redact_text(value, min_severity=min_severity)
    if isinstance(value, dict):
        return {key: redact_object(child, min_severity=min_severity) for key, child in value.items()}
    if isinstance(value, list):
        return [redact_object(child, min_severity=min_severity) for child in value]
    return copy.deepcopy(value)


def evaluate(value: Any, settings: dict | None, *, approved: bool = False) -> dict:
    settings = settings or {}
    enabled = settings.get("enabled", True) is not False
    mode = str(settings.get("mode", "standard")).lower()
    if mode not in _MODES:
        mode = "standard"
    if not enabled or mode == "off":
        return {"enabled": False, "mode": "off", "action": "allow", "findings": [], "counts": {}}

    findings = scan_object(value)
    public = [finding.public() for finding in findings]
    counts: dict[str, int] = {}
    for finding in findings:
        counts[finding.kind] = counts.get(finding.kind, 0) + 1

    if not findings:
        action = "allow"
    elif mode == "monitor":
        action = "allow"
    elif mode == "strict":
        action = "deny"
    else:
        high_risk = any(f.severity in {"critical", "high"} for f in findings)
        action = "allow" if approved or not high_risk else "approval_required"

    return {
        "enabled": True,
        "mode": mode,
        "action": action,
        "findings": public,
        "counts": counts,
        "redaction_available": bool(findings),
    }


def sanitize(value: Any, settings: dict | None, *, purpose: str = "external") -> tuple[Any, dict]:
    """Return a copy safe for persistence/external transport plus a sanitized DLP report.

    Off and Monitor intentionally do not modify content. Standard redacts high/critical
    matches. Strict redacts medium/high/critical matches. Matching values are never
    included in the returned report.
    """
    settings = settings or {}
    report = evaluate(value, settings, approved=True)
    mode = report.get("mode", "off")
    if not report.get("enabled") or mode in {"off", "monitor"} or not report.get("findings"):
        return copy.deepcopy(value), report
    minimum = "medium" if mode == "strict" else "high"
    return redact_object(value, min_severity=minimum), report
