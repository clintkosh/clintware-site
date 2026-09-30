import unittest

from agentbridge_node.model_policy import choose_model, private_data_allowed, routing_summary

class ModelPolicyTests(unittest.TestCase):
    def test_public_defaults_prefer_local_text_and_no_remote_image_provider(self):
        cfg = {
            "model_preferences": {
                "allow_user_choice": True,
                "text": {"mode": "local_auto", "provider": "local", "model": "auto"},
                "image": {"mode": "user_choice", "provider": "", "model": ""},
            },
            "private_data": {"owner_subject": ""},
        }
        self.assertEqual(choose_model(cfg, task_kind="text")["provider"], "local")
        self.assertEqual(choose_model(cfg, task_kind="image")["provider"], "")
        self.assertFalse(private_data_allowed("anyone", cfg))

    def test_user_can_deliberately_override_model(self):
        cfg = {"model_preferences": {"allow_user_choice": True, "text": {"provider": "local", "model": "auto"}}}
        out = choose_model(cfg, task_kind="text", requested_provider="ollama", requested_model="qwen3:8b")
        self.assertEqual(out["source"], "user_override")
        self.assertEqual(out["provider"], "ollama")
        self.assertEqual(out["model"], "qwen3:8b")

    def test_private_data_is_exact_verified_owner_only(self):
        cfg = {"private_data": {"owner_subject": "Clint.Kosh"}}
        self.assertTrue(private_data_allowed("clint.kosh", cfg))
        self.assertFalse(private_data_allowed("someone.else", cfg))
        self.assertFalse(private_data_allowed("", cfg))

    def test_owner_routing_summary_does_not_grant_without_subject(self):
        cfg = {"private_data": {"owner_subject": "Clint.Kosh"}}
        self.assertFalse(routing_summary(cfg)["private_data_allowed"])

if __name__ == "__main__":
    unittest.main()
