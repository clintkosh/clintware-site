from __future__ import annotations
import tempfile, unittest
from pathlib import Path
import preset_manager

class PresetManagerTests(unittest.TestCase):
    def test_clintware_logo_preset_exists(self):
        self.assertIn("clintware-eclipse-logo", preset_manager.list_presets())
    def test_preset_validates(self):
        preset_manager.validate_preset("clintware-eclipse-logo")
    def test_export_preserves_gimp_folder_file_contract(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = preset_manager.export_preset("clintware-eclipse-logo", Path(tmp))
            self.assertTrue(target.exists())
            self.assertEqual(target.parent.name, target.stem)
    def test_rejects_traversal(self):
        with self.assertRaises(ValueError):
            preset_manager.preset_file("../escape")

if __name__ == "__main__":
    unittest.main()
