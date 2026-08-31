import platform
import unittest

from agentbridge_node.config import Config
from agentbridge_node.desktop import ActivityLedger, QuillgeistDesktop, compile_intent
from agentbridge_node.usage_desktop import QuillgeistDesktopWithUsage


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


@unittest.skipUnless(platform.system().lower() == "windows", "real Tk startup smoke test is Windows-only")
def test_windows_desktop_ui_starts_with_inline_command_box(tmp_path, monkeypatch):
    monkeypatch.setenv("QUILLGEIST_HOME", str(tmp_path))
    app = QuillgeistDesktop(minimized=True, no_tray=True)
    try:
        app.root.update_idletasks()
        assert app.root.winfo_exists() == 1
        assert app.command_input.winfo_exists() == 1

        before = [w for w in app.root.winfo_children() if isinstance(w, app.tk.Toplevel)]
        app.show_palette()
        app.root.update_idletasks()
        after = [w for w in app.root.winfo_children() if isinstance(w, app.tk.Toplevel)]
        assert len(after) == len(before)

        app.command_input.insert("1.0", "summarize this report")
        app.submit_command()
        assert "Command prepared" in app.output.get("1.0", "end")
    finally:
        app._running = False
        app.root.destroy()


@unittest.skipUnless(platform.system().lower() == "windows", "real Tk startup smoke test is Windows-only")
def test_windows_usage_desktop_keeps_command_box_inline(tmp_path, monkeypatch):
    monkeypatch.setenv("QUILLGEIST_HOME", str(tmp_path))
    app = QuillgeistDesktopWithUsage(minimized=True, no_tray=True)
    try:
        app.root.update_idletasks()
        assert app.command_input.winfo_exists() == 1
        assert app.usage_panel.winfo_exists() == 1
        assert app.body.winfo_manager() == "pack"
    finally:
        app._running = False
        app.root.destroy()
