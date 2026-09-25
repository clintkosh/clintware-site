from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import json
import os
import secrets
import uuid
from urllib.parse import urlparse

def home_dir() -> Path:
    return Path(os.environ.get("QUILLGEIST_HOME", os.environ.get("AGENTBRIDGE_HOME", Path.home() / ".quillgeist"))).expanduser()

def _defaults() -> dict:
    return {
        "version": 3,
        "device_id": str(uuid.uuid4()),
        "device_token": secrets.token_urlsafe(32),
        "device_name": os.environ.get("COMPUTERNAME") or os.environ.get("HOSTNAME") or "Quillgeist Node",
        "cloud_url": os.environ.get("QUILLGEIST_CLOUD_URL", "").rstrip("/"),
        "allowed_workspaces": [],
        "policy": {
            "file.read": "always",
            "file.write": "ask",
            "process.run": "ask",
            "git.commit": "ask",
            "git.push": "never",
            "admin": "never",
            "network.write": "ask"
        },
        "dlp": {
            "enabled": True,
            "mode": "standard",
            "scan_before_execution": True,
            "scan_before_external_model": True,
            "scan_before_memory": True
        },
        "owner_mode": False,
        "trusted_auto_run": False,
        "clipboard_mode": "detect",
        "contextor": {
            "mode": "fast",
            "compact_threshold_chars": 6000,
            "max_transmit_chars": 24000,
            "ollama_model": "",
            "smart_min_savings_tokens": 4000
        },
        "prompt_planner": {
            "enabled": True,
            "threshold_chars": 3500,
            "step_target_chars": 2400,
            "complexity_threshold": 6,
            "max_steps": 24,
            "auto_continue": True
        },
        "state_compactor": {
            "enabled": True,
            "auto_scope_from_project": True,
            "max_active_chars": 12000,
            "min_duplicate_ratio": 0.25,
            "min_reduction_pct": 8.0,
            "recent_limit": 48,
            "rehydrate_hits": 12,
            "working_limit": 12,
            "archive_max_atoms": 4000
        },
        "telemetry": {
            "enabled": False,
            "privacy": "local_only_default",
            "send_redacted_errors": False,
            "queue_when_offline": False
        },
        "desktop": {
            "local_only": True,
            "launch_minimized": False,
            "global_hotkey": "Ctrl+Alt+Space"
        }
    }

@dataclass
class Config:
    data: dict

    @property
    def path(self) -> Path:
        return home_dir() / "config.json"

    @classmethod
    def load(cls) -> "Config":
        path = home_dir() / "config.json"
        base = _defaults()
        if path.exists():
            incoming = json.loads(path.read_text(encoding="utf-8"))
            base.update(incoming)
            base["policy"] = {**_defaults()["policy"], **incoming.get("policy", {})}
            base["dlp"] = {**_defaults()["dlp"], **incoming.get("dlp", {})}
            base["contextor"] = {**_defaults()["contextor"], **incoming.get("contextor", {})}
            base["prompt_planner"] = {**_defaults()["prompt_planner"], **incoming.get("prompt_planner", {})}
            base["state_compactor"] = {**_defaults()["state_compactor"], **incoming.get("state_compactor", {})}
            base["telemetry"] = {**_defaults()["telemetry"], **incoming.get("telemetry", {})}
            base["desktop"] = {**_defaults()["desktop"], **incoming.get("desktop", {})}
            # Public builds must never silently reconnect to Clintware infrastructure.
            incoming_cloud = str(incoming.get("cloud_url") or "").strip()
            host = (urlparse(incoming_cloud).hostname or "").lower() if incoming_cloud else ""
            if host == "clintware.com" or host.endswith(".clintware.com"):
                base["cloud_url"] = ""
                base["desktop"]["local_only"] = True
                base["telemetry"]["enabled"] = False
                base["telemetry"]["send_redacted_errors"] = False
                base["telemetry"]["queue_when_offline"] = False
        cfg = cls(base)
        cfg.save()
        return cfg

    def save(self) -> None:
        d = home_dir()
        d.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.data, indent=2, sort_keys=True), encoding="utf-8")
        try:
            os.chmod(self.path, 0o600)
        except OSError:
            pass

    def set_cloud(self, url: str) -> None:
        value = str(url or "").strip().rstrip("/")
        parsed = urlparse(value) if value else None
        host = (parsed.hostname or "").lower() if parsed else ""
        if not value or parsed.scheme not in {"http", "https"} or not host:
            raise ValueError("Provide your own self-hosted Quillgeist Cloud http/https URL.")
        if host == "clintware.com" or host.endswith(".clintware.com"):
            raise ValueError("Public Quillgeist builds cannot pair to Clintware infrastructure. Use your own self-hosted endpoint.")
        self.data["cloud_url"] = value
        self.data.setdefault("desktop", {})["local_only"] = False
        self.save()

    def workspace_allowed(self, workspace: Path) -> bool:
        allowed = [Path(p).expanduser().resolve() for p in self.data.get("allowed_workspaces", [])]
        if not allowed:
            return True
        w = workspace.resolve()
        return any(w == a or a in w.parents for a in allowed)
