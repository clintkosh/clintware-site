import os
import tempfile
import time
import unittest
from unittest.mock import patch

from agentbridge_node.active_jobs import begin_job, finish_job, list_active_jobs, request_stop, stop_requested
from agentbridge_node.scheduler import add_schedule, load_schedules, set_schedule_enabled, update_schedule


class TaskControlTests(unittest.TestCase):
    def test_schedule_can_be_edited_and_paused_live(self):
        with tempfile.TemporaryDirectory() as td, patch.dict(os.environ, {"AGENTBRIDGE_HOME": td}):
            pack = os.path.join(td, "demo.abpack")
            open(pack, "w", encoding="utf-8").write("{}")
            row = add_schedule(pack, at_epoch=time.time() + 300, every_seconds=3600)
            changed = update_schedule(row["id"], every_seconds=120, next_run_at=time.time() + 60)
            self.assertEqual(changed["every_seconds"], 120)
            paused = set_schedule_enabled(row["id"], False)
            self.assertFalse(paused["enabled"])
            stored = load_schedules()
            self.assertEqual(len(stored), 1)
            self.assertFalse(stored[0]["enabled"])

    def test_active_job_registry_and_stop_request(self):
        with tempfile.TemporaryDirectory() as td, patch.dict(os.environ, {"AGENTBRIDGE_HOME": td}):
            begin_job("run-1", "job-1", "Demo")
            self.assertEqual(len(list_active_jobs()), 1)
            request_stop("run-1")
            self.assertTrue(stop_requested("run-1"))
            self.assertEqual(list_active_jobs()[0]["state"], "stop_requested")
            finish_job("run-1")
            self.assertEqual(list_active_jobs(), [])


if __name__ == "__main__":
    unittest.main()
