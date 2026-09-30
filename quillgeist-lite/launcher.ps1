param(
  [switch]$TerminalHost
)

$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$RunnerPath = Join-Path $HomeDir "runner.ps1"
$CrashLog = Join-Path $HomeDir "runner-crash.log"
$PidPath = Join-Path $HomeDir "runner.pid"
$RunnerUrl = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/runner.ps1"
$EnsurePwshPath = Join-Path $HomeDir "ensure-powershell.ps1"
$EnsurePwshUrl = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/tasks/ensure-powershell.ps1"
$AutoRepairPath = Join-Path $HomeDir "auto-repair-runtime.ps1"
$AutoRepairUrl = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/tasks/auto-repair-runtime.ps1"
$RegistryUrl = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/tasks.json"
$SelfUpdateUrl = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/tasks/self-update.ps1"
$RestartWindowUrl = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/tasks/restart-window.ps1"
$LauncherUrl = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/launcher.ps1"
$StartWindowUrl = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/tasks/start-qq-window.ps1"
$McpConsoleUrl = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/tasks/mcp-console.ps1"
$BootSplashUrl = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/tools/boot_splash.py"
$RuntimeVersionUrl = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime-version"
$RuntimeVersionPath = Join-Path $HomeDir "runtime-version.txt"
$script:QQRuntimeVersion = ""
$script:QQRuntimeRefreshRequired = $true

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null



function Initialize-QQRuntimeVersion {
  $localVersion = ""
  try { if(Test-Path $RuntimeVersionPath){$localVersion=(Get-Content -LiteralPath $RuntimeVersionPath -Raw).Trim()} } catch {}
  try {
    $remote = Invoke-RestMethod -Method Get -Uri $RuntimeVersionUrl -TimeoutSec 8 -ErrorAction Stop
    $remoteVersion = ([string]$remote.runtime_version).Trim()
    if($remoteVersion){
      $script:QQRuntimeVersion = $remoteVersion
      if($remoteVersion -eq $localVersion -and (Test-Path $RunnerPath) -and (Test-Path (Join-Path $HomeDir "tasks.json"))){
        return $false
      }
      return $true
    }
  } catch {
    Add-Content -Path $CrashLog -Value ("{0} RUNTIME_VERSION_WARN {1}" -f (Get-Date).ToUniversalTime().ToString("o"),$_.Exception.Message)
  }
  return (-not (Test-Path $RunnerPath))
}

function Ensure-QuillgeistHealthService {
  $serviceName = "ClintwareQuillgeistLiteHealth"
  try {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service -and $service.Status -ne "Running") {
      Start-Service -Name $serviceName -ErrorAction Stop
      $service.WaitForStatus([System.ServiceProcess.ServiceControllerStatus]::Running,[TimeSpan]::FromSeconds(15))
      Write-Host "SELF-HEAL // health service restored" -ForegroundColor Cyan
    }
  } catch {
    Add-Content -Path $CrashLog -Value ("{0} HEALTH_SERVICE_START_WARN {1}" -f (Get-Date).ToUniversalTime().ToString("o"),$_.Exception.Message)
  }
}

function Set-ClintwareBaseTheme {
  try {
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    [Console]::BackgroundColor = [ConsoleColor]::Black
    [Console]::ForegroundColor = [ConsoleColor]::White
  } catch {}

  try {
    $Host.UI.RawUI.BackgroundColor = "Black"
    $Host.UI.RawUI.ForegroundColor = "White"
    $Host.UI.RawUI.WindowTitle = "Clintware™ QQ // LOCAL RESPONDER"
  } catch {}

  try { Clear-Host } catch {}
}

