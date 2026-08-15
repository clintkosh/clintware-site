from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import io
import json
import re
import uuid
import zipfile

class PackError(ValueError):
    pass

@dataclass
class ExecutionPack:
    manifest: dict
    embedded_files: dict[str, bytes]
    source_path: Path | None = None

    @property
    def id(self) -> str:
        return self.manifest["id"]

def _validate(manifest: dict) -> dict:
    if not isinstance(manifest, dict):
        raise PackError("manifest must be a JSON object")
    if str(manifest.get("agentbridge", "")).split(".")[0] != "1":
        raise PackError("manifest must declare agentbridge 1.x")
    manifest = dict(manifest)
    manifest.setdefault("id", str(uuid.uuid4()))
    manifest.setdefault("title", "AgentBridge task")
    manifest.setdefault("workspace", ".")
    manifest.setdefault("permissions", [])
    manifest.setdefault("steps", [])
    manifest.setdefault("definition_of_done", [])
    manifest.setdefault("approval", {"default": "ask"})
    manifest.setdefault("max_runtime_seconds", 900)
    if not isinstance(manifest["steps"], list):
        raise PackError("steps must be an array")
    if not isinstance(manifest["permissions"], list):
        raise PackError("permissions must be an array")
    if not isinstance(manifest["definition_of_done"], list):
        raise PackError("definition_of_done must be an array")
    if len(manifest["steps"]) > 200:
        raise PackError("alpha limit: at most 200 steps")
    return manifest

def _parse_markdown(text: str) -> dict:
    marker = re.search(
        r"---agentbridge---\s*(\{[\s\S]*?\})\s*---end-agentbridge---",
        text,
        flags=re.I
    )
    if marker:
        return json.loads(marker.group(1))
    fence = re.search(
        r"```(?:agentbridge|agentbridge-json)\s*\n([\s\S]*?)\n```",
        text,
        flags=re.I
    )
    if fence:
        return json.loads(fence.group(1))
    stripped = text.strip()
    if stripped.startswith("{") and stripped.endswith("}"):
        return json.loads(stripped)
    raise PackError(
        "Markdown packs need an ```agentbridge JSON``` fence or "
        "---agentbridge--- JSON ---end-agentbridge--- block"
    )

def load_bytes(payload: bytes, suffix: str) -> ExecutionPack:
    suffix = suffix.lower()
    if suffix == ".abpack":
        try:
            with zipfile.ZipFile(io.BytesIO(payload)) as zf:
                names = zf.namelist()
                for name in names:
                    p = Path(name)
                    if p.is_absolute() or ".." in p.parts:
                        raise PackError(f"unsafe archive member: {name}")
                if "manifest.json" not in names:
                    raise PackError("abpack is missing manifest.json")
                manifest = _validate(json.loads(zf.read("manifest.json").decode("utf-8")))
                embedded = {
                    name[len("files/"):]: zf.read(name)
                    for name in names
                    if name.startswith("files/") and not name.endswith("/")
                }
                return ExecutionPack(manifest, embedded)
        except zipfile.BadZipFile as exc:
            raise PackError("invalid .abpack zip") from exc
    if suffix == ".json":
        return ExecutionPack(_validate(json.loads(payload.decode("utf-8"))), {})
    if suffix in {".md", ".markdown"}:
        return ExecutionPack(_validate(_parse_markdown(payload.decode("utf-8"))), {})
    raise PackError(f"unsupported pack type: {suffix}")

def load_pack(path: str | Path) -> ExecutionPack:
    p = Path(path)
    pack = load_bytes(p.read_bytes(), p.suffix)
    pack.source_path = p
    return pack

def save_abpack(manifest: dict, output: str | Path, embedded_files: dict[str, bytes] | None = None) -> Path:
    manifest = _validate(manifest)
    out = Path(output)
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest, indent=2, sort_keys=True))
        for name, payload in (embedded_files or {}).items():
            p = Path(name)
            if p.is_absolute() or ".." in p.parts:
                raise PackError(f"unsafe embedded path: {name}")
            zf.writestr(f"files/{p.as_posix()}", payload)
    return out

def summary(pack: ExecutionPack) -> dict:
    return {
        "id": pack.id,
        "title": pack.manifest.get("title"),
        "workspace": pack.manifest.get("workspace"),
        "permissions": sorted(set(pack.manifest.get("permissions", []))),
        "steps": len(pack.manifest.get("steps", [])),
        "definition_of_done": len(pack.manifest.get("definition_of_done", [])),
        "embedded_files": sorted(pack.embedded_files)
    }
