from __future__ import annotations

import json
import platform
import re
import urllib.request
import webbrowser
from dataclasses import dataclass, asdict

from . import __version__
from .config import Config
from .telemetry import emit_event


class UpdateError(RuntimeError):
    pass


def _version_key(value: str) -> tuple[int, int, int, int, int]:
    text = str(value or "").strip().lower().replace("-alpha", "a")
    match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)(?:a(\d+))?", text)
    if not match:
        return (0, 0, 0, 0, 0)
    major, minor, patch = (int(match.group(i)) for i in (1, 2, 3))
    alpha = match.group(4)
    return (major, minor, patch, 0 if alpha is not None else 1, int(alpha or 0))


def platform_key(system: str | None = None, machine: str | None = None) -> str:
    system = (system or platform.system()).lower()
    machine = (machine or platform.machine()).lower()
    arm = machine in {"arm64", "aarch64"} or "arm64" in machine or "aarch64" in machine
    if system == "windows":
        return "windows_arm64" if arm else "windows_x64"
    if system == "darwin":
        return "macos_arm64" if arm else "macos_x64"
    if system == "linux":
        return "linux_arm64" if arm else "linux_x64"
    return f"{system}_{machine}".strip("_")


@dataclass
class UpdateStatus:
    current_version: str
    latest_version: str
    update_available: bool
    platform: str
    channel: str
    download_url: str | None
    sha256: str | None
    release_url: str | None
    install_policy: str
    notes: str

    def to_dict(self) -> dict:
        return asdict(self)


def check(config: Config | None = None, *, timeout: float = 2.5) -> UpdateStatus:
    config = config or Config.load()
    settings = config.data.get("updates", {})
    if settings.get("enabled", True) is False:
        raise UpdateError("Cloud update checks are disabled in local config.")
    cloud = str(config.data.get("cloud_url") or "https://quillgeist.clintware.com").rstrip("/")
    url = cloud + "/update.json"
    req = urllib.request.Request(url, headers={"accept": "application/json", "user-agent": f"Quillgeist/{__version__}"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            manifest = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise UpdateError(f"Unable to read Quillgeist Cloud update manifest: {exc}") from exc

    if int(manifest.get("schema", 0)) != 1 or manifest.get("product") != "Quillgeist":
        raise UpdateError("Cloud returned an unsupported update manifest.")
    latest = str(manifest.get("latest_version") or "").strip()
    if not latest:
        raise UpdateError("Cloud update manifest is missing latest_version.")
    channel = str(manifest.get("channel") or "public-alpha")
    configured_channel = str(settings.get("channel") or "public-alpha")
    if channel != configured_channel:
        raise UpdateError(f"Cloud update channel is {channel}; local channel is {configured_channel}.")

    key = platform_key()
    target = (manifest.get("downloads") or {}).get(key) or {}
    available = _version_key(latest) > _version_key(__version__)
    status = UpdateStatus(
        current_version=__version__,
        latest_version=latest,
        update_available=available,
        platform=key,
        channel=channel,
        download_url=str(target.get("url") or "") or None,
        sha256=str(target.get("sha256") or "") or None,
        release_url=str(manifest.get("release_url") or "") or None,
        install_policy=str(manifest.get("install_policy") or "explicit"),
        notes=str(manifest.get("notes") or ""),
    )
    emit_event(config, {
        "event_id": f"update-check:{config.data.get('device_id')}:{latest}:{key}",
        "type": "update_check",
        "status": "available" if available else "current",
        "node_version": __version__,
        "metadata": {
            "source": "cloud_update_manifest",
            "platform": key,
            "channel": channel,
            "latest_version": latest,
            "update_available": available,
        },
    }, queue_on_failure=False)
    return status


def open_release(status: UpdateStatus) -> bool:
    target = status.release_url or status.download_url
    if not target:
        raise UpdateError(f"No release target is published for {status.platform}.")
    return bool(webbrowser.open(target))
