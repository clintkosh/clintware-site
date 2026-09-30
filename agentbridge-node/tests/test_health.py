from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import json
import tempfile
import time
import unittest

from agentbridge_node.health import HealthPulse, assess_health


class HealthPulseTests(unittest.TestCase):
    def test_busy_progress_and_liveness_are_distinct(self):
        now = datetime.now(timezone.utc)
        payload = {
            "state": "busy",
            "timestamp": now.isoformat(),
            "progress_at": (now - timedelta(minutes=20)).isoformat(),
        }
        result = assess_health(payload, now=now, no_progress_seconds=900)
        self.assertFalse(result.healthy)
        self.assertEqual(result.reason, "busy_no_progress")

    def test_fresh_progress_is_healthy(self):
        now = datetime.now(timezone.utc)
        payload = {
            "state": "busy",
            "timestamp": now.isoformat(),
            "progress_at": (now - timedelta(seconds=30)).isoformat(),
        }
        result = assess_health(payload, now=now)
        self.assertTrue(result.healthy)
        self.assertEqual(result.reason, "busy_progress_fresh")

    def test_pulse_writes_v2_and_advances_progress_only_explicitly(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "health.json"
            pulse = HealthPulse(path, task_id="demo", interval_seconds=2)
            with pulse:
                first = json.loads(path.read_text(encoding="utf-8"))
                first_progress = first["progress_sequence"]
                pulse._write()
                second = json.loads(path.read_text(encoding="utf-8"))
                self.assertGreater(second["sequence"], first["sequence"])
                self.assertEqual(second["progress_sequence"], first_progress)
                pulse.mark_progress("step")
                third = json.loads(path.read_text(encoding="utf-8"))
                self.assertGreater(third["progress_sequence"], first_progress)
                self.assertEqual(third["version"], "2")


if __name__ == "__main__":
    unittest.main()
