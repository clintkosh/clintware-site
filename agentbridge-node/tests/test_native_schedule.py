from agentbridge_node.native_schedule import NativeScheduleError, build_windows_task_spec


def test_hourly_task_uses_windows_task_scheduler_limited_privilege():
    spec = build_windows_task_spec("C:/Temp/task.json", 3600, task_name="Quillgeist-Test")
    assert spec["provider"] == "windows_task_scheduler"
    assert spec["schedule"] == "HOURLY"
    assert spec["modifier"] == 1
    assert spec["task_name"] == "Quillgeist-Test"
    assert "/RL" in spec["argv"]
    assert "LIMITED" in spec["argv"]
    assert " run " in spec["command"]


def test_minute_and_daily_cadences_map_without_cloud_dependency():
    minute = build_windows_task_spec("C:/Temp/task.json", 900, task_name="Q-Minute")
    daily = build_windows_task_spec("C:/Temp/task.json", 86400, task_name="Q-Daily")
    assert (minute["schedule"], minute["modifier"]) == ("MINUTE", 15)
    assert (daily["schedule"], daily["modifier"]) == ("DAILY", 1)
    assert "http" not in minute["command"].lower()
    assert "http" not in daily["command"].lower()


def test_unrepresentable_cadence_is_refused():
    try:
        build_windows_task_spec("C:/Temp/task.json", 61, task_name="Q-Bad")
    except NativeScheduleError as exc:
        assert "cannot be represented" in str(exc)
    else:
        raise AssertionError("61-second cadence should be refused")
