import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class QuillgeistSaaSPortalTests(unittest.TestCase):
    def test_saas_page_is_separate_and_browser_local(self):
        page = (ROOT / "agentbridge-cloud" / "public" / "app.html").read_text(encoding="utf-8")
        script = (ROOT / "agentbridge-cloud" / "public" / "saas.js").read_text(encoding="utf-8")
        self.assertIn("Route the work. Not just the prompt.", page)
        self.assertIn("Primary / synthesis model", page)
        self.assertIn("Sub-search branches", page)
        self.assertIn("Stored only in this browser", page)
        self.assertIn("localStorage", script)
        self.assertIn("Promise.all", script)
        self.assertIn("/v1/models", script)
        self.assertIn("/v1/chat/completions", script)
        self.assertIn("synthesisMessages", script)
        self.assertNotIn("mcp.clintware.com/api", script)
        self.assertNotIn("CLOUDFLARE", script)

    def test_local_gateway_explicitly_allows_portal_origin(self):
        source = (ROOT / "agentbridge-node" / "agentbridge_node" / "local_gateway.py").read_text(encoding="utf-8")
        self.assertIn('"https://quillgeist.clintware.com"', source)
        self.assertIn('"https://qg.clintware.com"', source)
        self.assertIn("access-control-allow-private-network", source)
        self.assertIn("def do_OPTIONS", source)
        self.assertIn("gateway_cors_origins", source)

    def test_product_page_points_to_separate_workspace(self):
        page = (ROOT / "public" / "tools" / "quillgeist" / "index.html").read_text(encoding="utf-8")
        self.assertIn("Adaptive intent compiler for AI.", page)
        self.assertIn("https://quillgeist.clintware.com/app", page)
        self.assertIn("model switching", page.lower())
        self.assertIn("Quillgeist Lite / QQ", page)


if __name__ == "__main__":
    unittest.main()
