$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$ShortcutPath = Join-Path ([Environment]::GetFolderPath("Startup")) "Clintware Quillgeist Lite.lnk"

if (Test-Path $ShortcutPath) {
  Remove-Item $ShortcutPath -Force
}

Write-Host "Startup registration removed." -ForegroundColor Green
Write-Host "Close any running 'Clintware Quillgeist Lite' PowerShell window." -ForegroundColor Yellow
Write-Host "Local files remain at $HomeDir for logs/history. Delete that folder if you want a full local cleanup."
