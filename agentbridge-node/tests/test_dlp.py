import json
import os
import tempfile
import unittest
from pathlib import Path

from agentbridge_node.config import Config
from agentbridge_node.dlp import evaluate, redact_text, sanitize, scan_text
from agentbridge_node.pack import save_abpack
from agentbridge_node.runner import execute_pack_path
from agentbridge_node.telemetry import sanitize_error


class DlpTests(unittest.TestCase):
    def test_credit_card_detected_and_redacted(self):
        text = "Charge test card 4111 1111 1111 1111 for the example."
        findings = scan_text(text)
        self.assertTrue(any(f.kind == "payment_card" for f in findings))
        self.assertNotIn("4111", str([f.public() for f in findings]))
        self.assertIn("[PAYMENT_CARD]", redact_text(text, findings))

    def test_standard_requires_approval_for_high_risk(self):
        decision = evaluate({"prompt": "SSN 123-45-6789"}, {"enabled": True, "mode": "standard"})
        self.assertEqual(decision["action"], "approval_required")
        self.assertEqual(decision["counts"].get("us_ssn"), 1)
        approved = evaluate({"prompt": "SSN 123-45-6789"}, {"enabled": True, "mode": "standard"}, approved=True)
        self.assertEqual(approved["action"], "allow")

    def test_modes(self):
        value = {"prompt": "Email person@example.com"}
        self.assertEqual(evaluate(value, {"enabled": True, "mode": "standard"})["action"], "allow")
        self.assertEqual(evaluate(value, {"enabled": True, "mode": "strict"})["action"], "deny")
        self.assertEqual(evaluate(value, {"enabled": True, "mode": "monitor"})["action"], "allow")
        self.assertEqual(evaluate(value, {"enabled": False, "mode": "off"})["action"], "allow")

    def test_sanitize_respects_mode_and_severity(self):
        value = {"prompt": "Card 4111111111111111 email person@example.com"}
        standard, standard_report = sanitize(value, {"enabled": True, "mode": "standard"})
        self.assertIn("[PAYMENT_CARD]", standard["prompt"])
        self.assertIn("person@example.com", standard["prompt"])
        self.assertEqual(standard_report["counts"].get("payment_card"), 1)

        strict, _ = sanitize(value, {"enabled": True, "mode": "strict"})
        self.assertIn("[PAYMENT_CARD]", strict["prompt"])
        self.assertIn("[EMAIL]", strict["prompt"])

        monitor, _ = sanitize(value, {"enabled": True, "mode": "monitor"})
        self.assertIn("4111111111111111", monitor["prompt"])

    def test_telemetry_errors_redact_sensitive_data(self):
        clean = sanitize_error("Card 4111111111111111 SSN 123-45-6789 email person@example.com")
        self.assertNotIn("4111111111111111", clean)
        self.assertNotIn("123-45-6789", clean)
        self.assertNotIn("person@example.com", clean)
        self.assertIn("[PAYMENT_CARD]", clean)
        self.assertIn("[SSN]", clean)
        self.assertIn("[EMAIL]", clean)
        self.assertEqual(sanitize_error("password=hunter2"), "[REDACTED]")

    def test_executor_blocks_before_mutation(self):
        with tempfile.TemporaryDirectory() as td:
            os.environ["AGENTBRIDGE_HOME"] = str(Path(td) / "home")
            workspace = Path(td) / "work"
            workspace.mkdir()
            target = workspace / "secret.txt"
            manifest = {
                "agentbridge": "1.0",
                "workspace": str(workspace),
                "permissions": ["file.write"],
                "steps": [{"type": "write_file", "path": "secret.txt", "content": "4111111111111111"}],
            }
            pack = Path(td) / "dlp.abpack"
            save_abpack(manifest, pack)
            cfg = Config.load()
            cfg.data["policy"]["file.write"] = "always"
            cfg.data["telemetry"]["enabled"] = False
            cfg.save()
            result = execute_pack_path(pack, cfg, report_telemetry=False)
            self.assertEqual(result["status"], "approval_required")
            self.assertEqual(result["reason"], "sensitive_data_detected")
            self.assertFalse(target.exists())

    def test_approved_sensitive_run_is_redacted_before_result_storage(self):
        with tempfile.TemporaryDirectory() as td:
            os.environ["AGENTBRIDGE_HOME"] = str(Path(td) / "home-approved")
            workspace = Path(td) / "work"
            workspace.mkdir()
            manifest = {
                "agentbridge": "1.0",
                "workspace": str(workspace),
                "permissions": ["process.run"],
                "steps": [{"type": "run", "runtime": "python", "command": "print('4111111111111111')"}],
            }
            pack = Path(td) / "approved.abpack"
            save_abpack(manifest, pack)
            cfg = Config.load()
            cfg.data["policy"]["process.run"] = "always"
            cfg.data["telemetry"]["enabled"] = False
            cfg.save()
            result = execute_pack_path(pack, cfg, approved=True, report_telemetry=False)
            self.assertEqual(result["status"], "passed")
            serialized = json.dumps(result)
            self.assertNotIn("4111111111111111", serialized)
            self.assertIn("[PAYMENT_CARD]", serialized)
            stored = Path(cfg.path).parent / "runs" / result["run_id"] / "result.abresult"
            self.assertNotIn("4111111111111111", stored.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
