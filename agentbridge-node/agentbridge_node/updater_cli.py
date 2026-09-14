from __future__ import annotations

import argparse
import json

from .updater import UpdateError, check, open_release


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="quillgeist update", description="Check Quillgeist Cloud for the current approved release manifest.")
    p.add_argument("action", nargs="?", choices=["check", "open"], default="check")
    p.add_argument("--json", action="store_true")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        status = check()
    except UpdateError as exc:
        print(f"Quillgeist update check failed: {exc}")
        return 2
    if args.json:
        print(json.dumps(status.to_dict(), indent=2))
    else:
        print(f"Quillgeist {status.current_version} · Cloud {status.latest_version} · {status.channel}")
        print("UPDATE AVAILABLE" if status.update_available else "CURRENT")
        print(f"Platform: {status.platform}")
        print(f"Install policy: {status.install_policy}")
        if status.sha256:
            print(f"Published SHA-256: {status.sha256}")
        if status.notes:
            print(status.notes)
    if args.action == "open" and status.update_available:
        open_release(status)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
