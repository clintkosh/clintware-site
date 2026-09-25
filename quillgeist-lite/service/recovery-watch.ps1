param(
  [string]$ProgramDir = (Join-Path $env:ProgramData "Clintware\QuillgeistLite")
)

$ErrorActionPreference = "Stop"

$ServiceName = "ClintwareQuillgeistLiteHealth"
$RunnerTaskName = "Clintware Quillgeist Lite Runner"
$ConfigPath = Join-Path $ProgramDir "service.json"
$RecoveryConfigPath = Join-Path $ProgramDir "recovery.json"
$StatePath = Join-Path $ProgramDir "recovery-state.json"
$LogPath = Join-Path $ProgramDir "recovery.log"
$RepairCooldownMinutes = 30
$RunnerHeartbeatStaleSeconds = 90
$RunnerHeartbeatStartupGraceSeconds = 180
$RunnerBusyMaxMinutes = 45

New-Item -ItemType Directory -Force -Path $ProgramDir | Out-Null

function Write-RecoveryLog {
  param([string]$Message)
  $line = ((Get-Date).ToUniversalTime().ToString("o") + " " + $Message)
  Add-Content -Path $LogPath -Value $line -Encoding UTF8
  try {
    $info = Get-Item $LogPath -ErrorAction Stop
    if ($info.Length -gt 1048576) {
      $tail = Get-Content $LogPath -Tail 500 -ErrorAction SilentlyContinue
      $tail | Set-Content -Path $LogPath -Encoding UTF8
    }
  } catch {}
}

function Read-JsonSafe {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  try { return Get-Content $Path -Raw | ConvertFrom-Json } catch { return $null }
}

function Write-State {
  param($State)
  try {
    $State.updated_at = (Get-Date).ToUniversalTime().ToString("o")
    $State | ConvertTo-Json -Depth 6 | Set-Content -Path $StatePath -Encoding UTF8
  } catch {}
}

function New-State {
  return [pscustomobject]@{
    last_runtime_repair_utc = $null
    last_service_repair_utc = $null
    consecutive_failures = 0
    updated_at = $null
  }
}

function Test-CooldownElapsed {
  param([string]$Timestamp)
  if ([string]::IsNullOrWhiteSpace($Timestamp)) { return $true }
  try {
    $then = [DateTime]::Parse($Timestamp).ToUniversalTime()
    return (((Get-Date).ToUniversalTime() - $then).TotalMinutes -ge $RepairCooldownMinutes)
  } catch {
    return $true
  }
}

function Test-RunnerAlive {
  param([string]$PidPath)
  try {
    if (-not $PidPath -or -not (Test-Path $PidPath)) { return $false }
    $raw = (Get-Content $PidPath -Raw).Trim()
    $pidValue = 0
    if (-not [int]::TryParse($raw,[ref]$pidValue) -or $pidValue -le 0) { return $false }
    $p = Get-Process -Id $pidValue -ErrorAction Stop
    return (-not $p.HasExited)
  } catch {
    return $false
  }
}

function Get-RunnerHeartbeatHealth {
  param([string]$PidPath)

  $result = [ordered]@{
    Healthy = $false
    Reason = "unknown"
    State = ""
    AgeSeconds = [double]::PositiveInfinity
  }

  if (-not $PidPath) {
    $result.Reason = "pid_path_missing"
    return [pscustomobject]$result
  }

  $homeDir = Split-Path $PidPath -Parent
  $heartbeatPath = Join-Path $homeDir "runner-heartbeat.json"

  if (-not (Test-Path $heartbeatPath)) {
    try {
      $raw = (Get-Content $PidPath -Raw).Trim()
      $runnerPid = 0
      if ([int]::TryParse($raw,[ref]$runnerPid) -and $runnerPid -gt 0) {
        $process = Get-Process -Id $runnerPid -ErrorAction Stop
        $age = ((Get-Date) - $process.StartTime).TotalSeconds
        if ($age -lt $RunnerHeartbeatStartupGraceSeconds) {
          $result.Healthy = $true
          $result.Reason = "heartbeat_startup_grace"
          $result.AgeSeconds = $age
          return [pscustomobject]$result
        }
      }
    } catch {}
    $result.Reason = "heartbeat_missing"
    return [pscustomobject]$result
  }

  try {
    $heartbeat = Get-Content $heartbeatPath -Raw | ConvertFrom-Json
    $stamp = [DateTime]::Parse([string]$heartbeat.timestamp).ToUniversalTime()
    $ageSeconds = ((Get-Date).ToUniversalTime() - $stamp).TotalSeconds
    $state = [string]$heartbeat.state
    $result.State = $state
    $result.AgeSeconds = $ageSeconds

    if ($state -eq "busy") {
      if ($ageSeconds -le ($RunnerBusyMaxMinutes * 60)) {
        $result.Healthy = $true
        $result.Reason = "busy_within_limit"
      } else {
        $result.Reason = "busy_heartbeat_stale"
      }
      return [pscustomobject]$result
    }

    if ($ageSeconds -le $RunnerHeartbeatStaleSeconds) {
      $result.Healthy = $true
      $result.Reason = if ($state -eq "connected") { "connected" } else { "reconnect_grace" }
    } else {
      $result.Reason = "heartbeat_stale"
    }
    return [pscustomobject]$result
  } catch {
    $result.Reason = "heartbeat_invalid"
    return [pscustomobject]$result
  }
}

