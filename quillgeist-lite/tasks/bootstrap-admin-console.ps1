param(
  [switch]$Elevated,
  [int]$RunnerPid = 0
)

$ErrorActionPreference = "Stop"

$TaskName = "Clintware Quillgeist Lite Runner"
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Find-RunnerPid {
  try {
    $current = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
    if ($current.ParentProcessId) {
      $parent = Get-CimInstance Win32_Process -Filter ("ProcessId=" + [int]$current.ParentProcessId)
      if ([string]$parent.CommandLine -match '(?i)quillgeistlite.*runner\.ps1|quillgeist-lite.*runner\.ps1|runner\.ps1') {
        return [int]$current.ParentProcessId
      }

      if ($parent.ParentProcessId) {
        $grand = Get-CimInstance Win32_Process -Filter ("ProcessId=" + [int]$parent.ParentProcessId)
        if ([string]$grand.CommandLine -match '(?i)quillgeistlite.*runner\.ps1|quillgeist-lite.*runner\.ps1|runner\.ps1') {
          return [int]$parent.ParentProcessId
        }
      }
    }
  } catch {}
  return 0
}

if ($RunnerPid -le 0) {
  $RunnerPid = Find-RunnerPid
}

if (-not (Test-Administrator)) {
  $self = $MyInvocation.MyCommand.Path
  if (-not $self) { throw "qq admin bootstrap must run from a saved script file." }

  Write-Host "ADMIN // Windows will request one UAC approval for the managed qq service." -ForegroundColor DarkYellow
  $args = '-NoProfile -ExecutionPolicy Bypass -File "' + $self + '" -Elevated -RunnerPid ' + $RunnerPid
  $p = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $args -Verb RunAs -Wait -PassThru
  if ($p.ExitCode -ne 0) {
    throw "qq admin bootstrap failed with exit code $($p.ExitCode)."
  }
  exit 0
}

$installedNow = $false
$changedPrincipal = $false
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if (-not $task) {
  Write-Host "SERVICE // qq managed service/task is missing. Installing it now." -ForegroundColor Cyan
  $installerUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/install.ps1?v=20260922-qq-admin-2"
  $installer = (Invoke-WebRequest -Uri $installerUrl -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}).Content
  if (-not $installer) { throw "Could not download the maintained qq installer." }

  Invoke-Expression $installer
  $installedNow = $true

  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $task) {
    throw "qq installer completed without creating the managed interactive task."
  }
}

if (([string]$task.Principal.RunLevel) -ne "Highest") {
  $user = $task.Principal.UserId
  if (-not $user) {
    $user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  }
  $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Highest
  Set-ScheduledTask -TaskName $TaskName -Principal $principal | Out-Null
  $changedPrincipal = $true
  Write-Host "ADMIN // managed qq task upgraded to Highest privilege." -ForegroundColor Cyan
}

if (-not $installedNow -and -not $changedPrincipal -and -not $Elevated) {
  Write-Host "READY // qq is already the supervised interactive ADMIN console." -ForegroundColor Green
  exit 0
}

Write-Host "SERVICE // health service owns qq lifecycle; no window restart is required for this repair." -ForegroundColor Cyan

$repair = Join-Path $HomeDir "auto-repair-runtime.ps1"
try {
  Invoke-WebRequest -Uri ("https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/tasks/auto-repair-runtime.ps1?cb=" + [Guid]::NewGuid().ToString("n")) -OutFile $repair -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
  & $repair -HomeDir $HomeDir
} catch {
  Write-Host ("SELF-HEAL WARN // " + $_.Exception.Message) -ForegroundColor DarkYellow
}

Write-Host "READY // qq admin/service state reconciled in place; the current window remains untouched." -ForegroundColor Green
