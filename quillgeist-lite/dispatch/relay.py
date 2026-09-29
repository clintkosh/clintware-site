import base64
import hashlib
import json
import os
import re
import socket
import ssl
import struct
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

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
    "browser-work": {"Action", "Url", "Selector", "Value", "StepsJson", "Query", "Engine", "MaxResults", "MaxChars", "Approved", "Headless", "WaitMs", "UserWaitMs"},
    "record-google-oauth-verification": set(),
    "open-edge-tab": {"Url"},
    "repair-codex-org-identity": set(),
    "local-ai": {"Action", "Model", "Prompt", "ContextTokens", "MaxTokens"},
    "storage-audit": {"ExpectedComputer", "LargestFiles"},
    "crm-astro-build": {"Action", "Project", "Manifest", "SkipInstall", "RepoRoot"},
    "bitnet-setup": set(),
    "local-ai-integrate": set(),
    "finish-local-ai": {"MaxPasses"},
    "restore-immich": set(),
    "share-ai-network": set(),
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
    last_error = None
    for attempt in range(5):
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
            message = str(parsed.get("message") or parsed.get("error") or "")
            transient = (
                e.code in (429, 500, 502, 503, 504)
                or str(parsed.get("error") or "") == "internal_error"
                or "Durable Object reset because its code was updated" in message
            )
            if transient and attempt < 4:
                wait = min(12, 2 ** attempt)
                print(f"AUTO_RECOVERY control_plane_transient attempt={attempt+1} wait={wait}s status={e.code}", flush=True)
                time.sleep(wait)
                continue
            return e.code, parsed
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last_error = str(e)
            if attempt < 4:
                wait = min(12, 2 ** attempt)
                print(f"AUTO_RECOVERY control_plane_network attempt={attempt+1} wait={wait}s reason={last_error}", flush=True)
                time.sleep(wait)
                continue
            return 599, {"error": "control_plane_unreachable", "message": last_error}
    return 599, {"error": "control_plane_unreachable", "message": last_error or "unknown"}

def create_job_with_settle(body, settle_seconds=120):
    deadline = time.time() + settle_seconds
    attempt = 0
    while True:
        attempt += 1
        status, payload = request_json("POST", "/api/v1/quillgeist-lite/jobs", body)
        if status in (200, 201, 202) and payload.get("ok"):
            return status, payload
        error = str(payload.get("error") or "")
        if error == "task_not_allowed" and time.time() < deadline:
            # A repo commit can start the dispatch workflow before the control-plane
            # deployment carrying the same reviewed task registry has finished.
            wait = min(15, 2 + attempt * 2)
            print(f"AUTO_RECOVERY task_registry_settling task={body.get('task_id','')} attempt={attempt} wait={wait}s", flush=True)
            time.sleep(wait)
            continue
        return status, payload


_WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

def _recv_exact(sock, count):
    data = bytearray()
    while len(data) < count:
        chunk = sock.recv(count - len(data))
        if not chunk:
            raise EOFError("websocket_closed")
        data.extend(chunk)
    return bytes(data)

def _send_ws_frame(sock, opcode, payload=b""):
    if isinstance(payload, str):
        payload = payload.encode("utf-8")
    first = 0x80 | (opcode & 0x0F)
    mask = os.urandom(4)
    length = len(payload)
    if length < 126:
        header = bytes([first, 0x80 | length])
    elif length < 65536:
        header = bytes([first, 0x80 | 126]) + struct.pack("!H", length)
    else:
        header = bytes([first, 0x80 | 127]) + struct.pack("!Q", length)
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    sock.sendall(header + mask + masked)

