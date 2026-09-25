param(
  [switch]$TerminalHost
)

$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$RunnerPath = Join-Path $HomeDir "runner.ps1"
$CrashLog = Join-Path $HomeDir "runner-crash.log"
$PidPath = Join-Path $HomeDir "runner.pid"
$RunnerUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/runner.ps1"
$EnsurePwshPath = Join-Path $HomeDir "ensure-powershell.ps1"
$EnsurePwshUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/tasks/ensure-powershell.ps1"
$AutoRepairPath = Join-Path $HomeDir "auto-repair-runtime.ps1"
$AutoRepairUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/tasks/auto-repair-runtime.ps1"

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null


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
    $Host.UI.RawUI.WindowTitle = "Clintware Quillgeist Lite"
  } catch {}

  try { Clear-Host } catch {}
}

function Update-LocalRunner {
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

function Ensure-ModernPowerShell {
  if ($env:QUILLGEIST_PWSH_BOOTSTRAPPED -eq "1") { return }

  try {
    foreach ($asset in @(
      @{ Url = $EnsurePwshUrl; Path = $EnsurePwshPath },
      @{ Url = $AutoRepairUrl; Path = $AutoRepairPath }
    )) {
      $temp = $asset.Path + ".new"
      Invoke-WebRequest -Uri ($asset.Url + "?cb=" + [Guid]::NewGuid().ToString("n")) -OutFile $temp -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}

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
  $SplashUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/tools/boot_splash.py?cb=$([Guid]::NewGuid().ToString('n'))"
  $LogoPath = Join-Path $HomeDir "clintware-terminal-logo.b64"
  $LogoUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/assets/clintware-terminal-logo.b64?cb=$([Guid]::NewGuid().ToString('n'))"

  try {
    Invoke-WebRequest -Uri $SplashUrl -OutFile ($SplashPath + ".new") -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
    Invoke-WebRequest -Uri $LogoUrl -OutFile ($LogoPath + ".new") -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
    $logoRaw = (Get-Content ($LogoPath + ".new") -Raw).Trim()
    if (-not $logoRaw.StartsWith("iVBOR")) { throw "Downloaded Clintware logo asset is invalid." }
    Move-Item ($SplashPath + ".new") $SplashPath -Force
    Move-Item ($LogoPath + ".new") $LogoPath -Force

    $pyw = Get-Command pyw.exe -ErrorAction SilentlyContinue
    if ($pyw) {
      Start-Process -FilePath $pyw.Source -ArgumentList @("-3",$SplashPath) -WindowStyle Hidden | Out-Null
      return
    }
    $pythonw = Get-Command pythonw.exe -ErrorAction SilentlyContinue
    if ($pythonw) {
      Start-Process -FilePath $pythonw.Source -ArgumentList @($SplashPath) -WindowStyle Hidden | Out-Null
      return
    }
    $python = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($python) {
      Start-Process -FilePath $python.Source -ArgumentList @("-3",$SplashPath) -WindowStyle Hidden | Out-Null
      return
    }
    $python = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($python) {
      Start-Process -FilePath $python.Source -ArgumentList @($SplashPath) -WindowStyle Hidden | Out-Null
    }
  } catch {
    Remove-Item ($SplashPath + ".new") -Force -ErrorAction SilentlyContinue
    Remove-Item ($LogoPath + ".new") -Force -ErrorAction SilentlyContinue
    Add-Content -Path $CrashLog -Value ("{0} SPLASH_FAILED {1}" -f (Get-Date).ToUniversalTime().ToString("o"),$_.Exception.Message)
  }
}

Set-ClintwareBaseTheme
Ensure-QuillgeistHealthService
Ensure-ModernPowerShell
Show-WindowLoadSplash

try {
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
  Remove-Item $PidPath -Force -ErrorAction SilentlyContinue
}
