from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from .big_prompt import plan_big_prompt
from .config import Config


def _read_prompt(args) -> str:
    if args.file:
        return Path(args.file).read_text(encoding="utf-8")
    if args.prompt:
        return args.prompt
    if not sys.stdin.isatty():
        return sys.stdin.read()
    raise SystemExit("Provide prompt text, --file PATH, or pipe prompt text on stdin.")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="quillgeist-big",
        description="Recursively decompose a substantial prompt into dependency-aware qq/control-plane work units.",
    )
    parser.add_argument("prompt", nargs="?")
    parser.add_argument("--file")
    parser.add_argument("--project", default="")
    parser.add_argument("--state-scope", default="")
    parser.add_argument("--max-depth", type=int, default=None)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--plain", action="store_true")
    args = parser.parse_args(argv)

    cfg = Config.load()
    settings = dict(cfg.data.get("big_prompt", {}))
    settings["prompt_planner"] = dict(cfg.data.get("prompt_planner", {}))
    settings["state_compaction"] = dict(cfg.data.get("state_compactor", {}))
    if args.max_depth is not None:
        settings["max_depth"] = args.max_depth

    prompt = _read_prompt(args)
    plan = plan_big_prompt(
        prompt,
        settings,
        project=args.project,
        state_scope=args.state_scope,
        force=args.force,
    )
    if args.plain:
        print(plan.master_prompt)
    else:
        print(json.dumps(plan.to_dict(), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
