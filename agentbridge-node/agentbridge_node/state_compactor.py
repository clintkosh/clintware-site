from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import math
import os
import re
from typing import Iterable

SCHEMA_VERSION = 1
ATOM_SPLIT_RE = re.compile(r"\n+|(?<=[.!?])\s+(?=[A-Z0-9\"'\`/])")
WS_RE = re.compile(r"\s+")
WORD_RE = re.compile(r"[a-z0-9_./:-]{3,}", re.I)
ANCHOR_RE = re.compile(
    r"\b(?:must|never|do not|don't|exact(?:ly)?|required?|constraint|preserve|only|without|"
    r"definition of done|privacy|permission|filename|file path|path|url|quoted? text|count|name)\b",
    re.I,
)
OPEN_RE = re.compile(r"\b(?:todo|next|remaining|pending|unresolved|open item|follow[- ]?up|need(?:s|ed)? to|still need|after that|then)\b", re.I)
FAILURE_RE = re.compile(r"\b(?:error|exception|traceback|failed|failure|fatal|panic|denied|blocked|broken|regression|not found|timed? out)\b", re.I)
DECISION_RE = re.compile(r"\b(?:decision|decided|chosen|chose|selected|agreed|approved|keep using|use .* instead)\b", re.I)
DONE_RE = re.compile(r"\b(?:completed|done|passed|verified|resolved|fixed|deployed|shipped|accepted|closed)\b", re.I)
ACTION_RE = re.compile(r"\b(?:build|create|generate|make|update|edit|modify|fix|implement|add|remove|replace|assemble|combine|export|render|deploy|test|verify|check|review|research|search|compare|analyze|summarize|draft|send|save|upload|download|publish|continue)\b", re.I)
URL_RE = re.compile(r"https?://\S+", re.I)
PATH_RE = re.compile(r"(?:[A-Za-z]:\\\\|/(?:[^\s/]+/)+|\b[\w.-]+/[\w./-]+\b)")
QUOTE_RE = re.compile(r"[\"'\`]([^\"'\`]{4,})[\"'\`]")


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalized(text: str) -> str:
    return WS_RE.sub(" ", str(text or "").strip())


def _fingerprint(text: str) -> str:
    return sha256(_normalized(text).casefold().encode("utf-8")).hexdigest()[:20]


def _safe_scope(scope: str) -> str:
    raw = _normalized(scope) or "default"
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", raw).strip("-.")[:48] or "default"
    return f"{slug}-{sha256(raw.encode('utf-8')).hexdigest()[:8]}"


