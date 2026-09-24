param(
  [Parameter(Mandatory=$true)][string]$HomeDir,
  [Parameter(Mandatory=$true)][string]$TaskName,
  [Parameter(Mandatory=$true)][string]$UserName
)

$ErrorActionPreference = "Stop"
$Base = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite"
$RepairLog = Join-Path $HomeDir "auto-repair.log"

function Log([string]$m) {
  Add-Content -Path $RepairLog -Value (((Get-Date).ToUniversalTime().ToString("o")) + " " + $m)
}

function Download-Atomic([string]$Url,[string]$Target) {
  $tmp = $Target + ".repair"
  Invoke-WebRequest -Uri ($Url + "?v=" + [Uri]::EscapeDataString((Get-Date).ToUniversalTime().ToString("yyyyMMddHH"))) -OutFile $tmp -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
  if (-not (Test-Path $tmp)) { throw "download_missing: $Url" }
  Move-Item $tmp $Target -Force
}

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null
Log "AUTO_REPAIR start"

$files = @(
  @{u="$Base/launcher.ps1"; p=(Join-Path $HomeDir "launcher.ps1"); kind="ps"},
  @{u="$Base/runner.ps1"; p=(Join-Path $HomeDir "runner.ps1"); kind="ps"},
  @{u="$Base/tools/boot_splash.py"; p=(Join-Path $HomeDir "boot_splash.py"); kind="py"},
  @{u="$Base/tools/terminal_repair.py"; p=(Join-Path $HomeDir "terminal_repair.py"); kind="py"}
)

foreach($f in $files) {
  Download-Atomic $f.u $f.p
  if ($f.kind -eq "ps") {
    $tokens=$null; $errors=$null
    [System.Management.Automation.Language.Parser]::ParseFile($f.p,[ref]$tokens,[ref]$errors) | Out-Null
    if ($errors.Count -gt 0) { throw "parse_failed: $($f.p)" }
  }
  Log ("refreshed " + $f.p)
}

$pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
if (-not $pwsh) {
  $candidate = Join-Path $env:ProgramFiles "PowerShell\7\pwsh.exe"
  if (Test-Path $candidate) { $pwsh = Get-Item $candidate }
}
$exe = if ($pwsh) { $pwsh.Source } else { "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" }
$launcher = Join-Path $HomeDir "launcher.ps1"
$args = '-NoLogo -NoProfile -ExecutionPolicy Bypass -File "' + $launcher + '"'
$action = New-ScheduledTaskAction -Execute $exe -Argument $args -WorkingDirectory $HomeDir

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  Set-ScheduledTask -TaskName $TaskName -Action $action | Out-Null
  Enable-ScheduledTask -TaskName $TaskName | Out-Null
} else {
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $UserName
  $principal = New-ScheduledTaskPrincipal -UserId $UserName -LogonType Interactive -RunLevel Highest
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Supervised Clintware Quillgeist Lite interactive runtime." | Out-Null
}

try { Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue } catch {}
Start-Sleep -Milliseconds 500
Start-ScheduledTask -TaskName $TaskName
Log ("task_restarted shell=" + $exe)
Log "AUTO_REPAIR complete"
