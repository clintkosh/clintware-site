from __future__ import annotations

import time
import uuid

from . import __version__
from .config import Config
from .telemetry import emit_event, emit_run_result
from . import local_console as console


_raw_execute = console.execute


def _execute_with_telemetry(pack, config=None, workspace_override=None, approved=False):
    cfg = config or Config.load()
    result = _raw_execute(pack, cfg, workspace_override=workspace_override, approved=approved)
    intent = dict(pack.manifest.get("quillgeist_intent") or {})
    result["product_area"] = "local_autonomy"
    result["intent_type"] = intent.get("intent_type")
    result["autonomy"] = intent.get("autonomy")
    result["execution_source"] = "local_workbench"
    emit_run_result(cfg, result)
    emit_event(cfg, {
        "event_id": f"local-intent:{result.get('run_id') or uuid.uuid4()}",
        "type": "local_intent_run",
        "ts": int(time.time() * 1000),
        "device_id": cfg.data.get("device_id"),
        "run_id": result.get("run_id"),
        "job_id": result.get("job_id"),
        "status": result.get("status"),
        "duration_ms": int(result.get("duration_ms") or 0),
        "node_version": __version__,
        "metadata": {
            "source": "local_workbench",
            "intent_type": intent.get("intent_type"),
            "autonomy": intent.get("autonomy"),
            "scheduled": bool(intent.get("schedule_seconds")),
            "deterministic": True,
            "llm_required": False,
        },
    })
    return result


console.execute = _execute_with_telemetry
serve = console.serve


def main(argv=None):
    return console.main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
