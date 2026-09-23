$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$ServiceDir = Join-Path $HomeDir "service"
$SourcePath = Join-Path $ServiceDir "QuillgeistLiteHealthService.cs"
$ProgramDir = Join-Path $env:ProgramData "Clintware\QuillgeistLite"
$ServiceExe = Join-Path $ProgramDir "QuillgeistLiteHealthService.exe"
$ServiceName = "ClintwareQuillgeistLiteHealth"
$TaskName = "Clintware Quillgeist Lite Runner"
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

Write-Host "SERVICE // replacing watchdog binary" -ForegroundColor Cyan
Stop-Service -Name $ServiceName -Force -ErrorAction Stop
$service.WaitForStatus([System.ServiceProcess.ServiceControllerStatus]::Stopped,[TimeSpan]::FromSeconds(20))

$backup = $ServiceExe + ".previous"
Remove-Item $backup -Force -ErrorAction SilentlyContinue
if (Test-Path $ServiceExe) { Move-Item $ServiceExe $backup -Force }
try {
  Move-Item $tempExe $ServiceExe -Force
} catch {
  if (Test-Path $backup) { Move-Item $backup $ServiceExe -Force }
  throw
}

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances StopExisting
  Set-ScheduledTask -TaskName $TaskName -Settings $settings | Out-Null
  Write-Host "TASK // stale instances will now be replaced instead of ignored" -ForegroundColor Cyan
}

Start-Service -Name $ServiceName
(Get-Service -Name $ServiceName).WaitForStatus([System.ServiceProcess.ServiceControllerStatus]::Running,[TimeSpan]::FromSeconds(20))

Remove-Item $backup -Force -ErrorAction SilentlyContinue
Write-Host "READY // qq health service repaired; credentials and Control Plane registration preserved." -ForegroundColor Green
