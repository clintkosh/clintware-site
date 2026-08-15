import json,os,tempfile,unittest
from pathlib import Path

from agentbridge_node.config import Config
from agentbridge_node.helpdb import apply_updates, load, render
from agentbridge_node.pack import save_abpack
from agentbridge_node.runner import execute_pack_path
from agentbridge_node.telemetry import build_run_event, error_fingerprint, sanitize_error


class HelpTelemetryTests(unittest.TestCase):
    def test_help_center_seed_and_patch_update(self):
        with tempfile.TemporaryDirectory() as td:
            os.environ["AGENTBRIDGE_HOME"]=str(Path(td)/"home")
            data=load()
            self.assertTrue(data["getting_started"])
            self.assertTrue(any(x.get("term")=="Contextor" for x in data["glossary"]))
            apply_updates({"fixes":[{"id":"test-fix","date":"2026-08-15","version":"test","title":"Test fix","body":"Updated behavior."}]},source="unit-test")
            data=load()
            self.assertTrue(any(x.get("id")=="test-fix" for x in data["fixes"]))
            self.assertIn("Test fix",render("fixes"))

    def test_successful_execution_can_update_help(self):
        with tempfile.TemporaryDirectory() as td:
            os.environ["AGENTBRIDGE_HOME"]=str(Path(td)/"home2")
            workspace=Path(td)/"work"; workspace.mkdir()
            manifest={
                "agentbridge":"1.0","workspace":str(workspace),"permissions":["file.write"],
                "steps":[{"type":"write_file","path":"ok.txt","content":"ok"}],
                "definition_of_done":[{"type":"file_contains","path":"ok.txt","text":"ok"}],
                "help_updates":{"faq":[{"id":"faq-test-update","q":"Was Help updated?","a":"Yes."}]}
            }
            pack=Path(td)/"help.abpack";save_abpack(manifest,pack)
            cfg=Config.load();cfg.data["policy"]["file.write"]="always";cfg.data["telemetry"]["enabled"]=False;cfg.save()
            result=execute_pack_path(pack,cfg,report_telemetry=False)
            self.assertEqual(result["status"],"passed")
            self.assertTrue(result["help_updated"])
            self.assertTrue(any(x.get("id")=="faq-test-update" for x in load()["faq"]))

    def test_telemetry_event_is_metric_focused(self):
        result={
            "job_id":"job-1","run_id":"run-1","status":"failed","duration_ms":1400,
            "error":"token=super-secret\nTraceback failed at 12345",
            "error_kind":"agentbridge_internal",
            "changes":[{"path":"a.py"}],
            "steps":[{"type":"patch","ok":True}],
            "contextor":{"external_tokens_avoided_est":1000,"net_tokens_avoided_est":800,"local_llm_input_tokens_est":100,"local_llm_output_tokens_est":100,"raw_tokens_est":1400,"sent_tokens_est":400},
            "fixes_bug_ids":[],
        }
        event=build_run_event(result,"device-1")
        self.assertEqual(event["tokens_avoided_est"],1000)
        self.assertEqual(event["net_tokens_saved_est"],800)
        self.assertEqual(event["patch_count"],1)
        self.assertTrue(event["product_bug"])
        self.assertNotIn("super-secret",event["error_message"])
        self.assertNotIn("planner_feedback",event)

    def test_error_fingerprint_normalizes_variable_ids(self):
        a=error_fingerprint("Failure 12345 for 01234567-89ab-cdef-0123-456789abcdef","agentbridge_internal")
        b=error_fingerprint("Failure 99999 for aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee","agentbridge_internal")
        self.assertEqual(a,b)
        self.assertIn("[REDACTED]",sanitize_error("password=hunter2"))


if __name__=="__main__":unittest.main()
