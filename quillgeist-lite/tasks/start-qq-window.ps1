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

function Test-RunnerAlive {
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
    if (Test-Path $runtimeCopy) { Copy-Item -LiteralPath $runtimeCopy -Destination $McpConsolePath -Force }
  }

  $pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
  if (-not $pwsh) {
    $candidate = Join-Path $env:ProgramFiles "PowerShell\7\pwsh.exe"
    if (Test-Path $candidate) { $pwsh = Get-Item $candidate }
  }
  $exe = if ($pwsh) { $pwsh.Source } else { "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" }

  $wt = Get-Command wt.exe -ErrorAction SilentlyContinue
  if ($wt -and (Test-Path $McpConsolePath)) {
    # Native Windows Terminal split: first pane remains top; -H creates the
    # second pane below it. The named window prevents accidental extra tabs.
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

    # Wait for launcher.ps1 to write the real runner PID. This closes the
    # watchdog race without recording wt.exe as the runner.
    $deadline=(Get-Date).AddSeconds(10)
    do {
      Start-Sleep -Milliseconds 150
      if(Test-RunnerAlive){break}
      [void](Repair-RunnerPidFromExistingProcess)
      if(Test-RunnerAlive){break}
    } while((Get-Date)-lt $deadline)

    exit 0
  }

  # Fallback for machines where Windows Terminal is unavailable.
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
