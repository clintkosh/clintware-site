import tempfile,unittest
from pathlib import Path
from agentbridge_node.pack import load_pack,save_abpack
class PackTests(unittest.TestCase):
    def test_round_trip(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"x.abpack"; save_abpack({"agentbridge":"1.0","steps":[]},p,{"hello.txt":b"hi"})
            pack=load_pack(p); self.assertEqual(pack.manifest["agentbridge"],"1.0"); self.assertEqual(pack.embedded_files["hello.txt"],b"hi")
    def test_markdown(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"x.md"; p.write_text('```agentbridge\n{"agentbridge":"1.0","steps":[]}\n```\n')
            self.assertEqual(load_pack(p).manifest["agentbridge"],"1.0")
if __name__=="__main__":unittest.main()
