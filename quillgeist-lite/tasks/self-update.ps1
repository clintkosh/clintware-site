$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$RunnerPath = Join-Path $HomeDir "runner.ps1"
$RunnerUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/runner.ps1"
$RestartHelper = Join-Path $HomeDir "restart-runner.ps1"

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

Write-Host "Downloading latest Quillgeist Lite runner..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $RunnerUrl -OutFile ($RunnerPath + ".new") -UseBasicParsing
if (-not (Test-Path ($RunnerPath + ".new"))) {
  throw "Runner update download failed."
}

$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile(
  (Resolve-Path ($RunnerPath + ".new")),
  [ref]$tokens,
  [ref]$errors
) | Out-Null

if ($errors.Count -gt 0) {
  $errors | Format-List *
  Remove-Item ($RunnerPath + ".new") -Force -ErrorAction SilentlyContinue
  throw "Updated runner failed local PowerShell parse validation."
}

Move-Item ($RunnerPath + ".new") $RunnerPath -Force
Write-Host "Runner file updated." -ForegroundColor Green

$oldRunnerPid = 0
try {
  $current = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
  $currentCommand = [string]$current.CommandLine

  if ($currentCommand -match '(?i)quillgeistlite.*runner\.ps1|quillgeist-lite.*runner\.ps1|runner\.ps1') {
    $oldRunnerPid = $PID
  }
  elseif ($current.ParentProcessId) {
    $parent = Get-CimInstance Win32_Process -Filter ("ProcessId=" + [int]$current.ParentProcessId)
    $parentCommand = [string]$parent.CommandLine
    if ($parentCommand -match '(?i)quillgeistlite.*runner\.ps1|quillgeist-lite.*runner\.ps1|runner\.ps1') {
      $oldRunnerPid = [int]$current.ParentProcessId
    }
  }
} catch {}

if ($oldRunnerPid -le 0) {
  Write-Warning "Runner process could not be identified safely. Files were updated, but automatic restart is being skipped."
  exit 0
}

$helper = @'
param(
  [int]$OldRunnerPid,
  [string]$RunnerPath,
  [string]$HomeDir
)

Start-Sleep -Seconds 4

if ($OldRunnerPid -gt 0) {
  try {
    Stop-Process -Id $OldRunnerPid -Force -ErrorAction Stop
  } catch {}
}

Start-Sleep -Milliseconds 700

$exe = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$args = '-NoProfile -ExecutionPolicy Bypass -NoExit -File "' + $RunnerPath + '"'
Start-Process -FilePath $exe -ArgumentList $args -WorkingDirectory $HomeDir -WindowStyle Normal
'@

Set-Content -Path $RestartHelper -Value $helper -Encoding UTF8

Write-Host "Scheduling runner restart after this result is returned..." -ForegroundColor Cyan
$restartArgs = '-NoProfile -ExecutionPolicy Bypass -File "' + $RestartHelper + '" -OldRunnerPid ' + $oldRunnerPid + ' -RunnerPath "' + $RunnerPath + '" -HomeDir "' + $HomeDir + '"'
Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $restartArgs -WindowStyle Hidden

Write-Host "Quillgeist Lite self-update staged successfully." -ForegroundColor Green
