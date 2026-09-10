from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
import json
import re
import uuid

from .pack import ExecutionPack


URL_RE = re.compile(r"https?://[^\s<>'\"]+", re.I)
SCHEDULE_RE = re.compile(
    r"\bevery\s+(?:(\d+)\s*)?(second|minute|hour|day|week)s?\b|\b(hourly|daily|weekly)\b",
    re.I,
)
WINDOWS_PATH_RE = re.compile(r"(?P<path>[A-Za-z]:\\(?:[^<>:\"/|?*\r\n]+\\?)+)")
QUOTED_RE = re.compile(r"""(?P<q>[\"'])(?P<value>.+?)(?P=q)""")
SERVICE_RE = re.compile(r"\bservice\s+(?:named\s+)?[\"']?([A-Za-z0-9_. -]+?)[\"']?(?=\s+(?:is|stays|stay|running|and|$)|[.,;]|$)", re.I)
PROCESS_RE = re.compile(r"\bprocess\s+(?:named\s+)?[\"']?([A-Za-z0-9_.-]+)[\"']?", re.I)

AUTONOMY_LEVELS = ("observe", "recommend", "safe", "managed", "autonomous")


class IntentError(ValueError):
    pass


@dataclass
class CompiledIntent:
    id: str
    intent: str
    intent_type: str
    confidence: float
    autonomy: str
    workspace: str
    schedule_seconds: int | None
    powershell: str
    manifest: dict
    understanding: list[str]
    boundaries: list[str]

    def to_dict(self) -> dict:
        return asdict(self)

    def execution_pack(self) -> ExecutionPack:
        return ExecutionPack(dict(self.manifest), {})


def _ps_quote(value: str) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def _extract_schedule(text: str) -> tuple[str, int | None]:
    match = SCHEDULE_RE.search(text)
    if not match:
        return text.strip(), None
    if match.group(3):
        seconds = {"hourly": 3600, "daily": 86400, "weekly": 604800}[match.group(3).lower()]
    else:
        amount = int(match.group(1) or 1)
        unit = match.group(2).lower()
        multiplier = {"second": 1, "minute": 60, "hour": 3600, "day": 86400, "week": 604800}[unit]
        seconds = amount * multiplier
    if seconds < 60:
        raise IntentError("Local schedules must be at least 60 seconds apart.")
    cleaned = (text[:match.start()] + " " + text[match.end():]).strip(" ,.;")
    return re.sub(r"\s{2,}", " ", cleaned), seconds


def _explicit_powershell(text: str) -> str | None:
    fence = re.search(r"```(?:powershell|pwsh|ps1)\s*\n([\s\S]*?)\n```", text, re.I)
    if fence:
        return fence.group(1).strip()
    marker = re.search(r"\bpowershell\s*:\s*([\s\S]+)$", text, re.I)
    return marker.group(1).strip() if marker else None


def _path_from_text(text: str) -> str | None:
    match = WINDOWS_PATH_RE.search(text)
    if match:
        return match.group("path").rstrip("\\")
    for match in QUOTED_RE.finditer(text):
        value = match.group("value")
        if "\\" in value or "/" in value:
            return value
    return None


def _base_manifest(intent_id: str, title: str, workspace: str, permissions: list[str]) -> dict:
    return {
        "agentbridge": "1.0",
        "id": intent_id,
        "title": title,
        "workspace": workspace,
        "permissions": sorted(set(permissions)),
        "steps": [],
        "definition_of_done": [],
        "approval": {"default": "ask"},
        "max_runtime_seconds": 300,
        "quillgeist_intent": {"compiler": "deterministic-v1"},
    }


def _indent(text: str, spaces: int) -> str:
    prefix = " " * spaces
    return "\n".join(prefix + line if line else line for line in text.splitlines())


def _retry_wrapper(body: str, attempts: int = 3, delay_seconds: int = 2) -> str:
    return f"""$ErrorActionPreference = 'Stop'
$attempt = 0
$lastError = $null
while ($attempt -lt {attempts}) {{
  $attempt++
  try {{
{_indent(body, 4)}
    Write-Output ("E3 PASS attempt=" + $attempt)
    exit 0
  }} catch {{
    $lastError = $_
    Write-Output ("E3 EXAMINE attempt=" + $attempt + " error=" + $_.Exception.Message)
    if ($attempt -lt {attempts}) {{ Start-Sleep -Seconds {delay_seconds} }}
  }}
}}
throw $lastError
"""


