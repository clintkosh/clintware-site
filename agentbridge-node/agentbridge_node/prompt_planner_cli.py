from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from .config import Config
from .prompt_planner import plan_prompt


def _read_prompt(args) -> str:
    if args.file:
        return Path(args.file).read_text(encoding="utf-8")
    if args.prompt:
        return args.prompt
    if not sys.stdin.isatty():
        return sys.stdin.read()
    raise SystemExit("Provide prompt text, --file PATH, or pipe prompt text on stdin.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="quillgeist-plan",
        description="Compile a task with only the applicable user-owned operating rules, then compact/decompose it when useful.",
    )
    parser.add_argument("prompt", nargs="?", help="Prompt text. Omit when using --file or stdin.")
    parser.add_argument("--file", help="Read prompt text from a UTF-8 file.")
    parser.add_argument("--project", default="", help="Optional project name used to select project-scoped operating rules.")
    parser.add_argument("--task-type", default="", help="Optional explicit task type; otherwise Quillgeist infers a conservative type.")
    parser.add_argument("--force", action="store_true", help="Force decomposition even when automatic thresholds are not met.")
    parser.add_argument("--plain", action="store_true", help="Print only the compiled master prompt.")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    cfg = Config.load()
    text = _read_prompt(args)
    settings = dict(cfg.data.get("prompt_planner", {}))
    if args.project:
        settings["project"] = args.project
    if args.task_type:
        settings["task_type"] = args.task_type
    plan = plan_prompt(text, settings, force=args.force)
    if args.plain:
        print(plan.master_prompt)
    else:
        print(json.dumps(plan.to_dict(), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
