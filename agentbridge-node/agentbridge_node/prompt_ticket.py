from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
import json
import sqlite3
import uuid

from .config import home_dir

TERMINAL = {"verified_done", "blocked", "carried_forward"}

@dataclass(frozen=True)
class PromptTicket:
    ticket_id: str
    prompt: str
    status: str
    created_at: str
    updated_at: str
    detail: str = ""

def _db_path() -> Path:
    path = home_dir() / "prompt-tickets.sqlite3"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path

def _connect() -> sqlite3.Connection:
    db = sqlite3.connect(_db_path(), timeout=5)
    db.execute(
        """CREATE TABLE IF NOT EXISTS prompt_tickets(
        ticket_id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT ''
        )"""
    )
    return db

def open_ticket(prompt: str) -> PromptTicket:
    now = datetime.now(timezone.utc).isoformat()
    row = PromptTicket(
        ticket_id="qpt-" + uuid.uuid4().hex[:12],
        prompt=str(prompt or "").strip()[:12000],
        status="in_progress",
        created_at=now,
        updated_at=now,
    )
    with _connect() as db:
        db.execute(
            "INSERT INTO prompt_tickets(ticket_id,prompt,status,created_at,updated_at,detail) VALUES (?,?,?,?,?,?)",
            (row.ticket_id, row.prompt, row.status, row.created_at, row.updated_at, row.detail),
        )
    return row

def set_status(ticket_id: str, status: str, detail: str = "") -> PromptTicket:
    status = str(status or "").strip().lower()
    allowed = {"in_progress", *TERMINAL}
    if status not in allowed:
        raise ValueError(f"Unsupported prompt-ticket status: {status}")
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as db:
        existing = db.execute(
            "SELECT ticket_id,prompt,status,created_at,updated_at,detail FROM prompt_tickets WHERE ticket_id=?",
            (ticket_id,),
        ).fetchone()
        if not existing:
            raise KeyError(ticket_id)
        db.execute(
            "UPDATE prompt_tickets SET status=?,updated_at=?,detail=? WHERE ticket_id=?",
            (status, now, str(detail or "")[:4000], ticket_id),
        )
        row = db.execute(
            "SELECT ticket_id,prompt,status,created_at,updated_at,detail FROM prompt_tickets WHERE ticket_id=?",
            (ticket_id,),
        ).fetchone()
    return PromptTicket(*row)

def open_tickets(limit: int = 20) -> list[PromptTicket]:
    with _connect() as db:
        rows = db.execute(
            "SELECT ticket_id,prompt,status,created_at,updated_at,detail FROM prompt_tickets WHERE status='in_progress' ORDER BY created_at ASC LIMIT ?",
            (max(1, min(int(limit), 200)),),
        ).fetchall()
    return [PromptTicket(*row) for row in rows]

def ticket_contract() -> dict:
    return {
        "protocol": "quillgeist-prompt-ticket/v1",
        "open_before_work": True,
        "terminal_states": sorted(TERMINAL),
        "next_prompt_rule": "Before beginning the next substantial prompt, reconcile older in_progress tickets to verified_done, blocked, or carried_forward.",
        "no_silent_stop": True,
    }

def as_json(ticket: PromptTicket) -> str:
    return json.dumps(asdict(ticket), sort_keys=True)
