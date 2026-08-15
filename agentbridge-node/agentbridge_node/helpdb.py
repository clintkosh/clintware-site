from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from datetime import datetime, timezone
import json
import pydoc
import re

from .config import home_dir

BASE_HELP = {
    "schema": 1,
    "updated_at": "2026-08-15T00:00:00Z",
    "getting_started": [
        {"id":"quick-start","title":"Quick start","body":"1. Run `agentbridge init`.  2. Pair the Node with AgentBridge Cloud using `agentbridge pair`.  3. Start `agentbridge daemon`.  4. Inspect an Execution Pack before running it.  5. Run it with `agentbridge run <file>` or send it from AgentBridge Cloud."},
        {"id":"execution-pack","title":"Run an Execution Pack","body":"AgentBridge accepts `.abpack`, AgentBridge JSON, and AgentBridge Markdown.  Use `agentbridge inspect <file>` to review the requested workspace, steps, permissions, and Definition of Done before execution."},
        {"id":"cloud-pairing","title":"Pair with AgentBridge Cloud","body":"Run `agentbridge pair --cloud https://agentbridge.clintware.com`.  Enter the eight-character pairing code in AgentBridge Cloud.  The Node creates the outbound connection; you do not expose an inbound admin port."},
        {"id":"permissions","title":"Approve capabilities","body":"Local policy is authoritative.  `always` permits a capability, `ask` requires approval, and `never` cannot be overridden by Cloud.  Owner Mode does not override a local `never` rule."},
        {"id":"contextor","title":"Contextor","body":"Contextor compacts execution output before it is returned to an upstream planner.  Small results pass through, large results use deterministic compaction, and Smart mode can optionally use a local Ollama model when the predicted savings justify the overhead."},
        {"id":"scheduling","title":"Schedules","body":"Schedules may be device-owned or cloud-owned.  Device-owned schedules can continue while Cloud is unavailable.  Cloud-owned schedules are dispatched by AgentBridge Cloud to the selected paired device."},
        {"id":"telemetry","title":"Usage metrics and error reporting","body":"By default the Node sends operational metadata, Contextor token estimates, run duration, patch/file counts, connection activity, and redacted errors to your AgentBridge Cloud account.  Prompt text and file contents are not included in the telemetry event.  Use `agentbridge telemetry status|on|off|flush` to inspect or control Node telemetry."},
    ],
    "setup_removal": [
        {"id":"install-node","title":"Initial Node setup","body":"Download the correct AgentBridge Node for Windows, macOS, or Linux.  Run `agentbridge init`, review the generated config under `~/.agentbridge`, then pair the Node with Cloud.  File associations for `.abpack` and `.abresult` are installed when supported."},
        {"id":"workspace","title":"Restrict workspaces","body":"Add trusted directories to `allowed_workspaces` in `~/.agentbridge/config.json`.  When the list is empty the alpha permits any workspace subject to capability policy; production use should normally use explicit allowed workspaces."},
        {"id":"start-daemon","title":"Start the Node","body":"Run `agentbridge daemon` to keep Cloud routing and schedule synchronization active.  The desktop installer/service will eventually make this automatic; the alpha keeps it explicit."},
        {"id":"remove-associations","title":"Remove file associations","body":"The alpha installer-association command currently adds associations.  Until the signed installer supplies a one-click removal path, use the operating system's Default Apps/File Associations settings to change `.abpack`/`.abresult` handlers."},
        {"id":"remove-node","title":"Remove AgentBridge Node","body":"Stop the daemon, remove the downloaded executable/package, and delete `~/.agentbridge` only if you also want to remove local configuration, schedules, run evidence, snapshots, telemetry queue, and local Help Center history."},
        {"id":"disconnect-cloud","title":"Disconnect Cloud without removing local execution","body":"Stop the daemon or change/remove the Cloud pairing.  Local Execution Packs and device-owned schedules can continue independently.  Local execution is not intended to be disabled merely because a Cloud subscription ends."},
    ],
    "faq": [
        {"id":"faq-llm","q":"Does AgentBridge require a local LLM?","a":"No.  Explicit Execution Packs use the deterministic local executor.  A local LLM is optional for Smart Contextor compaction and future intent interpretation."},
        {"id":"faq-admin","q":"Does AgentBridge give Clintware unrestricted administrator access?","a":"No.  Cloud requests work; the local Node enforces device policy and permissions.  A local `never` capability cannot be overridden remotely."},
        {"id":"faq-offline","q":"Can AgentBridge work without Cloud?","a":"Yes.  Local Execution Packs and device-owned schedules can run without the hosted control plane.  Cloud adds routing, synchronization, remote control, account history, and reporting."},
        {"id":"faq-data","q":"What telemetry goes to Cloud?","a":"Operational metadata such as connection/send/receive counts, run status and duration, estimated token savings, patch/file counts, Node version, and redacted errors.  The telemetry path is designed not to send prompt text or file contents."},
        {"id":"faq-error","q":"What happens when a run fails?","a":"AgentBridge records the Result Pack locally, sends a redacted error/metrics event to the paired Cloud account when telemetry is enabled, and returns compact planner feedback for a repair iteration."},
        {"id":"faq-bugs","q":"How are AgentBridge product bugs tracked?","a":"Failures classified as AgentBridge-internal, or failures a user marks as a product bug, receive a stable bug fingerprint.  Successful repair packs can include `fixes_bug_ids` or `retry_of` so Cloud marks the associated bug resolved.  A later recurrence reopens it."},
        {"id":"faq-reports","q":"Can I export my usage data?","a":"Yes.  AgentBridge Cloud provides per-account metrics and filtered report exports.  Your dashboard reports only your account's devices/events; Clintware product-health metrics are maintained separately as de-identified aggregates."},
        {"id":"faq-abpack","q":"What is an .abpack?","a":"A portable AgentBridge Execution Pack containing structured instructions, requested capabilities, Definition of Done, and optionally embedded files.  Double-click/open should inspect the pack before execution."},
    ],
    "glossary": [
        {"term":"AgentBridge Cloud","definition":"The hosted control plane that pairs devices, routes jobs, synchronizes schedules, stores account-scoped operational history, and exposes remote approvals/reporting."},
        {"term":"AgentBridge Node","definition":"The local Windows, macOS, or Linux executor that enforces local permissions and performs authorized work on the user's machine."},
        {"term":"Execution Pack (.abpack)","definition":"Portable structured work instructions sent from an AI/user to AgentBridge for local validation and execution."},
        {"term":"Result Pack (.abresult)","definition":"Structured evidence from a run, including status, Definition-of-Done results, changes, errors, Contextor metrics, and planner feedback."},
        {"term":"Contextor","definition":"The local context-efficiency layer that reduces what must be sent to an expensive external model while preserving evidence required for the next decision."},
        {"term":"Definition of Done","definition":"Machine-checkable success criteria AgentBridge evaluates after execution."},
        {"term":"Capability policy","definition":"Local allow/ask/deny rules for actions such as file writes, process execution, Git push, admin operations, and network writes."},
        {"term":"Owner Mode","definition":"An advanced local mode that permits trusted automation where local policy allows it.  It does not override `never` rules."},
        {"term":"Device-owned schedule","definition":"A schedule stored/executed by the Node so it can continue while Cloud is unavailable."},
        {"term":"Cloud-owned schedule","definition":"A schedule whose trigger is maintained by AgentBridge Cloud and dispatched to its selected paired Node."},
        {"term":"Product bug","definition":"A failure attributed to AgentBridge itself rather than to a user's task, environment, or denied permission.  It has a lifecycle such as reported, open, resolved, or reopened."},
        {"term":"Bug fingerprint","definition":"A normalized hash of a redacted error signature used to group repeat occurrences without relying on a user's raw prompt or file contents."},
        {"term":"Telemetry","definition":"Operational metadata used for the user's own dashboard/reporting and separate de-identified aggregate product-health metrics."},
    ],
    "fixes": [
        {"id":"alpha-1","date":"2026-08-15","version":"0.1.0-alpha.1","title":"Public alpha execution backbone","body":"Added cross-platform Node builds, Cloud routing, Execution/Result Packs, local capability policy, rollback, schedules, Contextor, file associations, and mobile/PWA remote control."},
        {"id":"alpha-2-telemetry","date":"2026-08-15","version":"0.1.0-alpha.2","title":"Telemetry, reports, bug lifecycle, and local Help Center","body":"Added automatic operational metrics/error reporting, per-user filtered reports, de-identified product-health aggregation, bug reported/resolved/reopened tracking, and this locally stored Help Center."},
    ],
}


