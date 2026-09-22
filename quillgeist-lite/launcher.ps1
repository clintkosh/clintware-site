$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$RunnerPath = Join-Path $HomeDir "runner.ps1"
$CrashLog = Join-Path $HomeDir "runner-crash.log"
$PidPath = Join-Path $HomeDir "runner.pid"
$RunnerUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/runner.ps1"

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

try {
  if (-not (Test-Path $RunnerPath)) {
    Invoke-WebRequest -Uri $RunnerUrl -OutFile $RunnerPath -UseBasicParsing
  }

  Set-Content -Path $PidPath -Value $PID -Encoding ASCII
  & $RunnerPath
}
catch {
  $stamp = (Get-Date).ToUniversalTime().ToString("o")
  $detail = $_.Exception.ToString()
  Add-Content -Path $CrashLog -Value "$stamp RUNNER_FATAL $detail"
  Write-Host ""
  Write-Host "QUILLGEIST LITE RUNNER FATAL ERROR" -ForegroundColor Red
  Write-Host $detail -ForegroundColor Red
  Start-Sleep -Seconds 8
  exit 1
}
finally {
  Remove-Item $PidPath -Force -ErrorAction SilentlyContinue
}
