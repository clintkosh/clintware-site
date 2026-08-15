from __future__ import annotations
from datetime import datetime, timezone
import json
from .config import home_dir

def append(event: dict) -> None:
    log_dir = home_dir() / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    path = log_dir / f"{now.date().isoformat()}.jsonl"
    row = {"ts": now.isoformat(), **event}
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
