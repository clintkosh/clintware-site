from __future__ import annotations

import argparse
import json

from .assemblerer_manifest import compile_manifest_context


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="quillgeist-manifest",
        description="Compile an Assemblerer company manifest into bounded Quillgeist operating context.",
    )
    parser.add_argument("manifest", help="Path to an exported Assemblerer company-manifest JSON file.")
    parser.add_argument("--task-limit", type=int, default=8, help="Maximum pending tasks to include in one compiled context.")
    parser.add_argument("--plain", action="store_true", help="Print only the compiled operating context.")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    result = compile_manifest_context(args.manifest, task_limit=args.task_limit)
    if args.plain:
        print(result["context"])
    else:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