def _compile_http(intent_id: str, text: str, workspace: str, autonomy: str, url: str) -> CompiledIntent:
    url = url.rstrip(".,);]")
    q = _ps_quote(url)
    body = f"""$r = Invoke-WebRequest -UseBasicParsing -Uri {q} -Method Get -TimeoutSec 20
if ($r.StatusCode -lt 200 -or $r.StatusCode -ge 400) {{ throw "HTTP status $($r.StatusCode)" }}
Write-Output ("HTTP " + $r.StatusCode + " " + {q})"""
    ps = _retry_wrapper(body, attempts=3 if autonomy in {"safe", "managed", "autonomous"} else 1)
    manifest = _base_manifest(intent_id, f"Check {url}", workspace, ["process.run"])
    manifest["steps"] = [{"type": "run", "runtime": "powershell", "command": ps, "timeout": 90}]
    manifest["definition_of_done"] = [{
        "type": "command", "runtime": "powershell",
        "command": f"$r=Invoke-WebRequest -UseBasicParsing -Uri {q} -Method Get -TimeoutSec 20; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 400){{exit 0}}; exit 2",
        "expect_exit": 0, "label": "Endpoint responds with HTTP 2xx/3xx"
    }]
    return CompiledIntent(intent_id, text, "http_health", 0.98, autonomy, workspace, None, ps, manifest,
        [f"Target endpoint: {url}", "Goal: verify successful HTTP response", "E3: retry transient failures locally"],
        ["Quillgeist can retry and diagnose the local request path; it will not pretend to repair a remote server."])


def _compile_service(intent_id: str, text: str, workspace: str, autonomy: str, service: str) -> CompiledIntent:
    service = service.strip(" .,'\"")
    q = _ps_quote(service)
    can_repair = autonomy in {"managed", "autonomous"}
    repair = f"""
if ($svc.Status -ne 'Running') {{
  Write-Output "E3 EVOLVE starting stopped service"
  Start-Service -Name {q}
  $svc = Get-Service -Name {q}
}}""" if can_repair else ""
    body = f"""$svc = Get-Service -Name {q} -ErrorAction Stop
Write-Output ("E3 EXAMINE service=" + $svc.Name + " status=" + $svc.Status){repair}
if ($svc.Status -ne 'Running') {{ throw "Service is not running: $($svc.Status)" }}
Write-Output ("SERVICE RUNNING " + $svc.Name)"""
    ps = _retry_wrapper(body, attempts=2 if can_repair else 1, delay_seconds=2)
    perms = ["process.run"] + (["admin"] if can_repair else [])
    manifest = _base_manifest(intent_id, f"Ensure service {service} is running", workspace, perms)
    manifest["steps"] = [{"type": "run", "runtime": "powershell", "command": ps, "timeout": 60, "admin": can_repair}]
    manifest["definition_of_done"] = [{
        "type": "command", "runtime": "powershell",
        "command": f"if((Get-Service -Name {q} -ErrorAction Stop).Status -eq 'Running'){{exit 0}}; exit 2",
        "expect_exit": 0, "label": f"Service {service} is running"
    }]
    action = "start it if stopped, then verify again" if can_repair else "observe only; do not change service state"
    return CompiledIntent(intent_id, text, "windows_service", 0.96, autonomy, workspace, None, ps, manifest,
        [f"Windows service: {service}", f"Goal: {action}", "E3: examine actual service state after action"],
        ["Service repair is only enabled at managed/autonomous level and still passes through Quillgeist local admin/process policy."])


