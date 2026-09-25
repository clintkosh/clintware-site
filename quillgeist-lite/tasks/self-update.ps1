$ErrorActionPreference = "Stop"
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$RepairPath = Join-Path $HomeDir "auto-repair-runtime.ps1"
$Remote = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/tasks/auto-repair-runtime.ps1"
New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

Write-Host "SYNC // refreshing qq self-heal engine" -ForegroundColor Cyan
$temp = $RepairPath + ".new"

# Prefer GitHub's contents API so self-update always reads the current default-branch
# blob instead of a potentially stale raw.githubusercontent.com edge response.
try {
  $api = "https://api.github.com/repos/clintkosh/clintware-site/contents/quillgeist-lite/tasks/auto-repair-runtime.ps1?ref=main&cb=" + [Guid]::NewGuid().ToString("n")
  $headers = @{
    "Accept" = "application/vnd.github+json"
    "User-Agent" = "Clintware-Quillgeist-Lite"
    "Cache-Control" = "no-cache"
  }
  $meta = Invoke-RestMethod -Uri $api -Headers $headers -Method Get
  if (-not $meta.content) { throw "GitHub contents API returned no file content." }
  $bytes = [Convert]::FromBase64String(([string]$meta.content -replace '\s',''))
  [IO.File]::WriteAllBytes($temp,$bytes)
} catch {
  Write-Host ("SYNC WARN // GitHub API fetch failed; using raw fallback: " + $_.Exception.Message) -ForegroundColor DarkYellow
  Invoke-WebRequest -Uri ($Remote + "?cb=" + [Guid]::NewGuid().ToString("n")) -OutFile $temp -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
}

$tokens = $null; $errors = $null
[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $temp),[ref]$tokens,[ref]$errors) | Out-Null
if ($errors.Count -gt 0) {
  Remove-Item $temp -Force -ErrorAction SilentlyContinue
  throw "Updated qq self-heal engine failed PowerShell validation."
}
Move-Item $temp $RepairPath -Force
& $RepairPath -HomeDir $HomeDir
if ($LASTEXITCODE -ne 0) { throw "qq self-heal returned exit code $LASTEXITCODE." }

$ServiceRepairPath = Join-Path $HomeDir "repair-local-service.ps1"
if (-not (Test-Path $ServiceRepairPath)) {
  throw "qq self-heal did not materialize the health-service repair script."
}

Write-Host "SERVICE // aligning qq health service with canonical source" -ForegroundColor Cyan
& $ServiceRepairPath -SkipRunnerRestart
if ($LASTEXITCODE -ne 0) { throw "qq health-service alignment returned exit code $LASTEXITCODE." }

Write-Host "READY // qq runner and health service updated in place. The current window stays open; no duplicate launch requested." -ForegroundColor Green
