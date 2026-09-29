import importlib.util
import json
from pathlib import Path
import tempfile
import types
import unittest

SOURCE = Path(__file__).resolve().parents[1] / "tools" / "local_ai.py"
spec = importlib.util.spec_from_file_location("local_ai_recovery", SOURCE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class StorageRecoveryTests(unittest.TestCase):
    def run_case(self, backup_ok):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            paths = {
                r"F:\AI-Data\Docker\n8n": base / "n8n",
                r"F:\AI-Data\Docker\open-webui": base / "webui",
                r"F:\AI-Data\Backups\LOCAL-CHATGPT": base / "backups",
            }
            paths[r"F:\AI-Data\Docker\open-webui"].mkdir()
            calls = []
            original_path, original_os, original_run = module.Path, module.os, module.run
            original_which = module.shutil.which
            def fake_run(args, timeout):
                calls.append(args)
                if args[1] == "inspect":
                    return 0, json.dumps([{"Type": "bind", "Source": str(base / "n8n"),
                                          "Destination": "/home/node/.n8n"}])
                if args[1] == "cp":
                    if not backup_ok:
                        return 1, "unavailable"
                    (Path(args[-1]) / "config").write_text('{"encryptionKey":"fixture-only"}')
                return 0, ""
            try:
                module.Path = lambda raw: paths[raw]
                module.os = types.SimpleNamespace(name="nt", getpid=lambda: 1234)
                module.run = fake_run
                module.shutil.which = lambda name: "docker"
                result = module.repair_storage()
                if backup_ok:
                    self.assertTrue(result["ok"])
                    self.assertEqual((base / "n8n" / "config").read_text(), '{"encryptionKey":"fixture-only"}')
                    self.assertTrue(list((base / "backups").rglob("config")))
                else:
                    self.assertFalse(result["ok"])
                    self.assertFalse((base / "n8n").exists())
                self.assertTrue(any(args[1] == "start" for args in calls))
                self.assertFalse(any(args[1] in ("rm", "volume") for args in calls))
            finally:
                module.Path, module.os, module.run = original_path, original_os, original_run
                module.shutil.which = original_which

    def test_backup_failure_preserves_missing_target(self):
        self.run_case(False)

    def test_existing_key_is_preserved_in_backup_and_restore(self):
        self.run_case(True)


if __name__ == "__main__":
    unittest.main()
