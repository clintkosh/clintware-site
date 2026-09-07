from __future__ import annotations

from dataclasses import dataclass, asdict
import json
from pathlib import Path

SUPPORTED_SCHEMA = "clintware.assemblerer/company-manifest@0.1"
AUTHORITY = {
    0: "A0 · advise only",
    1: "A1 · prepare artifacts",
    2: "A2 · reversible local execution",
    3: "A3 · bounded external actions",
}


@dataclass(frozen=True)
class ManifestTask:
    id: str
    owner: str
    action: str
    route: str
    authority: int
    proof: str
    status: str

    def to_dict(self) -> dict:
        return asdict(self)


def _text(value) -> str:
    return " ".join(str(value or "").split()).strip()


def load_manifest(source: str | Path | dict) -> dict:
    if isinstance(source, dict):
        data = source
    else:
        path = Path(source)
        data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Assemblerer manifest must be a JSON object.")
    if data.get("schema") != SUPPORTED_SCHEMA:
        raise ValueError(f"Unsupported Assemblerer schema: {data.get('schema')!r}")
    if not _text(data.get("brief")):
        raise ValueError("Assemblerer manifest is missing its company brief.")
    return data


def pending_tasks(manifest: dict) -> list[ManifestTask]:
    tasks: list[ManifestTask] = []
    for row in manifest.get("tasks", []):
        if not isinstance(row, dict) or str(row.get("status", "queued")).casefold() == "done":
            continue
        authority = int(row.get("authority", 0) or 0)
        authority = max(0, min(3, authority))
        tasks.append(ManifestTask(
            id=_text(row.get("id")) or f"T{len(tasks)+1}",
            owner=_text(row.get("owner")) or "Unassigned",
            action=_text(row.get("action")),
            route=_text(row.get("route")) or "Local",
            authority=authority,
            proof=_text(row.get("proof")) or "Explicit completion evidence",
            status=_text(row.get("status")) or "queued",
        ))
    return tasks


def compile_manifest_context(source: str | Path | dict, *, task_limit: int = 8) -> dict:
    manifest = load_manifest(source)
    ceiling = max(0, min(3, int(manifest.get("authority", 0) or 0)))
    routing = _text(manifest.get("routing")) or "balanced"
    project = _text(manifest.get("companyId")) or "Assemblerer project"
    tasks = pending_tasks(manifest)[:max(0, int(task_limit))]
    lines = [
        "QUILLGEIST TEAM OPERATING MANIFEST",
        f"Project: {project}",
        f"Company brief: {_text(manifest.get('brief'))}",
        f"Founder authority ceiling: {AUTHORITY[ceiling]}",
        f"Routing preference: {routing}",
        "Rules:",
        "- Never exceed the founder authority ceiling supplied by this manifest.",
        "- Required proof is part of Definition of Done; a task is not complete until its proof is produced or explicitly reported unavailable.",
        "- A task routed Local should remain local unless the user or manifest explicitly changes the route.",
        "- A task routed Cloud may use external reasoning, but external/destructive/financial actions remain bounded by the task and authority ceiling.",
    ]
    if tasks:
        lines.append("Pending work:")
        for task in tasks:
            lines.append(
                f"- [{task.id}] {task.owner}: {task.action} | route={task.route} | authority={AUTHORITY[task.authority]} | proof={task.proof}"
            )
    else:
        lines.append("Pending work: none")
    lines.append("END TEAM OPERATING MANIFEST")
    return {
        "schema": SUPPORTED_SCHEMA,
        "project": project,
        "authority": ceiling,
        "routing": routing,
        "pending_task_count": len(pending_tasks(manifest)),
        "included_task_count": len(tasks),
        "context": "\n".join(lines),
        "tasks": [task.to_dict() for task in tasks],
    }
