from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import json
import os
import secrets
import uuid

def home_dir() -> Path:
    return Path(os.environ.get("QUILLGEIST_HOME", os.environ.get("AGENTBRIDGE_HOME", Path.home() / ".quillgeist"))).expanduser()

def _defaults() -> dict:
    return {
        "version": 3,
        "device_id": str(uuid.uuid4()),
        "device_token": secrets.token_urlsafe(32),
        "device_name": os.environ.get("COMPUTERNAME") or os.environ.get("HOSTNAME") or "Quillgeist Node",
        "cloud_url": "https://quillgeist.clintware.com",
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
        "telemetry": {
            "enabled": True,
            "privacy": "metadata_only",
            "send_redacted_errors": True,
            "queue_when_offline": True
        },
        "desktop": {
            "local_only": False,
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
            base["telemetry"] = {**_defaults()["telemetry"], **incoming.get("telemetry", {})}
            base["desktop"] = {**_defaults()["desktop"], **incoming.get("desktop", {})}
            # Migrate the pre-Quillgeist alpha endpoint without disturbing custom endpoints.
            if incoming.get("cloud_url") == "https://agentbridge.clintware.com":
                base["cloud_url"] = "https://quillgeist.clintware.com"
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
        self.data["cloud_url"] = url.rstrip("/")
        self.save()

    def workspace_allowed(self, workspace: Path) -> bool:
        allowed = [Path(p).expanduser().resolve() for p in self.data.get("allowed_workspaces", [])]
        if not allowed:
            return True
        w = workspace.resolve()
        return any(w == a or a in w.parents for a in allowed)
