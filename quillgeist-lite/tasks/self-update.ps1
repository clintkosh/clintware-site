$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$PackagedRoot = Join-Path $HomeDir "runtime\quillgeist-lite"
$RepairPath = Join-Path $HomeDir "auto-repair-runtime.ps1"
$RunnerPath = Join-Path $HomeDir "runner.ps1"
$RunnerPidPath = Join-Path $HomeDir "runner.pid"
$TaskName = "Clintware Quillgeist Lite Runner"

function Test-PowerShellFile {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [string[]]$Required = @()
  )

  if (-not (Test-Path $Path)) { throw "Reviewed QQ source is missing after download: $Path" }
  $body = Get-Content -LiteralPath $Path -Raw
  if ($body.Length -lt 500) { throw "Reviewed QQ source is unexpectedly small: $Path" }
  foreach ($needle in $Required) {
    if (-not $body.Contains($needle)) { throw "Reviewed QQ source failed structural validation: $needle" }
  }

  $tokens = $null
  $errors = $null
  [Management.Automation.Language.Parser]::ParseFile((Resolve-Path $Path),[ref]$tokens,[ref]$errors) | Out-Null
  if ($errors.Count -gt 0) { throw "Reviewed QQ source failed PowerShell parse validation: $Path" }
}

function Get-ReviewedQQAsset {
  param(
    [Parameter(Mandatory=$true)][string]$Relative,
    [Parameter(Mandatory=$true)][string]$Destination,
    [string[]]$Required = @()
  )

  $uri = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/" + $Relative
  $temp = $Destination + ".new"
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
  try {
    Invoke-WebRequest -Uri $uri -OutFile $temp -UseBasicParsing -TimeoutSec 25 -ErrorAction Stop
    Test-PowerShellFile -Path $temp -Required $Required
    Move-Item -LiteralPath $temp -Destination $Destination -Force
  } finally {
    Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
  }
}

if (-not (Test-Path $PackagedRoot)) {
  throw "Packaged QQ runtime is missing. Install the current QQ.exe distribution."
}

$packagedRepair = Join-Path $PackagedRoot "tasks\auto-repair-runtime.ps1"
if (-not (Test-Path $packagedRepair)) {
  throw "Packaged QQ self-heal engine is missing."
}

Write-Host "SYNC // reconciling QQ from the packaged runtime" -ForegroundColor Cyan
Copy-Item -LiteralPath $packagedRepair -Destination $RepairPath -Force
Test-PowerShellFile -Path $RepairPath -Required @("AUTO_REPAIR_READY")

& $RepairPath -HomeDir $HomeDir -SourceRoot $PackagedRoot
if ($LASTEXITCODE -ne 0) { throw "QQ self-heal returned exit code $LASTEXITCODE." }

Write-Host "SYNC // refreshing reviewed QQ runner from Clintware" -ForegroundColor Cyan
Get-ReviewedQQAsset -Relative "runner.ps1" -Destination $RunnerPath -Required @(
  "function Resolve-Python",
  "Miniconda3\python.exe",
  "\WindowsApps\",
  "A working Python 3 runtime was not found"
)
Write-Host "RUNTIME // reviewed Miniconda-first Python resolver installed" -ForegroundColor Green

Write-Host "SYNC // refreshing qq window, MCP monitor, splash, and logo assets" -ForegroundColor Cyan
Get-ReviewedQQAsset -Relative "launcher.ps1" -Destination (Join-Path $HomeDir "launcher.ps1") -Required @("Sync-LatestQQFunctionality")
Get-ReviewedQQAsset -Relative "tasks/start-qq-window.ps1" -Destination (Join-Path $HomeDir "start-qq-window.ps1") -Required @("split-pane","Clintware MCP // ADMIN")
Get-ReviewedQQAsset -Relative "tasks/mcp-console.ps1" -Destination (Join-Path $HomeDir "mcp-console.ps1") -Required @("LIVE ADMIN CONSOLE","mcp(admin)")
Get-ReviewedQQAsset -Relative "tools/boot_splash.py" -Destination (Join-Path $HomeDir "boot_splash.py") -Required @("supplied Clintware eclipse image")

$logoPath = Join-Path $HomeDir "clintware-terminal-logo.b64"
$logoTemp = $logoPath + ".new"
try {
  Invoke-WebRequest -Uri "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/assets/clintware-terminal-logo.b64" -OutFile $logoTemp -UseBasicParsing -TimeoutSec 25 -ErrorAction Stop
  $logoRaw=(Get-Content -LiteralPath $logoTemp -Raw).Trim()
  if(-not $logoRaw.StartsWith("iVBOR")){ throw "Reviewed QQ logo asset is invalid." }
  Move-Item -LiteralPath $logoTemp -Destination $logoPath -Force
} finally {
  Remove-Item -LiteralPath $logoTemp -Force -ErrorAction SilentlyContinue
}


