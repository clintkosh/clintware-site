param(
  [switch]$SkipRunnerRestart
)

$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$ServiceDir = Join-Path $HomeDir "service"
$SourcePath = Join-Path $ServiceDir "QuillgeistLiteHealthService.cs"
$ProgramDir = Join-Path $env:ProgramData "Clintware\QuillgeistLite"
$ServiceExe = Join-Path $ProgramDir "QuillgeistLiteHealthService.exe"
$ServiceName = "ClintwareQuillgeistLiteHealth"
$TaskName = "Clintware Quillgeist Lite Runner"
$LauncherPath = Join-Path $HomeDir "launcher.ps1"
$SourceUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/service/QuillgeistLiteHealthService.cs"

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object System.Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
  $self = $MyInvocation.MyCommand.Path
  if (-not $self) { throw "qq service repair must run from a saved script file." }
  Write-Host "ADMIN // Windows may request approval to repair the qq health service." -ForegroundColor DarkYellow
  $args = '-NoProfile -ExecutionPolicy Bypass -File "' + $self + '"'
  $p = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $args -Verb RunAs -Wait -PassThru
  if ($p.ExitCode -ne 0) { throw "qq health-service repair failed with exit code $($p.ExitCode)." }
  exit 0
}

New-Item -ItemType Directory -Force -Path $ServiceDir,$ProgramDir | Out-Null

Write-Host "SERVICE // refreshing stale-task recovery watchdog" -ForegroundColor Cyan
$tempSource = $SourcePath + ".new"
Invoke-WebRequest -Uri $SourceUrl -OutFile $tempSource -UseBasicParsing
if (-not (Test-Path $tempSource)) { throw "Could not download maintained qq health-service source." }
Move-Item $tempSource $SourcePath -Force

$cscCandidates = @(
  "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
  "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
$csc = $cscCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $csc) { throw "The .NET Framework C# compiler is required to repair the qq health service." }

$tempExe = Join-Path $env:TEMP ("QuillgeistLiteHealthService-" + [Guid]::NewGuid().ToString("n") + ".exe")
& $csc /nologo /target:winexe /optimize+ /out:$tempExe /reference:System.ServiceProcess.dll /reference:System.Runtime.Serialization.dll $SourcePath
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $tempExe)) {
  throw "Updated qq health-service source did not compile."
}

$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
  Remove-Item $tempExe -Force -ErrorAction SilentlyContinue
  throw "The qq health service is not installed; run the maintained qq installer instead."
}

function New-CompatibleTaskSettings {
  $common = @{
    AllowStartIfOnBatteries = $true
    DontStopIfGoingOnBatteries = $true
    StartWhenAvailable = $true
    ExecutionTimeLimit = [TimeSpan]::Zero
    ErrorAction = "Stop"
  }

  # The health service explicitly ends stale Task Scheduler wrappers before /Run,
  # so IgnoreNew is the desired policy. Resolve it from the local cmdlet metadata
  # instead of ever passing an enum value that this Windows build does not expose.
  try {
    $command = Get-Command New-ScheduledTaskSettingsSet -ErrorAction Stop
    $multi = $command.Parameters["MultipleInstances"]
    if ($multi -and $multi.ParameterType -and $multi.ParameterType.IsEnum) {
      $supported = [Enum]::GetNames($multi.ParameterType)
      if ($supported -contains "IgnoreNew") {
        $common["MultipleInstances"] = "IgnoreNew"
      } elseif ($supported -contains "Queue") {
        Write-Host "TASK // IgnoreNew unavailable; using Queue compatibility policy" -ForegroundColor DarkYellow
        $common["MultipleInstances"] = "Queue"
      } elseif ($supported -contains "Parallel") {
        Write-Host "TASK // only Parallel is available; watchdog will still end stale wrappers explicitly" -ForegroundColor DarkYellow
        $common["MultipleInstances"] = "Parallel"
      }
    }
  } catch {
    Write-Host ("WARN // could not inspect MultipleInstances support; using ScheduledTasks default: " + $_.Exception.Message) -ForegroundColor DarkYellow
  }

  return New-ScheduledTaskSettingsSet @common
}

$settings = New-CompatibleTaskSettings

Write-Host "SERVICE // replacing watchdog binary" -ForegroundColor Cyan
$serviceWasRunning = ($service.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Running)
Stop-Service -Name $ServiceName -Force -ErrorAction Stop
$service.WaitForStatus([System.ServiceProcess.ServiceControllerStatus]::Stopped,[TimeSpan]::FromSeconds(20))

$backup = $ServiceExe + ".previous"
Remove-Item $backup -Force -ErrorAction SilentlyContinue
if (Test-Path $ServiceExe) { Move-Item $ServiceExe $backup -Force }

try {
  Move-Item $tempExe $ServiceExe -Force

  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if (-not $task) {
  if (-not (Test-Path $LauncherPath)) {
    throw "The qq launcher is missing: $LauncherPath"
  }

  Write-Host "TASK // runner task missing; recreating automatically" -ForegroundColor DarkYellow
  $psExe = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $taskArgs = '-NoProfile -ExecutionPolicy Bypass -NoExit -File "' + $LauncherPath + '"'
  $action = New-ScheduledTaskAction -Execute $psExe -Argument $taskArgs -WorkingDirectory $HomeDir
  $userName = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $userName
  $principal = New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel Highest

  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Interactive ADMIN Clintware Quillgeist Lite console. Automatically launched and supervised by the local health service." | Out-Null
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
} else {
  Set-ScheduledTask -TaskName $TaskName -Settings $settings | Out-Null
}

Write-Host "TASK // automatic runner recovery is configured" -ForegroundColor Cyan

Set-Service -Name $ServiceName -StartupType Automatic
& sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/15000/restart/60000 | Out-Null
& sc.exe failureflag $ServiceName 1 | Out-Null

Start-Service -Name $ServiceName
(Get-Service -Name $ServiceName).WaitForStatus([System.ServiceProcess.ServiceControllerStatus]::Running,[TimeSpan]::FromSeconds(20))

if (-not $SkipRunnerRestart) {
  try {
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "TASK // runner start requested immediately" -ForegroundColor Cyan
  } catch {
    Write-Host ("WARN // runner task could not be started immediately: " + $_.Exception.Message) -ForegroundColor DarkYellow
  }
} else {
  Write-Host "TASK // runner restart deferred because an active qq job is using this session" -ForegroundColor DarkGray
}

  Remove-Item $backup -Force -ErrorAction SilentlyContinue
  Write-Host "READY // qq health service repaired; wake channel, credentials, and Control Plane registration preserved." -ForegroundColor Green
} catch {
  $repairError = $_
  Write-Host ("SELF-HEAL // repair step failed: " + $repairError.Exception.Message) -ForegroundColor Red

  try {
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    if (Test-Path $backup) {
      Remove-Item $ServiceExe -Force -ErrorAction SilentlyContinue
      Move-Item $backup $ServiceExe -Force
      Write-Host "SELF-HEAL // previous watchdog binary restored" -ForegroundColor DarkYellow
    }
    Set-Service -Name $ServiceName -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
    $recovered = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($recovered -and $recovered.Status -eq "Running") {
      Write-Host "SELF-HEAL // watchdog returned to Running state" -ForegroundColor Green
    }
  } catch {
    Write-Host ("SELF-HEAL WARN // rollback encountered: " + $_.Exception.Message) -ForegroundColor DarkYellow
  }

  Remove-Item $tempExe -Force -ErrorAction SilentlyContinue
  throw $repairError
}
