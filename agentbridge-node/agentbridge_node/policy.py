from __future__ import annotations
from dataclasses import dataclass

VALID = {"always", "ask", "never"}

def required_capabilities(manifest: dict) -> set[str]:
    caps = set(manifest.get("permissions", []))
    for step in manifest.get("steps", []):
        t = step.get("type")
        if t in {"write_file", "patch", "delete_file", "mkdir", "copy_file", "extract_embedded"}:
            caps.add("file.write")
        elif t == "read_file":
            caps.add("file.read")
        elif t == "run":
            caps.add("process.run")
            runtime = str(step.get("runtime", "")).lower()
            command = str(step.get("command", "")).strip().lower()
            if runtime == "git" and command.startswith("commit"):
                caps.add("git.commit")
            if runtime == "git" and command.startswith("push"):
                caps.add("git.push")
            if step.get("admin"):
                caps.add("admin")
            if step.get("network_write"):
                caps.add("network.write")
    for check in manifest.get("definition_of_done", []):
        if check.get("type") == "command":
            caps.add("process.run")
    return caps

@dataclass
class Decision:
    allowed: bool
    needs_approval: list[str]
    denied: list[str]

def evaluate(manifest: dict, policy: dict, approved: bool = False) -> Decision:
    ask = []
    denied = []
    for cap in sorted(required_capabilities(manifest)):
        mode = policy.get(cap, "ask")
        if mode not in VALID:
            mode = "ask"
        if mode == "never":
            denied.append(cap)
        elif mode == "ask" and not approved:
            ask.append(cap)
    return Decision(not denied and not ask, ask, denied)
