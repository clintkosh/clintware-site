param(
  [Parameter(Mandatory=$true)][string]$Url
)
$ErrorActionPreference = "Stop"

$uri = [Uri]$Url
if ($uri.Scheme -ne "https") { throw "Only https URLs are allowed." }

$edge = $null
try {
  $safeProc = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.ExecutablePath -and
      (Test-Path $_.ExecutablePath) -and
      ($_.CommandLine -notmatch 'Clintware\\QuillgeistLite\\browser-profile') -and
      ($_.CommandLine -notmatch '--remote-debugging-(port|pipe)')
    } |
    Select-Object -First 1
  if ($safeProc) { $edge = $safeProc.ExecutablePath }
} catch {}

if (-not $edge) {
  foreach ($regPath in @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"
  )) {
    try {
      $candidate = Get-ItemPropertyValue -Path $regPath -Name "(default)" -ErrorAction Stop
      if ($candidate -and (Test-Path $candidate)) { $edge = $candidate; break }
    } catch {}
  }
}

if (-not $edge) {
  $pf86 = [Environment]::GetFolderPath('ProgramFilesX86')
  $pf64 = [Environment]::GetFolderPath('ProgramFiles')
  foreach ($candidate in @(
    (Join-Path $pf86 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $pf64 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe')
  )) {
    if ($candidate -and (Test-Path $candidate)) { $edge = $candidate; break }
  }
}

if (-not $edge) {
  Start-Process -FilePath ("microsoft-edge:" + $uri.AbsoluteUri) -ErrorAction Stop
  Write-Host "OPENED EDGE TAB // $($uri.AbsoluteUri)" -ForegroundColor Green
  exit 0
}

# Use the user's normal supported Edge session. Never route provider sign-in
# through the QQ Playwright/CDP profile because Google and other IdPs can
# reject automated or embedded-browser login surfaces.
Start-Process -FilePath $edge -ArgumentList @("--new-tab", $uri.AbsoluteUri) -ErrorAction Stop
Write-Host "OPENED SYSTEM EDGE TAB // $($uri.AbsoluteUri)" -ForegroundColor Green
Write-Host "AUTH MODE // normal browser session; no QQ automation flags" -ForegroundColor Cyan
