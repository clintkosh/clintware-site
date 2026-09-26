param(
  [string]$LauncherPath = (Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite\launcher.ps1"),
  [string]$HomeDir = (Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite")
)

$ErrorActionPreference = "Stop"
$PidPath = Join-Path $HomeDir "runner.pid"
$HeartbeatPath = Join-Path $HomeDir "runner-heartbeat.json"
$MutexName = "Local\Clintware.QuillgeistLite.WindowHost"
$mutex = New-Object Threading.Mutex($false,$MutexName)
$acquired = $false

function Get-QQLauncherProcesses {
  $escapedHome = [Regex]::Escape($HomeDir)
  $escapedLauncher = [Regex]::Escape($LauncherPath)
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

function Stop-StaleMcpMonitor {
  $escapedHome=[Regex]::Escape($HomeDir)
  @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessId -ne $PID -and
    $_.Name -match '^(pwsh|powershell)\.exe
  try {
    if (-not (Test-Path $PidPath)) { return $false }
    $raw = (Get-Content $PidPath -Raw).Trim()
    $runnerPid = 0
    if (-not [int]::TryParse($raw,[ref]$runnerPid) -or $runnerPid -le 0) { return $false }
    return -not (Get-Process -Id $runnerPid -ErrorAction Stop).HasExited
  } catch { return $false }
}

function Repair-RunnerPidFromExistingProcess {
  $existing = @(Get-QQLauncherProcesses)
  if ($existing.Count -eq 0) { return $false }

  $keepPid = 0
  try {
    if (Test-Path $HeartbeatPath) {
      $heartbeat = Get-Content $HeartbeatPath -Raw | ConvertFrom-Json
      $candidate = [int]$heartbeat.pid
      $stamp = [DateTime]::Parse([string]$heartbeat.timestamp).ToUniversalTime()
      if (((Get-Date).ToUniversalTime() - $stamp).TotalSeconds -le 180 -and ($existing.ProcessId -contains $candidate)) {
        $keepPid = $candidate
      }
    }
  } catch {}

  if ($keepPid -le 0) {
    try {
      if (Test-Path $PidPath) {
        $candidate = 0
        $raw = (Get-Content $PidPath -Raw).Trim()
        if ([int]::TryParse($raw,[ref]$candidate) -and ($existing.ProcessId -contains $candidate)) {
          $keepPid = $candidate
        }
      }
    } catch {}
  }

  if ($keepPid -le 0) { $keepPid = [int]$existing[0].ProcessId }
  [IO.File]::WriteAllText($PidPath,[string]$keepPid,(New-Object Text.UTF8Encoding($false)))
  return $true
}

try {
  try {
    $acquired = $mutex.WaitOne(0)
  } catch [Threading.AbandonedMutexException] {
    $acquired = $true
  }

  if (-not $acquired) { exit 0 }

  if (Test-RunnerAlive) { exit 0 }
  if (Repair-RunnerPidFromExistingProcess) { exit 0 }
  if (-not (Test-Path $LauncherPath)) { throw "qq launcher is missing: $LauncherPath" }

  Stop-StaleMcpMonitor
  Start-Sleep -Milliseconds 250

  $McpConsolePath = Join-Path $HomeDir "mcp-console.ps1"
  if (-not (Test-Path $McpConsolePath)) {
    $runtimeCopy = Join-Path $HomeDir "runtime\quillgeist-lite\tasks\mcp-console.ps1"
    if (Test-Path $runtimeCopy) {
      Copy-Item -LiteralPath $runtimeCopy -Destination $McpConsolePath -Force
    }
  }

  $pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
  if (-not $pwsh) {
    $candidate = Join-Path $env:ProgramFiles "PowerShell\7\pwsh.exe"
    if (Test-Path $candidate) { $pwsh = Get-Item $candidate }
  }
  $exe = if ($pwsh) { $pwsh.Source } else { "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" }

  $wt = Get-Command wt.exe -ErrorAction SilentlyContinue
  if ($wt -and (Test-Path $McpConsolePath)) {
    $args = @(
      "-w","qq",
      "-F",
      "new-tab",
      "--title","Clintware MCP // ADMIN",
      $exe,"-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File",$McpConsolePath,
      ";",
      "split-pane","-H","--size","0.50",
      "--title","Quillgeist Lite",
      $exe,"-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File",$LauncherPath,"-TerminalHost"
    )

    Start-Process -FilePath $wt.Source -ArgumentList $args -WorkingDirectory $HomeDir | Out-Null

    $deadline = (Get-Date).AddSeconds(10)
    do {
      Start-Sleep -Milliseconds 150
      if (Test-RunnerAlive) { break }
      [void](Repair-RunnerPidFromExistingProcess)
      if (Test-RunnerAlive) { break }
    } while ((Get-Date) -lt $deadline)

    exit 0
  }

  $args = @("-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File",$LauncherPath,"-TerminalHost")
  $child = Start-Process -FilePath $exe -ArgumentList $args -WorkingDirectory $HomeDir -PassThru
  [IO.File]::WriteAllText($PidPath,[string]$child.Id,(New-Object Text.UTF8Encoding($false)))
}
finally {
  if ($acquired) {
    try { $mutex.ReleaseMutex() } catch {}
  }
  try { $mutex.Dispose() } catch {}
}

exit 0
 -and
    $_.CommandLine -and
    $_.CommandLine -match $escapedHome -and
    $_.CommandLine -match 'mcp-console\.ps1'
  }) | ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {}
  }
}

