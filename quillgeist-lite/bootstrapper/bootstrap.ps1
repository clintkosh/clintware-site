$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$RuntimeBase = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime"
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$LogPath = Join-Path $HomeDir "portable-installer.log"
$ResultPath = Join-Path $HomeDir "portable-install-result.json"
$TaskName = "Clintware Quillgeist Lite Runner"
$ServiceName = "ClintwareQuillgeistLiteHealth"

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

function Write-Step([string]$Message) {
  $line = ((Get-Date).ToUniversalTime().ToString("o") + " " + $Message)
  Add-Content -Path $LogPath -Value $line -Encoding UTF8
  Write-Host $Message -ForegroundColor Cyan
}

function Test-PowerShellFile([string]$Path) {
  $tokens = $null
  $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile(
    (Resolve-Path $Path),
    [ref]$tokens,
    [ref]$errors
  ) | Out-Null
  if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Step ("PARSE ERROR // " + $_.Message) }
    throw "Downloaded PowerShell file failed parse validation: $Path"
  }
}

function Download-PS([string]$RuntimePath,[string]$Destination) {
  $url = $RuntimeBase.TrimEnd("/") + "/" + $RuntimePath + "?cb=" + [Guid]::NewGuid().ToString("n")
  Invoke-WebRequest -Uri $url -OutFile $Destination -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
  Test-PowerShellFile $Destination
}

function Test-RunnerAlive {
  $pidPath = Join-Path $HomeDir "runner.pid"
  try {
    if (-not (Test-Path $pidPath)) { return $false }
    $rawPid = (Get-Content $pidPath -Raw).Trim()
    $runnerPid = 0
    if (-not [int]::TryParse($rawPid,[ref]$runnerPid) -or $runnerPid -le 0) { return $false }
    return -not (Get-Process -Id $runnerPid -ErrorAction Stop).HasExited
  } catch { return $false }
}

try {
  Write-Step "QQ // one-click install/repair starting"
  Write-Step "CONTROL PLANE // staging reviewed runtime; GitHub CLI/auth not required"

  $restore = Join-Path $env:TEMP ("clintware-qq-restore-" + [Guid]::NewGuid().ToString("n") + ".ps1")
  Download-PS "tools/restore-runtime.ps1" $restore
  & $restore -HomeDir $HomeDir
  if ($LASTEXITCODE -ne 0) { throw "QQ runtime staging failed with exit code $LASTEXITCODE." }
  Remove-Item $restore -Force -ErrorAction SilentlyContinue

  $sourceRoot = Join-Path $HomeDir "runtime\quillgeist-lite"
  $install = Join-Path $sourceRoot "install.ps1"
  if (-not (Test-Path $install)) { throw "Packaged QQ installer is missing after Control Plane runtime staging." }

  Write-Step "QQ // installing canonical maintained runtime"
  & $install -SourceRoot $sourceRoot
  if ($LASTEXITCODE -ne 0) { throw "Canonical qq installer failed with exit code $LASTEXITCODE." }

  $dedupe = Join-Path $sourceRoot "tasks\dedupe-qq-windows.ps1"
  Write-Step "QQ // closing stale duplicate qq launcher windows only"
  & $dedupe -HomeDir $HomeDir

  $repair = Join-Path $sourceRoot "tasks\auto-repair-runtime.ps1"
  Write-Step "QQ // reconciling service, singleton launch gate, and maintained runtime"
  & $repair -HomeDir $HomeDir

  Write-Step "QQ // final duplicate-window pass"
  & $dedupe -HomeDir $HomeDir

  $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
  if (-not $service) { throw "qq health service is not installed." }
  if ($service.Status -ne "Running") {
    Start-Service -Name $ServiceName
    (Get-Service -Name $ServiceName).WaitForStatus(
      [System.ServiceProcess.ServiceControllerStatus]::Running,
      [TimeSpan]::FromSeconds(20)
    )
  }

  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $task) { throw "qq supervised runner task is not installed." }
  Enable-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Out-Null

  if (-not (Test-RunnerAlive)) {
    Write-Step "QQ // starting supervised singleton runner"
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 5
  }

  if (-not (Test-RunnerAlive)) { throw "qq runner did not become live." }

  $checkInRequested = $false
  try {
    Write-Step "CHECK-IN // requesting qq Local Status"
    & $gh workflow run qq-local-status.yml --repo $Repo --ref main
    if ($LASTEXITCODE -eq 0) {
      $checkInRequested = $true
      Write-Step "CHECK-IN // requested"
    } else {
      Write-Step "CHECK-IN WARN // workflow dispatch unavailable; runner remains registered"
    }
  } catch {
    Write-Step ("CHECK-IN WARN // " + $_.Exception.Message)
  }

  $result = [ordered]@{
    status = "ready"
    installed_at = (Get-Date).ToUniversalTime().ToString("o")
    control_plane = "https://mcp.clintware.com"
    service = (Get-Service -Name $ServiceName).Status.ToString()
    runner_alive = $true
    duplicate_window_guard = "enabled"
    check_in_requested = $checkInRequested
    log_path = $LogPath
  }

  [IO.File]::WriteAllText(
    $ResultPath,
    ($result | ConvertTo-Json -Depth 6),
    (New-Object Text.UTF8Encoding($false))
  )

  Write-Step "READY // qq installed, connected, supervised, and duplicate-window protected"
  exit 0
}
catch {
  $message = $_.Exception.ToString()
  try { Add-Content -Path $LogPath -Value ((Get-Date).ToUniversalTime().ToString("o") + " FATAL " + $message) -Encoding UTF8 } catch {}
  Write-Host ""
  Write-Host "QQ // INSTALL FAILED" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host ("Log: " + $LogPath) -ForegroundColor DarkYellow
  exit 1
}
