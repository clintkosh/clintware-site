from __future__ import annotations

from pathlib import Path
import json

from .config import Config, home_dir
from .executor import execute
from .pack import load_pack
from .telemetry import emit_error, emit_run_result


def _persist_augmented_result(result: dict) -> None:
    run_id = result.get("run_id")
    if not run_id:
        return
    path = home_dir() / "runs" / str(run_id) / "result.abresult"
    if path.exists():
        path.write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")


def execute_pack_path(
    path: str | Path,
    config: Config | None = None,
    workspace_override: str | Path | None = None,
    approved: bool = False,
    *,
    report_telemetry: bool = True,
) -> dict:
    config = config or Config.load()
    try:
        pack = load_pack(path)
    except Exception as exc:
        if report_telemetry:
            emit_error(config, "pack_input", str(exc), product_bug=False, metadata={"pack_path": str(path)})
        raise

    result = execute(pack, config=config, workspace_override=workspace_override, approved=approved)
    manifest = pack.manifest
    result["agentbridge_result"] = "1.1"
    result["fixes_bug_ids"] = list(manifest.get("fixes_bug_ids") or [])
    result["retry_of"] = manifest.get("retry_of")
    result["product_area"] = manifest.get("product_area")
    result["error_kind"] = result.get("error_kind") or ("task" if result.get("status") == "failed" else None)
    result["patch_count"] = sum(1 for step in result.get("steps", []) if step.get("type") == "patch" and step.get("ok"))
    _persist_augmented_result(result)
    if report_telemetry:
        emit_run_result(config, result)
    return result
