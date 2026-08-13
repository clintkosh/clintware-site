#!/usr/bin/env python3
"""Render an email-safe HTML follow-up and plain-text alternative from JSON."""

from __future__ import annotations

import argparse
import html
import json
from pathlib import Path
from urllib.parse import urlparse


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def safe_url(value: object) -> str:
    raw = str(value or "").strip()
    parsed = urlparse(raw)
    return raw if parsed.scheme in {"http", "https"} and parsed.netloc else ""


def safe_color(value: object, fallback: str) -> str:
    raw = str(value or "").strip()
    valid = len(raw) in {4, 7} and raw.startswith("#")
    valid = valid and all(char in "0123456789abcdefABCDEF" for char in raw[1:])
    return raw if valid else fallback


def link_button(url: str, label: str, background: str, foreground: str) -> str:
    if not url:
        return ""
    return (
        f'<a href="{esc(url)}" style="display:inline-block;padding:12px 18px;'
        f'background:{background};color:{foreground};text-decoration:none;'
        f'font-size:13px;font-weight:800;border-radius:5px">{esc(label)}</a>'
    )


def render(spec: dict) -> tuple[str, str]:
    bg = safe_color(spec.get("background"), "#020e1c")
    panel = safe_color(spec.get("panel"), "#05172c")
    accent = safe_color(spec.get("accent"), "#f4c44e")
    secondary = safe_color(spec.get("secondary_accent"), "#83bd3a")
    paragraphs = [str(item).strip() for item in spec.get("body_paragraphs", []) if str(item).strip()]
    proof_url = safe_url(spec.get("proof_url"))
    small_url = safe_url(spec.get("secondary_url"))
    body = "".join(f'<p style="margin:0 0 14px">{esc(item)}</p>' for item in paragraphs)
    small_card = ""
    if spec.get("secondary_title") and small_url:
        small_card = f"""
<tr><td style="padding:0 18px 18px"><div style="padding:22px;background:#ffffff;border-radius:10px;color:#334d68">
<div style="font-size:10px;letter-spacing:1.8px;text-transform:uppercase;font-weight:800;color:{secondary}">Compact proof</div>
<h2 style="margin:7px 0 11px;color:#05172c;font-size:25px">{esc(spec.get("secondary_title"))}</h2>
<p style="font-size:15px;line-height:1.62">{esc(spec.get("secondary_body"))}</p>
{link_button(small_url, str(spec.get("secondary_label") or "View the project"), secondary, "#ffffff")}
</div></td></tr>"""

    email_html = f"""<!doctype html>
<html><body style="margin:0;padding:0;background:{bg};font-family:Arial,Helvetica,sans-serif;color:#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{bg}"><tr><td align="center" style="padding:22px 8px">
<table role="presentation" width="760" cellpadding="0" cellspacing="0" border="0" bgcolor="{panel}" style="width:100%;max-width:760px;background:{panel};border:1px solid {accent};border-radius:12px;overflow:hidden">
<tr><td style="padding:27px 28px;border-bottom:1px solid {accent}">
<div style="font-size:10px;letter-spacing:1.7px;text-transform:uppercase;font-weight:800;color:{secondary}">{esc(spec.get("subject_context"))}</div>
<h1 style="margin:10px 0 0;font-size:36px;line-height:1.12;color:#ffffff">{esc(spec.get("headline"))}</h1>
<p style="font-size:15px;line-height:1.6;color:#bfd0df">{esc(spec.get("subheadline"))}</p>
</td></tr>
<tr><td style="padding:24px 28px 8px;color:#e1e8ef;font-size:15px;line-height:1.7"><p>Hi {esc(spec.get("recipient_name"))},</p>{body}</td></tr>
<tr><td style="padding:18px"><div style="padding:21px;background:#0a3971;border:1px solid {accent};border-radius:10px;color:#e1e8ef;font-size:15px;line-height:1.67">
<div style="font-size:10px;letter-spacing:1.8px;text-transform:uppercase;font-weight:800;color:{secondary}">First operating move</div>
<h2 style="margin:5px 0 13px;color:#ffffff;font-size:28px">{esc(spec.get("strategy_title"))}</h2>
<p>{esc(spec.get("strategy_body"))}</p></div></td></tr>
<tr><td style="padding:0 18px 18px"><div style="padding:21px;background:#071f3a;border:1px solid {accent};border-radius:10px;color:#e1e8ef;font-size:15px;line-height:1.67">
<div style="font-size:10px;letter-spacing:1.8px;text-transform:uppercase;font-weight:800;color:{secondary}">Relevant proof</div>
<h2 style="margin:5px 0 13px;color:#ffffff;font-size:28px">{esc(spec.get("proof_title"))}</h2>
<p>{esc(spec.get("proof_body"))}</p>
{link_button(proof_url, str(spec.get("proof_label") or "Open the example"), accent, "#06182c")}
</div></td></tr>
{small_card}
<tr><td style="padding:22px 28px;color:#e1e8ef;font-size:15px;line-height:1.7">
<p>{esc(spec.get("closing"))}</p><strong>{esc(spec.get("sender_name"))}</strong><br>
{esc(spec.get("sender_phone"))}<br>{esc(spec.get("sender_email"))}
</td></tr></table></td></tr></table></body></html>"""

    plain = [f'Hi {spec.get("recipient_name", "")},', *paragraphs]
    plain += [str(spec.get("strategy_title", "")), str(spec.get("strategy_body", ""))]
    plain += [str(spec.get("proof_title", "")), str(spec.get("proof_body", "")), proof_url]
    if spec.get("secondary_title") and small_url:
        plain += [str(spec.get("secondary_title")), str(spec.get("secondary_body", "")), small_url]
    plain += [str(spec.get("closing", "")), str(spec.get("sender_name", ""))]
    plain += [str(spec.get("sender_phone", "")), str(spec.get("sender_email", ""))]
    return email_html, "\n\n".join(item for item in plain if item)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("spec", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    specification = json.loads(args.spec.read_text(encoding="utf-8"))
    html_output, plain_output = render(specification)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "followup.html").write_text(html_output, encoding="utf-8")
    (args.output_dir / "followup.txt").write_text(plain_output, encoding="utf-8")


if __name__ == "__main__":
    main()