function Test-RunnerAlive {
  try {
    if (-not (Test-Path $PidPath)) { return $false }
    $raw = (Get-Content $PidPath -Raw).Trim()
    $runnerPid = 0
    if (-not [int]::TryParse($raw,[ref]$runnerPid) -or $runnerPid -le 0) { return $false }
    return -not (Get-Process -Id $runnerPid -ErrorAction Stop).HasExited
  } catch { return $false }
}

function Repair-RunnerPidFromExistingProcess {
  $existing = @(Get-QQLauncherProcesses)
  if ($existing.Count -eq 0) { return $false }

  $keepPid = 0
  try {
    if (Test-Path $HeartbeatPath) {
      $heartbeat = Get-Content $HeartbeatPath -Raw | ConvertFrom-Json
      $candidate = [int]$heartbeat.pid
      $stamp = [DateTime]::Parse([string]$heartbeat.timestamp).ToUniversalTime()
      if (((Get-Date).ToUniversalTime() - $stamp).TotalSeconds -le 180 -and ($existing.ProcessId -contains $candidate)) {
        $keepPid = $candidate
      }
    }
  } catch {}

  if ($keepPid -le 0) {
    try {
      if (Test-Path $PidPath) {
        $candidate = 0
        $raw = (Get-Content $PidPath -Raw).Trim()
        if ([int]::TryParse($raw,[ref]$candidate) -and ($existing.ProcessId -contains $candidate)) {
          $keepPid = $candidate
        }
      }
    } catch {}
  }

  if ($keepPid -le 0) { $keepPid = [int]$existing[0].ProcessId }
  [IO.File]::WriteAllText($PidPath,[string]$keepPid,(New-Object Text.UTF8Encoding($false)))
  return $true
}

try {
  try {
    $acquired = $mutex.WaitOne(0)
  } catch [Threading.AbandonedMutexException] {
    $acquired = $true
  }

  if (-not $acquired) { exit 0 }

  if (Test-RunnerAlive) { exit 0 }
  if (Repair-RunnerPidFromExistingProcess) { exit 0 }
  if (-not (Test-Path $LauncherPath)) { throw "qq launcher is missing: $LauncherPath" }

  $McpConsolePath = Join-Path $HomeDir "mcp-console.ps1"
  if (-not (Test-Path $McpConsolePath)) {
    $runtimeCopy = Join-Path $HomeDir "runtime\quillgeist-lite\tasks\mcp-console.ps1"
    if (Test-Path $runtimeCopy) {
      Copy-Item -LiteralPath $runtimeCopy -Destination $McpConsolePath -Force
    }
  }

  $pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
  if (-not $pwsh) {
    $candidate = Join-Path $env:ProgramFiles "PowerShell\7\pwsh.exe"
    if (Test-Path $candidate) { $pwsh = Get-Item $candidate }
  }
  $exe = if ($pwsh) { $pwsh.Source } else { "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" }

  $wt = Get-Command wt.exe -ErrorAction SilentlyContinue
  if ($wt -and (Test-Path $McpConsolePath)) {
    $args = @(
      "-w","qq",
      "-F",
      "new-tab",
      "--title","Clintware MCP // ADMIN",
      $exe,"-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File",$McpConsolePath,
      ";",
      "split-pane","-H","--size","0.50",
      "--title","Quillgeist Lite",
      $exe,"-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File",$LauncherPath,"-TerminalHost"
    )

    Start-Process -FilePath $wt.Source -ArgumentList $args -WorkingDirectory $HomeDir | Out-Null

    $deadline = (Get-Date).AddSeconds(10)
    do {
      Start-Sleep -Milliseconds 150
      if (Test-RunnerAlive) { break }
      [void](Repair-RunnerPidFromExistingProcess)
      if (Test-RunnerAlive) { break }
    } while ((Get-Date) -lt $deadline)

    exit 0
  }

  $args = @("-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File",$LauncherPath,"-TerminalHost")
  $child = Start-Process -FilePath $exe -ArgumentList $args -WorkingDirectory $HomeDir -PassThru
  [IO.File]::WriteAllText($PidPath,[string]$child.Id,(New-Object Text.UTF8Encoding($false)))
}
finally {
  if ($acquired) {
    try { $mutex.ReleaseMutex() } catch {}
  }
  try { $mutex.Dispose() } catch {}
}

exit 0
