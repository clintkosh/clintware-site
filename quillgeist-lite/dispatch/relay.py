import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

CONTROL_PLANE = os.environ.get("CONTROL_PLANE", "https://mcp.clintware.com").rstrip("/")
TOKEN = os.environ.get("CONTROL_PLANE_MCP_TOKEN", "")
REQUEST_FILE = os.environ.get("REQUEST_FILE", "quillgeist-lite/dispatch/request.json")
RESULT_FILE = os.environ.get("RESULT_FILE", "quillgeist-lite/dispatch/result.json")

ALLOWED = {
    "clintware-doctor": set(),
    "google-cloud-support-access": {"OwnerAccount", "SupportAccount", "ProjectName"},
    "finish-google-oauth": {"Repo"},
    "python-runtime-check": {"Message"},
    "c-runtime-check": {"Message"},
    "ensure-c-runtime": set(),
    "ensure-powershell": set(),
    "update-powerchatbridge": set(),
    "self-update": set(),
    "self-heal": set(),
    "browser-setup": set(),
    "install-desktop-app": {"NoLaunch"},
    "browser-work": {"Action", "Url", "Selector", "Value", "StepsJson", "Query", "Engine", "MaxResults", "MaxChars", "Approved", "Headless", "WaitMs"},
    "open-edge-tab": {"Url"},
    "local-ai": {"Action", "Model", "Prompt", "ContextTokens", "MaxTokens"},
    "bitnet-setup": set(),
    "local-ai-integrate": set(),
    "finish-local-ai": {"MaxPasses"},
    "responder-agent": {"Action"},
    "restart-window": set(),
    "repair-local-service": set(),
    "apply-terminal-glass": set(),
    "connect-jira": set(),
    "enable-admin-console": set(),
    "bootstrap-admin-console": set(),
    "gimp-clintware-eclipse": set(),
    "dedupe-qq-windows": set(),
}

