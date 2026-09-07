import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from agentbridge_node.config import Config
from agentbridge_node.preferences import PreferenceStore, infer_task_type, parse_preference_command
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

    def test_explicit_preference_persists_as_global_rule(self):
        saved = plan_prompt("remember: Keep the original file and create a copy")
        self.assertEqual(saved.mode, "memory_update")
        self.assertIn("preference_saved", saved.triggered_by)
        plan = plan_prompt("Update this file with the corrected content")
        self.assertIn("scoped_operating_rules", plan.triggered_by)
        self.assertIn("Keep the original file and create a copy", plan.master_prompt)
        rows = PreferenceStore().list()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].scope, "global")

    def test_project_rule_only_compiles_for_matching_project(self):
        store = PreferenceStore()
        store.add("Back up production before deploying", scope="project", project="Clintware")
        matching = plan_prompt("Deploy the website", {"project": "Clintware"})
        other = plan_prompt("Deploy the website", {"project": "RenewNudge"})
        self.assertIn("Back up production before deploying", matching.master_prompt)
        self.assertNotIn("Back up production before deploying", other.master_prompt)
        self.assertEqual(matching.applicable_rule_count, 1)
        self.assertEqual(other.applicable_rule_count, 0)
        self.assertGreater(other.rule_context_avoided_est, 0)

    def test_task_rule_only_compiles_for_matching_task(self):
        store = PreferenceStore()
        store.add("Never overwrite the original file", scope="task", task_types=["file_edit"])
        file_plan = plan_prompt("Edit this file and save a copy")
        research_plan = plan_prompt("Research current competitors")
        self.assertEqual(file_plan.task_type, "file_edit")
        self.assertIn("Never overwrite the original file", file_plan.master_prompt)
        self.assertNotIn("Never overwrite the original file", research_plan.master_prompt)

    def test_keyword_rule_requires_keyword(self):
        store = PreferenceStore()
        store.add("Run the production build before deploy", keywords=["deploy"])
        self.assertIn("Run the production build before deploy", plan_prompt("Deploy the site").master_prompt)
        self.assertNotIn("Run the production build before deploy", plan_prompt("Write a short email").master_prompt)

    def test_correction_proposal_is_not_silently_saved(self):
        store = PreferenceStore()
        proposal = store.propose("Never overwrite the original file", task_type="file_edit")
        self.assertEqual(proposal["status"], "proposed")
        self.assertFalse(proposal["proposal"]["saved"])
        self.assertEqual(proposal["proposal"]["scope"], "task")
        self.assertEqual(store.list(), [])

    def test_duplicate_rule_is_not_added_twice(self):
        store = PreferenceStore()
        first = store.add("Use concise evidence in completion reports")
        second = store.add("  Use concise evidence in completion reports  ")
        self.assertEqual(first["status"], "saved")
        self.assertEqual(second["status"], "exists")
        self.assertEqual(len(store.list()), 1)

    def test_same_text_can_exist_in_distinct_scopes(self):
        store = PreferenceStore()
        store.add("Use the canonical link")
        store.add("Use the canonical link", scope="project", project="Clintware")
        self.assertEqual(len(store.list()), 2)

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

    def test_command_parser_and_task_inference(self):
        self.assertEqual(parse_preference_command("remember: use copies"), ("remember", "use copies"))
        self.assertEqual(parse_preference_command("forget: use copies"), ("forget", "use copies"))
        self.assertIsNone(parse_preference_command("I remember using copies"))
        self.assertEqual(infer_task_type("Deploy the website"), "website")
        self.assertEqual(infer_task_type("Research competitors"), "research")


if __name__ == "__main__":
    unittest.main()
