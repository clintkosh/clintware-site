from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from .config import Config
from .state_compactor import DeltaStateCompactor, maybe_compact_with_state


def _read_text(args) -> str:
    if getattr(args, "file", None):
        return Path(args.file).read_text(encoding="utf-8")
    if getattr(args, "text", None):
        return args.text
    if not sys.stdin.isatty():
        return sys.stdin.read()
    raise SystemExit("Provide text, --file PATH, or pipe UTF-8 text on stdin.")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="quillgeist-state",
        description="Maintain local delta-state context so repeated AI sessions send new state instead of replaying the full history.",
    )
    sub = p.add_subparsers(dest="command", required=True)

    ingest = sub.add_parser("ingest")
    ingest.add_argument("--scope", required=True)
    ingest.add_argument("text", nargs="?")
    ingest.add_argument("--file")
    ingest.add_argument("--query", default="")
    ingest.add_argument("--plain", action="store_true")

    show = sub.add_parser("show")
    show.add_argument("--scope", required=True)
    show.add_argument("--query", default="")

    status = sub.add_parser("status")
    status.add_argument("--scope", required=True)

    reset = sub.add_parser("reset")
    reset.add_argument("--scope", required=True)
    reset.add_argument("--yes", action="store_true")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    cfg = Config.load()
    settings = dict(cfg.data.get("state_compactor", {}))

    if args.command == "ingest":
        raw = _read_text(args)
        compacted, metrics = maybe_compact_with_state(raw, scope=args.scope, config=settings, query=args.query or None)
        if args.plain:
            print(compacted)
        else:
            print(json.dumps({"context": compacted, "metrics": metrics.to_dict()}, indent=2, ensure_ascii=False))
        return 0

    store = DeltaStateCompactor(args.scope, archive_max_atoms=int(settings.get("archive_max_atoms", 4000)))
    if args.command == "show":
        print(store.render(
            query=args.query,
            max_chars=int(settings.get("max_active_chars", 12000)),
            recent_limit=int(settings.get("recent_limit", 48)),
            rehydrate_hits=int(settings.get("rehydrate_hits", 12)),
            working_limit=int(settings.get("working_limit", 12)),
        ))
        return 0
    if args.command == "status":
        print(json.dumps(store.status(), indent=2, ensure_ascii=False))
        return 0
    if args.command == "reset":
        if not args.yes:
            raise SystemExit("Refusing to reset local context state without --yes")
        store.reset()
        print(json.dumps(store.status(), indent=2, ensure_ascii=False))
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
