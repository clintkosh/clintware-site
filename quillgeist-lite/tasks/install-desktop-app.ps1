param([switch]$NoLaunch)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$AppDir = Join-Path $HomeDir "desktop"
$GuardianTask = "Clintware Quillgeist Lite Guardian"
$UiTask = "Clintware Quillgeist Lite UI"
$LegacyRunnerTask = "Clintware Quillgeist Lite Runner"
$LegacyFallbackTask = "Clintware Quillgeist Lite Fallback Recovery"
$LegacyService = "ClintwareQuillgeistLiteHealth"

New-Item -ItemType Directory -Force -Path $AppDir | Out-Null

function Resolve-DotNet {
  $dotnet = Get-Command dotnet.exe -ErrorAction SilentlyContinue
  if ($dotnet) { return $dotnet.Source }

  $localDir = Join-Path $env:LOCALAPPDATA "Microsoft\dotnet"
  $local = Join-Path $localDir "dotnet.exe"
  if (-not (Test-Path $local)) {
    Write-Host "DOTNET // installing local .NET 8 SDK" -ForegroundColor Cyan
    $installer = Join-Path $env:TEMP "dotnet-install.ps1"
    Invoke-WebRequest https://dot.net/v1/dotnet-install.ps1 -OutFile $installer -UseBasicParsing
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -Channel 8.0 -InstallDir $localDir
    if ($LASTEXITCODE -ne 0) { throw ".NET 8 SDK installation failed." }
  }
  return $local
}

$dotnet = Resolve-DotNet
$guardianOut = Join-Path $AppDir "guardian"
$launcherOut = Join-Path $AppDir "launcher"

Write-Host "BUILD // Guardian" -ForegroundColor Cyan
& $dotnet publish (Join-Path $RepoRoot "quillgeist-lite\guardian\Clintware.QuillgeistLite.Guardian.csproj") -c Release -r win-x64 -o $guardianOut --nologo
if ($LASTEXITCODE -ne 0) { throw "Guardian publish failed." }

Write-Host "BUILD // single-pane launcher" -ForegroundColor Cyan
& $dotnet publish (Join-Path $RepoRoot "quillgeist-lite\launcher\Clintware.QuillgeistLite.Launcher.csproj") -c Release -r win-x64 -o $launcherOut --nologo
if ($LASTEXITCODE -ne 0) { throw "Launcher publish failed." }

$guardianExe = Join-Path $guardianOut "Clintware.QuillgeistLite.Guardian.exe"
$launcherExe = Join-Path $launcherOut "Clintware.QuillgeistLite.exe"
if (-not (Test-Path $guardianExe)) { throw "Guardian executable missing after publish." }
if (-not (Test-Path $launcherExe)) { throw "Launcher executable missing after publish." }

Write-Host "MIGRATE // disabling competing legacy supervisors" -ForegroundColor DarkYellow
foreach ($task in @($LegacyRunnerTask,$LegacyFallbackTask)) {
  try { Stop-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue } catch {}
  try { Disable-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue | Out-Null } catch {}
}
try {
  $svc = Get-Service -Name $LegacyService -ErrorAction SilentlyContinue
  if ($svc) {
    Stop-Service -Name $LegacyService -Force -ErrorAction SilentlyContinue
    Set-Service -Name $LegacyService -StartupType Disabled -ErrorAction SilentlyContinue
  }
} catch {}

$pidPath = Join-Path $HomeDir "runner.pid"
if (Test-Path $pidPath) {
  $raw = (Get-Content $pidPath -Raw).Trim()
  $oldPid = 0
  if ([int]::TryParse($raw,[ref]$oldPid) -and $oldPid -gt 0) {
    try { Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue } catch {}
  }
}
Start-Sleep -Milliseconds 600

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero)
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Highest

$guardianAction = New-ScheduledTaskAction -Execute $guardianExe -WorkingDirectory $guardianOut
$guardianTriggers = @(
  (New-ScheduledTaskTrigger -AtLogOn -User $user),
  (New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1))
)
Register-ScheduledTask -TaskName $GuardianTask -Action $guardianAction -Trigger $guardianTriggers -Principal $principal -Settings $settings -Description "Ensures the single QQ Guardian is alive. Guardian alone owns runner recovery." -Force | Out-Null

$uiAction = New-ScheduledTaskAction -Execute $launcherExe -WorkingDirectory $launcherOut
$uiTrigger = New-ScheduledTaskTrigger -AtLogOn -User $user
Register-ScheduledTask -TaskName $UiTask -Action $uiAction -Trigger $uiTrigger -Principal $principal -Settings $settings -Description "Single-pane Clintware Quillgeist Lite desktop UI." -Force | Out-Null

Start-ScheduledTask -TaskName $GuardianTask
Start-Sleep -Seconds 2

& $guardianExe --self-test
if ($LASTEXITCODE -ne 0) { throw "Guardian self-test failed." }

if (-not $NoLaunch) { Start-ScheduledTask -TaskName $UiTask }

Write-Host "PASS // QQ desktop installed" -ForegroundColor Green
Write-Host "PASS // one Guardian owns runner lifecycle" -ForegroundColor Green
Write-Host "PASS // legacy competing supervisors disabled" -ForegroundColor Green
Write-Host "PASS // one-minute Guardian ensure task installed" -ForegroundColor Green
Write-Host "PASS // single-pane Acrylic UI installed" -ForegroundColor Green
