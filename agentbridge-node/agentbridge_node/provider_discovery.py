from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess
import time

from .config import Config

_CACHE_SECONDS = 60
_cache: dict = {"ts": 0.0, "data": None}


def _run(argv: list[str], timeout: int = 4) -> tuple[int, str]:
    try:
        proc = subprocess.run(argv, text=True, capture_output=True, timeout=timeout)
        text = "\n".join(x for x in (proc.stdout.strip(), proc.stderr.strip()) if x).strip()
        return proc.returncode, text[:6000]
    except (OSError, subprocess.TimeoutExpired):
        return 127, ""


def _read_json(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _row(provider: str, *, ready: bool, auth_source: str = "", identity: str = "", detail: str = "", models: list[str] | None = None, client: str = "") -> dict:
    return {
        "provider": provider,
        "ready": bool(ready),
        "status": "authenticated" if ready else "detected",
        "auth_source": auth_source,
        "identity": identity,
        "detail": detail,
        "models": list(models or [])[:8],
        "client": client,
    }


def _codex(env: dict[str, str], home: Path) -> dict | None:
    exe = shutil.which("codex")
    api_key = bool(env.get("OPENAI_API_KEY"))
    codex_home = Path(env.get("CODEX_HOME") or (home / ".codex")).expanduser()
    cache_exists = (codex_home / "auth.json").exists()

    if exe:
        code, text = _run([exe, "login", "status"])
        lower = text.lower()
        if code == 0 and "logged in" in lower:
            method = "ChatGPT/Codex"
            for line in text.splitlines():
                if "logged in using" in line.lower():
                    method = line.split("using", 1)[-1].strip() or method
                    break
            return _row("OpenAI", ready=True, auth_source="Codex login", identity=method, detail="Supported Codex login is active.", client="codex")
        if api_key:
            return _row("OpenAI", ready=True, auth_source="OPENAI_API_KEY", identity="API account", detail="API key is available to local applications; key value is never read or stored.", client="codex")
        if cache_exists:
            return _row("OpenAI", ready=False, auth_source="Codex credential cache", detail="Codex credentials exist, but login status could not be verified.", client="codex")
        return _row("OpenAI", ready=False, auth_source="Codex installed", detail="Codex is installed but not currently authenticated.", client="codex")

    if api_key:
        return _row("OpenAI", ready=True, auth_source="OPENAI_API_KEY", identity="API account", detail="OpenAI API credentials are present in the process environment.")
    if cache_exists:
        return _row("OpenAI", ready=False, auth_source="Codex credential cache", detail="A Codex login cache exists, but the Codex CLI is not available to verify it.")
    return None


def _claude(env: dict[str, str], home: Path) -> dict | None:
    exe = shutil.which("claude")
    api_key = bool(env.get("ANTHROPIC_API_KEY"))
    if exe:
        code, text = _run([exe, "auth", "status", "--json"])
        if code == 0 and text:
            try:
                data = json.loads(text)
            except Exception:
                data = {}
            logged_in = bool(data.get("loggedIn") or data.get("logged_in"))
            if logged_in:
                identity = str(data.get("email") or data.get("account") or "Claude account")
                org = str(data.get("organization") or data.get("organizationName") or "").strip()
                method = str(data.get("authMethod") or data.get("auth_method") or "Claude login")
                detail = f"{method}" + (f" · {org}" if org else "")
                return _row("Anthropic", ready=True, auth_source="Claude Code login", identity=identity, detail=detail, client="claude")
        code, text = _run([exe, "auth", "status", "--text"])
        if code == 0 and text and "not logged in" not in text.lower():
            identity = "Claude account"
            for line in text.splitlines():
                if line.lower().startswith("email:"):
                    identity = line.split(":", 1)[1].strip() or identity
            return _row("Anthropic", ready=True, auth_source="Claude Code login", identity=identity, detail=text.replace("\n", " · ")[:500], client="claude")
        if api_key:
            return _row("Anthropic", ready=True, auth_source="ANTHROPIC_API_KEY", identity="API account", detail="Anthropic API credentials are present; secret value is never read or stored.", client="claude")
        return _row("Anthropic", ready=False, auth_source="Claude Code installed", detail="Claude Code is installed but no supported authenticated session was verified.", client="claude")
    if api_key:
        return _row("Anthropic", ready=True, auth_source="ANTHROPIC_API_KEY", identity="API account", detail="Anthropic API credentials are present in the process environment.")
    return None


def _gemini(env: dict[str, str], home: Path) -> dict | None:
    exe = shutil.which("gemini")
    gemini_home = home / ".gemini"
    settings = _read_json(gemini_home / "settings.json")
    auth = ((settings.get("security") or {}).get("auth") or {}) if isinstance(settings.get("security") or {}, dict) else {}
    selected = str(auth.get("selectedType") or settings.get("selectedAuthType") or "").strip()
    api_key = bool(env.get("GEMINI_API_KEY") or env.get("GOOGLE_API_KEY"))
    oauth_cache = (gemini_home / "oauth_creds.json").exists()
    accounts = _read_json(gemini_home / "google_accounts.json")
    identity = str(accounts.get("active") or "").strip()

    if api_key:
        return _row("Google Gemini", ready=True, auth_source="GEMINI_API_KEY" if env.get("GEMINI_API_KEY") else "GOOGLE_API_KEY", identity="Google AI API account", detail="Gemini API credentials are present; key value is never read or stored.", client="gemini" if exe else "")
    if selected == "oauth-personal" and oauth_cache:
        return _row("Google Gemini", ready=True, auth_source="Gemini Google OAuth", identity=identity or "Google account", detail="Gemini CLI OAuth configuration and credential cache were detected locally.", client="gemini" if exe else "")
    if selected:
        return _row("Google Gemini", ready=False, auth_source=f"Gemini {selected}", identity=identity, detail="Gemini authentication is configured, but a usable supported credential could not be verified.", client="gemini" if exe else "")
    if exe:
        return _row("Google Gemini", ready=False, auth_source="Gemini CLI installed", detail="Gemini CLI is installed; sign in once or set GEMINI_API_KEY for automatic detection.", client="gemini")
    return None


def _ollama(config: Config) -> dict | None:
    exe = shutil.which("ollama")
    selected = str(config.data.get("contextor", {}).get("ollama_model") or "").strip()
    if not exe:
        return None
    code, text = _run([exe, "list"], timeout=5)
    models: list[str] = []
    if code == 0:
        for line in text.splitlines()[1:]:
            name = line.split()[0].strip() if line.split() else ""
            if name:
                models.append(name)
    detail = "Local Ollama service is responding." if code == 0 else "Ollama is installed, but its local service did not answer."
    if selected:
        detail += f" QuillGeist Contextor model: {selected}."
    return _row("Ollama", ready=code == 0, auth_source="local runtime", identity="This PC", detail=detail, models=models, client="ollama")


def _other_api_keys(env: dict[str, str]) -> list[dict]:
    rows = []
    if env.get("OPENROUTER_API_KEY"):
        rows.append(_row("OpenRouter", ready=True, auth_source="OPENROUTER_API_KEY", identity="API account", detail="OpenRouter credentials are present; secret value is never read or stored."))
    if env.get("AZURE_OPENAI_API_KEY") or env.get("AZURE_OPENAI_ENDPOINT"):
        ready = bool(env.get("AZURE_OPENAI_API_KEY") and env.get("AZURE_OPENAI_ENDPOINT"))
        rows.append(_row("Azure OpenAI", ready=ready, auth_source="Azure environment", identity="Azure deployment", detail="Azure OpenAI environment configuration detected."))
    return rows


def provider_snapshot(config: Config | None = None, *, force: bool = False) -> dict:
    """Discover supported local provider authentication without exposing secret material.

    Discovery uses provider-supported status commands, environment-variable presence, and
    non-secret local settings metadata. Browser cookies, OAuth token values, API key values,
    and credential payloads are never copied into QuillGeist configuration or telemetry.
    """
    now = time.time()
    if not force and _cache.get("data") is not None and now - float(_cache.get("ts") or 0) < _CACHE_SECONDS:
        return dict(_cache["data"])

    config = config or Config.load()
    env = dict(os.environ)
    home = Path.home()
    rows = [r for r in (_codex(env, home), _claude(env, home), _gemini(env, home), _ollama(config)) if r]
    rows.extend(_other_api_keys(env))
    rows.sort(key=lambda r: (not r["ready"], r["provider"].lower()))
    ready = [r for r in rows if r["ready"]]
    result = {
        "checked_at": int(now * 1000),
        "detected": len(rows),
        "ready": len(ready),
        "providers": rows,
        "primary": ready[0] if ready else (rows[0] if rows else None),
        "secrets_read": False,
        "browser_sessions_read": False,
    }
    _cache["ts"] = now
    _cache["data"] = result
    return dict(result)
