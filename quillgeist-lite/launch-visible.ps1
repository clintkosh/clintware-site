$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$LauncherPath = Join-Path $HomeDir "launcher.ps1"
$EnsurePwshPath = Join-Path $HomeDir "ensure-powershell.ps1"
$WindowHostPath = Join-Path $HomeDir "start-qq-window.ps1"
$BaseRaw = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite"

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

Write-Host "Refreshing Clintware Quillgeist Lite launcher..." -ForegroundColor Cyan

$downloads = @(
  @{ Url = "$BaseRaw/launcher.ps1?v=2026.09.24.10"; Target = $LauncherPath },
  @{ Url = "$BaseRaw/tasks/ensure-powershell.ps1?v=2026.09.24.10"; Target = $EnsurePwshPath },
  @{ Url = "$BaseRaw/tasks/start-qq-window.ps1?v=2026.09.24.10"; Target = $WindowHostPath }
)

foreach ($item in $downloads) {
  $temp = $item.Target + ".new"
  Invoke-WebRequest -Uri $item.Url -OutFile $temp -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}

  $tokens = $null
  $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $temp),[ref]$tokens,[ref]$errors) | Out-Null
  if ($errors.Count -gt 0) {
    Remove-Item $temp -Force -ErrorAction SilentlyContinue
    throw "Downloaded qq launcher component failed PowerShell validation: $($item.Target)"
  }

  Move-Item $temp $item.Target -Force
}

$pwshPath = $null
try {
  $pwshPath = @(& $EnsurePwshPath) | Select-Object -Last 1
  $pwshPath = [string]$pwshPath
} catch {
  Write-Host ("PWSH WARN // " + $_.Exception.Message) -ForegroundColor DarkYellow
}

if (-not $pwshPath -or -not (Test-Path $pwshPath)) {
  $pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
  if ($pwsh) { $pwshPath = $pwsh.Source }
}

if (-not $pwshPath -or -not (Test-Path $pwshPath)) {
  $pwshPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
}

Write-Host "Opening the managed Quillgeist Lite glass console without stealing focus..." -ForegroundColor Green
Start-Process -FilePath $pwshPath -ArgumentList @("-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-WindowStyle","Hidden","-File",$WindowHostPath,"-LauncherPath",$LauncherPath,"-HomeDir",$HomeDir) -WorkingDirectory $HomeDir -WindowStyle Hidden | Out-Null

Write-Host "Launch requested. Existing healthy qq windows are reused rather than duplicated." -ForegroundColor Green
