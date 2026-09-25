param(
  [string]$SourceRoot = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$ServiceDir = Join-Path $HomeDir "service"
$RuntimeRoot = Join-Path $HomeDir "runtime"
$ProgramDir = Join-Path $env:ProgramData "Clintware\QuillgeistLite"
$ExistingConfigPath = Join-Path $ProgramDir "service.json"

$RunnerPath = Join-Path $HomeDir "runner.ps1"
$LauncherPath = Join-Path $HomeDir "launcher.ps1"
$ServiceSourcePath = Join-Path $ServiceDir "QuillgeistLiteHealthService.cs"
$ServiceInstallerPath = Join-Path $ServiceDir "install-service.ps1"
$TerminalRepairPath = Join-Path $HomeDir "terminal_repair.py"
$BootSplashPath = Join-Path $HomeDir "boot_splash.py"
$WindowHostPath = Join-Path $HomeDir "start-qq-window.ps1"
$BrowserAgentPath = Join-Path $HomeDir "browser_agent.py"
$BrowserSetupPath = Join-Path $HomeDir "ensure-browser-runtime.ps1"
$BrowserWorkPath = Join-Path $HomeDir "browser-work.ps1"
$EnsurePwshPath = Join-Path $HomeDir "ensure-powershell.ps1"
$AutoRepairPath = Join-Path $HomeDir "auto-repair-runtime.ps1"
$ServiceRepairPath = Join-Path $HomeDir "repair-local-service.ps1"
$RecoveryWatchPath = Join-Path $ServiceDir "recovery-watch.ps1"
$BootstrapPath = Join-Path $HomeDir "service-bootstrap.json"
$RegistryPath = Join-Path $HomeDir "tasks.json"
$LogoAssetPath = Join-Path $HomeDir "clintware-terminal-logo.b64"

Write-Host ""
Write-Host "=== INSTALL CLINTWARE QUILLGEIST LITE ===" -ForegroundColor Cyan
Write-Host "Local packaged runtime -> Clintware Control Plane -> local execution" -ForegroundColor DarkGray
Write-Host "No GitHub CLI, GitHub login, or direct GitHub runtime fetches." -ForegroundColor DarkGray
Write-Host ""

function Test-PowerShellFile([string]$Path) {
  $tokens = $null
  $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile(
    (Resolve-Path $Path),
    [ref]$tokens,
    [ref]$errors
  ) | Out-Null
  if ($errors.Count -gt 0) {
    $errors | Format-List *
    throw "PowerShell parse validation failed: $Path"
  }
}

function New-QQDeviceToken {
  $bytes = New-Object byte[] 48
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+","-").Replace("/","_")
}

function Get-TokenHash([string]$Token) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    $hashBytes = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Token))
  } finally {
    $sha.Dispose()
  }
  return (-join ($hashBytes | ForEach-Object { $_.ToString("x2") }))
}

function Test-ExistingQQEnrollment([object]$Config) {
  if (-not $Config -or -not $Config.DeviceId -or -not $Config.Token -or -not $Config.Endpoint) { return $false }
  try {
    $body = @{
      device_id = [string]$Config.DeviceId
      level = "INFO"
      phase = "installer"
      message = "existing_device_enrollment_verified"
      runner_alive = $false
      service_version = "installer"
      timestamp = (Get-Date).ToUniversalTime().ToString("o")
    } | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Method Post -Uri (([string]$Config.Endpoint).TrimEnd("/") + "/api/v1/quillgeist-lite/diagnostics") -Headers @{Authorization=("Bearer " + [string]$Config.Token)} -ContentType "application/json" -Body $body -TimeoutSec 20
    return $r.ok -eq $true
  } catch {
    return $false
  }
}