def _recv_ws_message(sock):
    fragments = bytearray()
    text_opcode = None
    while True:
        head = _recv_exact(sock, 2)
        b1, b2 = head[0], head[1]
        fin = bool(b1 & 0x80)
        opcode = b1 & 0x0F
        masked = bool(b2 & 0x80)
        length = b2 & 0x7F
        if length == 126:
            length = struct.unpack("!H", _recv_exact(sock, 2))[0]
        elif length == 127:
            length = struct.unpack("!Q", _recv_exact(sock, 8))[0]
        mask = _recv_exact(sock, 4) if masked else None
        payload = _recv_exact(sock, length) if length else b""
        if mask:
            payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        if opcode == 0x8:
            raise EOFError("websocket_close_frame")
        if opcode == 0x9:
            _send_ws_frame(sock, 0xA, payload)
            continue
        if opcode == 0xA:
            continue
        if opcode in (0x1, 0x2):
            fragments = bytearray(payload)
            text_opcode = opcode
        elif opcode == 0x0:
            fragments.extend(payload)
        else:
            continue
        if fin:
            if text_opcode == 0x1:
                return fragments.decode("utf-8", errors="replace")
            return bytes(fragments)

def _connect_job_stream(job_id):
    parsed = urlparse(CONTROL_PLANE)
    host = parsed.hostname
    if not host:
        raise RuntimeError("control_plane_host_missing")
    secure = parsed.scheme == "https"
    port = parsed.port or (443 if secure else 80)
    raw = socket.create_connection((host, port), timeout=30)
    sock = ssl.create_default_context().wrap_socket(raw, server_hostname=host) if secure else raw
    key = base64.b64encode(os.urandom(16)).decode("ascii")
    base_path = (parsed.path or "").rstrip("/")
    target = base_path + "/api/v1/quillgeist-lite/jobs/" + urllib.parse.quote(job_id, safe="") + "/stream"
    host_header = host if port in (80, 443) else f"{host}:{port}"
    request = (
        f"GET {target} HTTP/1.1\r\n"
        f"Host: {host_header}\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        "Sec-WebSocket-Version: 13\r\n"
        f"Authorization: Bearer {TOKEN}\r\n"
        "User-Agent: clintware-quillgeist-lite-relay\r\n"
        "\r\n"
    ).encode("ascii")
    sock.sendall(request)
    header = bytearray()
    while b"\r\n\r\n" not in header:
        if len(header) > 65536:
            sock.close()
            raise RuntimeError("websocket_handshake_too_large")
        chunk = sock.recv(1)
        if not chunk:
            sock.close()
            raise RuntimeError("websocket_handshake_closed")
        header.extend(chunk)
    text = header.decode("iso-8859-1", errors="replace")
    status_line = text.split("\r\n", 1)[0]
    if " 101 " not in status_line:
        sock.close()
        raise RuntimeError("websocket_upgrade_failed:" + status_line)
    headers = {}
    for line in text.split("\r\n")[1:]:
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        headers[k.strip().lower()] = v.strip()
    expected = base64.b64encode(hashlib.sha1((key + _WS_GUID).encode("ascii")).digest()).decode("ascii")
    if headers.get("sec-websocket-accept") != expected:
        sock.close()
        raise RuntimeError("websocket_accept_invalid")
    sock.settimeout(75)
    return sock

