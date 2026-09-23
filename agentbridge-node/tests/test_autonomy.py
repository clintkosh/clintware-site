from agentbridge_node.autonomy import IntentError, compile_intent


def test_http_intent_compiles_with_retry_and_schedule():
    result = compile_intent(
        "Check https://clintware.com every hour and make sure it is available",
        autonomy="safe",
    )
    assert result.intent_type == "http_health"
    assert result.schedule_seconds == 3600
    assert "Invoke-WebRequest" in result.powershell
    assert "E3 EXAMINE" in result.powershell
    assert result.manifest["permissions"] == ["process.run"]


def test_managed_service_can_repair_but_requires_admin_policy():
    result = compile_intent("Ensure service Spooler is running", autonomy="managed")
    assert result.intent_type == "windows_service"
    assert "Start-Service" in result.powershell
    assert "admin" in result.manifest["permissions"]
    assert result.manifest["steps"][0]["admin"] is True


def test_recommend_service_does_not_change_state():
    result = compile_intent("Check service Spooler is running", autonomy="recommend")
    assert "Start-Service" not in result.powershell
    assert "admin" not in result.manifest["permissions"]


def test_git_sync_is_fast_forward_only():
    result = compile_intent(r"Sync git repo C:\Projects\clintware", autonomy="managed")
    assert result.intent_type == "git_repository"
    assert "git pull --ff-only" in result.powershell
    assert "reset --hard" not in result.powershell.lower()
    assert "git push" not in result.powershell.lower()


def test_directory_repair_is_bounded_to_explicit_directory():
    result = compile_intent(r"Ensure folder C:\Temp\Quillgeist exists", autonomy="managed")
    assert result.intent_type == "directory_state"
    assert "New-Item -ItemType Directory" in result.powershell
    assert "file.write" in result.manifest["permissions"]
    assert "Remove-Item" not in result.powershell


def test_explicit_powershell_is_preserved():
    result = compile_intent("PowerShell: Write-Output 'hello'", autonomy="recommend")
    assert result.intent_type == "explicit_powershell"
    assert "Write-Output 'hello'" in result.powershell


def test_ambiguous_intent_refuses_to_invent_commands():
    try:
        compile_intent("Make my computer better", autonomy="autonomous")
    except IntentError as exc:
        assert "outside the deterministic compiler" in str(exc)
    else:
        raise AssertionError("ambiguous intent should not compile")


def test_schedule_under_one_minute_is_refused():
    try:
        compile_intent("Check https://clintware.com every 10 seconds", autonomy="safe")
    except IntentError as exc:
        assert "at least 60 seconds" in str(exc)
    else:
        raise AssertionError("too-frequent schedule should be refused")
