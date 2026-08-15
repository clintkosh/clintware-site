#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re
import subprocess
import sys

NODE_HELP = Path("agentbridge-node/agentbridge_node/helpdb.py")
CLOUD_HELP = Path("agentbridge-cloud/src/help.js")
DOC_PATHS = {str(NODE_HELP), str(CLOUD_HELP)}

USER_FACING_PREFIXES = (
    "agentbridge-node/agentbridge_node/",
    "agentbridge-cloud/src/",
    "agentbridge-cloud/public/",
    "agentbridge-mobile/",
)

# These files change release/build metadata without changing user-facing behavior.
EXEMPT_FILES = {
    "agentbridge-node/agentbridge_node/__init__.py",
}


def git_changed_files() -> set[str]:
    try:
        raw = subprocess.check_output(
            ["git", "diff", "--name-only", "HEAD^", "HEAD"],
            text=True,
            stderr=subprocess.STDOUT,
        )
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"help-doc guard could not inspect git diff: {exc}", file=sys.stderr)
        return set()
    return {line.strip() for line in raw.splitlines() if line.strip()}


def user_facing_changes(changed: set[str]) -> set[str]:
    return {
        path
        for path in changed
        if path not in EXEMPT_FILES
        and path not in DOC_PATHS
        and any(path.startswith(prefix) for prefix in USER_FACING_PREFIXES)
        and "/tests/" not in path
    }


def extract_ids(text: str) -> set[str]:
    # Help entries deliberately use stable IDs so Node and Cloud can merge safely.
    return set(re.findall(r'["\']id["\']\s*:\s*["\']([^"\']+)["\']', text))


def extract_terms(text: str) -> set[str]:
    return set(re.findall(r'["\']term["\']\s*:\s*["\']([^"\']+)["\']', text))


def check_help_topic_parity() -> list[str]:
    errors: list[str] = []
    node = NODE_HELP.read_text(encoding="utf-8")
    cloud = CLOUD_HELP.read_text(encoding="utf-8")

    node_ids, cloud_ids = extract_ids(node), extract_ids(cloud)
    node_terms, cloud_terms = extract_terms(node), extract_terms(cloud)

    only_node_ids = sorted(node_ids - cloud_ids)
    only_cloud_ids = sorted(cloud_ids - node_ids)
    only_node_terms = sorted(node_terms - cloud_terms)
    only_cloud_terms = sorted(cloud_terms - node_terms)

    if only_node_ids or only_cloud_ids:
        errors.append(
            "Help entry IDs differ between Node and Cloud. "
            f"Node-only={only_node_ids}; Cloud-only={only_cloud_ids}"
        )
    if only_node_terms or only_cloud_terms:
        errors.append(
            "Glossary terms differ between Node and Cloud. "
            f"Node-only={only_node_terms}; Cloud-only={only_cloud_terms}"
        )
    return errors


def main() -> int:
    errors = check_help_topic_parity()
    changed = git_changed_files()
    relevant = user_facing_changes(changed)

    if relevant:
        missing = DOC_PATHS - changed
        if missing:
            errors.append(
                "User-facing AgentBridge code changed without updating both Help Center sources. "
                f"Relevant changes={sorted(relevant)}; missing documentation updates={sorted(missing)}. "
                "Update the appropriate FAQ/setup/glossary/fix entries in both Node helpdb.py and Cloud help.js."
            )

    if errors:
        print("AgentBridge Help Center guard FAILED:\n")
        for error in errors:
            print(f"- {error}")
        return 1

    if relevant:
        print("AgentBridge Help Center guard passed. User-facing changes include Node + Cloud help updates.")
    else:
        print("AgentBridge Help Center guard passed. No undocumented user-facing change detected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
