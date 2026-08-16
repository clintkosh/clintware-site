import os
import tempfile
import unittest
from pathlib import Path

from agentbridge_node.config import Config
from agentbridge_node.dlp import evaluate, redact_text, scan_text
from agentbridge_node.pack import save_abpack
from agentbridge_node.runner import execute_pack_path


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


if __name__ == "__main__":
    unittest.main()