def stream_job_events(job_id, max_seconds=1800):
    deadline = time.time() + max_seconds
    last_seq = 0
    attempts = 0
    last_error = None
    while time.time() < deadline:
        sock = None
        try:
            sock = _connect_job_stream(job_id)
            print(f"EVENT_STREAM_CONNECTED job={job_id}", flush=True)
            attempts = 0
            while time.time() < deadline:
                try:
                    raw = _recv_ws_message(sock)
                except socket.timeout:
                    _send_ws_frame(sock, 0x9, b"qq-relay")
                    continue
                event = json.loads(raw)
                if str(event.get("job_id") or "") != job_id:
                    continue
                kind = str(event.get("event") or "")
                if kind == "snapshot":
                    job = event.get("job") or {}
                    for row in job.get("logs") or []:
                        seq = int(row.get("seq") or 0)
                        if seq > last_seq:
                            print(f"[{row.get('timestamp','')}] {row.get('line','')}", flush=True)
                            last_seq = max(last_seq, seq)
                    state = str(job.get("status") or "unknown")
                    print(f"EVENT snapshot status={state}", flush=True)
                    if state in {"passed", "failed"}:
                        return job, "websocket-snapshot"
                    continue
                if kind == "ack":
                    print(f"EVENT ack device={event.get('device_id','')} status={event.get('status','running')}", flush=True)
                    continue
                if kind == "log":
                    row = event.get("log") or {}
                    seq = int(row.get("seq") or 0)
                    if seq > last_seq:
                        print(f"[{row.get('timestamp','')}] {row.get('line','')}", flush=True)
                        last_seq = max(last_seq, seq)
                    continue
                if kind == "result":
                    result = event.get("result") or {}
                    return {
                        "job_id": job_id,
                        "task_id": result.get("task_id"),
                        "status": event.get("status") or result.get("status"),
                        "completed_at": event.get("completed_at"),
                        "result": result,
                    }, "websocket-event"
        except Exception as e:
            last_error = str(e)
            attempts += 1
            wait = min(10, max(1, 2 ** min(attempts - 1, 3)))
            print(f"EVENT_STREAM_RECONNECT job={job_id} attempt={attempts} reason={last_error}", flush=True)
            time.sleep(wait)
        finally:
            if sock:
                try:
                    sock.close()
                except Exception:
                    pass
    raise TimeoutError("timed_out_waiting_for_event_stream:" + job_id + (":" + last_error if last_error else ""))

def wait_for_job(job_id, max_seconds=1800):
    try:
        return stream_job_events(job_id, max_seconds=max_seconds)
    except Exception as event_error:
        print(f"EVENT_STREAM_FALLBACK reason={event_error}", flush=True)
        deadline = time.time() + max_seconds
        last_seq = 0
        while time.time() < deadline:
            status_code, payload = request_json("GET", f"/api/v1/quillgeist-lite/jobs/{job_id}")
            if status_code == 200 and payload.get("ok"):
                current = payload.get("job") or {}
                for row in current.get("logs") or []:
                    seq = int(row.get("seq") or 0)
                    if seq > last_seq:
                        print(f"[{row.get('timestamp','')}] {row.get('line','')}", flush=True)
                        last_seq = max(last_seq, seq)
                if str(current.get("status") or "") in {"passed", "failed"}:
                    return current, "bounded-fallback"
            time.sleep(8)
        raise TimeoutError(f"timed_out_waiting_for_job:{job_id}")

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
    if ("start-process" in line and ("fail" in line or "error" in line)) or "microsoft edge executable not found" in line:
        return "browser_launch_failed"
    if "is not recognized as a name of a cmdlet" in line or "commandnotfoundexception" in line:
        return "command_not_found"
    if "cannot validate argument" in line and ("null or empty" in line or "cannot convert null" in line):
        return "invalid_local_path"
    if "could not refresh reviewed" in line or "reviewed task source failed" in line:
        return "runtime_source_refresh_failed"
    if "timed out" in line or "timeout" in line:
        return "timeout"
    if "connection error" in line or "websocket" in line:
        return "connection_error"
    if "cannot find the file specified" in line:
        return "file_not_found"
    if "service" in line and ("missing" in line or "not installed" in line):
        return "service_missing"
    return "other"

RECOVERABLE_TASK_FAILURES = {
    "browser_launch_failed",
    "command_not_found",
    "invalid_local_path",
    "file_not_found",
    "runtime_bundle_missing",
    "runtime_source_refresh_failed",
    "task_registry_missing",
    "health_service_missing",
    "service_missing",
    "managed_task_missing",
}
NO_AUTORETRY_TASKS = {
    "self-update",
    "repair-local-service",
    "restart-window",
    "browser-work",
    "finish-google-oauth",
    "google-cloud-support-access",
}

