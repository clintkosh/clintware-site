import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

from agentbridge_node import local_inference as li


class LocalInferenceTests(unittest.TestCase):
    def test_parse_size(self):
        self.assertEqual(li._parse_size("4.7 GB"), int(4.7 * 1024**3))
        self.assertEqual(li._parse_size("900 MB"), 900 * 1024**2)
        self.assertEqual(li._parse_size("bad"), 0)

    def test_configured_model_dirs_dedupes(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td).resolve()
            with mock.patch.dict(os.environ, {"QUILLGEIST_MODEL_DIRS": str(root) + os.pathsep + str(root)}, clear=False):
                rows = li.configured_model_dirs({"model_dirs": [str(root)]})
            self.assertEqual(rows.count(root), 1)

    def test_gguf_inventory(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            model = root / "tiny.gguf"
            model.write_bytes(b"x" * 2048)
            rows = li._gguf_models({"model_dirs": [str(root)]})
            self.assertEqual(rows[0]["runtime"], "llama.cpp")
            self.assertEqual(rows[0]["size_bytes"], 2048)

    def test_fit_states(self):
        mem = {"available_bytes": 16 * 1024**3}
        likely = li.estimate_fit(2 * 1024**3, context_tokens=2048, memory=mem, reserve_gib=2)
        self.assertEqual(likely["fit"], "likely")
        no = li.estimate_fit(20 * 1024**3, context_tokens=4096, memory=mem, reserve_gib=2)
        self.assertEqual(no["fit"], "no")

    def test_benchmark_refuses_uninstalled(self):
        with mock.patch.object(li, "model_inventory", return_value=[]):
            out = li.benchmark("missing")
        self.assertEqual(out, {"ok": False, "error": "installed_model_not_found", "model": "missing"})

    def test_route_local_when_viable(self):
        fake = {
            "memory": {"available_bytes": 16 * 1024**3},
            "models": [{"id": "ollama:test", "runtime": "ollama", "size_bytes": 2 * 1024**3}],
        }
        with mock.patch.object(li, "status", return_value=fake):
            out = li.route_recommendation(prefer_local=True, context_tokens=2048)
        self.assertEqual(out["choice"]["target"], "local")
        self.assertEqual(out["choice"]["model"], "ollama:test")


if __name__ == "__main__":
    unittest.main()
