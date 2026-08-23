from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import time
import uuid

from .config import Config, home_dir
from .telemetry import emit_event

UNITS = {"tokens", "requests", "messages", "usd", "credits", "minutes", "custom"}


def _number(value) -> float:
    try:
        return max(0.0, float(value or 0))
    except (TypeError, ValueError):
        return 0.0


def _compact(value: float) -> str:
    value = float(value or 0)
    for suffix, divisor in (("T", 1_000_000_000_000), ("B", 1_000_000_000), ("M", 1_000_000), ("K", 1_000)):
        if abs(value) >= divisor:
            return f"{value / divisor:.1f}{suffix}".replace(".0", "")
    return f"{value:.1f}".replace(".0", "")


def normalize_plan(plan: dict) -> dict:
    provider = str(plan.get("provider") or "").strip()
    name = str(plan.get("plan_name") or plan.get("name") or "").strip()
    if not provider or not name:
        raise ValueError("provider and plan name are required")
    unit = str(plan.get("unit") or "tokens").lower()
    if unit not in UNITS:
        unit = "custom"
    allowance = _number(plan.get("allowance"))
    used = _number(plan.get("used"))
    remaining = max(0.0, allowance - used) if allowance > 0 else None
    return {
        "plan_id": str(plan.get("plan_id") or uuid.uuid4()),
        "provider": provider,
        "plan_name": name,
        "unit": unit,
        "allowance": allowance,
        "used": used,
        "remaining": remaining,
        "remaining_pct": (remaining / allowance * 100) if allowance > 0 else None,
        "reset_at": str(plan.get("reset_at") or ""),
        "source": str(plan.get("source") or "manual"),
        "note": str(plan.get("note") or "")[:500],
        "updated_at": int(time.time() * 1000),
    }


def plans(config: Config) -> list[dict]:
    out = []
    for raw in config.data.get("usage_plans", []):
        try:
            out.append(normalize_plan(raw))
        except ValueError:
            continue
    return out


def save_plan(config: Config, plan: dict) -> dict:
    row = normalize_plan({**plan, "source": "manual"})
    rows = [p for p in plans(config) if p["plan_id"] != row["plan_id"]]
    rows.append(row)
    config.data["usage_plans"] = rows
    config.save()
    emit_plan_snapshot(config)
    return row


def delete_plan(config: Config, plan_id: str) -> bool:
    rows = plans(config)
    kept = [p for p in rows if p["plan_id"] != plan_id]
    changed = len(kept) != len(rows)
    config.data["usage_plans"] = kept
    config.save()
    if changed:
        emit_plan_snapshot(config)
    return changed


def emit_plan_snapshot(config: Config) -> bool:
    rows = plans(config)
    return emit_event(config, {
        "event_id": f"usage-plans:{config.data['device_id']}:{int(time.time() * 1000)}",
        "type": "usage_plan_snapshot",
        "ts": int(time.time() * 1000),
        "device_id": config.data["device_id"],
        "status": "synced",
        "metadata": {"plans": rows},
    }, queue_on_failure=False)


def _run_metrics(path: Path) -> tuple[float, float, float, float]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return 0, 0, 0, 0
    c = data.get("contextor") or {}
    raw = _number(c.get("raw_tokens_est"))
    sent = _number(c.get("sent_tokens_est"))
    local = _number(c.get("local_llm_input_tokens_est")) + _number(c.get("local_llm_output_tokens_est"))
    saved = _number(c.get("net_tokens_avoided_est"))
    return raw, sent, local, saved


def snapshot(config: Config | None = None) -> dict:
    config = config or Config.load()
    raw = sent = local = saved = 0.0
    runs = home_dir() / "runs"
    if runs.exists():
        for result in runs.glob("*/result.abresult"):
            a, b, c, d = _run_metrics(result)
            raw += a; sent += b; local += c; saved += d
    baseline = sent + saved
    pressure = sent / baseline * 100 if baseline > 0 else 0.0
    avoided = saved / baseline * 100 if baseline > 0 else 0.0
    local_share = local / (local + sent) * 100 if local + sent > 0 else 0.0
    rows = plans(config)
    known = [p for p in rows if p["remaining_pct"] is not None]
    by_unit: dict[str, dict] = {}
    for p in known:
        u = by_unit.setdefault(p["unit"], {"unit": p["unit"], "allowance": 0.0, "used": 0.0, "remaining": 0.0, "plans": 0})
        u["allowance"] += p["allowance"]; u["used"] += p["used"]; u["remaining"] += p["remaining"] or 0; u["plans"] += 1
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "scope": "this_device",
        "device_id": config.data.get("device_id"),
        "consumption": {
            "raw_tokens_est": raw,
            "external_tokens_used_est": sent,
            "local_tokens_used_est": local,
            "net_tokens_saved_est": saved,
            "local_vs_external_delta_est": local - sent,
            "baseline_external_tokens_est": baseline,
            "external_consumption_pressure_pct": pressure,
            "avoided_external_pct": avoided,
            "local_work_share_pct": local_share,
        },
        "plans": rows,
        "plans_summary": {
            "connected": len(rows),
            "provider_synced": sum(1 for p in rows if p["source"] == "provider_api"),
            "known_remaining": len(known),
            "unknown_remaining": len(rows) - len(known),
            "normalized_remaining_pct": sum(p["remaining_pct"] for p in known) / len(known) if known else None,
            "by_unit": list(by_unit.values()),
        },
        "display": {"external": _compact(sent), "local": _compact(local), "saved": _compact(saved)},
    }
