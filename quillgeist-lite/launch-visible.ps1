$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$RunnerPath = Join-Path $HomeDir "runner.ps1"
$RunnerUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/runner.ps1"

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

Write-Host "Refreshing Clintware Quillgeist Lite..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $RunnerUrl -OutFile ($RunnerPath + ".new") -UseBasicParsing

$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile(
  (Resolve-Path ($RunnerPath + ".new")),
  [ref]$tokens,
  [ref]$errors
) | Out-Null

if ($errors.Count -gt 0) {
  $errors | Format-List *
  Remove-Item ($RunnerPath + ".new") -Force -ErrorAction SilentlyContinue
  throw "Downloaded runner failed PowerShell validation."
}

Move-Item ($RunnerPath + ".new") $RunnerPath -Force

# Stop stale Quillgeist Lite runner processes only.
try {
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.ProcessId -ne $PID -and
      [string]$_.CommandLine -match '(?i)Clintware\\QuillgeistLite\\runner\.ps1|quillgeist-lite\\runner\.ps1'
    } |
    ForEach-Object {
      try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {}
    }
} catch {}

Start-Sleep -Milliseconds 500

$psExe = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$psArgs = '-NoProfile -ExecutionPolicy Bypass -NoExit -File "' + $RunnerPath + '"'

$wt = Get-Command wt.exe -ErrorAction SilentlyContinue
if ($wt) {
  Write-Host "Opening visible Quillgeist Lite window in Windows Terminal..." -ForegroundColor Green
  Start-Process -FilePath $wt.Source -ArgumentList @("-w","new","new-tab",$psExe,"-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File",$RunnerPath)
} else {
  Write-Host "Opening visible Quillgeist Lite PowerShell window..." -ForegroundColor Green
  Start-Process -FilePath $psExe -ArgumentList $psArgs -WorkingDirectory $HomeDir -WindowStyle Normal
}

Write-Host "Launch requested. Look for a window titled: Clintware Quillgeist Lite" -ForegroundColor Green