def _path() -> Path:
    p = home_dir() / "help" / "help.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def _merge_named(existing: list[dict], incoming: list[dict], key: str) -> list[dict]:
    by_key = {str(row.get(key)): row for row in existing if row.get(key) is not None}
    order = [str(row.get(key)) for row in existing if row.get(key) is not None]
    for row in incoming:
        value = str(row.get(key) or "").strip()
        if not value:
            continue
        if value not in by_key:
            order.append(value)
        by_key[value] = {**by_key.get(value, {}), **row}
    return [by_key[x] for x in order]


def load() -> dict:
    path = _path()
    data = deepcopy(BASE_HELP)
    if path.exists():
        try:
            saved = json.loads(path.read_text(encoding="utf-8"))
            for section, key in (("getting_started","id"),("setup_removal","id"),("faq","id"),("glossary","term"),("fixes","id")):
                data[section] = _merge_named(data.get(section, []), saved.get(section, []), key)
        except (OSError, json.JSONDecodeError):
            pass
    save(data)
    return data


def save(data: dict) -> None:
    data = deepcopy(data)
    data["schema"] = 1
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    _path().write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def apply_updates(updates: dict | None, *, source: str | None = None) -> dict:
    data = load()
    if not updates:
        return data
    for section, key in (("getting_started","id"),("setup_removal","id"),("faq","id"),("glossary","term"),("fixes","id")):
        rows = updates.get(section) or []
        stamped = []
        for row in rows:
            item = dict(row)
            if source:
                item.setdefault("source", source)
            stamped.append(item)
        data[section] = _merge_named(data.get(section, []), stamped, key)
    save(data)
    return data