def _compile_process(intent_id: str, text: str, workspace: str, autonomy: str, process: str) -> CompiledIntent:
    process = process.strip(" .,'\"")
    q = _ps_quote(process.removesuffix(".exe"))
    can_repair = autonomy in {"managed", "autonomous"} and bool(re.search(r"\b(?:start|ensure|keep)\b", text, re.I))
    start = f"""
if (-not $p) {{
  Write-Output "E3 EVOLVE starting missing process"
  Start-Process -FilePath {_ps_quote(process)}
  Start-Sleep -Seconds 1
  $p = Get-Process -Name {q} -ErrorAction SilentlyContinue
}}""" if can_repair else ""
    body = f"""$p = Get-Process -Name {q} -ErrorAction SilentlyContinue
Write-Output ("E3 EXAMINE process=" + {q} + " running=" + [bool]$p){start}
if (-not $p) {{ throw "Process is not running" }}
Write-Output ("PROCESS RUNNING " + {q})"""
    ps = _retry_wrapper(body, attempts=2 if can_repair else 1)
    manifest = _base_manifest(intent_id, f"Check process {process}", workspace, ["process.run"])
    manifest["steps"] = [{"type": "run", "runtime": "powershell", "command": ps, "timeout": 60}]
    manifest["definition_of_done"] = [{
        "type": "command", "runtime": "powershell",
        "command": f"if(Get-Process -Name {q} -ErrorAction SilentlyContinue){{exit 0}}; exit 2",
        "expect_exit": 0, "label": f"Process {process} is running"
    }]
    return CompiledIntent(intent_id, text, "process_health", 0.91, autonomy, workspace, None, ps, manifest,
        [f"Process: {process}", "Goal: ensure it is running" if can_repair else "Goal: inspect whether it is running"],
        ["Starting a process is attempted only when the prompt explicitly says start/ensure/keep and autonomy is managed/autonomous."])


def _compile_folder(intent_id: str, text: str, workspace: str, autonomy: str, path: str) -> CompiledIntent:
    q = _ps_quote(path)
    ensure = bool(re.search(r"\b(?:ensure|make sure|create|keep)\b", text, re.I))
    can_repair = ensure and autonomy in {"managed", "autonomous"}
    mutate = f"""
if (-not $exists) {{
  Write-Output "E3 EVOLVE creating missing directory"
  New-Item -ItemType Directory -Path {q} -Force | Out-Null
  $exists = Test-Path -LiteralPath {q} -PathType Container
}}""" if can_repair else ""
    body = f"""$exists = Test-Path -LiteralPath {q} -PathType Container
Write-Output ("E3 EXAMINE directory=" + {q} + " exists=" + $exists){mutate}
if (-not $exists) {{ throw "Directory does not exist" }}
Write-Output ("DIRECTORY EXISTS " + {q})"""
    ps = _retry_wrapper(body, attempts=1)
    perms = ["process.run"] + (["file.write"] if can_repair else [])
    manifest = _base_manifest(intent_id, "Ensure directory exists", workspace, perms)
    manifest["steps"] = [{"type": "run", "runtime": "powershell", "command": ps, "timeout": 30}]
    manifest["definition_of_done"] = [{
        "type": "command", "runtime": "powershell",
        "command": f"if(Test-Path -LiteralPath {q} -PathType Container){{exit 0}}; exit 2",
        "expect_exit": 0, "label": "Directory exists"
    }]
    return CompiledIntent(intent_id, text, "directory_state", 0.95, autonomy, workspace, None, ps, manifest,
        [f"Directory: {path}", "Goal: create if missing and verify" if can_repair else "Goal: verify existence only"],
        ["Filesystem repair is bounded to creating the explicitly named directory; no deletion or cleanup is inferred."])


def _compile_git(intent_id: str, text: str, workspace: str, autonomy: str, path: str | None) -> CompiledIntent:
    repo = path or workspace
    q = _ps_quote(repo)
    wants_sync = bool(re.search(r"\b(?:sync|pull|update|latest|up to date)\b", text, re.I))
    can_mutate = wants_sync and autonomy in {"managed", "autonomous"}
    mutate = """
Write-Output "E3 EVOLVE fast-forwarding from configured upstream"
git pull --ff-only
if ($LASTEXITCODE -ne 0) { throw "git pull --ff-only failed" }""" if can_mutate else ""
    body = f"""Set-Location -LiteralPath {q}
git rev-parse --is-inside-work-tree | Out-Null
if ($LASTEXITCODE -ne 0) {{ throw "Not a Git work tree" }}
$status = git status --short
Write-Output "E3 EXAMINE git repository"
if ($status) {{ Write-Output $status }} else {{ Write-Output "WORKTREE CLEAN" }}
git fetch --all --prune
if ($LASTEXITCODE -ne 0) {{ throw "git fetch failed" }}{mutate}
git status --short --branch"""
    ps = _retry_wrapper(body, attempts=2 if autonomy in {"safe", "managed", "autonomous"} else 1)
    manifest = _base_manifest(intent_id, "Inspect Git repository" if not can_mutate else "Sync Git repository", repo, ["process.run"])
    manifest["steps"] = [{"type": "run", "runtime": "powershell", "command": ps, "timeout": 180, "network_write": False}]
    manifest["definition_of_done"] = [{
        "type": "command", "runtime": "git", "command": "rev-parse --is-inside-work-tree",
        "expect_exit": 0, "label": "Workspace is a Git repository"
    }]
    return CompiledIntent(intent_id, text, "git_repository", 0.93, autonomy, repo, None, ps, manifest,
        [f"Repository: {repo}", "Goal: fetch + fast-forward only" if can_mutate else "Goal: inspect + fetch remote state"],
        ["Quillgeist never infers commit, push, reset --hard, force operations, or conflict resolution from a generic sync request."])