def request_json(method, path, body=None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        CONTROL_PLANE + path,
        data=data,
        method=method,
        headers={
            "Authorization": "Bearer " + TOKEN,
            "Content-Type": "application/json",
            "User-Agent": "clintware-quillgeist-lite-relay",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        payload = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(payload)
        except Exception:
            parsed = {"error": payload}
        return e.code, parsed

def scrub(value):
    text = str(value or "")
    patterns = [
        r"(?i)(client_secret|refresh_token|access_token|authorization|api[_-]?key|password)\s*[:=]\s*([^\s,;]+)",
        r"gh[pousr]_[A-Za-z0-9_]{20,}",
        r"github_pat_[A-Za-z0-9_]{20,}",
        r"ya29\.[A-Za-z0-9._-]+",
    ]
    for pattern in patterns:
        if pattern.startswith("(?i)"):
            text = re.sub(pattern, r"\1=[REDACTED]", text)
        else:
            text = re.sub(pattern, "[REDACTED]", text)
    return text[-30000:]


def write_result(value):
    os.makedirs(os.path.dirname(RESULT_FILE), exist_ok=True)
    temp = RESULT_FILE + ".new"
    with open(temp, "w", encoding="utf-8") as handle:
        json.dump(value, handle, indent=2)
        handle.write("\n")
    os.replace(temp, RESULT_FILE)


if not TOKEN:
    raise SystemExit("CONTROL_PLANE_MCP_TOKEN is missing")

with open(REQUEST_FILE, "r", encoding="utf-8") as f:
    req = json.load(f)

def error_kind(message):
    line = str(message or "").lower()
    if "workers_ai_responder_passed" in line:
        return "workers_ai_responder_passed"
    if "workers_ai_responder_failed" in line:
        return "workers_ai_responder_failed"
    if "task registry" in line:
        return "task_registry_missing"
    if "health service is not installed" in line:
        return "health_service_missing"
    if "scheduled task" in line and ("missing" in line or "cannot find" in line):
        return "managed_task_missing"
    if "packaged" in line and ("missing" in line or "not found" in line):
        return "runtime_bundle_missing"
    if "enrollment" in line and ("timed out" in line or "timeout" in line):
        return "device_enrollment_timeout"
    if "address already in use" in line or "only one usage of each socket address" in line:
        return "local_listener_conflict"
    if "unauthorizedaccessexception" in line or "access is denied" in line:
        return "local_access_denied"
    if "401" in line and ("websocket" in line or "server returned" in line or "status code" in line):
        return "websocket_401"
    if "start-process" in line and ("fail" in line or "error" in line):
        return "browser_launch_failed"
    if "timed out" in line or "timeout" in line:
        return "timeout"
    if "connection error" in line or "websocket" in line:
        return "connection_error"
    if "cannot find the file specified" in line:
        return "file_not_found"
    if "service" in line and ("missing" in line or "not installed" in line):
        return "service_missing"
    return "other"

if req.get("mode") == "inspect":
    code, payload = request_json("GET", "/api/v1/quillgeist-lite/status")
    if code != 200 or not payload.get("ok"):
        raise SystemExit("status_inspection_failed")
    diagnostics = payload.get("diagnostics") or []
    jobs = payload.get("jobs") or []
    public = {
        "online": payload.get("online"),
        "recovery_online": payload.get("recovery_online"),
        "wake_online": payload.get("wake_online"),
        "recovery": payload.get("recovery"),
        "runner_version": (payload.get("runner") or {}).get("version"),
        "runner_last_seen": (payload.get("runner") or {}).get("last_seen"),
        "runner": payload.get("runner"),
        "connected_devices": payload.get("connected_devices") or [],
        "service_devices": payload.get("service_devices") or [],
        "jobs": [
            {"job_id": row.get("job_id"), "task_id": row.get("task_id"), "target_device": row.get("target_device"), "status": row.get("status")}
            for row in jobs[:12]
        ],
        "diagnostics": [
            {"device_id": row.get("device_id"), "level": row.get("level"), "phase": row.get("phase"), "kind": error_kind(row.get("message")),
             "message": scrub(row.get("message")), "timestamp": row.get("timestamp")}
            for row in diagnostics[:12]
        ],
    }
    job_id = str(req.get("job_id") or "")
    if job_id and len(job_id) <= 120:
        code, item = request_json("GET", "/api/v1/quillgeist-lite/jobs/" + job_id)
        if code == 200 and item.get("ok"):
            row = item.get("job") or {}
            result = row.get("result") or {}
            recent_logs = row.get("logs") or []
            public["selected_job"] = {
                "job_id": row.get("job_id"), "task_id": row.get("task_id"),
                "status": row.get("status"), "requested_by": row.get("requested_by"),
                "created_at": row.get("created_at"), "completed_at": row.get("completed_at"),
                "duration_ms": result.get("duration_ms"), "exit_code": result.get("exit_code"),
                "error_kind": error_kind(result.get("output")),
                "recent_logs": [
                    {
                        "seq": log.get("seq"),
                        "phase": log.get("phase"),
                        "timestamp": log.get("timestamp"),
                        "line": scrub(log.get("line")),
                    }
                    for log in recent_logs[-30:]
                ],
            }
    write_result({
        "request_id": req.get("request_id"),
        "mode": "inspect",
        "recorded_at": int(time.time()),
        "inspection": public,
    })
    print("INSPECT_OK " + json.dumps(public, indent=2), flush=True)
    sys.exit(0)


if req.get("mode") == "rollout":
    task_id = str(req.get("task_id") or "self-update")
    args = req.get("args") or {}
    if task_id not in ALLOWED:
        raise SystemExit(f"task_not_allowed: {task_id!r}")
    if not isinstance(args, dict):
        raise SystemExit("args must be an object")
    unknown = set(args) - ALLOWED[task_id]
    if unknown:
        raise SystemExit(f"argument_not_allowed: {sorted(unknown)}")

    status, created = request_json("POST", "/api/v1/quillgeist-lite/rollout", {
        "task_id": task_id,
        "args": args,
        "objective": str(req.get("objective") or ""),
        "resume_after": bool(req.get("resume_after", True)),
    })
    print(json.dumps(created, indent=2), flush=True)
    if status not in (200, 201, 202) or not created.get("ok"):
        raise SystemExit("rollout_dispatch_failed")

    jobs = [row for row in (created.get("jobs") or []) if row.get("ok") and row.get("job_id")]
    states = {row["job_id"]: {"target_device": row.get("target_device"), "status": "queued"} for row in jobs}
    deadline = time.time() + int(req.get("verify_seconds") or 240)
    last_printed = {}
    while time.time() < deadline and jobs:
        all_done = True
        for row in jobs:
            job_id = row["job_id"]
            code, payload = request_json("GET", f"/api/v1/quillgeist-lite/jobs/{job_id}")
            if code != 200 or not payload.get("ok"):
                all_done = False
                continue
            job = payload.get("job") or {}
            state = str(job.get("status") or "unknown")
            result = job.get("result") or {}
            states[job_id] = {
                "job_id": job_id,
                "target_device": row.get("target_device"),
                "status": state,
                "exit_code": result.get("exit_code"),
                "duration_ms": result.get("duration_ms"),
                "output_tail": scrub(result.get("output")) if state in {"passed", "failed"} else "",
            }
            if last_printed.get(job_id) != state:
                print(f"ROLLOUT {row.get('target_device')} {job_id} {state}", flush=True)
                last_printed[job_id] = state
            if state not in {"passed", "failed"}:
                all_done = False
        if all_done:
            break
        time.sleep(4)

    summary = {
        "request_id": req.get("request_id"),
        "mode": "rollout",
        "task_id": task_id,
        "runtime_version": created.get("runtime_version"),
        "registered_devices": created.get("devices"),
        "jobs": list(states.values()),
        "recorded_at": int(time.time()),
    }
    write_result(summary)
    completed = sum(1 for row in states.values() if row.get("status") in {"passed", "failed"})
    passed = sum(1 for row in states.values() if row.get("status") == "passed")
    pending = sum(1 for row in states.values() if row.get("status") not in {"passed", "failed"})
    print(f"ROLLOUT_SUMMARY registered={created.get('devices')} completed={completed} passed={passed} pending={pending}", flush=True)
    sys.exit(0)

task_id = str(req.get("task_id") or "")
args = req.get("args") or {}
if task_id not in ALLOWED:
    raise SystemExit(f"task_not_allowed: {task_id!r}")
if not isinstance(args, dict):
    raise SystemExit("args must be an object")

unknown = set(args) - ALLOWED[task_id]
if unknown:
    raise SystemExit(f"argument_not_allowed: {sorted(unknown)}")

print(f"REQUEST_OK task={task_id} request_id={req.get('request_id','')}", flush=True)

status, created = request_json("POST", "/api/v1/quillgeist-lite/jobs", {
    "task_id": task_id,
    "args": args,
    "objective": str(req.get("objective") or ""),
    "target_device": str(req.get("target_device") or ""),
    "resume_after": bool(req.get("resume_after", False)),
})
print(json.dumps(created, indent=2), flush=True)
if status not in (200, 201, 202) or not created.get("ok"):
    raise SystemExit("dispatch_failed")

job_id = created["job_id"]
print(f"JOB_ID={job_id}", flush=True)

last_seq = 0
for _ in range(900):
    status_code, payload = request_json("GET", f"/api/v1/quillgeist-lite/jobs/{job_id}")
    if status_code != 200:
        print(json.dumps(payload, indent=2), flush=True)
        time.sleep(2)
        continue

    job = payload.get("job") or {}
    logs = job.get("logs") or []
    for row in logs:
        seq = int(row.get("seq") or 0)
        if seq > last_seq:
            print(f"[{row.get('timestamp','')}] {row.get('line','')}", flush=True)
            last_seq = max(last_seq, seq)

    state = str(job.get("status") or "unknown")
    if state in {"passed", "failed"}:
        result = job.get("result") or {}
        print("", flush=True)
        print(f"FINAL_STATUS={state}", flush=True)
        print(f"EXIT_CODE={result.get('exit_code')}", flush=True)
        print(f"DURATION_MS={result.get('duration_ms')}", flush=True)
        output = str(result.get("output") or "")
        write_result({
            "request_id": req.get("request_id"),
            "job_id": job_id,
            "task_id": task_id,
            "status": state,
            "exit_code": result.get("exit_code"),
            "duration_ms": result.get("duration_ms"),
            "recorded_at": int(time.time()),
            "output_tail": scrub(output),
        })
        if output:
            print("--- FINAL OUTPUT ---", flush=True)
            print(output[-20000:], flush=True)
        # A local task failure is diagnostic evidence. The relay itself remains usable
        # so another request can be dispatched immediately by the model.
        sys.exit(0)

    time.sleep(2)

raise SystemExit(f"timed_out_waiting_for_job:{job_id}")
