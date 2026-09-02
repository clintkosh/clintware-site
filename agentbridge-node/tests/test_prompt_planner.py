import unittest

from agentbridge_node.prompt_planner import plan_prompt


class PromptPlannerTests(unittest.TestCase):
    def test_short_prompt_passes_through(self):
        raw = "Summarize this report as a table."
        plan = plan_prompt(raw, {"enabled": True, "threshold_chars": 3500, "complexity_threshold": 6})
        self.assertEqual(plan.mode, "single")
        self.assertEqual(plan.master_prompt, raw)
        self.assertEqual(len(plan.steps), 1)

    def test_force_builds_auto_continue_plan(self):
        raw = (
            "Create the cover. Then generate pages 1 through 10. After that verify names and page numbers. "
            "Next assemble the PDF. Finally create three gallery images and deliver the files."
        )
        plan = plan_prompt(
            raw,
            {"enabled": True, "step_target_chars": 80, "max_steps": 12, "auto_continue": True},
            force=True,
        )
        self.assertEqual(plan.mode, "auto_continue")
        self.assertGreater(len(plan.steps), 1)
        self.assertIn("without asking for repeated OK/continue confirmations", plan.master_prompt)
        self.assertIn("re-compact the unresolved requirements", plan.master_prompt)
        self.assertIn("Begin with STEP 1", plan.master_prompt)
        self.assertIn("assemble the PDF", plan.master_prompt)
        self.assertIn("three gallery images", plan.master_prompt)

    def test_preserves_exact_constraints_while_deduping_repetition(self):
        repeated = "Never change the exact name Sophia or Mona."
        raw = "\n".join([
            repeated,
            repeated,
            "Use file path /tmp/sample.pdf exactly.",
            'Keep the quoted text "Thank you for the best birthday ever!" exactly.',
            "Then verify the output. Then continue to the next batch. Then do final QA.",
        ])
        plan = plan_prompt(raw, {"enabled": True, "threshold_chars": 20, "step_target_chars": 120})
        self.assertEqual(plan.master_prompt.count(repeated), 1)
        self.assertIn("/tmp/sample.pdf", plan.master_prompt)
        self.assertIn('"Thank you for the best birthday ever!"', plan.master_prompt)
        self.assertIn("final QA", plan.master_prompt)

    def test_complex_request_triggers_without_length_threshold(self):
        raw = (
            "Build the app; then test it; then fix failures; then package it; then verify the package; "
            "then export it; then create docs; finally deliver it."
        )
        plan = plan_prompt(
            raw,
            {"enabled": True, "threshold_chars": 10000, "complexity_threshold": 3, "step_target_chars": 70},
        )
        self.assertIn("complexity", plan.triggered_by)
        self.assertEqual(plan.mode, "auto_continue")

    def test_visual_multi_output_adds_composition_variation_rule(self):
        raw = (
            "Generate 20 coloring book pages. Then review every image. Then fix bad pages. "
            "Then assemble a PDF. Then generate gallery images. Finally deliver all files."
        )
        plan = plan_prompt(
            raw,
            {"enabled": True, "complexity_threshold": 2, "step_target_chars": 100},
            force=True,
        )
        self.assertEqual(plan.mode, "auto_continue")
        self.assertIn("deliberately vary pose, body angle, camera distance", plan.master_prompt)
        self.assertIn("do not clone the same portrait stance", plan.master_prompt)


if __name__ == "__main__":
    unittest.main()
