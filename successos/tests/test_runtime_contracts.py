import importlib.util
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OSDIR=ROOT/"successos"/"os"
sys.path.insert(0,str(OSDIR))

from success_driver_scan import recommended_packages

spec=importlib.util.spec_from_file_location("success_terminal",OSDIR/"success_terminal.py")
terminal=importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(terminal)

class RuntimeContractTests(unittest.TestCase):
    def test_nested_planner_json(self):
        text='noise before {"action":"filesystem.move","resource":"x","args":{"source":"/tmp/a","destination":"/tmp/b"}} trailing'
        obj=terminal.parse_json(text)
        self.assertEqual(obj["action"],"filesystem.move")
        self.assertEqual(obj["args"]["destination"],"/tmp/b")

    def test_last_valid_object_wins(self):
        text='{"action":"explain","message":"draft"}\n{"action":"network.status","resource":"machine","args":{}}'
        self.assertEqual(terminal.parse_json(text)["action"],"network.status")

    def test_driver_candidates(self):
        lines=[
            "01:00.0 Network controller [0280]: Intel Corporation Device [8086:2725]",
            "02:00.0 VGA compatible controller [0300]: NVIDIA Corporation Device [10de:25a2]",
            "03:00.0 Ethernet controller [0200]: Realtek Semiconductor Co., Ltd. Device [10ec:8168]",
        ]
        pkgs={x["package"] for x in recommended_packages(lines)}
        self.assertIn("firmware-iwlwifi",pkgs)
        self.assertIn("firmware-nvidia-graphics",pkgs)
        self.assertIn("firmware-realtek",pkgs)

    def test_shell_scripts_have_real_newlines(self):
        for name in ("build-successos.sh","prepare-bitnet-bundle.sh"):
            text=(OSDIR/name).read_text(encoding="utf-8")
            self.assertNotIn('\\ncp "$ROOT',text)
            self.assertTrue(text.startswith("#!/usr/bin/env bash\n"))

    def test_build_includes_gui_and_terminal(self):
        text=(OSDIR/"build-successos.sh").read_text(encoding="utf-8")
        for value in ("zenity","success_terminal.py","success_approve_gui.py","success-driver-scan"):
            self.assertIn(value,text)

if __name__=="__main__":
    unittest.main()
