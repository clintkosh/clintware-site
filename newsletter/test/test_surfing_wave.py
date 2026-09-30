import importlib.util
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
PATH = ROOT / "newsletter" / "scripts" / "surfing_wave.py"
spec = importlib.util.spec_from_file_location("surfing_wave", PATH)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class SurfingWaveTests(unittest.TestCase):
    def test_build_package_requires_human_review_and_never_auto_publishes(self):
        package = mod.build_package({
            "signals": [{"headline": "Model release", "why_it_matters": "Capability changed", "source": "https://example.com"}],
            "model_grades": [{"model": "local:test", "grade": "A", "evidence": "latency improved"}],
            "devils_advocate": "Counterpoint.",
            "image_brief": "Wave visualization.",
        }, issue_date="2026-09-30")
        self.assertTrue(package["human_review_required"])
        self.assertFalse(package["auto_publish"])
        self.assertEqual(package["signal_count"], 1)
        self.assertIn("Subscriber delivery: Existing Clintware newsletter Worker only after approval.", package["markdown"])

    def test_empty_inputs_fail_safe_to_reviewable_draft(self):
        package = mod.build_package({}, issue_date="2026-09-30")
        self.assertIn("No verified public signals were supplied", package["markdown"])
        self.assertIn("No critic pass supplied.", package["markdown"])

if __name__ == "__main__":
    unittest.main()