$RegistryPath = Join-Path $HomeDir "tasks.json"
$RegistryTemp = $RegistryPath + ".new"
Write-Host "SYNC // refreshing reviewed QQ task registry" -ForegroundColor Cyan
try {
  Invoke-WebRequest -Uri "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/tasks.json" -OutFile $RegistryTemp -UseBasicParsing -TimeoutSec 25 -ErrorAction Stop
  $registry = Get-Content -LiteralPath $RegistryTemp -Raw | ConvertFrom-Json
  if (-not $registry.tasks) { throw "Reviewed QQ task registry is invalid." }
  foreach ($requiredTask in @("self-update","local-ai","bitnet-setup","local-ai-integrate")) {
    if (-not $registry.tasks.PSObject.Properties[$requiredTask]) {
      throw ("Reviewed QQ task registry is missing: " + $requiredTask)
    }
  }
  Move-Item -LiteralPath $RegistryTemp -Destination $RegistryPath -Force
  Write-Host ("REGISTRY // reviewed task registry v" + [string]$registry.version + " installed") -ForegroundColor Green
} finally {
  Remove-Item -LiteralPath $RegistryTemp -Force -ErrorAction SilentlyContinue
}

$ServiceRepairPath = Join-Path $HomeDir "repair-local-service.ps1"
Write-Host "SERVICE // aligning QQ health service with reviewed Clintware source" -ForegroundColor Cyan
Get-ReviewedQQAsset -Relative "tasks/repair-local-service.ps1" -Destination $ServiceRepairPath -Required @(
  "SERVICE_DEFERRED",
  "Repair-ServiceRegistration"
)

& $ServiceRepairPath -SkipRunnerRestart
if ($LASTEXITCODE -ne 0) { throw "QQ health-service alignment returned exit code $LASTEXITCODE." }

$runnerPid = 0
try {
  if (Test-Path $RunnerPidPath) {
    $raw = (Get-Content -LiteralPath $RunnerPidPath -Raw).Trim()
    [void][int]::TryParse($raw,[ref]$runnerPid)
  }
} catch {}

$restartHelper = Join-Path $HomeDir "apply-self-update.ps1"
$helperContent = @'
param(
  [int]$RunnerPid,
  [string]$TaskName,
  [string]$HomeDir
)

Start-Sleep -Seconds 8

if ($RunnerPid -gt 0) {
  try {
    $proc = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $RunnerPid) -ErrorAction Stop
    $line = [string]$proc.CommandLine
    if ($line -and ($line -like ("*" + $HomeDir + "*")) -and $line -match '(?i)(launcher|runner)\.ps1') {
      Stop-Process -Id $RunnerPid -Force -ErrorAction SilentlyContinue
    }
  } catch {}
}

Start-Sleep -Seconds 1

try { Enable-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Out-Null } catch {}
try { Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue } catch {}
Start-Sleep -Milliseconds 700

try {
  Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
} catch {
  try { schtasks.exe /Run /TN $TaskName | Out-Null } catch {}
}
'@
[IO.File]::WriteAllText($restartHelper,$helperContent,(New-Object Text.UTF8Encoding($false)))
Test-PowerShellFile -Path $restartHelper -Required @("Start-ScheduledTask","RunnerPid")

$pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
$hostExe = if ($pwsh) { $pwsh.Source } else { "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" }
$restartArgs = '-NoLogo -NoProfile -ExecutionPolicy Bypass -File "' + $restartHelper + '" -RunnerPid ' + $runnerPid + ' -TaskName "' + $TaskName + '" -HomeDir "' + $HomeDir + '"'
Start-Process -FilePath $hostExe -ArgumentList $restartArgs -WindowStyle Hidden | Out-Null

$pendingBinary = Join-Path $env:ProgramData "Clintware\QuillgeistLite\QuillgeistLiteHealthService.exe.pending"
if (Test-Path $pendingBinary) {
  Write-Host "PARTIAL // runner update is ready; Windows deferred the watchdog binary replacement." -ForegroundColor DarkYellow
} else {
  Write-Host "READY // QQ runtime and Python resolver reconciled." -ForegroundColor Green
}
Write-Host "RESTART // canonical QQ runner restart queued after result delivery" -ForegroundColor Cyan
