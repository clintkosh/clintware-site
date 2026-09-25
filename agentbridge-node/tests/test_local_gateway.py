import unittest
from unittest import mock

from agentbridge_node import local_gateway


class LocalGatewayTests(unittest.TestCase):
    def test_flatten_messages(self):
        text = local_gateway._flatten_messages([
            {"role": "system", "content": "Be concise."},
            {"role": "user", "content": "Hello"},
        ])
        self.assertIn("SYSTEM: Be concise.", text)
        self.assertIn("USER: Hello", text)
        self.assertTrue(text.endswith("ASSISTANT:"))

    def test_streaming_is_rejected_before_model_resolution(self):
        status, body = local_gateway.complete({
            "model": "auto",
            "stream": True,
            "messages": [{"role": "user", "content": "hi"}],
        })
        self.assertEqual(status, 400)
        self.assertEqual(body["error"]["type"], "unsupported_request")

    def test_auto_model_prefers_active_profile(self):
        rows = [{"id": "ollama:test", "name": "test", "runtime": "ollama", "size_bytes": 1}]
        with mock.patch.object(local_gateway.local_inference, "model_inventory", return_value=rows),              mock.patch.object(local_gateway.local_inference, "active_profile", return_value={"active": True, "model": "ollama:test"}):
            found = local_gateway._resolve_model("auto", {})
        self.assertEqual(found["id"], "ollama:test")

    def test_non_loopback_bind_is_refused(self):
        with self.assertRaises(ValueError):
            local_gateway.serve({}, host="0.0.0.0", port=11435)


if __name__ == "__main__":
    unittest.main()