function Update-LocalRunner {
  if (Test-Path $RunnerPath) { return $false }
  $temp = Join-Path $HomeDir "runner.next.ps1"

  try {
    Invoke-WebRequest -Uri ($RunnerUrl + "?cb=" + [Guid]::NewGuid().ToString("n")) -OutFile $temp -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}

    $tokens = $null
    $errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile($temp,[ref]$tokens,[ref]$errors) | Out-Null
    if ($errors.Count -gt 0) {
      throw "Downloaded runner failed PowerShell parse validation."
    }

    Move-Item -Path $temp -Destination $RunnerPath -Force
    return $true
  }
  catch {
    Remove-Item $temp -Force -ErrorAction SilentlyContinue
    if (-not (Test-Path $RunnerPath)) { throw }
    return $false
  }
}

function Sync-LatestQQFunctionality {
  $restorePath = Join-Path $HomeDir "restore-runtime.ps1"
  if (-not (Test-Path $restorePath) -or $script:QQRuntimeRefreshRequired) {
    $temp = $restorePath + ".new"
    Invoke-WebRequest -Uri "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/tools/restore-runtime.ps1" -OutFile $temp -UseBasicParsing -TimeoutSec 25
    $tokens = $null
    $errors = $null
    [Management.Automation.Language.Parser]::ParseFile($temp,[ref]$tokens,[ref]$errors) | Out-Null
    if ($errors.Count -gt 0) { throw "QQ runtime sync helper failed parse validation." }
    Move-Item -LiteralPath $temp -Destination $restorePath -Force
  }
  & $restorePath -HomeDir $HomeDir
  if (-not $script:QQRuntimeRefreshRequired) {
    Write-Host "CACHE" -ForegroundColor White -NoNewline
    Write-Host " // QQ runtime version unchanged; remote asset sync skipped" -ForegroundColor DarkCyan
    return
  }
  $syncFailed = $false
  $runtimeRoot = Join-Path $HomeDir "runtime\quillgeist-lite"
  $taskRoot = Join-Path $runtimeRoot "tasks"
  New-Item -ItemType Directory -Force -Path $runtimeRoot,$taskRoot | Out-Null

  $specs = @(
    @{ Url = $RunnerUrl; Path = $RunnerPath; Kind = "powershell"; Required = "function Get-QQRequestEnvelope" },
    @{ Url = $RegistryUrl; Path = (Join-Path $HomeDir "tasks.json"); Kind = "json"; Required = '"tasks"' },
    @{ Url = $RegistryUrl; Path = (Join-Path $runtimeRoot "tasks.json"); Kind = "json"; Required = '"tasks"' },
    @{ Url = $SelfUpdateUrl; Path = (Join-Path $taskRoot "self-update.ps1"); Kind = "powershell"; Required = "RESTART // canonical QQ runner restart queued after result delivery" },
    @{ Url = $RestartWindowUrl; Path = (Join-Path $taskRoot "restart-window.ps1"); Kind = "powershell"; Required = "qq window restart queued" },
    @{ Url = $LauncherUrl; Path = $PSCommandPath; Kind = "powershell"; Required = "Sync-LatestQQFunctionality" },
    @{ Url = $StartWindowUrl; Path = (Join-Path $HomeDir "start-qq-window.ps1"); Kind = "powershell"; Required = "Ensure-ClintwareTerminalFragment" },
    @{ Url = $McpConsoleUrl; Path = (Join-Path $HomeDir "mcp-console.ps1"); Kind = "powershell"; Required = "Get-ClintwareLineColor" },
    @{ Url = $BootSplashUrl; Path = (Join-Path $HomeDir "boot_splash.py"); Kind = "python"; Required = "Clintware™" }
  )

  foreach ($spec in $specs) {
    $temp = $spec.Path + ".boot-refresh"
    try {
      $requestUrl = $spec.Url
      if($script:QQRuntimeVersion){$requestUrl += $(if($requestUrl.Contains("?")){"&"}else{"?"}) + "runtime_version=" + [Uri]::EscapeDataString($script:QQRuntimeVersion)}
      Invoke-WebRequest -Uri $requestUrl -OutFile $temp -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
      $raw = Get-Content -LiteralPath $temp -Raw
      if (-not $raw.Contains([string]$spec.Required)) { throw ("QQ boot refresh structural validation failed: " + $spec.Path) }

      if ($spec.Kind -eq "powershell") {
        $tokens = $null
        $errors = $null
        [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $temp),[ref]$tokens,[ref]$errors) | Out-Null
        if ($errors.Count -gt 0) { throw ("QQ boot refresh PowerShell validation failed: " + $spec.Path) }
      } elseif ($spec.Kind -eq "json") {
        $parsed = $raw | ConvertFrom-Json
        if (-not $parsed.tasks) { throw ("QQ boot refresh registry validation failed: " + $spec.Path) }
      }

      Move-Item -LiteralPath $temp -Destination $spec.Path -Force
    } catch {
      $syncFailed = $true
      Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
      Add-Content -Path $CrashLog -Value ("{0} BOOT_REFRESH_WARN {1}" -f (Get-Date).ToUniversalTime().ToString("o"),$_.Exception.Message)
    }
  }

  if(-not $syncFailed -and $script:QQRuntimeVersion){
    try {[IO.File]::WriteAllText($RuntimeVersionPath,$script:QQRuntimeVersion,(New-Object Text.UTF8Encoding($false)))} catch {}
  }

  Write-Host "SYNC" -ForegroundColor White -NoNewline
  Write-Host " // latest qq functionality checked at boot" -ForegroundColor Cyan
}

