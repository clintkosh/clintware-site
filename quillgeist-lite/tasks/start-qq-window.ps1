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

  # Re-check only after acquiring the singleton gate. This closes the race where
  # the service, fallback watchdog, scheduled task, and a manual launch all saw a
  # missing runner.pid before the first launcher had time to create it.
  if (Test-RunnerAlive) { exit 0 }
  if (Repair-RunnerPidFromExistingProcess) { exit 0 }

  if (-not (Test-Path $LauncherPath)) { throw "qq launcher is missing: $LauncherPath" }

  Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class QQWindowNative {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@ -ErrorAction SilentlyContinue

  $previous = [IntPtr]::Zero
  try { $previous = [QQWindowNative]::GetForegroundWindow() } catch {}

  $pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
  if (-not $pwsh) {
    $candidate = Join-Path $env:ProgramFiles "PowerShell\7\pwsh.exe"
    if (Test-Path $candidate) { $pwsh = Get-Item $candidate }
  }
  $exe = if ($pwsh) { $pwsh.Source } else { "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" }
  $args = @("-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File",$LauncherPath,"-TerminalHost")
  $child = Start-Process -FilePath $exe -ArgumentList $args -WorkingDirectory $HomeDir -PassThru

  # Reserve the canonical runner PID immediately. launcher.ps1 later writes the
  # same PID after initialization, but watchdogs can now see a live process during
  # that startup gap instead of opening another window.
  [IO.File]::WriteAllText($PidPath,[string]$child.Id,(New-Object Text.UTF8Encoding($false)))

  $deadline = (Get-Date).AddSeconds(3)
  do {
    Start-Sleep -Milliseconds 80
    try { $child.Refresh() } catch {}
    $hwnd = try { $child.MainWindowHandle } catch { [IntPtr]::Zero }
    if ($hwnd -ne [IntPtr]::Zero) {
      try { [void][QQWindowNative]::ShowWindowAsync($hwnd,4) } catch {}
      break
    }
  } while ((Get-Date) -lt $deadline)

  if ($previous -ne [IntPtr]::Zero) {
    Start-Sleep -Milliseconds 80
    try { [void][QQWindowNative]::SetForegroundWindow($previous) } catch {}
  }
}
finally {
  if ($acquired) {
    try { $mutex.ReleaseMutex() } catch {}
  }
  try { $mutex.Dispose() } catch {}
}

exit 0
