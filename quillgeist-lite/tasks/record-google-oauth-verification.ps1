param()
$ErrorActionPreference = "Stop"
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$Setup = Join-Path $HomeDir "ensure-browser-runtime.ps1"
$Capture = Join-Path $HomeDir "oauth_verification_capture.py"
$Python = Join-Path $HomeDir "browser-runtime\Scripts\python.exe"
$Base = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite"

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

function Refresh([string]$Remote,[string]$Target) {
  $temp = $Target + ".new"
  Invoke-WebRequest -Uri ($Base + "/" + $Remote + "?cb=" + [Guid]::NewGuid().ToString("n")) -OutFile $temp -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
  if (-not (Test-Path $temp) -or (Get-Item $temp).Length -lt 500) { throw "Download failed: $Remote" }
  Move-Item $temp $Target -Force
}

Refresh "tasks/ensure-browser-runtime.ps1" $Setup
Refresh "tools/oauth_verification_capture.py" $Capture

& $Setup
if (-not (Test-Path $Python)) { throw "qq browser runtime is unavailable." }

Write-Host "CAPTURE // A maximized browser will open for the real Google OAuth consent flow." -ForegroundColor Cyan
Write-Host "ACTION // Complete Google sign-in/consent in that browser. The rest of the demo is automatic." -ForegroundColor Yellow
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
& $Python $Capture
if ($LASTEXITCODE -ne 0) { throw "OAuth verification recording did not complete." }

Write-Host ("READY // " + (Join-Path $HOME "Downloads\Clintware-Google-OAuth-Verification-Demo.mp4")) -ForegroundColor Green
