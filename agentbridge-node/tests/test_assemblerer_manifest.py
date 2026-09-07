import unittest

from agentbridge_node.assemblerer_manifest import compile_manifest_context, load_manifest


SAMPLE = {
    "schema": "clintware.assemblerer/company-manifest@0.1",
    "companyId": "ASM-123456",
    "brief": "Build a merchant offer eligibility company with strong privacy controls.",
    "authority": 2,
    "routing": "local",
    "tasks": [
        {"id": "T1", "owner": "Product", "action": "Define acceptance tests", "route": "Local", "authority": 2, "proof": "Acceptance checklist", "status": "queued"},
        {"id": "T2", "owner": "GTM", "action": "Draft outreach", "route": "Cloud", "authority": 1, "proof": "Draft only", "status": "queued"},
        {"id": "T3", "owner": "Ops", "action": "Completed task", "route": "Local", "authority": 2, "proof": "Done proof", "status": "done"},
    ],
}


class ManifestTests(unittest.TestCase):
    def test_compiles_authority_routing_pending_work_and_proof(self):
        result = compile_manifest_context(SAMPLE)
        self.assertEqual(result["project"], "ASM-123456")
        self.assertEqual(result["authority"], 2)
        self.assertEqual(result["pending_task_count"], 2)
        self.assertIn("A2 · reversible local execution", result["context"])
        self.assertIn("Routing preference: local", result["context"])
        self.assertIn("Acceptance checklist", result["context"])
        self.assertNotIn("Completed task", result["context"])

    def test_task_limit_is_respected(self):
        result = compile_manifest_context(SAMPLE, task_limit=1)
        self.assertEqual(result["pending_task_count"], 2)
        self.assertEqual(result["included_task_count"], 1)

    def test_rejects_wrong_schema(self):
        bad = dict(SAMPLE, schema="other/schema")
        with self.assertRaisesRegex(ValueError, "Unsupported Assemblerer schema"):
            load_manifest(bad)

    def test_rejects_missing_brief(self):
        bad = dict(SAMPLE, brief="")
        with self.assertRaisesRegex(ValueError, "missing its company brief"):
            load_manifest(bad)


if __name__ == "__main__":
    unittest.main()