function Request-ClintwareEnrollment {
  param(
    [Parameter(Mandatory=$true)][string]$DeviceId,
    [Parameter(Mandatory=$true)][string]$DeviceToken
  )

  $tokenHash = Get-TokenHash $DeviceToken
  $nonce = [Guid]::NewGuid().ToString("n") + [Guid]::NewGuid().ToString("n")
  $tcp = New-Object System.Net.Sockets.TcpListener([Net.IPAddress]::Loopback,0)
  $tcp.Start()
  $port = ([Net.IPEndPoint]$tcp.LocalEndpoint).Port
  $tcp.Stop()

  $prefix = "http://127.0.0.1:$port/"
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add($prefix)

  try {
    $listener.Start()

    $callback = [Uri]::EscapeDataString($prefix)
    $device = [Uri]::EscapeDataString($DeviceId)
    $label = [Uri]::EscapeDataString("$DeviceId / $env:USERNAME")
    $hash = [Uri]::EscapeDataString($tokenHash)
    $safeNonce = [Uri]::EscapeDataString($nonce)
    $authorize = "https://mcp.clintware.com/admin/qq/enroll?device_id=$device&token_hash=$hash&label=$label&callback=$callback&nonce=$safeNonce"

    Write-Host "IDENTITY // opening Clintware device approval" -ForegroundColor Cyan
    Write-Host "Complete the Clintware Identity sign-in in the browser if requested." -ForegroundColor DarkYellow
    Start-Process $authorize

    $pending = $listener.GetContextAsync()
    if (-not $pending.Wait([TimeSpan]::FromMinutes(5))) {
      throw "Clintware device enrollment timed out."
    }

    $ctx = $pending.Result
    $status = [string]$ctx.Request.QueryString["status"]
    $returnedNonce = [string]$ctx.Request.QueryString["nonce"]

    $html = if ($status -eq "ok" -and $returnedNonce -eq $nonce) {
      "<!doctype html><html><body style='font-family:Segoe UI;padding:40px'><h1>QQ approved</h1><p>You can close this tab.</p></body></html>"
    } else {
      "<!doctype html><html><body style='font-family:Segoe UI;padding:40px'><h1>QQ approval failed</h1><p>Return to the installer.</p></body></html>"
    }
    $bytes = [Text.Encoding]::UTF8.GetBytes($html)
    $ctx.Response.ContentType = "text/html; charset=utf-8"
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length)
    $ctx.Response.OutputStream.Close()

    if ($status -ne "ok" -or $returnedNonce -ne $nonce) {
      throw "Clintware device enrollment did not complete successfully."
    }

    Write-Host "IDENTITY // QQ device approved by Clintware" -ForegroundColor Green
    return $true
  }
  finally {
    try { $listener.Stop() } catch {}
    try { $listener.Close() } catch {}
  }
}

New-Item -ItemType Directory -Force -Path $HomeDir,$ServiceDir,$RuntimeRoot | Out-Null

if (-not $SourceRoot) {
  $localPackaged = Join-Path $RuntimeRoot "quillgeist-lite"
  if (Test-Path (Join-Path $localPackaged "runner.ps1")) {
    $SourceRoot = $localPackaged
  } else {
    throw "Local packaged QQ runtime is missing. Run the maintained QQ.exe installer."
  }
}

$SourceRoot = (Resolve-Path $SourceRoot -ErrorAction Stop).Path
$RepoRoot = Split-Path $SourceRoot -Parent
Write-Host ("SOURCE // using packaged local runtime " + $SourceRoot) -ForegroundColor Cyan

$sources = @(
  @{ Relative = "runner.ps1"; Destination = $RunnerPath },
  @{ Relative = "launcher.ps1"; Destination = $LauncherPath },
  @{ Relative = "service/QuillgeistLiteHealthService.cs"; Destination = $ServiceSourcePath },
  @{ Relative = "service/install-service.ps1"; Destination = $ServiceInstallerPath },
  @{ Relative = "tools/terminal_repair.py"; Destination = $TerminalRepairPath },
  @{ Relative = "tools/boot_splash.py"; Destination = $BootSplashPath },
  @{ Relative = "tasks/start-qq-window.ps1"; Destination = $WindowHostPath },
  @{ Relative = "tools/browser_agent.py"; Destination = $BrowserAgentPath },
  @{ Relative = "tasks/ensure-browser-runtime.ps1"; Destination = $BrowserSetupPath },
  @{ Relative = "tasks/browser-work.ps1"; Destination = $BrowserWorkPath },
  @{ Relative = "tasks/ensure-powershell.ps1"; Destination = $EnsurePwshPath },
  @{ Relative = "tasks/auto-repair-runtime.ps1"; Destination = $AutoRepairPath },
  @{ Relative = "tasks/repair-local-service.ps1"; Destination = $ServiceRepairPath },
  @{ Relative = "service/recovery-watch.ps1"; Destination = $RecoveryWatchPath }
)

