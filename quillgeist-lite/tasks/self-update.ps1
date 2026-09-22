$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$RunnerPath = Join-Path $HomeDir "runner.ps1"
$LauncherPath = Join-Path $HomeDir "launcher.ps1"
$BaseUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite"
$RestartHelper = Join-Path $HomeDir "restart-runner.ps1"

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

$updates = @(
  @{ Name = "runner";   Url = "$BaseUrl/runner.ps1";   Target = $RunnerPath },
  @{ Name = "launcher"; Url = "$BaseUrl/launcher.ps1"; Target = $LauncherPath }
)

Write-Host "SYNC" -ForegroundColor White -NoNewline
Write-Host " // downloading latest Quillgeist Lite terminal + runner" -ForegroundColor Cyan

foreach ($item in $updates) {
  $temp = $item.Target + ".new"
  Invoke-WebRequest -Uri $item.Url -OutFile $temp -UseBasicParsing

  if (-not (Test-Path $temp)) {
    throw "$($item.Name) update download failed."
  }

  $tokens = $null
  $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile(
    (Resolve-Path $temp),
    [ref]$tokens,
    [ref]$errors
  ) | Out-Null

  if ($errors.Count -gt 0) {
    $errors | Format-List *
    Remove-Item $temp -Force -ErrorAction SilentlyContinue
    throw "Updated $($item.Name) failed local PowerShell parse validation."
  }
}

foreach ($item in $updates) {
  Move-Item ($item.Target + ".new") $item.Target -Force
  Write-Host ("UPDATED // " + $item.Name) -ForegroundColor Cyan
}

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
  Write-Host "WARN // files updated; runner PID could not be identified for automatic restart." -ForegroundColor DarkYellow
  exit 0
}

$helper = @'
param(
  [int]$OldRunnerPid,
  [string]$LauncherPath,
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
$args = '-NoProfile -ExecutionPolicy Bypass -NoExit -File "' + $LauncherPath + '"'
Start-Process -FilePath $exe -ArgumentList $args -WorkingDirectory $HomeDir -WindowStyle Normal
'@

Set-Content -Path $RestartHelper -Value $helper -Encoding UTF8

Write-Host "RESTART // applying Clintware terminal theme after result return" -ForegroundColor Cyan
$restartArgs = '-NoProfile -ExecutionPolicy Bypass -File "' + $RestartHelper + '" -OldRunnerPid ' + $oldRunnerPid + ' -LauncherPath "' + $LauncherPath + '" -HomeDir "' + $HomeDir + '"'
Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $restartArgs -WindowStyle Hidden

Write-Host "READY // Quillgeist Lite self-update staged successfully." -ForegroundColor White
