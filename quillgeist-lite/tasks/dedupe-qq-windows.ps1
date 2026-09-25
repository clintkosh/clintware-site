param(
  [string]$HomeDir = (Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite")
)

$ErrorActionPreference = "Stop"
$PidPath = Join-Path $HomeDir "runner.pid"
$HeartbeatPath = Join-Path $HomeDir "runner-heartbeat.json"

Write-Host "DEDUPE_QQ // inspecting Clintware-owned qq windows" -ForegroundColor Cyan

function Get-QQProcesses {
  $escapedHome = [Regex]::Escape($HomeDir)
  $escapedLauncher = [Regex]::Escape((Join-Path $HomeDir "launcher.ps1"))
  @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessId -ne $PID -and
    $_.Name -match '^(pwsh|powershell)\.exe$' -and
    $_.CommandLine -and
    (
      $_.CommandLine -match $escapedLauncher -or
      ($_.CommandLine -match $escapedHome -and $_.CommandLine -match 'launcher\.ps1')
    )
  } | Sort-Object CreationDate)
}

function Test-CandidatePid {
  param([int]$Candidate,[object[]]$Processes)
  return [bool]($Processes | Where-Object { [int]$_.ProcessId -eq $Candidate } | Select-Object -First 1)
}

$processes = @(Get-QQProcesses)
if ($processes.Count -eq 0) {
  Write-Host "DEDUPE_QQ // no duplicate qq launcher processes found" -ForegroundColor Green
  exit 0
}

$keepPid = 0

try {
  if (Test-Path $HeartbeatPath) {
    $heartbeat = Get-Content $HeartbeatPath -Raw | ConvertFrom-Json
    $candidate = [int]$heartbeat.pid
    $stamp = [DateTime]::Parse([string]$heartbeat.timestamp).ToUniversalTime()
    if (((Get-Date).ToUniversalTime() - $stamp).TotalSeconds -le 180 -and (Test-CandidatePid $candidate $processes)) {
      $keepPid = $candidate
      Write-Host ("DEDUPE_QQ // keeping recent heartbeat PID " + $keepPid) -ForegroundColor DarkCyan
    }
  }
} catch {}

if ($keepPid -le 0) {
  try {
    if (Test-Path $PidPath) {
      $candidate = 0
      $raw = (Get-Content $PidPath -Raw).Trim()
      if ([int]::TryParse($raw,[ref]$candidate) -and (Test-CandidatePid $candidate $processes)) {
        $keepPid = $candidate
        Write-Host ("DEDUPE_QQ // keeping registered runner PID " + $keepPid) -ForegroundColor DarkCyan
      }
    }
  } catch {}
}

if ($keepPid -le 0) {
  $keepPid = [int]$processes[0].ProcessId
  Write-Host ("DEDUPE_QQ // keeping oldest qq PID " + $keepPid) -ForegroundColor DarkCyan
}

$closed = @()
foreach ($proc in $processes) {
  $procId = [int]$proc.ProcessId
  if ($procId -eq $keepPid) { continue }
  try {
    Stop-Process -Id $procId -Force -ErrorAction Stop
    $closed += $procId
    Write-Host ("DEDUPE_QQ // closed duplicate PID " + $procId) -ForegroundColor Yellow
  } catch {
    Write-Host ("DEDUPE_QQ WARN // could not close PID " + $procId + ": " + $_.Exception.Message) -ForegroundColor DarkYellow
  }
}

[IO.File]::WriteAllText($PidPath,[string]$keepPid,(New-Object Text.UTF8Encoding($false)))

Write-Host ("DEDUPE_QQ_READY // kept=" + $keepPid + " closed=" + $closed.Count) -ForegroundColor Green