foreach ($entry in $sources) {
  $sourcePath = Join-Path $SourceRoot ($entry.Relative -replace "/","\")
  if (-not (Test-Path $sourcePath)) { throw "Local install source missing: $sourcePath" }
  Copy-Item -LiteralPath $sourcePath -Destination $entry.Destination -Force
  if (-not (Test-Path $entry.Destination)) { throw "Install source was not materialized: $($entry.Relative)" }
}

$registrySource = Join-Path $SourceRoot "tasks.json"
if (-not (Test-Path $registrySource)) { throw "Packaged QQ task registry is missing." }
Copy-Item -LiteralPath $registrySource -Destination $RegistryPath -Force

$logoSource = Join-Path $SourceRoot "assets\clintware-terminal-logo.b64"
if (Test-Path $logoSource) { Copy-Item -LiteralPath $logoSource -Destination $LogoAssetPath -Force }

Write-Host "RUNTIME // staging packaged allowlisted task sources" -ForegroundColor Cyan
$runtimeStage = $RuntimeRoot + ".new"
Remove-Item $runtimeStage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $runtimeStage | Out-Null

$qqRuntimeDest = Join-Path $runtimeStage "quillgeist-lite"
Copy-Item -LiteralPath $SourceRoot -Destination $qqRuntimeDest -Recurse -Force

$identitySource = Join-Path $RepoRoot "identity-broker"
if (Test-Path $identitySource) {
  Copy-Item -LiteralPath $identitySource -Destination (Join-Path $runtimeStage "identity-broker") -Recurse -Force
}

Remove-Item $RuntimeRoot -Recurse -Force -ErrorAction SilentlyContinue
Move-Item $runtimeStage $RuntimeRoot -Force

Write-Host "Validating local PowerShell files..." -ForegroundColor Cyan
foreach ($file in @($RunnerPath,$LauncherPath,$WindowHostPath,$BrowserSetupPath,$BrowserWorkPath,$ServiceInstallerPath,$EnsurePwshPath,$AutoRepairPath,$ServiceRepairPath,$RecoveryWatchPath)) {
  Test-PowerShellFile $file
}

Write-Host "Ensuring current PowerShell 7 runtime..." -ForegroundColor Cyan
try {
  & $EnsurePwshPath | Out-Host
} catch {
  Write-Host ("PWSH WARN // bootstrap will continue and launcher will retry: " + $_.Exception.Message) -ForegroundColor DarkYellow
}

Write-Host "Building the Clintware acrylic terminal profile and no-focus HUD..." -ForegroundColor Cyan
try {
  $py = Get-Command py.exe -ErrorAction SilentlyContinue
  if ($py) { & $py.Source -3 $TerminalRepairPath }
  else {
    $python = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($python) { & $python.Source $TerminalRepairPath }
  }
} catch {
  Write-Host ("GLASS WARN // terminal profile will self-repair on first QQ recovery: " + $_.Exception.Message) -ForegroundColor DarkYellow
}

$DeviceId = $env:COMPUTERNAME
$UserName = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$DeviceToken = $null
$Endpoint = "https://mcp.clintware.com"

if (Test-Path $ExistingConfigPath) {
  try {
    $existing = Get-Content $ExistingConfigPath -Raw | ConvertFrom-Json
    if (Test-ExistingQQEnrollment $existing) {
      $DeviceId = [string]$existing.DeviceId
      $DeviceToken = [string]$existing.Token
      $Endpoint = ([string]$existing.Endpoint).TrimEnd("/")
      Write-Host "IDENTITY // existing Clintware QQ device registration verified and reused" -ForegroundColor Green
    }
  } catch {
    Write-Host ("IDENTITY WARN // existing registration could not be reused: " + $_.Exception.Message) -ForegroundColor DarkYellow
  }
}

if (-not $DeviceToken) {
  Write-Host "IDENTITY // provisioning a new QQ device credential through Clintware" -ForegroundColor Cyan
  $DeviceToken = New-QQDeviceToken
  [void](Request-ClintwareEnrollment -DeviceId $DeviceId -DeviceToken $DeviceToken)
}

$bootstrap = [ordered]@{
  HomeDir = $HomeDir
  DeviceId = $DeviceId
  DeviceToken = $DeviceToken
  Endpoint = $Endpoint
  UserName = $UserName
}

$bootstrap | ConvertTo-Json -Depth 5 | Set-Content -Path $BootstrapPath -Encoding UTF8

$ServiceInstallMarker = Join-Path $HomeDir "service-install.ok"
Remove-Item $ServiceInstallMarker -Force -ErrorAction SilentlyContinue

try {
  Write-Host ""
  & $ServiceInstallerPath -BootstrapPath $BootstrapPath
  if (-not (Test-Path $ServiceInstallMarker)) {
    throw "Health service installation did not produce its success marker."
  }
}
finally {
  Remove-Item $BootstrapPath -Force -ErrorAction SilentlyContinue
  $DeviceToken = $null
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host " CLINTWARE QUILLGEIST LITE INSTALLED" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host "Source         : packaged inside QQ.exe"
Write-Host "Identity       : Clintware Identity / QQ device credential"
Write-Host "Control Plane  : https://mcp.clintware.com"
Write-Host "GitHub local   : not required"
Write-Host "Health service : ClintwareQuillgeistLiteHealth"
Write-Host "Runner task    : Clintware Quillgeist Lite Runner"
Write-Host ""
