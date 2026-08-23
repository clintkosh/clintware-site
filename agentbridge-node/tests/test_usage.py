from agentbridge_node.config import Config
from agentbridge_node.usage import save_plan, snapshot


def test_usage_snapshot_and_plan_headroom(tmp_path, monkeypatch):
    monkeypatch.setenv("QUILLGEIST_HOME", str(tmp_path))
    cfg = Config.load()
    save_plan(cfg, {"provider": "Example", "plan_name": "Test", "unit": "tokens", "allowance": 1000, "used": 250})
    out = snapshot(Config.load())
    assert out["plans_summary"]["connected"] == 1
    assert out["plans_summary"]["normalized_remaining_pct"] == 75
    assert out["plans"][0]["source"] == "manual"
    assert out["consumption"]["external_consumption_pressure_pct"] == 0
