from __future__ import annotations

import argparse
import json

from .preferences import PreferenceStore


def _print(value):
    print(json.dumps(value, indent=2, ensure_ascii=False, default=str))


def _csv(value: str | None) -> list[str]:
    return [item.strip() for item in str(value or "").split(",") if item.strip()]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="quillgeist-rules", description="Manage Quillgeist user-owned operating rules.")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("list")
    add = sub.add_parser("add")
    add.add_argument("text")
    add.add_argument("--scope", choices=["global", "project", "task"], default="global")
    add.add_argument("--project", default="")
    add.add_argument("--task-types", default="", help="Comma-separated task types such as website,file_edit,writing")
    add.add_argument("--keywords", default="", help="Optional comma-separated trigger keywords")
    propose = sub.add_parser("propose")
    propose.add_argument("correction")
    propose.add_argument("--project", default="")
    propose.add_argument("--task-type", default="")
    remove = sub.add_parser("remove")
    remove.add_argument("selector")
    clear = sub.add_parser("clear")
    clear.add_argument("--yes", action="store_true")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    store = PreferenceStore()
    if args.command == "list":
        _print({"rules": [item.to_dict() for item in store.list()], "count": len(store.list()), "path": str(store.path)})
    elif args.command == "add":
        _print(store.add(args.text, scope=args.scope, project=args.project, task_types=_csv(args.task_types), keywords=_csv(args.keywords)))
    elif args.command == "propose":
        _print(store.propose(args.correction, project=args.project, task_type=args.task_type))
    elif args.command == "remove":
        _print(store.remove(args.selector))
    elif args.command == "clear":
        if not args.yes:
            raise SystemExit("Refusing to clear operating rules without --yes")
        _print(store.clear())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
