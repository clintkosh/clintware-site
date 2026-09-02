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
        description="Compact and decompose oversized or multi-stage prompts into a self-continuing Quillgeist execution plan.",
    )
    parser.add_argument("prompt", nargs="?", help="Prompt text. Omit when using --file or stdin.")
    parser.add_argument("--file", help="Read prompt text from a UTF-8 file.")
    parser.add_argument("--force", action="store_true", help="Force decomposition even when automatic thresholds are not met.")
    parser.add_argument("--plain", action="store_true", help="Print only the master continuation prompt.")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    cfg = Config.load()
    text = _read_prompt(args)
    plan = plan_prompt(text, cfg.data.get("prompt_planner", {}), force=args.force)
    if args.plain:
        print(plan.master_prompt)
    else:
        print(json.dumps(plan.to_dict(), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