def auto_recover_failed_task(task_id, args, objective, target_device, state, result):
    history = []
    if state != "failed" or task_id in NO_AUTORETRY_TASKS:
        return None, history
    output = str(result.get("output") or "")
    kind = error_kind(output)
    if kind not in RECOVERABLE_TASK_FAILURES:
        return None, history

    chain = ["self-update"]
    if kind in {"health_service_missing", "service_missing", "managed_task_missing"}:
        chain = ["repair-local-service", "self-update"]

    print(f"AUTO_RECOVERY task_failure kind={kind} task={task_id} device={target_device or 'auto'}", flush=True)
    for repair_task in chain:
        repair_body = {
            "task_id": repair_task,
            "args": {},
            "objective": f"Autonomous QQ recovery for {task_id}: {kind}",
            "target_device": target_device,
            "resume_after": False,
        }
        status, created = create_job_with_settle(repair_body, settle_seconds=90)
        if status not in (200, 201, 202) or not created.get("ok"):
            history.append({"task": repair_task, "status": "dispatch_failed", "error": scrub(created)})
            return None, history
        repair_job, repair_transport = wait_for_job(created["job_id"], max_seconds=900)
        repair_result = repair_job.get("result") or {}
        repair_state = str(repair_job.get("status") or "unknown")
        history.append({
            "task": repair_task,
            "job_id": created.get("job_id"),
            "status": repair_state,
            "exit_code": repair_result.get("exit_code"),
            "transport": repair_transport,
        })
        if repair_state != "passed":
            return None, history
        if repair_task == "self-update":
            # self-update delivers its result before the canonical runner restart.
            time.sleep(12)

    retry_body = {
        "task_id": task_id,
        "args": args,
        "objective": objective,
        "target_device": target_device,
        "resume_after": False,
    }
    status, retry_created = create_job_with_settle(retry_body, settle_seconds=120)
    if status not in (200, 201, 202) or not retry_created.get("ok"):
        history.append({"task": task_id, "status": "retry_dispatch_failed", "error": scrub(retry_created)})
        return None, history
    retry_job, retry_transport = wait_for_job(retry_created["job_id"], max_seconds=1800)
    retry_result = retry_job.get("result") or {}
    retry_state = str(retry_job.get("status") or "unknown")
    history.append({
        "task": task_id,
        "job_id": retry_created.get("job_id"),
        "status": retry_state,
        "exit_code": retry_result.get("exit_code"),
        "transport": retry_transport,
        "retry": True,
    })
    return {
        "job_id": retry_created["job_id"],
        "job": retry_job,
        "transport": retry_transport,
        "created": retry_created,
    }, history

if req.get("mode") == "checkin":
    target_device = str(req.get("target_device") or "")
    action = str(req.get("action") or "status")
    force = bool(req.get("force", False))
    if not target_device:
        raise SystemExit("target_device_required")
    if action not in {"status", "restart_runner"}:
        raise SystemExit("invalid_checkin_action")
    request_id = str(req.get("request_id") or "")
    code, created = request_json("POST", "/api/v1/quillgeist-lite/check-in", {
        "request_id": request_id,
        "target_device": target_device,
        "action": action,
        "force": force,
    })
    if code not in (200, 201, 202) or not created.get("ok"):
        write_result({
            "request_id": request_id,
            "mode": "checkin",
            "target_device": target_device,
            "action": action,
            "status": "dispatch_failed",
            "response": scrub(created),
            "recorded_at": int(time.time()),
        })
        raise SystemExit("checkin_dispatch_failed")
    checkin_id = str(created.get("request_id") or request_id)
    latest = created
    deadline = time.time() + int(req.get("verify_seconds") or 45)
    while time.time() < deadline:
        code2, payload = request_json("GET", "/api/v1/quillgeist-lite/check-in/" + checkin_id)
        if code2 == 200 and payload.get("ok"):
            latest = payload
            if str((payload.get("checkin") or {}).get("status") or "") == "replied":
                break
        time.sleep(1)
    row = latest.get("checkin") or latest
    write_result({
        "request_id": request_id,
        "mode": "checkin",
        "target_device": target_device,
        "action": action,
        "force": force,
        "status": row.get("status"),
        "delivered": row.get("delivered"),
        "reply": row.get("reply"),
        "recorded_at": int(time.time()),
    })
    print("CHECKIN_RESULT " + json.dumps(row, indent=2), flush=True)
    sys.exit(0)

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

