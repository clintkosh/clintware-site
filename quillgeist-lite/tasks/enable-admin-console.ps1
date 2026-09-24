$ErrorActionPreference = "Stop"

$TaskName = "Clintware Quillgeist Lite Runner"
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-RunnerPid {
  try {
    $current = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
    if ([string]$current.CommandLine -match '(?i)quillgeistlite.*runner\.ps1|quillgeist-lite.*runner\.ps1|runner\.ps1') {
      return $PID
    }
    if ($current.ParentProcessId) {
      $parent = Get-CimInstance Win32_Process -Filter ("ProcessId=" + [int]$current.ParentProcessId)
      if ([string]$parent.CommandLine -match '(?i)quillgeistlite.*runner\.ps1|quillgeist-lite.*runner\.ps1|runner\.ps1') {
        return [int]$current.ParentProcessId
      }
    }
  } catch {}
  return 0
}

if (-not (Test-Administrator)) {
  $self = $MyInvocation.MyCommand.Path
  if (-not $self) { throw "The admin-console upgrader must run from a saved script file." }

  Write-Host "ADMIN // Windows will request one UAC approval to convert qq into the supervised admin console." -ForegroundColor DarkYellow
  $args = '-NoProfile -ExecutionPolicy Bypass -File "' + $self + '"'
  $p = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $args -Verb RunAs -Wait -PassThru
  if ($p.ExitCode -ne 0) {
    throw "qq admin-console upgrade failed with exit code $($p.ExitCode)."
  }
  exit 0
}

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) {
  Write-Host "SERVICE // managed qq service/task is not installed. Bootstrapping it now." -ForegroundColor Cyan
  Write-Host "ADMIN // Windows may request one UAC approval for the service installation." -ForegroundColor DarkYellow

  $installerUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/install.ps1"
  $installer = (Invoke-WebRequest -Uri $installerUrl -UseBasicParsing).Content
  if (-not $installer) { throw "Could not download the maintained qq installer." }

  Invoke-Expression $installer

  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $task) {
    throw "qq installer completed without creating the managed interactive task."
  }
}

if (([string]$task.Principal.RunLevel) -eq "Highest" -and (Test-Administrator)) {
  Write-Host "READY // qq is already the supervised interactive ADMIN console." -ForegroundColor Green
  exit 0
}

$user = $task.Principal.UserId
if (-not $user) {
  $user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
}

$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Highest
Set-ScheduledTask -TaskName $TaskName -Principal $principal | Out-Null

Write-Host "ADMIN // managed qq task now runs at highest privileges." -ForegroundColor Cyan
Write-Host "SERVICE // existing qq window remains in place; supervised recovery will use the no-focus host only if the runner later exits." -ForegroundColor Cyan
Write-Host "READY // qq admin-console policy updated without reopening the window." -ForegroundColor Green
