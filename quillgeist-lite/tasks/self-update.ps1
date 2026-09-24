$ErrorActionPreference = "Stop"
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$RepairPath = Join-Path $HomeDir "auto-repair-runtime.ps1"
$Remote = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/tasks/auto-repair-runtime.ps1"
New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

Write-Host "SYNC // refreshing qq self-heal engine" -ForegroundColor Cyan
$temp = $RepairPath + ".new"
Invoke-WebRequest -Uri ($Remote + "?cb=" + [Guid]::NewGuid().ToString("n")) -OutFile $temp -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
$tokens = $null; $errors = $null
[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $temp),[ref]$tokens,[ref]$errors) | Out-Null
if ($errors.Count -gt 0) {
  Remove-Item $temp -Force -ErrorAction SilentlyContinue
  throw "Updated qq self-heal engine failed PowerShell validation."
}
Move-Item $temp $RepairPath -Force
& $RepairPath -HomeDir $HomeDir
if ($LASTEXITCODE -ne 0) { throw "qq self-heal returned exit code $LASTEXITCODE." }
Write-Host "READY // qq updated in place. The current window stays open; no background restart or focus theft." -ForegroundColor Green
