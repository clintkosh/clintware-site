from agentbridge_node.config import Config
from agentbridge_node.preferences import PreferenceStore, parse_preference_command
from agentbridge_node.prompt_planner import plan_prompt


def test_explicit_preference_persists_and_is_injected(tmp_path, monkeypatch):
    monkeypatch.setenv("QUILLGEIST_HOME", str(tmp_path))
    Config.load()

    saved = plan_prompt("remember: Keep the original file and create a copy")
    assert saved.mode == "memory_update"
    assert "preference_saved" in saved.triggered_by

    plan = plan_prompt("Update this file with the corrected content")
    assert "persistent_preferences" in plan.triggered_by
    assert "Keep the original file and create a copy" in plan.master_prompt
    assert "task-specific instruction" in plan.master_prompt

    # Persistence belongs to Quillgeist, not to one planner/model process.
    store = PreferenceStore()
    rows = store.list()
    assert len(rows) == 1
    assert rows[0].text == "Keep the original file and create a copy"


def test_duplicate_preference_is_not_added_twice(tmp_path, monkeypatch):
    monkeypatch.setenv("QUILLGEIST_HOME", str(tmp_path))
    Config.load()
    store = PreferenceStore()

    first = store.add("Use concise evidence in completion reports")
    second = store.add("  Use concise evidence in completion reports  ")

    assert first["status"] == "saved"
    assert second["status"] == "exists"
    assert len(store.list()) == 1


def test_forget_command_removes_preference(tmp_path, monkeypatch):
    monkeypatch.setenv("QUILLGEIST_HOME", str(tmp_path))
    Config.load()
    store = PreferenceStore()
    saved = store.add("Never rename the source file")["preference"]

    result = plan_prompt(f"forget: {saved['id']}")
    assert result.mode == "memory_update"
    assert "preference_removed" in result.triggered_by
    assert store.list() == []


def test_memory_write_uses_dlp_sanitization(tmp_path, monkeypatch):
    monkeypatch.setenv("QUILLGEIST_HOME", str(tmp_path))
    Config.load()
    store = PreferenceStore()

    result = store.add("For this service password=supersecret123")
    stored = result["preference"]["text"]

    assert "supersecret123" not in stored
    assert "[SECRET]" in stored
    assert result["dlp"]["findings"]


def test_preference_command_parser_requires_explicit_prefix():
    assert parse_preference_command("remember: use copies") == ("remember", "use copies")
    assert parse_preference_command("forget: use copies") == ("forget", "use copies")
    assert parse_preference_command("I remember using copies") is None
