$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$PackagedRoot = Join-Path $HomeDir "runtime\quillgeist-lite"
$RepairPath = Join-Path $HomeDir "auto-repair-runtime.ps1"

if (-not (Test-Path $PackagedRoot)) {
  throw "Packaged QQ runtime is missing. Install the current QQ.exe distribution."
}

$packagedRepair = Join-Path $PackagedRoot "tasks\auto-repair-runtime.ps1"
if (-not (Test-Path $packagedRepair)) {
  throw "Packaged QQ self-heal engine is missing."
}

Write-Host "SYNC // reconciling QQ from the packaged runtime" -ForegroundColor Cyan
Copy-Item -LiteralPath $packagedRepair -Destination $RepairPath -Force

$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $RepairPath),[ref]$tokens,[ref]$errors) | Out-Null
if ($errors.Count -gt 0) {
  throw "Packaged QQ self-heal engine failed PowerShell validation."
}

& $RepairPath -HomeDir $HomeDir -SourceRoot $PackagedRoot
if ($LASTEXITCODE -ne 0) { throw "QQ self-heal returned exit code $LASTEXITCODE." }

$ServiceRepairPath = Join-Path $HomeDir "repair-local-service.ps1"
if (-not (Test-Path $ServiceRepairPath)) {
  throw "QQ self-heal did not materialize the health-service repair script."
}

Write-Host "SERVICE // aligning QQ health service with packaged source" -ForegroundColor Cyan
& $ServiceRepairPath -SkipRunnerRestart
if ($LASTEXITCODE -ne 0) { throw "QQ health-service alignment returned exit code $LASTEXITCODE." }

$pendingBinary = Join-Path $env:ProgramData "Clintware\\QuillgeistLite\\QuillgeistLiteHealthService.exe.pending"
if (Test-Path $pendingBinary) {
  Write-Host "PARTIAL // QQ runner is reconciled; Windows deferred the health-service binary replacement." -ForegroundColor DarkYellow
} else {
  Write-Host "READY // QQ reconciled locally. Distribution upgrades are delivered through the maintained QQ.exe package." -ForegroundColor Green
}
