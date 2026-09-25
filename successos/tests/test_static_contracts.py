import json
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]

class Parser(HTMLParser):
    pass

class StaticContractTests(unittest.TestCase):
    def test_landing_page_parses_and_has_permission_choices(self):
        html=(ROOT/"public/successos/index.html").read_text(encoding="utf-8")
        Parser().feed(html)
        for value in ("Allow once","Allow for this session","Always allow","Deny","Join beta list"):
            self.assertIn(value,html)

    def test_plugin_manifest_and_mcp_mapping(self):
        plugin=json.loads((ROOT/"successos/plugin/plugin.json").read_text(encoding="utf-8"))
        mcp=json.loads((ROOT/"successos/plugin/mcp.json").read_text(encoding="utf-8"))
        self.assertEqual(plugin["name"],"clintware-successos")
        self.assertEqual(mcp["mcpServers"]["clintware"]["type"],"streamable-http")
        self.assertEqual(mcp["mcpServers"]["clintware"]["url"],"https://mcp.clintware.com/mcp")

    def test_venture_index_has_unique_successos_rank(self):
        html=(ROOT/"public/startup/index.html").read_text(encoding="utf-8")
        self.assertEqual(html.count('class="name">Clintware SuccessOS'),1)
        self.assertIn('<div class="rank">04</div><div class="name">Clintware SuccessOS',html)

    def test_product_register_has_successos(self):
        html=(ROOT/"public/tools/index.html").read_text(encoding="utf-8")
        self.assertEqual(html.count('<div class="name">Clintware SuccessOS'),1)
        self.assertIn("#4 · Prototype track",html)

if __name__=="__main__":
    unittest.main()
