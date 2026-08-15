from __future__ import annotations
from pathlib import Path
import base64
import json
import platform
import secrets
import time
import urllib.parse
import urllib.request

from . import __version__
from .config import Config, home_dir
from .runner import execute_pack_path
from .pack import save_abpack
from .telemetry import emit_error, emit_event, emit_run_result, flush as flush_telemetry


def _request(method: str, url: str, body: dict | None = None, token: str | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
        return json.loads(raw.decode("utf-8")) if raw else {}


def pair(config: Config, cloud_url: str | None = None) -> dict:
    if cloud_url:
        config.set_cloud(cloud_url)
    code = "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(8))
    payload = {
        "pair_code": code,
        "device_id": config.data["device_id"],
        "device_token": config.data["device_token"],
        "device_name": config.data.get("device_name"),
        "platform": platform.system().lower(),
        "node_version": __version__,
    }
    out = _request("POST", config.data["cloud_url"] + "/api/pair/request", payload)
    config.data["pair_code"] = code
    config.save()
    return {"pair_code": code, **out}


def materialize_job(job: dict) -> Path:
    inbox = home_dir() / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    job_id = job.get("id", str(int(time.time())))
    name = job.get("pack_name") or f"{job_id}.json"
    suffix = Path(name).suffix.lower() or ".json"
    path = inbox / f"cloud-{job_id}{suffix}"
    if job.get("pack_b64"):
        path.write_bytes(base64.b64decode(job["pack_b64"]))
    elif job.get("pack_text") is not None:
        path.write_text(job["pack_text"], encoding="utf-8")
    elif job.get("manifest"):
        if suffix == ".abpack":
            save_abpack(job["manifest"], path)
        else:
            path.write_text(json.dumps(job["manifest"], indent=2), encoding="utf-8")
    else:
        raise ValueError("cloud job contains no execution pack")
    return path


def _connection_event(config: Config, event_type: str, connection_id: str, *, started_ms: int | None = None) -> None:
    now_ms = int(time.time() * 1000)
    event = {
        "event_id": f"{event_type}:{connection_id}",
        "type": event_type,
        "ts": now_ms,
        "device_id": config.data["device_id"],
        "status": "connected" if event_type == "connection_open" else "closed",
        "duration_ms": max(0, now_ms - int(started_ms or now_ms)) if event_type == "connection_close" else 0,
        "node_version": __version__,
    }
    emit_event(config, event)


def daemon(config: Config) -> None:
    try:
        from websockets.sync.client import connect
    except Exception as exc:
        raise RuntimeError("websockets package is required for cloud daemon") from exc

    last_connection_error_at = 0.0
    while True:
        base = config.data["cloud_url"]
        scheme = "wss://" if base.startswith("https://") else "ws://"
        host = base.split("://", 1)[-1].rstrip("/")
        ws_url = f"{scheme}{host}/ws/device/{config.data['device_id']}?token={urllib.parse.quote(config.data['device_token'])}"
        connection_id = secrets.token_hex(8)
        connection_started_ms: int | None = None
        try:
            with connect(ws_url, open_timeout=20, close_timeout=5, max_size=4 * 1024 * 1024) as ws:
                connection_started_ms = int(time.time() * 1000)
                flush_telemetry(config, limit=100)
                _connection_event(config, "connection_open", connection_id)
                try:
                    sync_help_center(config)
                except Exception:
                    pass
                ws.send(json.dumps({"type": "hello", "platform": platform.system().lower(), "node_version": __version__, "ts": time.time()}))
                for raw in ws:
                    msg = json.loads(raw)
                    if msg.get("type") != "job":
                        continue
                    job = msg["job"]
                    emit_event(config, {
                        "event_id": f"cloud-receive:{job.get('id') or secrets.token_hex(8)}",
                        "type": "cloud_receive",
                        "ts": int(time.time() * 1000),
                        "device_id": config.data["device_id"],
                        "job_id": job.get("id"),
                        "status": "received",
                        "node_version": __version__,
                    })
                    try:
                        path = materialize_job(job)
                        result = execute_pack_path(
                            path,
                            config=config,
                            workspace_override=job.get("workspace"),
                            approved=bool(job.get("approved")),
                            report_telemetry=False,
                        )
                        result["pack_id"] = result.get("job_id")
                        result["job_id"] = job.get("id")
                        result["source"] = job.get("source", "cloud")
                    except Exception as exc:
                        kind = "cloud_job_input" if isinstance(exc, (ValueError, KeyError, json.JSONDecodeError)) else "agentbridge_internal"
                        result = {
                            "agentbridge_result": "1.1",
                            "job_id": job.get("id"),
                            "status": "failed",
                            "error": str(exc),
                            "error_kind": kind,
                            "product_bug": kind == "agentbridge_internal",
                            "planner_feedback": str(exc),
                            "node_version": __version__,
                        }
                    emit_run_result(config, result)
                    ws.send(json.dumps({"type": "result", "result": result}, default=str))
                    emit_event(config, {
                        "event_id": f"device-send:{job.get('id') or secrets.token_hex(8)}:{result.get('run_id') or 'result'}",
                        "type": "device_send",
                        "ts": int(time.time() * 1000),
                        "device_id": config.data["device_id"],
                        "job_id": job.get("id"),
                        "run_id": result.get("run_id"),
                        "status": result.get("status"),
                        "node_version": __version__,
                    })
        except Exception as exc:
            now = time.time()
            if now - last_connection_error_at >= 60:
                emit_error(config, "cloud_connection", str(exc), product_bug=False)
                last_connection_error_at = now
            print(f"AgentBridge Cloud disconnected: {exc}. Reconnecting.")
            time.sleep(5)
        finally:
            if connection_started_ms is not None:
                _connection_event(config, "connection_close", connection_id, started_ms=connection_started_ms)


def sync_help_center(config: Config) -> dict:
    from .helpdb import apply_updates, load

    url = config.data["cloud_url"] + "/api/device/help/sync"
    body = {"device_id": config.data["device_id"], "help": load()}
    out = _request("POST", url, body, token=config.data["device_token"])
    if out.get("help"):
        apply_updates(out["help"], source="cloud")
    return out


def sync_device_schedules(config: Config) -> list[dict]:
    url = config.data["cloud_url"] + f"/api/device/schedules?device_id={config.data['device_id']}"
    return _request("GET", url, token=config.data["device_token"]).get("schedules", [])


def report_device_schedule_state(config: Config, row: dict, result: dict | None = None) -> dict:
    url = config.data["cloud_url"] + "/api/device/schedules/state"
    body = {
        "device_id": config.data["device_id"],
        "id": row["id"],
        "next_run_at": float(row.get("next_run_at") or 0) * 1000,
        "enabled": bool(row.get("enabled")),
        "approved_local": bool(row.get("approved_local")),
        "last_status": (result or {}).get("status"),
        "last_run_at": time.time() * 1000 if result else row.get("last_run_at"),
    }
    return _request("POST", url, body, token=config.data["device_token"])


def sync_device_schedules_to_local(config: Config) -> list[dict]:
    """Materialize cloud-authored device-owned schedules into the local scheduler."""
    from .scheduler import load_schedules, save_schedules

    remote = sync_device_schedules(config)
    rows = load_schedules()
    by_id = {r.get("id"): r for r in rows}
    remote_ids = set()
    for r in remote:
        sid = r.get("id")
        if not sid:
            continue
        remote_ids.add(sid)
        existing = by_id.get(sid, {})
        cloud_updated = str(r.get("updated_at") or "")
        seen_updated = str(existing.get("cloud_updated_at") or "")
        job = {**r, "id": f"schedule-{sid}"}
        try:
            pack_path = materialize_job(job)
        except Exception as exc:
            print(f"Unable to materialize cloud schedule {sid}: {exc}")
            continue
        cloud_changed = bool(cloud_updated and cloud_updated != seen_updated)
        raw_next = float(r.get("next_run_at") or (time.time() + 60) * 1000)
        next_run = raw_next / 1000 if raw_next > 100_000_000_000 else raw_next
        if existing and not cloud_changed:
            next_run = float(existing.get("next_run_at", next_run))
        merged = {
            **existing,
            "id": sid,
            "pack_path": str(pack_path),
            "next_run_at": next_run,
            "every_seconds": int(r["every_seconds"]) if r.get("every_seconds") else None,
            "owner": "device",
            "device_id": config.data["device_id"],
            "enabled": bool(r.get("enabled", True)) if cloud_changed or not existing else bool(existing.get("enabled", True)),
            "approved_local": bool(existing.get("approved_local", False)),
            "source": "cloud",
            "cloud_updated_at": cloud_updated,
            "title": r.get("title") or r.get("pack_name") or "Cloud schedule",
        }
        by_id[sid] = merged
    final = []
    for sid, row in by_id.items():
        if row.get("source") == "cloud" and sid not in remote_ids:
            continue
        final.append(row)
    save_schedules(final)
    return final
