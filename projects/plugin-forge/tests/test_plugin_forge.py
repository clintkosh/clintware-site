from __future__ import annotations

import ast
import tempfile
import unittest
from pathlib import Path

import plugin_forge as forge

LEGACY = '''from gimpfu import *\n\ndef old(image, drawable):\n    pdb.gimp_selection_none(image)\n    pdb.gimp_displays_flush()\n    pdb.some_unknown_call(image)\n\nregister("legacy", "x", "x", "x", "x", "2020", "Legacy", "*", [], [], old, menu="<Image>/Filters")\nmain()\n'''


class PluginForgeTests(unittest.TestCase):
    def test_slug_is_safe_and_prefixed(self):
        self.assertEqual(forge.slugify("../../ My Tool !!"), "clintware-my-tool")
        self.assertNotIn("..", forge.slugify("../../ My Tool !!"))

    def test_generate_clear_selection_plugin_contract(self):
        slug, source = forge.render_plugin(prompt="Clear the current selection", name="Selection Clear")
        self.assertEqual(slug, "clintware-selection-clear")
        self.assertIn("Gimp.Selection.none(image)", source)
        self.assertIn("<Image>/Clintware", source)
        self.assertTrue(forge.validate_plugin_source(source, slug).ok)
        ast.parse(source)

    def test_generate_invert_selection(self):
        _, source = forge.render_plugin(prompt="Invert the selection", name="Invert")
        self.assertIn("Gimp.Selection.invert(image)", source)

    def test_generic_prompt_is_valid_noop_scaffold(self):
        slug, source = forge.render_plugin(prompt="Make the image look cinematic", name="Cinema")
        self.assertIn("TODO: Add image operation here", source)
        self.assertTrue(forge.validate_plugin_source(source, slug).ok)

    def test_scan_legacy_detects_expected_constructs(self):
        codes = {f.code for f in forge.scan_legacy_source(LEGACY)}
        self.assertTrue({"gimpfu", "register", "pdb", "main"}.issubset(codes))

    def test_migrate_maps_known_calls_and_reports_unknown(self):
        report, source = forge.migrate_legacy_source(LEGACY, "legacy.py")
        self.assertIn("Gimp.Selection.none(image)", source)
        self.assertIn("Gimp.displays_flush()", source)
        self.assertIn("some_unknown_call", report.unmapped_pdb_calls)
        self.assertNotIn("from gimpfu", source)
        self.assertTrue(forge.validate_plugin_source(source, report.generated_slug).ok)

    def test_write_matches_gimp_folder_file_contract(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = forge.write_plugin(Path(tmp), prompt="Clear selection", name="Demo")
            self.assertEqual(path.parent.name, path.stem)
            self.assertEqual(path.name, f"{path.parent.name}.py")

    def test_install_copies_validated_folder(self):
        with tempfile.TemporaryDirectory() as tmp, tempfile.TemporaryDirectory() as target:
            source = forge.write_plugin(Path(tmp), prompt="Invert selection", name="Install Test")
            installed = forge.install_plugin(source, Path(target))
            self.assertTrue(installed.exists())
            self.assertEqual(installed.parent.name, source.parent.name)
            self.assertEqual(installed.read_text(encoding="utf-8"), source.read_text(encoding="utf-8"))

    def test_validator_rejects_legacy_source(self):
        self.assertFalse(forge.validate_plugin_source(LEGACY).ok)

    def test_cli_generate_and_validate(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(forge.cli(["generate", "--prompt", "Clear selection", "--name", "CLI Tool", "--output", tmp]), 0)
            path = Path(tmp) / "clintware-cli-tool" / "clintware-cli-tool.py"
            self.assertTrue(path.exists())
            self.assertEqual(forge.cli(["validate", str(path)]), 0)


if __name__ == "__main__":
    unittest.main()
