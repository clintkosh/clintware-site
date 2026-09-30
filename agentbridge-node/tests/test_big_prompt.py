import json

from agentbridge_node.big_prompt import plan_big_prompt


def settings():
    return {
        "max_depth": 3,
        "max_units": 32,
        "child_target_chars": 120,
        "child_complexity_threshold": 2,
        "max_children": 8,
        "prompt_planner": {
            "enabled": True,
            "threshold_chars": 10000,
            "complexity_threshold": 2,
            "step_target_chars": 160,
            "max_steps": 12,
            "auto_continue": True,
        },
    }


def test_big_prompt_recursively_breaks_work_into_ordered_units():
    prompt = (
        "Inspect the repository; then build the application; then test it; then fix failures; "
        "then verify the package; finally summarize the evidence."
    )
    plan = plan_big_prompt(prompt, settings(), project="demo", force=True)
    assert plan.mode == "qq_big_prompt"
    assert len(plan.units) > 2
    assert plan.units[0].depends_on == []
    for previous, current in zip(plan.units, plan.units[1:]):
        assert current.depends_on == [previous.id]
    assert any(unit.depth > 0 for unit in plan.units)


def test_external_actions_stay_behind_control_plane():
    prompt = "Deploy the release to Cloudflare, then send the customer an email. Finally verify current deployment status."
    plan = plan_big_prompt(prompt, settings(), force=True)
    lanes = {unit.lane for unit in plan.units}
    assert "control_plane_action" in lanes
    assert all(unit.broker == "mcp.clintware.com" for unit in plan.units if unit.lane.startswith("control_plane_"))


def test_local_build_work_prefers_qq():
    plan = plan_big_prompt("Build the source code, run tests, and package the result.", settings(), force=True)
    assert any(unit.lane == "qq_deterministic" for unit in plan.units)


def test_secret_shapes_are_redacted_from_plan():
    prompt = "Use Bearer abcdefghijklmnopqrstuvwxyz123456789 to deploy the project."
    plan = plan_big_prompt(prompt, settings(), force=True)
    rendered = json.dumps(plan.to_dict())
    assert "abcdefghijklmnopqrstuvwxyz123456789" not in rendered
    assert "[REDACTED_CREDENTIAL]" in rendered


def test_context_savings_estimate_is_nonnegative():
    prompt = (
        "Research the current release status; then compare the latest provider documentation; "
        "then build a local verification script; then summarize the result."
    )
    plan = plan_big_prompt(prompt, settings(), force=True)
    assert plan.avoided_remote_context_tokens_est >= 0
    assert plan.remote_units >= 1
    assert plan.local_units >= 1
