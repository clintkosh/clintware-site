import tempfile, unittest, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; sys.path.insert(0,str(ROOT/"os"))
from success_permission import PolicyStore, Request
class PermissionPolicyTests(unittest.TestCase):
    def make(self):
        td=tempfile.TemporaryDirectory(); self.addCleanup(td.cleanup); return PolicyStore(Path(td.name)/"policy.json")
    def test_r0_defaults_allow(self):
        self.assertEqual(self.make().evaluate(Request("u","hardware.inspect","read","/sys/devices","host","R0")),"allow")
    def test_write_defaults_prompt(self):
        self.assertEqual(self.make().evaluate(Request("u","network.wifi","connect","ssid:office","host","R1")),"prompt")
    def test_once_consumed(self):
        s=self.make(); r=Request("u","package.install","install","pkg:git","host","R1"); s.grant(r,"once"); self.assertEqual(s.evaluate(r),"allow"); self.assertEqual(s.evaluate(r),"prompt")
    def test_exact_durable_rule(self):
        s=self.make(); r=Request("u","network.wifi","connect","ssid:office","host","R1"); s.grant(r,"always"); self.assertEqual(s.evaluate(r),"allow")
    def test_durable_r2_rejected(self):
        s=self.make(); r=Request("u","service.manage","restart","service:sshd","host","R2")
        with self.assertRaises(ValueError): s.grant(r,"always")
    def test_durable_wildcard_rejected(self):
        s=self.make(); r=Request("u","filesystem.write","write","*","host","R1")
        with self.assertRaises(ValueError): s.grant(r,"always")
    def test_denial_persists(self):
        td=tempfile.TemporaryDirectory(); self.addCleanup(td.cleanup); path=Path(td.name)/"policy.json"; r=Request("u","network.wifi","connect","ssid:guest","host","R1"); s=PolicyStore(path); s.grant(r,"deny"); self.assertEqual(PolicyStore(path).evaluate(r),"deny")
if __name__=="__main__":unittest.main()
