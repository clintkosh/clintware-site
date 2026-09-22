$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$RunnerPath = Join-Path $HomeDir "runner.ps1"
$RunnerUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/runner.ps1"
$StartupDir = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $StartupDir "Clintware Quillgeist Lite.lnk"

Write-Host ""
Write-Host "=== INSTALL CLINTWARE QUILLGEIST LITE ===" -ForegroundColor Cyan
Write-Host "Event-driven MCP -> local PowerShell / Python / C bridge" -ForegroundColor DarkGray
Write-Host ""

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "Installing GitHub CLI..." -ForegroundColor Cyan
    winget install --id GitHub.cli --exact --source winget --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { throw "GitHub CLI installation failed." }

    $possibleGh = Join-Path $env:ProgramFiles "GitHub CLI"
    if (Test-Path $possibleGh) { $env:Path += ";$possibleGh" }
  } else {
    throw "GitHub CLI is required and winget is not available."
  }
}

gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Authenticating GitHub CLI..." -ForegroundColor Cyan
  gh auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { throw "GitHub authentication failed." }
}

$login = (gh api user --jq .login).Trim()
if ($LASTEXITCODE -ne 0 -or $login.ToLowerInvariant() -ne "clintkosh") {
  throw "Quillgeist Lite expects the Clintware GitHub identity 'clintkosh'. Current identity: $login"
}

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null
Invoke-WebRequest -Uri $RunnerUrl -OutFile $RunnerPath -UseBasicParsing
if (-not (Test-Path $RunnerPath)) { throw "Could not install the Quillgeist Lite runner." }

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$Shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -NoExit -File "' + $RunnerPath + '"'
$Shortcut.WorkingDirectory = $HomeDir
$Shortcut.WindowStyle = 1
$Shortcut.Description = "Clintware Quillgeist Lite event-driven local runner"
$Shortcut.Save()

Write-Host "Installed runner: $RunnerPath" -ForegroundColor Green
Write-Host "Startup link:     $ShortcutPath" -ForegroundColor Green
Write-Host ""
Write-Host "Starting Quillgeist Lite now..." -ForegroundColor Cyan
Start-Process -FilePath $Shortcut.TargetPath -ArgumentList $Shortcut.Arguments -WorkingDirectory $HomeDir -WindowStyle Normal

Write-Host ""
Write-Host "SUCCESS" -ForegroundColor Green
Write-Host "Quillgeist Lite will reconnect automatically after Windows sign-in." -ForegroundColor Green
Write-Host "It uses an outbound WebSocket, not scheduled polling." -ForegroundColor Green
Write-Host "The startup window stays visible so the animated Clintware splash and live task logs are available." -ForegroundColor Green