job_request = {
    "task_id": task_id,
    "args": args,
    "objective": str(req.get("objective") or ""),
    "target_device": str(req.get("target_device") or ""),
    "resume_after": bool(req.get("resume_after", False)),
}
status, created = create_job_with_settle(job_request)
print(json.dumps(created, indent=2), flush=True)
if status not in (200, 201, 202) or not created.get("ok"):
    raise SystemExit("dispatch_failed")

job_id = created["job_id"]
print(f"JOB_ID={job_id}", flush=True)
job, confirmation_transport = wait_for_job(job_id, max_seconds=1800)

state = str(job.get("status") or "unknown")
result = job.get("result") or {}
confirmation_source = str(result.get("confirmation_source") or "")
confirmed_device = str(result.get("device_id") or created.get("target_device") or "")
if state not in {"passed", "failed"}:
    raise SystemExit(f"event_stream_ended_without_final_state:{job_id}:{state}")
if not confirmation_source.startswith("qq-local-agent"):
    raise SystemExit(f"final_state_missing_local_agent_confirmation:{job_id}")

recovery_history = []
recovered, recovery_history = auto_recover_failed_task(
    task_id,
    args,
    str(req.get("objective") or ""),
    confirmed_device or str(req.get("target_device") or ""),
    state,
    result,
)
if recovered:
    job_id = recovered["job_id"]
    job = recovered["job"]
    confirmation_transport = recovered["transport"]
    created = recovered["created"]
    state = str(job.get("status") or "unknown")
    result = job.get("result") or {}
    confirmation_source = str(result.get("confirmation_source") or "")
    confirmed_device = str(result.get("device_id") or created.get("target_device") or confirmed_device)
    if not confirmation_source.startswith("qq-local-agent"):
        raise SystemExit(f"recovered_final_state_missing_local_agent_confirmation:{job_id}")
    print(f"AUTO_RECOVERY_COMPLETE task={task_id} final_status={state}", flush=True)

print("", flush=True)
print(f"FINAL_STATUS={state}", flush=True)
print(f"CONFIRMATION_SOURCE={confirmation_source}", flush=True)
print(f"CONFIRMATION_TRANSPORT={confirmation_transport}", flush=True)
print(f"CONFIRMED_DEVICE={confirmed_device}", flush=True)
print(f"EXIT_CODE={result.get('exit_code')}", flush=True)
print(f"DURATION_MS={result.get('duration_ms')}", flush=True)
output = str(result.get("output") or "")
write_result({
    "request_id": req.get("request_id"),
    "job_id": job_id,
    "task_id": task_id,
    "target_device": confirmed_device,
    "status": state,
    "exit_code": result.get("exit_code"),
    "duration_ms": result.get("duration_ms"),
    "confirmation_source": confirmation_source,
    "confirmation_transport": confirmation_transport,
    "confirmed_at": result.get("confirmed_at") or job.get("completed_at"),
    "recorded_at": int(time.time()),
    "recovery_history": recovery_history,
    "output_tail": scrub(output),
})
if output:
    print("--- FINAL OUTPUT ---", flush=True)
    print(output[-20000:], flush=True)
# A local task failure is diagnostic evidence. The relay itself remains usable
# so another request can be dispatched immediately by the model.
sys.exit(0)
