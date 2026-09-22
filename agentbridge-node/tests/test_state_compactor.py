import tempfile
import unittest

from agentbridge_node.state_compactor import DeltaStateCompactor, maybe_compact_with_state


class DeltaStateCompactorTests(unittest.TestCase):
    def test_first_ingest_builds_state_without_forcing_rewrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw = "Build the parser. Never change the exact name Quillgeist. Use file path /tmp/a.txt exactly. Then verify it."
            compacted, metrics = maybe_compact_with_state(raw, scope="demo", config={"root": tmp, "enabled": True})
            self.assertEqual(compacted, raw)
            self.assertFalse(metrics.eligible_for_compaction)
            store = DeltaStateCompactor("demo", root=tmp)
            status = store.status()
            self.assertGreaterEqual(status["anchors"], 2)
            self.assertGreaterEqual(status["working"], 1)

    def test_repeated_context_uses_delta_state_and_preserves_exact_anchors(self):
        with tempfile.TemporaryDirectory() as tmp:
            base_lines = [
                "Never change the exact name Quillgeist.",
                "Use file path /tmp/a.txt exactly.",
                'Keep the quoted text "GO FURTHEST." exactly.',
            ] + [f"Build component {i} and verify it." for i in range(1, 35)]
            first = "\n".join(base_lines)
            cfg = {"root": tmp, "enabled": True, "max_active_chars": 6000, "recent_limit": 12, "rehydrate_hits": 8}
            _, first_metrics = maybe_compact_with_state(first, scope="demo", config=cfg)
            self.assertFalse(first_metrics.eligible_for_compaction)
            second = first + "\nNext implement the deployment check for component 34."
            compacted, second_metrics = maybe_compact_with_state(second, scope="demo", config=cfg)
            self.assertTrue(second_metrics.eligible_for_compaction)
            self.assertLess(len(compacted), len(second))
            self.assertIn("Never change the exact name Quillgeist.", compacted)
            self.assertIn("/tmp/a.txt", compacted)
            self.assertIn('"GO FURTHEST."', compacted)
            self.assertIn("deployment check", compacted)
            self.assertIn("state_hash:", compacted)

    def test_query_rehydrates_relevant_cold_history(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = DeltaStateCompactor("demo", root=tmp)
            for i in range(80):
                store.ingest(f"Background note {i} about ordinary setup details.")
            store.ingest("The telemetry cache uses a bloom filter for duplicate suppression.")
            for i in range(80, 160):
                store.ingest(f"Background note {i} about ordinary setup details.")
            rendered = store.render(query="duplicate telemetry bloom filter", recent_limit=5, rehydrate_hits=5, max_chars=5000)
            self.assertIn("bloom filter", rendered)
            self.assertIn("REHYDRATED FOR NEXT STEP", rendered)

    def test_state_persists_across_instances(self):
        with tempfile.TemporaryDirectory() as tmp:
            a = DeltaStateCompactor("demo", root=tmp)
            a.ingest("Never remove the exact route /api/v1/compact.")
            h = a.state_hash()
            b = DeltaStateCompactor("demo", root=tmp)
            self.assertEqual(b.state_hash(), h)
            self.assertIn("/api/v1/compact", b.render())


if __name__ == "__main__":
    unittest.main()
