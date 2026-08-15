import json
import os
import tempfile
import time
import unittest
from unittest.mock import patch

from agentbridge_node.config import Config
from agentbridge_node.cloud import sync_device_schedules_to_local, report_device_schedule_state


class CloudScheduleTests(unittest.TestCase):
    def test_cloud_ms_schedule_syncs_to_local_seconds(self):
        with tempfile.TemporaryDirectory() as td, patch.dict(os.environ, {"AGENTBRIDGE_HOME": td}):
            cfg = Config({"device_id":"dev-1","device_token":"secret","cloud_url":"https://example.invalid"})
            future_ms = (time.time() + 300) * 1000
            remote = [{
                "id":"sched-1","device_id":"dev-1","owner":"device","enabled":True,
                "next_run_at":future_ms,"every_seconds":3600,"updated_at":"2026-08-15T08:00:00Z",
                "pack_name":"scheduled.json","pack_text":json.dumps({"agentbridge":"1.0","steps":[]})
            }]
            with patch("agentbridge_node.cloud.sync_device_schedules", return_value=remote):
                rows = sync_device_schedules_to_local(cfg)
            self.assertEqual(len(rows),1)
            self.assertAlmostEqual(rows[0]["next_run_at"], future_ms/1000, delta=1)
            self.assertFalse(rows[0]["approved_local"])
            self.assertTrue(os.path.exists(rows[0]["pack_path"]))

    def test_report_converts_local_seconds_to_cloud_ms(self):
        cfg = Config({"device_id":"dev-1","device_token":"secret","cloud_url":"https://example.invalid"})
        captured = {}
        def fake(method,url,body=None,token=None):
            captured.update({"method":method,"url":url,"body":body,"token":token}); return {"ok":True}
        with patch("agentbridge_node.cloud._request", side_effect=fake):
            report_device_schedule_state(cfg,{"id":"s1","next_run_at":123.5,"enabled":True,"approved_local":False},{"status":"passed"})
        self.assertEqual(captured["body"]["next_run_at"],123500.0)
        self.assertEqual(captured["token"],"secret")

if __name__ == "__main__":
    unittest.main()
