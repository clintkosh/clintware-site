from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import secrets

from .config import Config, home_dir
from .dlp import sanitize


MAX_PREFERENCES = 100
MAX_PREFERENCE_CHARS = 1200
VALID_SCOPES = {"global", "project", "task"}
REMEMBER_RE = re.compile(r"^\s*(?:remember|save\s+preference|preference)\s*:\s*(.+?)\s*$", re.I | re.S)
FORGET_RE = re.compile(r"^\s*(?:forget|remove\s+preference)\s*:\s*(.+?)\s*$", re.I | re.S)


@dataclass(frozen=True)
class Preference:
    id: str
    text: str
    created_at: str
    source: str = "user_explicit"
    scope: str = "global"
    project: str = ""
    task_types: tuple[str, ...] = ()
    keywords: tuple[str, ...] = ()
    enabled: bool = True

    def to_dict(self) -> dict:
        data = asdict(self)
        data["task_types"] = list(self.task_types)
        data["keywords"] = list(self.keywords)
        return data


def _normalize(value: str) -> str:
    return " ".join(str(value or "").split()).strip()


def _normalize_key(value: str) -> str:
    return _normalize(value).casefold()


def infer_task_type(text: str) -> str:
    source = str(text or "").casefold()
    checks = (
        ("website", ("website", "site", "html", "css", "deploy", "homepage", "landing page")),
        ("code", ("code", "python", "javascript", "typescript", "bug", "test", "repository", "repo", "git")),
        ("file_edit", ("file", "document", "pdf", "spreadsheet", "slide", "rename", "copy", "overwrite")),
        ("writing", ("write", "rewrite", "draft", "email", "message", "post", "resume", "résumé")),
        ("research", ("research", "search", "compare", "find", "market", "competition")),
    )
    for task_type, terms in checks:
        if any(term in source for term in terms):
            return task_type
    return "general"


