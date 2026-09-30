import json
import unittest

from agentbridge_node.big_prompt import plan_big_prompt


def settings():
    return {
        "max_depth": 3,
        "max_units": 32,
        "child_target_chars": 120,
        "child_complexity_threshold": 2,
        "max_children": 8,
        "remote_broker": "control_plane",
        "prompt_planner": {
            "enabled": True,
            "threshold_chars": 10000,
            "complexity_threshold": 2,
            "step_target_chars": 160,
            "max_steps": 12,
            "auto_continue": True,
        },
    }


class BigPromptTests(unittest.TestCase):
    def test_recursively_breaks_work_into_ordered_units(self):
        prompt = " ".join(
            f"Build component {idx} and capture deterministic verification evidence."
            for idx in range(1, 12)
        )
        plan = plan_big_prompt(prompt, settings(), project="demo", force=True)
        self.assertEqual(plan.mode, "qq_big_prompt")
        self.assertGreaterEqual(len(plan.units), 2)
        self.assertEqual(plan.units[0].depends_on, [])
        for previous, current in zip(plan.units, plan.units[1:]):
            self.assertEqual(current.depends_on, [previous.id])
        self.assertTrue(any(unit.depth > 0 for unit in plan.units))

    def test_external_actions_stay_behind_control_plane(self):
        prompt = "Deploy the release to Cloudflare, then send the customer an email. Finally verify current deployment status."
        plan = plan_big_prompt(prompt, settings(), force=True)
        lanes = {unit.lane for unit in plan.units}
        self.assertIn("control_plane_action", lanes)
        self.assertTrue(all(unit.broker == "control_plane" for unit in plan.units if unit.lane.startswith("control_plane_")))

    def test_local_build_work_prefers_qq(self):
        plan = plan_big_prompt("Build the source code, run tests, and package the result.", settings(), force=True)
        self.assertTrue(any(unit.lane == "qq_deterministic" for unit in plan.units))

    def test_secret_shapes_are_redacted_from_plan(self):
        prompt = "Use Bearer abcdefghijklmnopqrstuvwxyz123456789 to deploy the project."
        plan = plan_big_prompt(prompt, settings(), force=True)
        rendered = json.dumps(plan.to_dict())
        self.assertNotIn("abcdefghijklmnopqrstuvwxyz123456789", rendered)
        self.assertIn("[REDACTED_CREDENTIAL]", rendered)

    def test_context_savings_estimate_is_nonnegative(self):
        prompt = (
            "Research the current release status; then compare the latest provider documentation; "
            "then build a local verification script; then summarize the result."
        )
        plan = plan_big_prompt(prompt, settings(), force=True)
        self.assertGreaterEqual(plan.avoided_remote_context_tokens_est, 0)
        self.assertGreaterEqual(plan.remote_units, 1)
        self.assertGreaterEqual(plan.local_units, 1)


if __name__ == "__main__":
    unittest.main()
