import json,os,tempfile,unittest
from pathlib import Path
from agentbridge_node.config import Config
from agentbridge_node.executor import rollback
from agentbridge_node.runner import execute_pack_path
from agentbridge_node.pack import save_abpack
class ExecutorTests(unittest.TestCase):
    def test_write_dod_and_rollback(self):
        with tempfile.TemporaryDirectory() as td:
            os.environ["AGENTBRIDGE_HOME"]=str(Path(td)/"home"); workspace=Path(td)/"work"; workspace.mkdir()
            target=workspace/"x.txt"; target.write_text("before")
            manifest={"agentbridge":"1.0","workspace":str(workspace),"permissions":["file.write"],"steps":[{"type":"write_file","path":"x.txt","content":"after"}],"definition_of_done":[{"type":"file_contains","path":"x.txt","text":"after"}]}
            pack=Path(td)/"x.abpack"; save_abpack(manifest,pack); cfg=Config.load(); cfg.data["policy"]["file.write"]="always"; cfg.data["telemetry"]["enabled"]=False; cfg.save()
            result=execute_pack_path(pack,cfg,report_telemetry=False); self.assertEqual(result["status"],"passed"); self.assertEqual(target.read_text(),"after")
            rollback(result["run_id"],workspace); self.assertEqual(target.read_text(),"before")
    def test_never_cannot_be_approved(self):
        with tempfile.TemporaryDirectory() as td:
            os.environ["AGENTBRIDGE_HOME"]=str(Path(td)/"home2"); workspace=Path(td)/"work"; workspace.mkdir()
            pack=Path(td)/"x.json"; pack.write_text(json.dumps({"agentbridge":"1.0","workspace":str(workspace),"permissions":["git.push"],"steps":[]}))
            cfg=Config.load(); cfg.data["policy"]["git.push"]="never"; cfg.data["telemetry"]["enabled"]=False; cfg.save()
            result=execute_pack_path(pack,cfg,approved=True,report_telemetry=False); self.assertEqual(result["status"],"denied")
if __name__=="__main__":unittest.main()
