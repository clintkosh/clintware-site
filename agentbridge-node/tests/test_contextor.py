import unittest
from agentbridge_node.contextor import compact
class ContextorTests(unittest.TestCase):
    def test_pass_small(self):
        out,m=compact("hello",{"compact_threshold_chars":10,"mode":"fast"}); self.assertEqual(out,"hello"); self.assertEqual(m.mode,"pass")
    def test_dedupes_large(self):
        raw=("ok\n"*4000)+"ERROR exact failure\n"+("noise\n"*4000)
        out,m=compact(raw,{"compact_threshold_chars":100,"max_transmit_chars":4000,"mode":"fast"})
        self.assertIn("ERROR exact failure",out); self.assertLess(len(out),len(raw)); self.assertGreater(m.external_tokens_avoided_est,0)
if __name__=="__main__":unittest.main()
