param(
  [string]$LauncherPath = (Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite\launcher.ps1"),
  [string]$HomeDir = (Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite")
)
$ErrorActionPreference = "Stop"
$PidPath = Join-Path $HomeDir "runner.pid"

function Test-RunnerAlive {
  try {
    if (-not (Test-Path $PidPath)) { return $false }
    $raw = (Get-Content $PidPath -Raw).Trim()
    $runnerPid = 0
    if (-not [int]::TryParse($raw,[ref]$runnerPid) -or $runnerPid -le 0) { return $false }
    return -not (Get-Process -Id $runnerPid -ErrorAction Stop).HasExited
  } catch { return $false }
}
if (Test-RunnerAlive) { exit 0 }
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

$deadline = (Get-Date).AddSeconds(2)
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
exit 0