function Ensure-ModernPowerShell {
  if ($env:QUILLGEIST_PWSH_BOOTSTRAPPED -eq "1") { return }

  try {
    foreach ($asset in @(
      @{ Url = $EnsurePwshUrl; Path = $EnsurePwshPath },
      @{ Url = $AutoRepairUrl; Path = $AutoRepairPath }
    )) {
      if((Test-Path $asset.Path) -and -not $script:QQRuntimeRefreshRequired){continue}
      $temp = $asset.Path + ".new"
      $requestUrl=$asset.Url
      if($script:QQRuntimeVersion){$requestUrl += "?runtime_version=" + [Uri]::EscapeDataString($script:QQRuntimeVersion)}
      Invoke-WebRequest -Uri $requestUrl -OutFile $temp -UseBasicParsing

      $tokens = $null
      $errors = $null
      [System.Management.Automation.Language.Parser]::ParseFile($temp,[ref]$tokens,[ref]$errors) | Out-Null
      if ($errors.Count -gt 0) { throw ("qq runtime asset failed parse validation: " + $asset.Path) }

      Move-Item $temp $asset.Path -Force
    }

    $resolved = @(& $EnsurePwshPath) | Select-Object -Last 1
    $resolved = [string]$resolved

    if ($resolved -and (Test-Path $resolved) -and $PSVersionTable.PSEdition -ne "Core") {
      Write-Host "PWSH // switching qq runtime to PowerShell 7" -ForegroundColor Cyan
      $env:QUILLGEIST_PWSH_BOOTSTRAPPED = "1"
      # The child is a different process and must be able to claim ownership.
      $launcherMutex.ReleaseMutex()
      $script:launcherOwnsMutex = $false
      & $resolved -NoLogo -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath
      exit $LASTEXITCODE
    }
  } catch {
    Add-Content -Path $CrashLog -Value ("{0} PWSH_BOOTSTRAP_WARN {1}" -f (Get-Date).ToUniversalTime().ToString("o"),$_.Exception.Message)
    Write-Host ("PWSH WARN // " + $_.Exception.Message) -ForegroundColor DarkYellow
  }
}

