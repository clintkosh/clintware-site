param(
  [string]$HomeDir = (Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite")
)

$ErrorActionPreference = "Stop"
$BaseUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite"
$LogPath = Join-Path $HomeDir "auto-repair.log"
$TaskName = "Clintware Quillgeist Lite Runner"
$PidPath = Join-Path $HomeDir "runner.pid"
New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

function Write-RepairLog([string]$Message) {
  $line = ((Get-Date).ToUniversalTime().ToString("o") + " " + $Message)
  Add-Content -Path $LogPath -Value $line
  Write-Host $Message
}
function Resolve-Pwsh {
  $cmd = Get-Command pwsh.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidate = Join-Path $env:ProgramFiles "PowerShell\7\pwsh.exe"
  if (Test-Path $candidate) { return $candidate }
  return "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
}
function Resolve-Python {
  foreach ($name in @("py.exe","python.exe","python3.exe")) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  return $null
}
function Test-RunnerAlive {
  try {
    if (-not (Test-Path $PidPath)) { return $false }
    $raw = (Get-Content $PidPath -Raw).Trim()
    $runnerPid = 0
    if (-not [int]::TryParse($raw,[ref]$runnerPid) -or $runnerPid -le 0) { return $false }
    return -not (Get-Process -Id $runnerPid -ErrorAction Stop).HasExited
  } catch { return $false }
}

Write-RepairLog "AUTO_REPAIR // reconciling qq against canonical Clintware source"

$specs = @(
  @{ Remote = "runner.ps1"; Local = "runner.ps1"; Kind = "powershell"; Required = "Show-QuillgeistSplash" },
  @{ Remote = "launcher.ps1"; Local = "launcher.ps1"; Kind = "powershell"; Required = "Show-WindowLoadSplash" },
  @{ Remote = "tools/boot_splash.py"; Local = "boot_splash.py"; Kind = "python"; Required = "No-focus acrylic HUD splash" },
  @{ Remote = "assets/clintware-terminal-logo.b64"; Local = "clintware-terminal-logo.b64"; Kind = "text"; Required = "iVBOR" },
  @{ Remote = "tools/terminal_repair.py"; Local = "terminal_repair.py"; Kind = "python"; Required = "Clintware Glass" },
  @{ Remote = "tools/browser_agent.py"; Local = "browser_agent.py"; Kind = "python"; Required = "local browser operator" },
  @{ Remote = "tasks/start-qq-window.ps1"; Local = "start-qq-window.ps1"; Kind = "powershell"; Required = "MutexName" },
  @{ Remote = "tasks/dedupe-qq-windows.ps1"; Local = "dedupe-qq-windows.ps1"; Kind = "powershell"; Required = "DEDUPE_QQ" },
  @{ Remote = "tasks/ensure-powershell.ps1"; Local = "ensure-powershell.ps1"; Kind = "powershell"; Required = "PWSH_READY" },
  @{ Remote = "tasks/repair-local-service.ps1"; Local = "repair-local-service.ps1"; Kind = "powershell"; Required = "Repair-ServiceRegistration" },
  @{ Remote = "tasks/ensure-browser-runtime.ps1"; Local = "ensure-browser-runtime.ps1"; Kind = "powershell"; Required = "Playwright" },
  @{ Remote = "tasks/browser-work.ps1"; Local = "browser-work.ps1"; Kind = "powershell"; Required = "browser_agent.py" }
)

foreach ($spec in $specs) {
  $target = Join-Path $HomeDir $spec.Local
  $temp = $target + ".new"
  Invoke-WebRequest -Uri ($BaseUrl + "/" + $spec.Remote + "?v=" + [DateTime]::UtcNow.Ticks) -OutFile $temp -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
  if (-not (Test-Path $temp)) { throw "Auto-repair download failed: $($spec.Remote)" }
  $raw = Get-Content $temp -Raw
  if ($raw -notlike ("*" + $spec.Required + "*")) { throw "Auto-repair structural validation failed: $($spec.Remote)" }

  if ($spec.Kind -eq "powershell") {
    $tokens = $null
    $errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $temp),[ref]$tokens,[ref]$errors) | Out-Null
    if ($errors.Count -gt 0) {
      Remove-Item $temp -Force -ErrorAction SilentlyContinue
      throw "Auto-repair PowerShell parse validation failed: $($spec.Remote)"
    }
  }
  Move-Item $temp $target -Force
  Write-RepairLog ("AUTO_REPAIR // refreshed " + $spec.Local)
}

try {
  $dedupePath = Join-Path $HomeDir "dedupe-qq-windows.ps1"
  if (Test-Path $dedupePath) {
    & $dedupePath -HomeDir $HomeDir
    Write-RepairLog "AUTO_REPAIR // duplicate qq windows reconciled"
  }
} catch {
  Write-RepairLog ("AUTO_REPAIR WARN // qq dedupe failed: " + $_.Exception.Message)
}

$pwsh = Resolve-Pwsh
$windowHost = Join-Path $HomeDir "start-qq-window.ps1"
$launcher = Join-Path $HomeDir "launcher.ps1"
$taskArgs = '-NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $windowHost + '" -LauncherPath "' + $launcher + '" -HomeDir "' + $HomeDir + '"'
try {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  $action = New-ScheduledTaskAction -Execute $pwsh -Argument $taskArgs -WorkingDirectory $HomeDir
  Set-ScheduledTask -TaskName $TaskName -Action $action | Out-Null
  Enable-ScheduledTask -TaskName $TaskName | Out-Null
  Write-RepairLog "AUTO_REPAIR // no-focus supervised launch action verified"
} catch {
  Write-RepairLog ("AUTO_REPAIR WARN // task rewrite failed: " + $_.Exception.Message)
}

try {
  $python = Resolve-Python
  $terminalRepair = Join-Path $HomeDir "terminal_repair.py"
  if ($python -and (Test-Path $terminalRepair)) {
    if ((Split-Path $python -Leaf).ToLowerInvariant() -eq "py.exe") { & $python -3 $terminalRepair }
    else { & $python $terminalRepair }
    if ($LASTEXITCODE -eq 0) { Write-RepairLog "AUTO_REPAIR // glass terminal profile verified" }
  }
} catch {
  Write-RepairLog ("AUTO_REPAIR WARN // terminal profile repair failed: " + $_.Exception.Message)
}

try {
  $svc = Get-Service -Name "ClintwareQuillgeistLiteHealth" -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -ne "Running") {
    Start-Service -Name "ClintwareQuillgeistLiteHealth" -ErrorAction SilentlyContinue
    Write-RepairLog "AUTO_REPAIR // health watchdog restored"
  }
} catch {
  Write-RepairLog ("AUTO_REPAIR WARN // health service restart failed: " + $_.Exception.Message)
}

if (-not (Test-RunnerAlive)) {
  try {
    Enable-ScheduledTask -TaskName $TaskName -ErrorAction Stop | Out-Null
    Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
    Write-RepairLog "AUTO_REPAIR // runner was down; no-focus recovery requested"
  } catch {
    Write-RepairLog ("AUTO_REPAIR WARN // runner recovery failed: " + $_.Exception.Message)
  }
} else {
  Write-RepairLog "AUTO_REPAIR // runner already healthy; no duplicate window opened"
}
Write-RepairLog "AUTO_REPAIR_READY // canonical files, service, profile, and launch policy reconciled"
