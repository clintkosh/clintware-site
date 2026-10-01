#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
schema = json.loads((ROOT / "pxe.schema.json").read_text(encoding="utf-8"))
registry = json.loads((ROOT / "CWS-WORK-ITEMS.json").read_text(encoding="utf-8"))
example = json.loads((ROOT / "examples" / "pxe-cws11.json").read_text(encoding="utf-8"))

required_schema_fields = {
    "pxe_version", "artifact_id", "work_item_id", "revision",
    "content", "execution_policy", "security",
}
missing = required_schema_fields - set(schema.get("required", []))
if missing:
    raise SystemExit(f"PXE schema missing required fields: {sorted(missing)}")

classifications = set(schema["$defs"]["classification"]["enum"])
expected_classes = {"PUBLIC","INTERNAL","CONFIDENTIAL","RESTRICTED","LOCAL_ONLY","SECRET_REF"}
if classifications != expected_classes:
    raise SystemExit(f"Unexpected PXE classification set: {sorted(classifications)}")

items = registry.get("items") or []
if not items:
    raise SystemExit("CWS registry is empty")

ids = [row.get("id", "") for row in items]
if len(ids) != len(set(ids)):
    raise SystemExit("CWS registry contains duplicate canonical IDs")
for cid in ids:
    if not re.fullmatch(r"CWS-[1-9][0-9]*", cid):
        raise SystemExit(f"Invalid CWS canonical ID: {cid}")

aliases = [row.get("jira_alias", "") for row in items if row.get("jira_alias")]
if len(aliases) != len(set(aliases)):
    raise SystemExit("CWS registry contains duplicate Jira aliases")
for alias in aliases:
    if not re.fullmatch(r"KAN-[1-9][0-9]*", alias):
        raise SystemExit(f"Unexpected legacy Jira alias: {alias}")

allowed_states = {"in_progress","verified_done","blocked","carried_forward"}
for row in items:
    if row.get("state") not in allowed_states:
        raise SystemExit(f"Invalid CWS state for {row.get('id')}: {row.get('state')}")

if example.get("pxe_version") != "clintware-pxe/v1":
    raise SystemExit("PXE example version mismatch")
if example.get("work_item_id") not in set(ids):
    raise SystemExit("PXE example is not bound to a known CWS work item")
if not re.fullmatch(r"sha256:[0-9a-fA-F]{64}", example["revision"]["id"]):
    raise SystemExit("PXE example revision ID must be an immutable SHA-256 identifier")
if example["security"].get("secret_refs") is None:
    raise SystemExit("PXE example must include explicit secret_refs")

# Guard the architectural boundary: MCP is an edge protocol, not canonical storage.
routing = (ROOT / "UNIVERSAL-LLM-ROUTING.md").read_text(encoding="utf-8")
needles = [
    "clintware-pxe/v1",
    "CWS-",
    "loss report",
    "MCP is the governed tool/context edge",
    "immutable PXE revision",
    "LOCAL_ONLY",
    "SECRET_REF",
]
for needle in needles:
    if needle not in routing:
        raise SystemExit(f"Universal routing contract missing PXE/CWS invariant: {needle}")

print(f"PXE/CWS contract OK: {len(items)} canonical work items; schema and example loaded.")
