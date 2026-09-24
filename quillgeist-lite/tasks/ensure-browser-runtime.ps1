param([switch]$Force)
$ErrorActionPreference = "Stop"
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$RuntimeDir = Join-Path $HomeDir "browser-runtime"
$PythonPath = Join-Path $RuntimeDir "Scripts\python.exe"
$MarkerPath = Join-Path $RuntimeDir "ready.json"
New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

function Resolve-SystemPython {
  foreach ($name in @("py.exe","python.exe","python3.exe")) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  throw "Python 3 is required for qq browser automation."
}

$healthy = $false
if (-not $Force -and (Test-Path $PythonPath) -and (Test-Path $MarkerPath)) {
  try {
    & $PythonPath -c "import playwright, mss, cv2; print('PLAYWRIGHT_RECORDING_READY')" | Out-Null
    if ($LASTEXITCODE -eq 0) { $healthy = $true }
  } catch {}
}
if ($healthy) {
  Write-Host "READY // qq browser runtime already installed" -ForegroundColor Green
  Write-Output $PythonPath
  exit 0
}

$systemPython = Resolve-SystemPython
Write-Host "BROWSER // building isolated qq Playwright runtime" -ForegroundColor Cyan
if (-not (Test-Path $PythonPath)) {
  if ((Split-Path $systemPython -Leaf).ToLowerInvariant() -eq "py.exe") { & $systemPython -3 -m venv $RuntimeDir }
  else { & $systemPython -m venv $RuntimeDir }
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $PythonPath)) { throw "Could not create qq browser virtual environment." }
}
& $PythonPath -m pip install --disable-pip-version-check --no-input --upgrade pip
if ($LASTEXITCODE -ne 0) { throw "pip upgrade failed." }
& $PythonPath -m pip install --disable-pip-version-check --no-input "playwright>=1.50,<2" "mss>=10,<11" "opencv-python-headless>=4.12,<5"
if ($LASTEXITCODE -ne 0) { throw "Playwright/screen-recording dependency installation failed." }
& $PythonPath -m playwright install chromium
if ($LASTEXITCODE -ne 0) { throw "Chromium installation failed." }

@{ready=$true;python=$PythonPath;updated_at=(Get-Date).ToUniversalTime().ToString("o")} |
  ConvertTo-Json | Set-Content -Path $MarkerPath -Encoding UTF8
Write-Host "READY // qq local browser + screen-recording runtime installed" -ForegroundColor Green
Write-Output $PythonPath
