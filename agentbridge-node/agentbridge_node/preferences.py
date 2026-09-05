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
REMEMBER_RE = re.compile(r"^\s*(?:remember|save\s+preference|preference)\s*:\s*(.+?)\s*$", re.I | re.S)
FORGET_RE = re.compile(r"^\s*(?:forget|remove\s+preference)\s*:\s*(.+?)\s*$", re.I | re.S)


@dataclass(frozen=True)
class Preference:
    id: str
    text: str
    created_at: str
    source: str = "user_explicit"

    def to_dict(self) -> dict:
        return asdict(self)


def _normalize(value: str) -> str:
    return " ".join(str(value or "").split()).strip()


class PreferenceStore:
    """Small local store for user-approved, model-independent preferences.

    Preferences live under QUILLGEIST_HOME and are deliberately separate from
    provider chat history.  Only explicit user saves should enter this store.
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
        payload = {"version": 1, "preferences": rows[-MAX_PREFERENCES:]}
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
            out.append(
                Preference(
                    id=str(row.get("id", "")) or f"p-{secrets.token_hex(4)}",
                    text=text,
                    created_at=str(row.get("created_at", "")),
                    source=str(row.get("source", "user_explicit")),
                )
            )
        if limit is not None:
            return out[-max(0, int(limit)):]
        return out

    def add(self, text: str) -> dict:
        normalized = _normalize(text)
        if not normalized:
            raise ValueError("Preference cannot be empty.")
        if len(normalized) > MAX_PREFERENCE_CHARS:
            raise ValueError(f"Preference exceeds {MAX_PREFERENCE_CHARS} characters.")

        cfg = Config.load()
        dlp = cfg.data.get("dlp", {})
        safe_text = normalized
        report = {"findings": [], "counts": {}, "mode": dlp.get("mode", "standard")}
        if dlp.get("scan_before_memory", True):
            safe_text, report = sanitize(normalized, dlp, purpose="memory")
            safe_text = _normalize(str(safe_text))

        rows = [item.to_dict() for item in self.list()]
        for row in rows:
            if _normalize(row.get("text", "")).casefold() == safe_text.casefold():
                return {"status": "exists", "preference": row, "dlp": report}

        pref = Preference(
            id=f"p-{secrets.token_hex(4)}",
            text=safe_text,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        rows.append(pref.to_dict())
        self._write(rows)
        return {"status": "saved", "preference": pref.to_dict(), "dlp": report}

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
                return {
                    "status": "ambiguous",
                    "matches": matches,
                    "message": "More than one preference matched. Remove by preference id.",
                }
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
        "QUILLGEIST USER-OWNED PREFERENCES",
        "Apply these saved preferences when relevant. A task-specific instruction from the user overrides them.",
    ]
    lines.extend(f"- [{pref.id}] {pref.text}" for pref in preferences)
    lines.append("END USER-OWNED PREFERENCES")
    return "\n".join(lines)