class PreferenceStore:
    """Local store for explicit user-owned operating rules.

    Historical v1 preferences remain valid and load as global rules. New rules
    may be scoped to a project or task type so Quillgeist can compile only the
    operating context that applies to the current task.
    """

    def __init__(self, path: Path | None = None) -> None:
        self.path = path or (home_dir() / "preferences.json")

    def _load_raw(self) -> list[dict]:
        if not self.path.exists():
            return []
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return []
        rows = data.get("preferences", []) if isinstance(data, dict) else []
        return [row for row in rows if isinstance(row, dict)]

    def _write(self, rows: list[dict]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"version": 2, "preferences": rows[-MAX_PREFERENCES:]}
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
        tmp.replace(self.path)
        try:
            self.path.chmod(0o600)
        except OSError:
            pass

    def list(self, limit: int | None = None) -> list[Preference]:
        out: list[Preference] = []
        for row in self._load_raw():
            text = _normalize(row.get("text", ""))
            if not text:
                continue
            scope = str(row.get("scope", "global")).casefold()
            if scope not in VALID_SCOPES:
                scope = "global"
            out.append(Preference(
                id=str(row.get("id", "")) or f"p-{secrets.token_hex(4)}",
                text=text,
                created_at=str(row.get("created_at", "")),
                source=str(row.get("source", "user_explicit")),
                scope=scope,
                project=_normalize(row.get("project", "")),
                task_types=tuple(_normalize(x).casefold() for x in row.get("task_types", []) if _normalize(x)),
                keywords=tuple(_normalize(x).casefold() for x in row.get("keywords", []) if _normalize(x)),
                enabled=bool(row.get("enabled", True)),
            ))
        if limit is not None:
            return out[-max(0, int(limit)):]
        return out

    def add(self, text: str, *, scope: str = "global", project: str = "", task_types: list[str] | tuple[str, ...] | None = None, keywords: list[str] | tuple[str, ...] | None = None, source: str = "user_explicit") -> dict:
        normalized = _normalize(text)
        if not normalized:
            raise ValueError("Preference cannot be empty.")
        if len(normalized) > MAX_PREFERENCE_CHARS:
            raise ValueError(f"Preference exceeds {MAX_PREFERENCE_CHARS} characters.")
        scope = str(scope or "global").casefold()
        if scope not in VALID_SCOPES:
            raise ValueError(f"Scope must be one of: {', '.join(sorted(VALID_SCOPES))}.")
        project = _normalize(project)
        clean_task_types = tuple(dict.fromkeys(_normalize(x).casefold() for x in (task_types or []) if _normalize(x)))
        clean_keywords = tuple(dict.fromkeys(_normalize(x).casefold() for x in (keywords or []) if _normalize(x)))
        if scope == "project" and not project:
            raise ValueError("Project-scoped rules require a project name.")
        if scope == "task" and not clean_task_types:
            raise ValueError("Task-scoped rules require at least one task type.")

        cfg = Config.load()
        dlp = cfg.data.get("dlp", {})
        safe_text = normalized
        report = {"findings": [], "counts": {}, "mode": dlp.get("mode", "standard")}
        if dlp.get("scan_before_memory", True):
            safe_text, report = sanitize(normalized, dlp, purpose="memory")
            safe_text = _normalize(str(safe_text))

        rows = [item.to_dict() for item in self.list()]
        signature = (safe_text.casefold(), scope, project.casefold(), clean_task_types, clean_keywords)
        for row in rows:
            row_signature = (
                _normalize(row.get("text", "")).casefold(),
                str(row.get("scope", "global")).casefold(),
                _normalize(row.get("project", "")).casefold(),
                tuple(str(x).casefold() for x in row.get("task_types", [])),
                tuple(str(x).casefold() for x in row.get("keywords", [])),
            )
            if row_signature == signature:
                return {"status": "exists", "preference": row, "dlp": report}

        pref = Preference(
            id=f"p-{secrets.token_hex(4)}",
            text=safe_text,
            created_at=datetime.now(timezone.utc).isoformat(),
            source=source,
            scope=scope,
            project=project,
            task_types=clean_task_types,
            keywords=clean_keywords,
        )
        rows.append(pref.to_dict())
        self._write(rows)
        return {"status": "saved", "preference": pref.to_dict(), "dlp": report}

    def select(self, text: str, *, project: str = "", task_type: str = "", limit: int | None = None) -> list[Preference]:
        source = str(text or "").casefold()
        project_key = _normalize_key(project)
        task_key = _normalize_key(task_type) or infer_task_type(text)
        selected: list[Preference] = []
        for pref in self.list():
            if not pref.enabled:
                continue
            if pref.scope == "project" and _normalize_key(pref.project) != project_key:
                continue
            if pref.scope == "task" and task_key not in pref.task_types:
                continue
            if pref.keywords and not any(keyword in source for keyword in pref.keywords):
                continue
            selected.append(pref)
        if limit is not None:
            return selected[-max(0, int(limit)):]
        return selected

    def propose(self, correction: str, *, project: str = "", task_type: str = "") -> dict:
        text = _normalize(correction)
        if not text:
            raise ValueError("Correction cannot be empty.")
        inferred = _normalize(task_type).casefold() or infer_task_type(text)
        scope = "project" if _normalize(project) else ("task" if inferred != "general" else "global")
        proposal = {
            "text": text,
            "scope": scope,
            "project": _normalize(project) if scope == "project" else "",
            "task_types": [inferred] if scope == "task" else [],
            "source": "correction_proposal",
            "saved": False,
        }
        return {"status": "proposed", "proposal": proposal, "message": "Review this rule before saving. Quillgeist never turns a correction into a persistent rule silently."}

    def remove(self, selector: str) -> dict:
        needle = _normalize(selector)
        if not needle:
            raise ValueError("Preference selector cannot be empty.")
        rows = [item.to_dict() for item in self.list()]
        exact_id = [row for row in rows if row.get("id", "").casefold() == needle.casefold()]
        if exact_id:
            remove_ids = {row["id"] for row in exact_id}
        else:
            matches = [row for row in rows if needle.casefold() in row.get("text", "").casefold()]
            if len(matches) > 1:
                return {"status": "ambiguous", "matches": matches, "message": "More than one preference matched. Remove by preference id."}
            if not matches:
                return {"status": "not_found", "selector": needle}
            remove_ids = {matches[0]["id"]}
        removed = [row for row in rows if row.get("id") in remove_ids]
        kept = [row for row in rows if row.get("id") not in remove_ids]
        self._write(kept)
        return {"status": "removed", "removed": removed}

    def clear(self) -> dict:
        count = len(self.list())
        self._write([])
        return {"status": "cleared", "removed_count": count}


def parse_preference_command(text: str) -> tuple[str, str] | None:
    source = str(text or "")
    match = REMEMBER_RE.match(source)
    if match:
        return "remember", match.group(1)
    match = FORGET_RE.match(source)
    if match:
        return "forget", match.group(1)
    return None


def render_preference_context(preferences: list[Preference]) -> str:
    if not preferences:
        return ""
    lines = [
        "QUILLGEIST APPLICABLE OPERATING RULES",
        "Apply only these user-owned rules for this task. A direct task-specific instruction from the user overrides them.",
    ]
    for pref in preferences:
        scope = pref.scope
        if pref.project:
            scope += f":{pref.project}"
        elif pref.task_types:
            scope += ":" + ",".join(pref.task_types)
        lines.append(f"- [{pref.id} | {scope}] {pref.text}")
    lines.append("END APPLICABLE OPERATING RULES")
    return "\n".join(lines)
