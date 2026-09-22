$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory=$true)]
  [string]$BootstrapPath
)

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
  $self = $MyInvocation.MyCommand.Path
  if (-not $self) { throw "Service installer must run from a saved script file." }

  $args = '-NoProfile -ExecutionPolicy Bypass -File "' + $self + '" -BootstrapPath "' + $BootstrapPath + '"'
  $p = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $args -Verb RunAs -Wait -PassThru
  if ($p.ExitCode -ne 0) { throw "Elevated Quillgeist Lite service installation failed with exit code $($p.ExitCode)." }
  exit 0
}

$bootstrap = Get-Content $BootstrapPath -Raw | ConvertFrom-Json

$HomeDir = [string]$bootstrap.HomeDir
$DeviceId = [string]$bootstrap.DeviceId
$DeviceToken = [string]$bootstrap.DeviceToken
$Endpoint = [string]$bootstrap.Endpoint
$UserName = [string]$bootstrap.UserName

if (-not $HomeDir -or -not $DeviceId -or -not $DeviceToken -or -not $Endpoint -or -not $UserName) {
  throw "Quillgeist Lite service bootstrap data is incomplete."
}

$ProgramDir = Join-Path $env:ProgramData "Clintware\QuillgeistLite"
$SourcePath = Join-Path $HomeDir "service\QuillgeistLiteHealthService.cs"
$ServiceExe = Join-Path $ProgramDir "QuillgeistLiteHealthService.exe"
$ConfigPath = Join-Path $ProgramDir "service.json"
$ServiceLog = Join-Path $ProgramDir "service-local.log"

$LauncherPath = Join-Path $HomeDir "launcher.ps1"
$RunnerPidPath = Join-Path $HomeDir "runner.pid"
$RunnerLogPath = Join-Path $HomeDir "runner.log"
$CrashLogPath = Join-Path $HomeDir "runner-crash.log"

$ServiceName = "ClintwareQuillgeistLiteHealth"
$TaskName = "Clintware Quillgeist Lite Runner"

New-Item -ItemType Directory -Force -Path $ProgramDir | Out-Null

if (-not (Test-Path $SourcePath)) { throw "Missing health service source: $SourcePath" }
if (-not (Test-Path $LauncherPath)) { throw "Missing Quillgeist Lite launcher: $LauncherPath" }

Write-Host "Compiling Clintware Quillgeist Lite health service..." -ForegroundColor Cyan

$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
  try { Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue } catch {}
}

Start-Sleep -Milliseconds 800
Remove-Item $ServiceExe -Force -ErrorAction SilentlyContinue

$refs = @("System.ServiceProcess.dll","System.Runtime.Serialization.dll")
Add-Type -Path $SourcePath -Language CSharp -ReferencedAssemblies $refs -OutputAssembly $ServiceExe -OutputType WindowsApplication

if (-not (Test-Path $ServiceExe)) { throw "Health service compilation did not produce $ServiceExe" }

$config = [ordered]@{
  Endpoint = $Endpoint
  DeviceId = $DeviceId
  Token = $DeviceToken
  TaskName = $TaskName
  RunnerPidPath = $RunnerPidPath
  RunnerLogPath = $RunnerLogPath
  CrashLogPath = $CrashLogPath
  LocalServiceLogPath = $ServiceLog
}

$config | ConvertTo-Json -Depth 6 | Set-Content -Path $ConfigPath -Encoding UTF8

& icacls.exe $ProgramDir /inheritance:r /grant:r "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Could not secure the Quillgeist Lite service directory." }

Write-Host "Registering interactive Quillgeist Lite runner task..." -ForegroundColor Cyan

$oldTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($oldTask) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$psExe = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$taskArgs = '-NoProfile -ExecutionPolicy Bypass -NoExit -File "' + $LauncherPath + '"'

$action = New-ScheduledTaskAction -Execute $psExe -Argument $taskArgs -WorkingDirectory $HomeDir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $UserName
$principal = New-ScheduledTaskPrincipal -UserId $UserName -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Interactive Clintware Quillgeist Lite runner managed by the local health service." | Out-Null

Write-Host "Registering Windows health service..." -ForegroundColor Cyan

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
  & sc.exe delete $ServiceName | Out-Null
  Start-Sleep -Seconds 2
}

New-Service -Name $ServiceName -BinaryPathName ('"' + $ServiceExe + '"') -DisplayName "Clintware Quillgeist Lite Health" -Description "Maintains Quillgeist Lite local runner health and securely uplinks bounded diagnostics to the Clintware Control Plane." -StartupType Automatic | Out-Null

& sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/15000/restart/60000 | Out-Null
& sc.exe failureflag $ServiceName 1 | Out-Null

$startupShortcut = Join-Path ([Environment]::GetFolderPath("CommonStartup")) "Clintware Quillgeist Lite.lnk"
$userStartupShortcut = Join-Path ([Environment]::GetFolderPath("Startup")) "Clintware Quillgeist Lite.lnk"
Remove-Item $startupShortcut -Force -ErrorAction SilentlyContinue
Remove-Item $userStartupShortcut -Force -ErrorAction SilentlyContinue

Start-Service -Name $ServiceName
Start-ScheduledTask -TaskName $TaskName

Start-Sleep -Seconds 2

$service = Get-Service -Name $ServiceName
if ($service.Status -ne "Running") { throw "Quillgeist Lite health service did not reach Running state." }

Write-Host ""
Write-Host "HEALTH SERVICE ACTIVE" -ForegroundColor Green
Write-Host "Service : $ServiceName"
Write-Host "Runner  : $TaskName"
Write-Host "Device  : $DeviceId"
Write-Host ""

Remove-Item $BootstrapPath -Force -ErrorAction SilentlyContinue