def search(query: str, data: dict | None = None) -> list[dict]:
    data = data or load()
    q = query.lower().strip()
    found = []
    for section in ("getting_started","setup_removal","faq","glossary","fixes"):
        for row in data.get(section, []):
            hay = json.dumps(row, ensure_ascii=False).lower()
            if q in hay:
                found.append({"section":section, **row})
    return found


def _format_row(section: str, row: dict) -> str:
    if section == "faq":
        return f"Q: {row.get('q','')}\nA: {row.get('a','')}"
    if section == "glossary":
        return f"{row.get('term','')}\n  {row.get('definition','')}"
    title = row.get("title") or row.get("id") or section
    prefix = f"{row.get('date','')} · {row.get('version','')}\n" if section == "fixes" else ""
    return f"{title}\n{prefix}{row.get('body','')}".strip()


def render(section: str = "all", query: str | None = None, limit: int = 100) -> str:
    data = load()
    if query:
        rows = search(query, data)[:limit]
        return "\n\n".join(f"[{r.pop('section')}] {_format_row('faq' if 'q' in r else 'glossary' if 'term' in r else 'fixes' if 'version' in r else 'getting_started', r)}" for r in rows) or "No Help Center matches."
    aliases={"start":"getting_started","setup":"setup_removal","remove":"setup_removal","glossary":"glossary","faq":"faq","fixes":"fixes","all":"all"}
    section=aliases.get(section,section)
    sections=("getting_started","setup_removal","faq","glossary","fixes") if section=="all" else (section,)
    chunks=[]
    for name in sections:
        if name not in data:
            continue
        title=name.replace("_"," ").title()
        rows=data[name][-limit:] if name=="fixes" else data[name][:limit]
        chunks.append(f"=== {title} ===\n"+"\n\n".join(_format_row(name,row) for row in rows))
    return "\n\n".join(chunks)


def page(section: str = "all", query: str | None = None, limit: int = 100) -> None:
    text = render(section, query=query, limit=limit)
    pydoc.pager(text)
