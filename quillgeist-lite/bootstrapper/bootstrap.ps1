$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = "clintkosh/clintware-site"
$Raw = "https://raw.githubusercontent.com/clintkosh/clintware-site/main"
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

function Get-Gh {
  $cmd = Get-Command gh.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $known = Join-Path $env:ProgramFiles "GitHub CLI\gh.exe"
  if (Test-Path $known) { return $known }
  return $null
}

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path","Machine")
  $user = [Environment]::GetEnvironmentVariable("Path","User")
  $env:Path = ($machine + ";" + $user)
}

function Ensure-GitHubCli {
  $gh = Get-Gh
  if ($gh) { return $gh }

  Write-Step "GITHUB // CLI missing; installing official GitHub CLI"
  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if ($winget) {
    & $winget.Source install --id GitHub.cli --exact --silent --disable-interactivity --accept-source-agreements --accept-package-agreements
    Refresh-Path
    $gh = Get-Gh
    if ($gh) { return $gh }
  }

  Write-Step "GITHUB // winget unavailable; using official GitHub release MSI"
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/cli/cli/releases/latest" -Headers @{
    "User-Agent" = "Clintware-QQ"
    "Accept" = "application/vnd.github+json"
  }
  $asset = $release.assets | Where-Object { $_.name -match "_windows_amd64\.msi$" } | Select-Object -First 1
  if (-not $asset) { throw "Could not locate the official GitHub CLI Windows AMD64 MSI." }

  $msi = Join-Path $env:TEMP $asset.name
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $msi -UseBasicParsing
  $p = Start-Process msiexec.exe -ArgumentList @("/i",$msi,"/qn","/norestart") -Wait -PassThru
  Remove-Item $msi -Force -ErrorAction SilentlyContinue
  if ($p.ExitCode -notin @(0,3010)) { throw "GitHub CLI MSI install failed with exit code $($p.ExitCode)." }

  Refresh-Path
  $gh = Get-Gh
  if (-not $gh) { throw "GitHub CLI installed but gh.exe could not be resolved." }
  return $gh
}

function Ensure-GitHubAuth([string]$Gh) {
  & $Gh auth status --hostname github.com 1>$null 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Step "GITHUB // existing authorized identity found"
    return
  }

  Write-Step "GITHUB // one-time browser authorization required"
  & $Gh auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { throw "GitHub authorization was not completed." }

  & $Gh auth status --hostname github.com 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) { throw "GitHub authorization could not be verified." }
}

function Download-PS([string]$RepoPath,[string]$Destination) {
  $url = $Raw + "/" + $RepoPath + "?cb=" + [Guid]::NewGuid().ToString("n")
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

  $gh = Ensure-GitHubCli
  Ensure-GitHubAuth $gh

  $install = Join-Path $env:TEMP ("clintware-qq-install-" + [Guid]::NewGuid().ToString("n") + ".ps1")
  Download-PS "quillgeist-lite/install.ps1" $install

  Write-Step "QQ // installing canonical maintained runtime"
  & $install
  if ($LASTEXITCODE -ne 0) { throw "Canonical qq installer failed with exit code $LASTEXITCODE." }
  Remove-Item $install -Force -ErrorAction SilentlyContinue

  $dedupe = Join-Path $HomeDir "dedupe-qq-windows.ps1"
  Download-PS "quillgeist-lite/tasks/dedupe-qq-windows.ps1" $dedupe
  Write-Step "QQ // closing stale duplicate qq launcher windows only"
  & $dedupe -HomeDir $HomeDir

  $repair = Join-Path $HomeDir "auto-repair-runtime.ps1"
  Download-PS "quillgeist-lite/tasks/auto-repair-runtime.ps1" $repair
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
