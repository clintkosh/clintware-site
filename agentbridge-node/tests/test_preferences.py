import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from agentbridge_node.config import Config
from agentbridge_node.preferences import PreferenceStore, parse_preference_command
from agentbridge_node.prompt_planner import plan_prompt


class PreferenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.home = Path(self.temp.name)
        self.env = patch.dict(os.environ, {"QUILLGEIST_HOME": str(self.home)})
        self.env.start()
        Config.load()

    def tearDown(self):
        self.env.stop()
        self.temp.cleanup()

    def test_explicit_preference_persists_and_is_injected(self):
        saved = plan_prompt("remember: Keep the original file and create a copy")
        self.assertEqual(saved.mode, "memory_update")
        self.assertIn("preference_saved", saved.triggered_by)

        plan = plan_prompt("Update this file with the corrected content")
        self.assertIn("persistent_preferences", plan.triggered_by)
        self.assertIn("Keep the original file and create a copy", plan.master_prompt)
        self.assertIn("task-specific instruction", plan.master_prompt)

        store = PreferenceStore()
        rows = store.list()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].text, "Keep the original file and create a copy")

    def test_duplicate_preference_is_not_added_twice(self):
        store = PreferenceStore()
        first = store.add("Use concise evidence in completion reports")
        second = store.add("  Use concise evidence in completion reports  ")

        self.assertEqual(first["status"], "saved")
        self.assertEqual(second["status"], "exists")
        self.assertEqual(len(store.list()), 1)

    def test_forget_command_removes_preference(self):
        store = PreferenceStore()
        saved = store.add("Never rename the source file")["preference"]

        result = plan_prompt(f"forget: {saved['id']}")
        self.assertEqual(result.mode, "memory_update")
        self.assertIn("preference_removed", result.triggered_by)
        self.assertEqual(store.list(), [])

    def test_memory_write_uses_dlp_sanitization(self):
        store = PreferenceStore()
        result = store.add("For this service password=supersecret123")
        stored = result["preference"]["text"]

        self.assertNotIn("supersecret123", stored)
        self.assertIn("[SECRET]", stored)
        self.assertTrue(result["dlp"]["findings"])

    def test_preference_command_parser_requires_explicit_prefix(self):
        self.assertEqual(parse_preference_command("remember: use copies"), ("remember", "use copies"))
        self.assertEqual(parse_preference_command("forget: use copies"), ("forget", "use copies"))
        self.assertIsNone(parse_preference_command("I remember using copies"))


if __name__ == "__main__":
    unittest.main()
