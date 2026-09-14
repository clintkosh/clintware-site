from __future__ import annotations

import argparse
import json
import platform
import sys
import time
import uuid

from . import __version__
from .autonomy import AUTONOMY_LEVELS, IntentError, compile_intent, save_manifest_json
from .config import Config, home_dir
from .executor import execute
from .native_schedule import NativeScheduleError, install_windows_schedule
from .policy import evaluate
from .scheduler import add_schedule, approve_schedule
from .telemetry import emit_event, emit_run_result


def _duration(value: str) -> int:
    raw = str(value or "").strip().lower()
    if raw.isdigit():
        seconds = int(raw)
    else:
        import re
        match = re.fullmatch(r"(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)", raw)
        if not match:
            raise argparse.ArgumentTypeError("Use seconds or a duration such as 15m, 1h, 1d.")
        amount = int(match.group(1))
        unit = match.group(2)[0]
        seconds = amount * {"s": 1, "m": 60, "h": 3600, "d": 86400, "w": 604800}[unit]
    if seconds < 60:
        raise argparse.ArgumentTypeError("Schedules must be at least 60 seconds apart.")
    return seconds


def _human(compiled) -> None:
    print("QUILLGEIST LOCAL INTENT")
    print(f"TYPE        {compiled.intent_type}")
    print(f"CONFIDENCE  {compiled.confidence:.0%}")
    print(f"AUTONOMY    {compiled.autonomy}")
    print(f"WORKSPACE   {compiled.workspace}")
    print(f"SCHEDULE    {compiled.schedule_seconds or 'not scheduled'}")
    print("\nUNDERSTAND")
    for line in compiled.understanding:
        print(f"  - {line}")
    print("\nBOUNDARIES")
    for line in compiled.boundaries:
        print(f"  - {line}")
    print("\nPOWERSHELL")
    print("```powershell")
    print(compiled.powershell.rstrip())
    print("```")


def _intent_event(cfg: Config, event_type: str, status: str, compiled=None, *, source: str = "intent_cli") -> None:
    metadata = {"source": source, "deterministic": True, "llm_required": False}
    if compiled is not None:
        metadata.update({
            "intent_type": compiled.intent_type,
            "autonomy": compiled.autonomy,
            "confidence": compiled.confidence,
            "scheduled": bool(compiled.schedule_seconds),
        })
    emit_event(cfg, {
        "event_id": f"{event_type}:{uuid.uuid4()}",
        "type": event_type,
        "ts": int(time.time() * 1000),
        "device_id": cfg.data.get("device_id"),
        "status": status,
        "node_version": __version__,
        "metadata": metadata,
    })


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="quillgeist intent",
        description="Compile bounded natural-language local intent into an inspectable Quillgeist execution pack.",
    )
    p.add_argument("text", help="Local task intent. Put complex text in quotes.")
    p.add_argument("--workspace", default=".", help="Local workspace used by the generated execution pack.")
    p.add_argument("--autonomy", choices=AUTONOMY_LEVELS, default="recommend")
    p.add_argument("--apply", action="store_true", help="Execute the compiled pack now.")
    p.add_argument("--approve-all", action="store_true", help="Explicitly approve capabilities that local policy marks ask.")
    p.add_argument("--schedule", action="store_true", help="Install a local schedule using cadence parsed from the intent.")
    p.add_argument("--every", type=_duration, help="Override/add a local repeat cadence, e.g. 15m, 1h, 1d.")
    p.add_argument("--output", help="Write the generated execution manifest to this JSON path.")
    p.add_argument("--json", action="store_true", help="Print the complete compiler result as JSON.")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    cfg = Config.load()
    try:
        compiled = compile_intent(args.text, workspace=args.workspace, autonomy=args.autonomy)
    except IntentError as exc:
        _intent_event(cfg, "local_intent_compile", "refused")
        print(f"Quillgeist could not compile this intent: {exc}", file=sys.stderr)
        return 2

    if args.every:
        compiled.schedule_seconds = args.every
        compiled.manifest["quillgeist_intent"]["schedule_seconds"] = args.every

    _intent_event(cfg, "local_intent_compile", "prepared", compiled)

    if args.output:
        save_manifest_json(compiled, args.output)

    if args.json:
        print(json.dumps(compiled.to_dict(), indent=2))
    else:
        _human(compiled)

    pack = compiled.execution_pack()

    if args.apply:
        decision = evaluate(pack.manifest, cfg.data.get("policy", {}), approved=args.approve_all)
        print("\nEXECUTE")
        if (decision.denied or decision.needs_approval) and not args.approve_all:
            status = "approval_required" if decision.needs_approval else "denied"
            _intent_event(cfg, "local_intent_run", status, compiled)
            print(json.dumps({
                "status": status,
                "needs_approval": decision.needs_approval,
                "denied": decision.denied,
            }, indent=2))
        else:
            result = execute(pack, cfg, workspace_override=args.workspace, approved=args.approve_all)
            result["product_area"] = "local_autonomy"
            result["intent_type"] = compiled.intent_type
            result["autonomy"] = compiled.autonomy
            result["execution_source"] = "intent_cli"
            emit_run_result(cfg, result)
            _intent_event(cfg, "local_intent_run", result.get("status", "unknown"), compiled)
            print(json.dumps(result, indent=2, default=str))

    if args.schedule:
        every = compiled.schedule_seconds
        if not every:
            print("\nSCHEDULE\nNo cadence found. Add wording such as 'every hour' or pass --every 1h.", file=sys.stderr)
            return 2
        decision = evaluate(pack.manifest, cfg.data.get("policy", {}), approved=args.approve_all)
        if decision.denied:
            _intent_event(cfg, "local_intent_schedule", "denied", compiled)
            print(json.dumps({"status": "denied", "denied": decision.denied}, indent=2), file=sys.stderr)
            return 2
        if decision.needs_approval and not args.approve_all:
            _intent_event(cfg, "local_intent_schedule", "approval_required", compiled)
            print(json.dumps({"status": "approval_required", "needs_approval": decision.needs_approval}, indent=2), file=sys.stderr)
            return 2
        pack_dir = home_dir() / "autonomy" / "packs"
        pack_path = save_manifest_json(compiled, pack_dir / f"{compiled.id}.json")
        try:
            if platform.system().lower() == "windows":
                if "admin" in compiled.manifest.get("permissions", []):
                    raise NativeScheduleError("Admin-level repair is not silently installed as an elevated persistent task. Run it interactively or create an explicitly elevated task.")
                row = install_windows_schedule(pack_path, every, approve_all=args.approve_all)
            else:
                row = add_schedule(str(pack_path), every_seconds=every, owner="device", device_id=cfg.data["device_id"])
                if args.approve_all:
                    approve_schedule(row["id"], True)
                    row["approved_local"] = True
                row = {"provider": "quillgeist_device_scheduler", **row}
        except NativeScheduleError as exc:
            _intent_event(cfg, "local_intent_schedule", "failed", compiled)
            print(f"\nSCHEDULE\n{exc}", file=sys.stderr)
            return 2
        _intent_event(cfg, "local_intent_schedule", "installed", compiled)
        print("\nSCHEDULE")
        print(json.dumps(row, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
