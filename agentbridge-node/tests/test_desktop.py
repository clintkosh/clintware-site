import platform

import pytest

from agentbridge_node.config import Config
from agentbridge_node.desktop import ActivityLedger, QuillgeistDesktop, compile_intent


def test_desktop_intent_compiler_and_activity(tmp_path, monkeypatch):
    monkeypatch.setenv("QUILLGEIST_HOME", str(tmp_path))
    cfg = Config.load()
    compiled = compile_intent("summarize this report as a table", cfg)
    assert compiled["product"] == "Quillgeist"
    assert compiled["action"] == "summarize"
    assert compiled["routing"] == "local-first"
    assert "table" in compiled["definition_of_done"].lower()

    ledger = ActivityLedger()
    ledger.add("test", "desktop smoke")
    recent = ledger.recent(1)
    assert recent[0][1:] == ("test", "desktop smoke")


@pytest.mark.skipif(platform.system().lower() != "windows", reason="real Tk startup smoke test is Windows-only")
def test_windows_desktop_ui_starts(tmp_path, monkeypatch):
    monkeypatch.setenv("QUILLGEIST_HOME", str(tmp_path))
    app = QuillgeistDesktop(minimized=True, no_tray=True)
    try:
        app.root.update_idletasks()
        assert app.root.winfo_exists() == 1
    finally:
        app._running = False
        app.root.destroy()
