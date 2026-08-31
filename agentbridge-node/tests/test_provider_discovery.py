import json

from agentbridge_node.config import Config
from agentbridge_node import provider_discovery as providers


def test_codex_login_status_is_detected_without_reading_secret(tmp_path, monkeypatch):
    monkeypatch.setattr(providers.shutil, "which", lambda name: "codex" if name == "codex" else None)
    monkeypatch.setattr(providers, "_run", lambda argv, timeout=4: (0, "Logged in using ChatGPT"))
    row = providers._codex({}, tmp_path)
    assert row["provider"] == "OpenAI"
    assert row["ready"] is True
    assert row["identity"] == "ChatGPT"
    assert row["auth_source"] == "Codex login"


def test_api_key_presence_never_exposes_key_value(tmp_path, monkeypatch):
    monkeypatch.setattr(providers.shutil, "which", lambda name: None)
    secret = "sk-do-not-copy-this-value"
    row = providers._codex({"OPENAI_API_KEY": secret}, tmp_path)
    assert row["ready"] is True
    assert row["auth_source"] == "OPENAI_API_KEY"
    assert secret not in json.dumps(row)


def test_gemini_oauth_account_metadata_is_detected(tmp_path, monkeypatch):
    monkeypatch.setattr(providers.shutil, "which", lambda name: "gemini" if name == "gemini" else None)
    root = tmp_path / ".gemini"
    root.mkdir()
    (root / "settings.json").write_text(json.dumps({"security": {"auth": {"selectedType": "oauth-personal"}}}), encoding="utf-8")
    (root / "google_accounts.json").write_text(json.dumps({"active": "person@example.com"}), encoding="utf-8")
    (root / "oauth_creds.json").write_text("{}", encoding="utf-8")
    row = providers._gemini({}, tmp_path)
    assert row["ready"] is True
    assert row["identity"] == "person@example.com"
    assert row["auth_source"] == "Gemini Google OAuth"


def test_provider_snapshot_reports_no_secret_or_browser_session_read(tmp_path, monkeypatch):
    monkeypatch.setenv("QUILLGEIST_HOME", str(tmp_path / "quillgeist"))
    monkeypatch.setattr(providers.shutil, "which", lambda name: None)
    monkeypatch.setattr(providers.Path, "home", classmethod(lambda cls: tmp_path))
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("AZURE_OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("AZURE_OPENAI_ENDPOINT", raising=False)
    providers._cache["data"] = None
    out = providers.provider_snapshot(Config.load(), force=True)
    assert out["ready"] == 0
    assert out["secrets_read"] is False
    assert out["browser_sessions_read"] is False