def _compile_explicit_powershell(intent_id: str, text: str, workspace: str, autonomy: str, script: str) -> CompiledIntent:
    attempts = 2 if autonomy == "autonomous" else 1
    ps = _retry_wrapper(script, attempts=attempts)
    manifest = _base_manifest(intent_id, "Explicit PowerShell task", workspace, ["process.run"])
    manifest["steps"] = [{"type": "run", "runtime": "powershell", "command": ps, "timeout": 300}]
    return CompiledIntent(intent_id, text, "explicit_powershell", 1.0, autonomy, workspace, None, ps, manifest,
        ["The prompt contains an explicit PowerShell block; Quillgeist preserves it rather than inventing commands."],
        ["No Definition-of-Done condition is invented. Success means the supplied script exits successfully."])


def compile_intent(text: str, *, workspace: str = ".", autonomy: str = "recommend") -> CompiledIntent:
    raw = str(text or "").strip()
    if not raw:
        raise IntentError("Enter a local task intent.")
    autonomy = str(autonomy or "recommend").lower()
    if autonomy not in AUTONOMY_LEVELS:
        raise IntentError(f"Unknown autonomy level: {autonomy}")
    cleaned, schedule_seconds = _extract_schedule(raw)
    intent_id = str(uuid.uuid4())

    script = _explicit_powershell(cleaned)
    url = URL_RE.search(cleaned)
    path = _path_from_text(cleaned)
    service = SERVICE_RE.search(cleaned)
    process = PROCESS_RE.search(cleaned)

    if script:
        result = _compile_explicit_powershell(intent_id, cleaned, workspace, autonomy, script)
    elif service and re.search(r"\b(?:service|running|stopped|start|ensure|check)\b", cleaned, re.I):
        result = _compile_service(intent_id, cleaned, workspace, autonomy, service.group(1))
    elif process:
        result = _compile_process(intent_id, cleaned, workspace, autonomy, process.group(1))
    elif url and re.search(r"\b(?:check|monitor|health|healthy|respond|online|available|up|verify|ensure)\b", cleaned, re.I):
        result = _compile_http(intent_id, cleaned, workspace, autonomy, url.group(0))
    elif re.search(r"\b(?:git|repo|repository)\b", cleaned, re.I):
        result = _compile_git(intent_id, cleaned, workspace, autonomy, path)
    elif path and re.search(r"\b(?:folder|directory)\b", cleaned, re.I):
        result = _compile_folder(intent_id, cleaned, workspace, autonomy, path)
    else:
        raise IntentError(
            "Intent is outside the deterministic compiler's proven capability set. "
            "Supported now: endpoint health, Windows services/processes, Git repository checks/sync, "
            "directory state, and explicit PowerShell. Quillgeist will not fabricate a command for an ambiguous request."
        )

    result.schedule_seconds = schedule_seconds
    result.manifest["quillgeist_intent"].update({
        "text": cleaned,
        "intent_type": result.intent_type,
        "confidence": result.confidence,
        "autonomy": autonomy,
        "schedule_seconds": schedule_seconds,
        "understanding": result.understanding,
        "boundaries": result.boundaries,
    })
    return result


def render_powershell_block(compiled: CompiledIntent) -> str:
    return compiled.powershell


def save_manifest_json(compiled: CompiledIntent, path: str | Path) -> Path:
    out = Path(path).expanduser().resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(compiled.manifest, indent=2), encoding="utf-8")
    return out