def _split_atoms(text: str) -> list[str]:
    text = str(text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        return []
    atoms: list[str] = []
    for block in ATOM_SPLIT_RE.split(text):
        item = _normalized(block)
        if item:
            atoms.append(item)
    return atoms


def _kind(text: str) -> str:
    if FAILURE_RE.search(text):
        return "failure"
    if ANCHOR_RE.search(text) or URL_RE.search(text) or PATH_RE.search(text) or QUOTE_RE.search(text):
        return "anchor"
    if DONE_RE.search(text):
        return "done"
    if DECISION_RE.search(text):
        return "decision"
    if OPEN_RE.search(text) or ACTION_RE.search(text):
        return "open"
    return "recent"


def _terms(text: str) -> set[str]:
    stop = {"the", "and", "for", "that", "this", "with", "from", "into", "then", "when", "have", "has", "was", "were", "are", "but", "not", "you", "your", "our", "use"}
    return {w.casefold() for w in WORD_RE.findall(text) if w.casefold() not in stop}


def _relevance(query_terms: set[str], item_text: str) -> float:
    if not query_terms:
        return 0.0
    terms = _terms(item_text)
    if not terms:
        return 0.0
    overlap = len(query_terms & terms)
    if not overlap:
        return 0.0
    return overlap / math.sqrt(max(1, len(terms)))


@dataclass
class StateMetrics:
    scope: str
    total_atoms: int
    new_atoms: int
    duplicate_atoms: int
    duplicate_ratio: float
    active_chars: int
    raw_chars: int
    reduction_pct: float
    state_hash: str
    eligible_for_compaction: bool

    def to_dict(self) -> dict:
        return asdict(self)


class DeltaStateCompactor:
    """Local persistent state for repeated AI context.

    The active prompt is rendered from four layers:
    exact anchors, current working state, a short recent tail, and query-selected
    cold history. Full raw conversation replay is intentionally avoided.
    """

    def __init__(
        self,
        scope: str,
        *,
        root: str | Path | None = None,
        archive_max_atoms: int = 4000,
    ):
        self.scope = _normalized(scope) or "default"
        self.root = Path(root).expanduser() if root else Path(os.environ.get("QUILLGEIST_HOME", Path.home() / ".quillgeist")) / "context-state"
        self.root.mkdir(parents=True, exist_ok=True)
        self.path = self.root / f"{_safe_scope(self.scope)}.json"
        self.archive_max_atoms = max(200, int(archive_max_atoms))
        self.state = self._load()

    def _empty(self) -> dict:
        now = _utcnow()
        return {
            "version": SCHEMA_VERSION,
            "scope": self.scope,
            "revision": 0,
            "created_at": now,
            "updated_at": now,
            "anchors": [],
            "working": [],
            "done": [],
            "archive": [],
            "seen": {},
            "stats": {"ingested_atoms": 0, "duplicate_atoms": 0},
        }

    def _load(self) -> dict:
        if not self.path.exists():
            return self._empty()
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return self._empty()
        if data.get("version") != SCHEMA_VERSION or data.get("scope") != self.scope:
            return self._empty()
        return data

    def _save(self) -> None:
        self.state["updated_at"] = _utcnow()
        self.path.write_text(json.dumps(self.state, indent=2, ensure_ascii=False), encoding="utf-8")
        try:
            os.chmod(self.path, 0o600)
        except OSError:
            pass

    def _all_items(self) -> Iterable[dict]:
        yield from self.state.get("anchors", [])
        yield from self.state.get("working", [])
        yield from self.state.get("done", [])
        yield from self.state.get("archive", [])

    def state_hash(self) -> str:
        basis = "\n".join(f"{x.get('id','')}:{x.get('kind','')}:{x.get('text','')}" for x in self._all_items())
        return sha256(basis.encode("utf-8")).hexdigest()[:16]

    def ingest(self, text: str, *, source: str = "context") -> dict:
        atoms = _split_atoms(text)
        seen = self.state.setdefault("seen", {})
        existing_before = len(seen)
        new_items: list[dict] = []
        duplicate = 0
        now = _utcnow()
        for atom in atoms:
            fid = _fingerprint(atom)
            if fid in seen:
                duplicate += 1
                seen[fid]["count"] = int(seen[fid].get("count", 1)) + 1
                seen[fid]["last_seen"] = now
                continue
            kind = _kind(atom)
            item = {"id": fid, "kind": kind, "text": atom, "source": source, "first_seen": now, "last_seen": now}
            seen[fid] = {"count": 1, "kind": kind, "last_seen": now}
            if kind == "anchor":
                self.state.setdefault("anchors", []).append(item)
            elif kind in {"open", "failure", "decision"}:
                self.state.setdefault("working", []).append(item)
            elif kind == "done":
                self.state.setdefault("done", []).append(item)
            else:
                self.state.setdefault("archive", []).append(item)
            new_items.append(item)

        self.state["anchors"] = self.state.get("anchors", [])[-500:]
        self.state["working"] = self.state.get("working", [])[-800:]
        self.state["done"] = self.state.get("done", [])[-160:]
        self.state["archive"] = self.state.get("archive", [])[-self.archive_max_atoms:]
        stats = self.state.setdefault("stats", {})
        stats["ingested_atoms"] = int(stats.get("ingested_atoms", 0)) + len(atoms)
        stats["duplicate_atoms"] = int(stats.get("duplicate_atoms", 0)) + duplicate
        if new_items:
            self.state["revision"] = int(self.state.get("revision", 0)) + 1
        self._save()
        return {
            "scope": self.scope,
            "total_atoms": len(atoms),
            "new_atoms": len(new_items),
            "duplicate_atoms": duplicate,
            "duplicate_ratio": (duplicate / len(atoms)) if atoms else 0.0,
            "existing_atoms_before": existing_before,
            "delta_text": "\n".join(item["text"] for item in new_items),
            "new_items": new_items,
            "state_hash": self.state_hash(),
        }

    def render(
        self,
        *,
        query: str = "",
        max_chars: int = 12000,
        recent_limit: int = 48,
        rehydrate_hits: int = 12,
        working_limit: int = 12,
        mandatory_ids: Iterable[str] | None = None,
    ) -> str:
        max_chars = max(1200, int(max_chars))
        recent_limit = max(4, int(recent_limit))
        rehydrate_hits = max(0, int(rehydrate_hits))
        working_limit = max(4, int(working_limit))
        mandatory_ids = set(mandatory_ids or [])
        sections: list[tuple[str, list[dict]]] = []

        anchors = list(self.state.get("anchors", []))
        all_working = list(self.state.get("working", []))
        mandatory_working = [x for x in all_working if x.get("id") in mandatory_ids]
        failures = [x for x in all_working if x.get("kind") == "failure" and x.get("id") not in mandatory_ids][-24:]
        decisions = [x for x in all_working if x.get("kind") == "decision" and x.get("id") not in mandatory_ids][-24:]
        opens = [x for x in all_working if x.get("kind") == "open" and x.get("id") not in mandatory_ids]

        query_terms = _terms(query)
        scored_open = sorted(
            ((_relevance(query_terms, x.get("text", "")), x) for x in opens),
            key=lambda pair: pair[0],
            reverse=True,
        )
        relevant_open = [x for score, x in scored_open[:rehydrate_hits] if score >= 0.55]
        working: list[dict] = []
        chosen: set[str] = set()
        for bucket in (mandatory_working, failures, decisions, relevant_open, list(reversed(opens))):
            for item in bucket:
                iid = item.get("id")
                if not iid or iid in chosen:
                    continue
                if len(working) >= working_limit and item not in mandatory_working:
                    continue
                working.append(item)
                chosen.add(iid)
        working.sort(key=lambda x: x.get("first_seen", ""))

        done = list(self.state.get("done", []))[-8:]
        recent = list(self.state.get("archive", []))[-recent_limit:]
        selected_ids = {x.get("id") for x in anchors + working + done + recent}
        cold_pool = [x for x in self._all_items() if x.get("id") not in selected_ids and x.get("kind") != "open"]
        scored = sorted(
            ((_relevance(query_terms, x.get("text", "")), x) for x in cold_pool),
            key=lambda pair: pair[0],
            reverse=True,
        )
        rehydrated = [x for score, x in scored[:rehydrate_hits] if score > 0]

        if anchors:
            sections.append(("EXACT ANCHORS", anchors))
        if working:
            sections.append(("WORKING STATE", working))
        if rehydrated:
            sections.append(("REHYDRATED FOR NEXT STEP", rehydrated))
        if recent:
            sections.append(("RECENT UNIQUE CONTEXT", recent))
        if done:
            sections.append(("RECENT VERIFIED/DONE", done))

        header = [
            "QUILLGEIST DELTA-STATE CONTEXT",
            f"scope: {self.scope}",
            f"revision: {self.state.get('revision', 0)}",
            f"state_hash: {self.state_hash()}",
            "Rule: Exact anchors stay immutable unless explicitly superseded. Use the bounded working set plus relevant rehydrated history; do not replay conversation noise.",
        ]
        out = "\n".join(header)
        omitted = max(0, len(all_working) - len(working))
        for title, items in sections:
            block_lines = [f"\n[{title}]"]
            for item in items:
                kind = item.get("kind", "context")
                prefix = f"{kind.upper()}: " if kind in {"failure", "decision"} else ""
                block_lines.append(f"- {prefix}{item.get('text', '')}")
            block = "\n".join(block_lines)
            if len(out) + len(block) <= max_chars:
                out += block
                continue
            room = max_chars - len(out)
            if room > 220:
                partial = [f"\n[{title}]"]
                for item in reversed(items):
                    kind = item.get("kind", "context")
                    prefix = f"{kind.upper()}: " if kind in {"failure", "decision"} else ""
                    line = f"- {prefix}{item.get('text','')}"
                    if len("\n".join(partial + [line])) > room - 100:
                        omitted += 1
                        continue
                    partial.append(line)
                if len(partial) > 1:
                    out += "\n".join(partial)
            else:
                omitted += len(items)
        if omitted:
            suffix = f"\n[STATE NOTE] {omitted} lower-priority items remain in local cold state and were omitted from this active context budget."
            if len(out) + len(suffix) <= max_chars:
                out += suffix
        return out[:max_chars]

    def status(self) -> dict:
        return {
            "scope": self.scope,
            "revision": int(self.state.get("revision", 0)),
            "state_hash": self.state_hash(),
            "anchors": len(self.state.get("anchors", [])),
            "working": len(self.state.get("working", [])),
            "done": len(self.state.get("done", [])),
            "archive": len(self.state.get("archive", [])),
            "seen": len(self.state.get("seen", {})),
            "path": str(self.path),
        }

    def reset(self) -> None:
        self.state = self._empty()
        self._save()


def maybe_compact_with_state(text: str, *, scope: str, config: dict | None = None, query: str | None = None) -> tuple[str, StateMetrics]:
    settings = dict(config or {})
    root = settings.get("root") or None
    store = DeltaStateCompactor(scope, root=root, archive_max_atoms=int(settings.get("archive_max_atoms", 4000)))
    ingested = store.ingest(text, source=str(settings.get("source", "prompt")))
    rendered = store.render(
        query=query or ingested.get("delta_text") or text,
        max_chars=int(settings.get("max_active_chars", 12000)),
        recent_limit=int(settings.get("recent_limit", 48)),
        rehydrate_hits=int(settings.get("rehydrate_hits", 12)),
        working_limit=int(settings.get("working_limit", 12)),
        mandatory_ids=[item.get("id") for item in ingested.get("new_items", []) if item.get("id")],
    )
    raw_chars = len(text)
    active_chars = len(rendered)
    reduction = ((raw_chars - active_chars) / raw_chars * 100.0) if raw_chars else 0.0
    min_dup = float(settings.get("min_duplicate_ratio", 0.25))
    min_reduction = float(settings.get("min_reduction_pct", 8.0))
    anchor_chars = sum(len(x.get("text", "")) + 16 for x in store.state.get("anchors", []))
    anchors_fit = anchor_chars <= int(settings.get("max_active_chars", 12000)) * 0.60
    eligible = bool(
        settings.get("enabled", True)
        and anchors_fit
        and ingested.get("existing_atoms_before", 0) > 0
        and ingested.get("duplicate_ratio", 0.0) >= min_dup
        and reduction >= min_reduction
    )
    metrics = StateMetrics(
        scope=scope,
        total_atoms=int(ingested.get("total_atoms", 0)),
        new_atoms=int(ingested.get("new_atoms", 0)),
        duplicate_atoms=int(ingested.get("duplicate_atoms", 0)),
        duplicate_ratio=float(ingested.get("duplicate_ratio", 0.0)),
        active_chars=active_chars,
        raw_chars=raw_chars,
        reduction_pct=max(0.0, reduction),
        state_hash=str(ingested.get("state_hash", store.state_hash())),
        eligible_for_compaction=eligible,
    )
    return (rendered if eligible else text), metrics
