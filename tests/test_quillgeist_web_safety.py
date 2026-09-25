import importlib.util
import json
import pathlib
import socket
import unittest
from unittest import mock

ROOT = pathlib.Path(__file__).resolve().parents[1]
AGENT_PATH = ROOT / "quillgeist-lite" / "tools" / "browser_agent.py"

spec = importlib.util.spec_from_file_location("qq_browser_agent", AGENT_PATH)
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)


class QuillgeistWebSafetyTests(unittest.TestCase):
    def test_false_like_values_never_grant_approval(self):
        for value in ("false", "0", "no", "off", "", None, False):
            self.assertFalse(agent.as_bool(value), value)
        for value in ("true", "1", "yes", "on", True):
            self.assertTrue(agent.as_bool(value), value)

    def test_dns_resolution_failure_fails_closed(self):
        policy = agent.NetworkPolicy(allow_private=False)
        with mock.patch.object(socket, "getaddrinfo", side_effect=socket.gaierror("dns failure")):
            self.assertFalse(policy._host_allowed("unresolvable.example"))
            with self.assertRaises(ValueError):
                policy.validate("https://unresolvable.example/path")

    def test_private_and_loopback_targets_blocked(self):
        policy = agent.NetworkPolicy(allow_private=False)
        for url in (
            "http://127.0.0.1/",
            "http://localhost/",
            "http://169.254.169.254/latest/meta-data/",
            "http://10.0.0.1/",
            "http://192.168.1.1/",
        ):
            with self.assertRaises(ValueError, msg=url):
                policy.validate(url)

    def test_remote_task_schema_cannot_enable_private_networks(self):
        data = json.loads((ROOT / "quillgeist-lite" / "tasks.json").read_text(encoding="utf-8"))
        params = data["tasks"]["browser-work"]["parameters"]
        self.assertNotIn("AllowPrivate", params)

    def test_browser_wrapper_supports_all_agent_search_engines(self):
        text = (ROOT / "quillgeist-lite" / "tasks" / "browser-work.ps1").read_text(encoding="utf-8")
        self.assertIn('"auto","google","brave","bing","duckduckgo"', text)


if __name__ == "__main__":
    unittest.main()