function Restart-SupervisedRunner {
  param(
    [string]$TaskName,
    [string]$PidPath,
    [string]$Reason
  )

  Write-RecoveryLog ("runner_restart_begin reason=" + $Reason)

  try {
    if ($PidPath -and (Test-Path $PidPath)) {
      $raw = (Get-Content $PidPath -Raw).Trim()
      $runnerPid = 0
      if ([int]::TryParse($raw,[ref]$runnerPid) -and $runnerPid -gt 0) {
        Stop-Process -Id $runnerPid -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {
    Write-RecoveryLog ("runner_process_stop_warn " + $_.Exception.Message)
  }

  try { & schtasks.exe /End /TN $TaskName 1>$null 2>$null } catch {}
  Start-Sleep -Milliseconds 900

  try {
    $enableOutput = & schtasks.exe /Change /TN $TaskName /ENABLE 2>&1 | Out-String
    Write-RecoveryLog ("runner_enable_requested " + ($enableOutput.Trim() -replace '[\r\n]+',' '))
  } catch {
    Write-RecoveryLog ("runner_enable_exception " + $_.Exception.Message)
  }

  try {
    $runOutput = & schtasks.exe /Run /TN $TaskName 2>&1 | Out-String
    Write-RecoveryLog ("runner_start_requested " + ($runOutput.Trim() -replace '[\r\n]+',' '))
  } catch {
    Write-RecoveryLog ("runner_start_exception " + $_.Exception.Message)
  }

  Start-Sleep -Seconds 8
  return (Test-RunnerAlive $PidPath)
}

function Resolve-PowerShellHost {
  $pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
  if ($pwsh) { return $pwsh.Source }
  $candidate = Join-Path $env:ProgramFiles "PowerShell\7\pwsh.exe"
  if (Test-Path $candidate) { return $candidate }
  return "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
}

function Invoke-RepairScript {
  param(
    [string]$Path,
    [string[]]$Arguments = @(),
    [int]$TimeoutSeconds = 180
  )
  if (-not $Path -or -not (Test-Path $Path)) { return $false }

  $hostExe = Resolve-PowerShellHost
  $argList = @("-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-File",$Path) + $Arguments

  try {
    Write-RecoveryLog ("repair_start path=" + $Path)
    $p = Start-Process -FilePath $hostExe -ArgumentList $argList -WindowStyle Hidden -PassThru
    if (-not $p.WaitForExit($TimeoutSeconds * 1000)) {
      try { $p.Kill() } catch {}
      Write-RecoveryLog ("repair_timeout path=" + $Path)
      return $false
    }
    Write-RecoveryLog ("repair_complete path=" + $Path + " exit=" + $p.ExitCode)
    return ($p.ExitCode -eq 0)
  } catch {
    Write-RecoveryLog ("repair_exception path=" + $Path + " error=" + $_.Exception.Message)
    return $false
  }
}

$serviceConfig = Read-JsonSafe $ConfigPath
$recoveryConfig = Read-JsonSafe $RecoveryConfigPath
$state = Read-JsonSafe $StatePath
if (-not $state) { $state = New-State }

if ($serviceConfig -and $serviceConfig.TaskName) {
  $RunnerTaskName = [string]$serviceConfig.TaskName
}

$runnerPidPath = if ($serviceConfig) { [string]$serviceConfig.RunnerPidPath } else { $null }
$autoRepairPath = if ($serviceConfig) { [string]$serviceConfig.AutoRepairPath } else { $null }
$serviceRepairPath = if ($recoveryConfig) { [string]$recoveryConfig.ServiceRepairPath } else { $null }

Write-RecoveryLog "watch_start"

$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not $service) {
  $serviceExe = Join-Path $ProgramDir "QuillgeistLiteHealthService.exe"
  if (Test-Path $serviceExe) {
    try {
      New-Service -Name $ServiceName -BinaryPathName ('"' + $serviceExe + '"') -DisplayName "Clintware Quillgeist Lite Health" -Description "Maintains Quillgeist Lite local runner health and securely uplinks bounded diagnostics to the Clintware Control Plane." -StartupType Automatic | Out-Null
      & sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/15000/restart/60000 | Out-Null
      & sc.exe failureflag $ServiceName 1 | Out-Null
      Write-RecoveryLog "service_recreated"
      $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    } catch {
      Write-RecoveryLog ("service_recreate_failed " + $_.Exception.Message)
    }
  }
}

$serviceHealthy = $false
if ($service) {
  try {
    Set-Service -Name $ServiceName -StartupType Automatic -ErrorAction SilentlyContinue
    $service.Refresh()
    if ($service.Status -ne "Running") {
      Write-RecoveryLog ("service_state=" + $service.Status + " start_requested")
      Start-Service -Name $ServiceName -ErrorAction Stop
      (Get-Service -Name $ServiceName).WaitForStatus([System.ServiceProcess.ServiceControllerStatus]::Running,[TimeSpan]::FromSeconds(20))
    }
    $service = Get-Service -Name $ServiceName -ErrorAction Stop
    $serviceHealthy = ($service.Status -eq "Running")
  } catch {
    Write-RecoveryLog ("service_start_failed " + $_.Exception.Message)
  }
}

if (-not $serviceHealthy -and (Test-CooldownElapsed ([string]$state.last_service_repair_utc))) {
  $state.last_service_repair_utc = (Get-Date).ToUniversalTime().ToString("o")
  Write-State $state
  if (Invoke-RepairScript -Path $serviceRepairPath -Arguments @("-SkipRunnerRestart")) {
    try {
      Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
      $serviceHealthy = ((Get-Service -Name $ServiceName -ErrorAction SilentlyContinue).Status -eq "Running")
    } catch {}
  }
}

if ($serviceHealthy) {
  Start-Sleep -Seconds 5
}

$runnerAlive = Test-RunnerAlive $runnerPidPath
$runnerHeartbeat = if ($runnerAlive) { Get-RunnerHeartbeatHealth $runnerPidPath } else { $null }

if ($runnerAlive -and $runnerHeartbeat -and -not $runnerHeartbeat.Healthy) {
  Write-RecoveryLog ("runner_stale_detected reason=" + $runnerHeartbeat.Reason + " state=" + $runnerHeartbeat.State + " age_seconds=" + [Math]::Round([double]$runnerHeartbeat.AgeSeconds,1))
  $runnerAlive = Restart-SupervisedRunner -TaskName $RunnerTaskName -PidPath $runnerPidPath -Reason $runnerHeartbeat.Reason
  $runnerHeartbeat = if ($runnerAlive) { Get-RunnerHeartbeatHealth $runnerPidPath } else { $null }
}

if (-not $runnerAlive) {
  $runnerAlive = Restart-SupervisedRunner -TaskName $RunnerTaskName -PidPath $runnerPidPath -Reason "runner_not_alive"
  $runnerHeartbeat = if ($runnerAlive) { Get-RunnerHeartbeatHealth $runnerPidPath } else { $null }
}

if (-not $runnerAlive -and (Test-CooldownElapsed ([string]$state.last_runtime_repair_utc))) {
  $state.last_runtime_repair_utc = (Get-Date).ToUniversalTime().ToString("o")
  Write-State $state

  $homeDir = $null
  try {
    if ($runnerPidPath) { $homeDir = Split-Path $runnerPidPath -Parent }
  } catch {}

  $repairArgs = @()
  if ($homeDir) { $repairArgs = @("-HomeDir",$homeDir) }

  [void](Invoke-RepairScript -Path $autoRepairPath -Arguments $repairArgs)

  Start-Sleep -Seconds 5
  $runnerAlive = Test-RunnerAlive $runnerPidPath
}

if ($runnerAlive -and $serviceHealthy -and (!$runnerHeartbeat -or $runnerHeartbeat.Healthy)) {
  $state.consecutive_failures = 0
  $heartbeatSummary = if ($runnerHeartbeat) { " heartbeat=" + $runnerHeartbeat.Reason } else { "" }
  Write-RecoveryLog ("healthy service=running runner=alive" + $heartbeatSummary)
} else {
  $state.consecutive_failures = [int]$state.consecutive_failures + 1
  Write-RecoveryLog ("degraded service=" + $serviceHealthy + " runner=" + $runnerAlive + " failures=" + $state.consecutive_failures)
}

Write-State $state