function Show-WindowLoadSplash {
  $SplashPath = Join-Path $HomeDir "boot_splash.py"
  try {
    if(-not(Test-Path $SplashPath)){
      Invoke-WebRequest -Uri $BootSplashUrl -OutFile ($SplashPath + ".new") -UseBasicParsing -TimeoutSec 20
      Move-Item ($SplashPath + ".new") $SplashPath -Force
    }
    $pyw = Get-Command pyw.exe -ErrorAction SilentlyContinue
    if ($pyw) { Start-Process -FilePath $pyw.Source -ArgumentList @("-3",$SplashPath) -WindowStyle Hidden | Out-Null; return }
    $pythonw = Get-Command pythonw.exe -ErrorAction SilentlyContinue
    if ($pythonw) { Start-Process -FilePath $pythonw.Source -ArgumentList @($SplashPath) -WindowStyle Hidden | Out-Null; return }
    $python = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($python) { Start-Process -FilePath $python.Source -ArgumentList @("-3",$SplashPath) -WindowStyle Hidden | Out-Null; return }
    $python = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($python) { Start-Process -FilePath $python.Source -ArgumentList @($SplashPath) -WindowStyle Hidden | Out-Null }
  } catch {
    Remove-Item ($SplashPath + ".new") -Force -ErrorAction SilentlyContinue
    Add-Content -Path $CrashLog -Value ("{0} SPLASH_FAILED {1}" -f (Get-Date).ToUniversalTime().ToString("o"),$_.Exception.Message)
  }
}

# Claim the same OS-owned mutex as runner.ps1 before publishing PID/heartbeat
# or syncing files. A rejected duplicate must never erase the active owner.
$launcherMutex = New-Object System.Threading.Mutex($false, "Local\ClintwareQuillgeistLiteV3")
$launcherOwnsMutex = $false
try { $launcherOwnsMutex = $launcherMutex.WaitOne(0,$false) }
catch [System.Threading.AbandonedMutexException] { $launcherOwnsMutex = $true }
if (-not $launcherOwnsMutex) {
  $launcherMutex.Dispose()
  return
}
try {
Set-Content -Path $PidPath -Value $PID -Encoding ASCII
$launcherHeartbeatAt=(Get-Date).ToUniversalTime()
@{
  version="2"
  runner_id=$env:COMPUTERNAME
  pid=$PID
  session_id=("launcher-"+$PID)
  state="starting"
  job_id=""
  task_id=""
  phase="launcher"
  sequence=1
  progress_sequence=0
  progress_at=""
  network_state="disconnected"
  timestamp=$launcherHeartbeatAt.ToString("o")
} | ConvertTo-Json | Set-Content -Path (Join-Path $HomeDir "runner-heartbeat.json") -Encoding UTF8
Set-ClintwareBaseTheme
Ensure-QuillgeistHealthService
$script:QQRuntimeRefreshRequired = Initialize-QQRuntimeVersion
Ensure-ModernPowerShell
Sync-LatestQQFunctionality
if($env:QQ_HEADLESS -ne "1"){Show-WindowLoadSplash}

  $updated = Update-LocalRunner
  Set-Content -Path $PidPath -Value $PID -Encoding ASCII

  if ($updated) {
    Write-Host "SYNC" -ForegroundColor White -NoNewline
    Write-Host " // latest Quillgeist Lite runner loaded" -ForegroundColor Cyan
    Start-Sleep -Milliseconds 200
  }

  & $RunnerPath
}
catch {
  $stamp = (Get-Date).ToUniversalTime().ToString("o")
  $detail = $_.Exception.ToString()
  Add-Content -Path $CrashLog -Value "$stamp RUNNER_FATAL $detail"

  Write-Host ""
  Write-Host "QUILLGEIST LITE // FATAL" -ForegroundColor Red
  Write-Host $detail -ForegroundColor Red
  Write-Host ""
  Write-Host "Recovery will be attempted by the Clintware health service." -ForegroundColor DarkYellow
  Start-Sleep -Seconds 8
  exit 1
}
finally {
  try {
    if ((Test-Path $PidPath) -and (Get-Content $PidPath -Raw).Trim() -eq [string]$PID) {
      Remove-Item $PidPath -Force -ErrorAction SilentlyContinue
    }
  } finally {
    if ($launcherOwnsMutex) { try { $launcherMutex.ReleaseMutex() } catch {} }
    $launcherMutex.Dispose()
  }
}
