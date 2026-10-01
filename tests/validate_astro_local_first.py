#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT / "projects"

errors = []
checked = []

for manifest_path in sorted(PROJECTS.glob("*/manifest.json")):
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    mode = str(data.get("persistence_mode") or "").strip().lower()
    if not mode:
        errors.append(f"{manifest_path}: missing persistence_mode")
        continue

    remote = bool(data.get("remote_state_required", False))
    durable = bool(data.get("durable_objects_required", False))
    reason = str(data.get("remote_state_reason") or "").strip()

    if mode in {"browser-local", "stateless"}:
        if remote:
            errors.append(f"{manifest_path}: {mode} cannot set remote_state_required=true")
        if durable:
            errors.append(f"{manifest_path}: {mode} cannot set durable_objects_required=true")
    elif mode == "remote-required":
        if not remote:
            errors.append(f"{manifest_path}: remote-required must set remote_state_required=true")
        if not reason:
            errors.append(f"{manifest_path}: remote-required must explain remote_state_reason")
    else:
        errors.append(f"{manifest_path}: unsupported persistence_mode={mode!r}")

    if durable and not remote:
        errors.append(f"{manifest_path}: Durable Objects require explicit remote state")

    checked.append((manifest_path.relative_to(ROOT).as_posix(), mode))

astro = (ROOT / "ASTRO_CRM_ONE_OFF_SKILL.md").read_text(encoding="utf-8")
internal = (ROOT / "skills" / "crm-one-off" / "SKILL.md").read_text(encoding="utf-8")
build = (ROOT / "quillgeist-lite" / "tasks" / "crm-astro-build.ps1").read_text(encoding="utf-8")
tool = (ROOT / "quillgeist-lite" / "tools" / "crm_astro.py").read_text(encoding="utf-8")
standard = (ROOT / "docs" / "astro-local-first-persistence-standard.md").read_text(encoding="utf-8")

required = {
    "ASTRO_CRM_ONE_OFF_SKILL.md": [
        "browser-local persistence is the default",
        "Do not inherit Durable Objects",
    ],
    "skills/crm-one-off/SKILL.md": [
        "browser-local persistence is the default",
        "Durable Objects are never inherited",
    ],
    "quillgeist-lite/tasks/crm-astro-build.ps1": [
        "Quota-independence gate failed",
        '"browser-local"',
    ],
    "quillgeist-lite/tools/crm_astro.py": [
        "durable_objects_required",
        "quota_independent",
    ],
    "docs/astro-local-first-persistence-standard.md": [
        "CWS-10",
        "The application must remain functional when Durable Objects are unavailable.",
    ],
}
sources = {
    "ASTRO_CRM_ONE_OFF_SKILL.md": astro,
    "skills/crm-one-off/SKILL.md": internal,
    "quillgeist-lite/tasks/crm-astro-build.ps1": build,
    "quillgeist-lite/tools/crm_astro.py": tool,
    "docs/astro-local-first-persistence-standard.md": standard,
}
for name, needles in required.items():
    for needle in needles:
        if needle not in sources[name]:
            errors.append(f"{name}: missing required invariant: {needle}")

if not checked:
    errors.append("No CRM manifests were discovered")

if errors:
    raise SystemExit("\n".join(errors))

print(f"ASTRO local-first persistence OK: {len(checked)} manifests validated")
for path, mode in checked:
    print(f"  {mode:13} {path}")
