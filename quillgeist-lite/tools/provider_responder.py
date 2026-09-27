#!/usr/bin/env python3
"""
Quillgeist subscription-provider responder.

Uses only provider-supported local CLI authentication already present on the
owner machine. It never reads or copies OAuth tokens/API keys.

Modes:
  respond --prompt-file PATH
  status
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

QQ_HOME = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "Clintware" / "QuillgeistLite"
EST_PATH = QQ_HOME / "provider-usage-estimates.json"
AGENTBRIDGE_HOME = Path(
    os.environ.get("QUILLGEIST_HOME", os.environ.get("AGENTBRIDGE_HOME", str(Path.home() / ".quillgeist")))
).expanduser()
CONFIG_PATH = AGENTBRIDGE_HOME / "config.json"
MAX_OUTPUT = 20000

SYSTEM = """You are the response-only fallback for Quillgeist Lite on the owner's Windows PC.
Answer the user's question directly and concisely.
Do not browse, edit files, run commands, or mutate state.
If the request requires an action or fresh/private data that you cannot answer safely
without tools, begin with exactly REMOTE_REQUIRED: and a short reason.
Never claim an action was performed unless it was actually performed elsewhere."""


def read_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".new")
    tmp.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def run(argv: list[str], *, timeout: int = 90, cwd: str | None = None) -> tuple[int, str]:
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    try:
        cp = subprocess.run(
            argv,
            text=True,
            capture_output=True,
            timeout=timeout,
            cwd=cwd,
            creationflags=flags,
        )
        stdout = cp.stdout.strip()
        stderr = cp.stderr.strip()
        # Response-capable CLIs place the final answer on stdout and progress
        # or diagnostics on stderr. Prefer stdout so terminal progress cannot
        # replace the model's final answer.
        text = stdout if stdout else stderr
        return cp.returncode, text[-MAX_OUTPUT:]
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 127, str(exc)[:1000]


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_provider(value: str) -> str:
    v = str(value or "").strip().lower()
    if any(x in v for x in ("chatgpt", "openai", "codex")):
        return "chatgpt"
    if any(x in v for x in ("anthropic", "claude")):
        return "claude"
    if any(x in v for x in ("google gemini", "gemini", "google ai")):
        return "gemini"
    return v.replace(" ", "-")


def plan_map() -> dict[str, dict]:
    config = read_json(CONFIG_PATH)
    out: dict[str, dict] = {}
    plans = config.get("usage_plans") if isinstance(config.get("usage_plans"), list) else []
    for raw in plans:
        if not isinstance(raw, dict):
            continue
        key = normalize_provider(raw.get("provider", ""))
        if not key:
            continue
        allowance = 0.0
        used = 0.0
        try:
            allowance = max(0.0, float(raw.get("allowance") or 0))
            used = max(0.0, float(raw.get("used") or 0))
        except (TypeError, ValueError):
            pass
        out[key] = {
            "plan_name": str(raw.get("plan_name") or raw.get("name") or ""),
            "unit": str(raw.get("unit") or "custom"),
            "allowance": allowance,
            "used": used,
            "remaining": max(0.0, allowance - used) if allowance else None,
            "reset_at": str(raw.get("reset_at") or ""),
            "source": str(raw.get("source") or "manual"),
        }
    return out


def provider_rows() -> list[dict]:
    rows: list[dict] = []

    codex = shutil.which("codex")
    if codex:
        code, text = run([codex, "login", "status"], timeout=8)
        ready = code == 0 and "logged in" in text.lower()
        rows.append({
            "id": "chatgpt",
            "provider": "ChatGPT/Codex",
            "client": "codex",
            "exe": codex,
            "ready": ready,
            "auth": "supported Codex login" if ready else "Codex detected",
        })

    claude = shutil.which("claude")
    if claude:
        code, text = run([claude, "auth", "status", "--json"], timeout=8)
        ready = False
        if code == 0:
            try:
                data = json.loads(text)
                ready = bool(data.get("loggedIn") or data.get("logged_in"))
            except Exception:
                ready = bool(text.strip()) and "not logged in" not in text.lower()
        rows.append({
            "id": "claude",
            "provider": "Claude",
            "client": "claude",
            "exe": claude,
            "ready": ready,
            "auth": "supported Claude Code login" if ready else "Claude Code detected",
        })

    gemini = shutil.which("gemini")
    if gemini:
        settings = read_json(Path.home() / ".gemini" / "settings.json")
        security = settings.get("security") if isinstance(settings.get("security"), dict) else {}
        auth = security.get("auth") if isinstance(security.get("auth"), dict) else {}
        selected = str(auth.get("selectedType") or settings.get("selectedAuthType") or "")
        oauth_cache = (Path.home() / ".gemini" / "oauth_creds.json").exists()
        api_env = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
        ready = api_env or (selected == "oauth-personal" and oauth_cache)
        rows.append({
            "id": "gemini",
            "provider": "Gemini",
            "client": "gemini",
            "exe": gemini,
            "ready": ready,
            "auth": "supported Gemini auth" if ready else "Gemini CLI detected",
        })

    estimates = read_json(EST_PATH)
    counters = estimates.get("providers") if isinstance(estimates.get("providers"), dict) else {}
    plans = plan_map()
    for row in rows:
        counter = counters.get(row["id"]) if isinstance(counters.get(row["id"]), dict) else {}
        row["estimated_calls"] = int(counter.get("calls") or 0)
        row["estimate_started_at"] = str(counter.get("started_at") or "")
        row["last_used_at"] = str(counter.get("last_used_at") or "")
        plan = plans.get(row["id"]) or {}
        row["plan"] = plan
        allowance = float(plan.get("allowance") or 0)
        used = float(plan.get("used") or 0)
        row["usage_pct"] = (used / allowance * 100.0) if allowance > 0 else None
        row["reset_at"] = str(plan.get("reset_at") or "")
    return rows


def increment(provider_id: str) -> None:
    state = read_json(EST_PATH)
    providers = state.get("providers") if isinstance(state.get("providers"), dict) else {}
    row = providers.get(provider_id) if isinstance(providers.get(provider_id), dict) else {}
    row["calls"] = int(row.get("calls") or 0) + 1
    row.setdefault("started_at", iso_now())
    row["last_used_at"] = iso_now()
    providers[provider_id] = row
    state["providers"] = providers
    state["updated_at"] = iso_now()
    write_json(EST_PATH, state)


def provider_command(row: dict, prompt: str, cwd: str) -> list[str]:
    exe = row["exe"]
    pid = row["id"]
    full_prompt = SYSTEM + "\n\nUSER:\n" + prompt

    if pid == "chatgpt":
        # Ephemeral + read-only. default_permissions closes the gap where a local
        # requirements.toml can otherwise override the sandbox profile.
        return [
            exe, "exec",
            "--ephemeral",
            "--skip-git-repo-check",
            "--sandbox", "read-only",
            "--config", "default_permissions=:read-only",
            "--config", 'approval_policy="never"',
            full_prompt,
        ]
    if pid == "claude":
        return [
            exe, "-p", full_prompt,
            "--permission-mode", "plan",
            "--output-format", "text",
        ]
    if pid == "gemini":
        return [
            exe,
            "--approval-mode", "plan",
            "-p", full_prompt,
            "--output-format", "text",
        ]
    raise ValueError("unsupported provider")


def choose_ready(rows: list[dict]) -> list[dict]:
    ready = [row for row in rows if row.get("ready")]
    # Prefer the least pressured provider when a configured allowance exists,
    # then the least-used local estimate. This prevents one subscription from
    # being consumed merely because it appears first in PATH.
    return sorted(
        ready,
        key=lambda row: (
            row.get("usage_pct") is None,
            float(row.get("usage_pct") or 0),
            int(row.get("estimated_calls") or 0),
            {"chatgpt": 0, "claude": 1, "gemini": 2}.get(row.get("id"), 9),
        ),
    )


def respond(prompt: str) -> dict:
    attempts = []
    rows = provider_rows()
    ready_rows = choose_ready(rows)
    usage = [
        {
            "provider": row.get("provider"),
            "provider_id": row.get("id"),
            "estimated_calls": int(row.get("estimated_calls") or 0),
            "usage_pct": row.get("usage_pct"),
            "reset_at": row.get("reset_at") or "",
            "plan_name": (row.get("plan") or {}).get("plan_name") or "",
            "unit": (row.get("plan") or {}).get("unit") or "",
        }
        for row in ready_rows
    ]
    with tempfile.TemporaryDirectory(prefix="qq-responder-") as tmp:
        for row in ready_rows:
            argv = provider_command(row, prompt, tmp)
            code, output = run(argv, timeout=120, cwd=tmp)
            attempts.append({"provider": row["provider"], "exit_code": code})
            if code != 0 or not output.strip():
                continue
            answer = output.strip()
            # Codex progress normally goes to stderr, but merged fallback output can
            # still contain status noise. Keep the final non-empty section.
            if row["id"] == "chatgpt" and "\n" in answer:
                chunks = [x.strip() for x in answer.split("\n\n") if x.strip()]
                if chunks:
                    answer = chunks[-1]
            increment(row["id"])
            return {
                "ok": True,
                "provider": row["provider"],
                "provider_id": row["id"],
                "answer": answer[-12000:],
                "attempts": attempts,
                "ready_providers": [r.get("provider") for r in ready_rows],
                "usage_estimates": usage,
            }
    return {
        "ok": False,
        "error": "no_authenticated_provider_answer",
        "attempts": attempts,
        "ready_providers": [r.get("provider") for r in ready_rows],
        "usage_estimates": usage,
    }


def status() -> dict:
    rows = provider_rows()
    for row in rows:
        row.pop("exe", None)
    return {
        "ok": True,
        "checked_at": iso_now(),
        "providers": rows,
        "ready": sum(1 for row in rows if row.get("ready")),
        "estimate_scope": "QQ subscription-fallback calls observed on this machine",
        "exact_provider_subscription_quota_available": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="mode", required=True)
    response = sub.add_parser("respond")
    response.add_argument("--prompt-file", required=True)
    sub.add_parser("status")
    args = parser.parse_args()

    if args.mode == "status":
        print(json.dumps(status(), ensure_ascii=False))
        return 0

    prompt = Path(args.prompt_file).read_text(encoding="utf-8", errors="replace")[:40000]
    print(json.dumps(respond(prompt), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
