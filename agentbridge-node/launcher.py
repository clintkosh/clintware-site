from __future__ import annotations

import sys


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "intent":
        from agentbridge_node.autonomy_cli import main as autonomy_main
        raise SystemExit(autonomy_main(sys.argv[2:]))
    if len(sys.argv) > 1 and sys.argv[1] == "local":
        from agentbridge_node.local_console import main as local_main
        raise SystemExit(local_main(sys.argv[2:]))

    from agentbridge_node.cli import main as cli_main
    return cli_main()


if __name__ == "__main__":
    main()
