$ErrorActionPreference = "Stop"

Write-Host "=== CODEX / ORG APP IDENTITY REPAIR ===" -ForegroundColor Cyan
Write-Host ("DEVICE // " + $env:COMPUTERNAME) -ForegroundColor Cyan

$state = (& dsregcmd.exe /status 2>&1 | Out-String)
$workplaceJoined = $state -match 'WorkplaceJoined\s*:\s*YES'
$azureJoined = $state -match 'AzureAdJoined\s*:\s*YES'
$wamConsumers = $state -match 'WamDefaultAuthority\s*:\s*consumers'
Write-Host ("WINDOWS // AzureAdJoined=" + $azureJoined + " WorkplaceJoined=" + $workplaceJoined + " WAMConsumers=" + $wamConsumers)

$codexHome = [Environment]::GetEnvironmentVariable("CODEX_HOME","User")
$codexHomeValid = $false
if ($codexHome) {
  try {
    $root = [IO.Path]::GetPathRoot($codexHome)
    $codexHomeValid = [bool]($root -and (Test-Path -LiteralPath $root))
  } catch {
    $codexHomeValid = $false
  }
}

if (-not $codexHomeValid) {
  $previousCodexHome = $codexHome
  $codexHome = Join-Path $env:USERPROFILE ".codex"
  [Environment]::SetEnvironmentVariable("CODEX_HOME",$codexHome,"User")
  if ($previousCodexHome) {
    Write-Host ("CODEX_HOME_REPAIR // invalid prior value replaced: " + $previousCodexHome) -ForegroundColor Yellow
  } else {
    Write-Host "CODEX_HOME_REPAIR // user CODEX_HOME initialized" -ForegroundColor Yellow
  }
}

New-Item -ItemType Directory -Force -Path $codexHome | Out-Null
$env:CODEX_HOME = $codexHome
Write-Host ("CODEX_HOME // " + $codexHome) -ForegroundColor Green

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) { $npm = Get-Command npm.exe -ErrorAction SilentlyContinue }
if (-not $npm) { throw "Node is present but npm was not found; Codex repair cannot continue safely." }

$codex = Get-Command codex.cmd -ErrorAction SilentlyContinue
if (-not $codex) { $codex = Get-Command codex.exe -ErrorAction SilentlyContinue }
if (-not $codex) { $codex = Get-Command codex -ErrorAction SilentlyContinue }

if (-not $codex) {
  Write-Host "CODEX // CLI missing; installing official @openai/codex@latest" -ForegroundColor Yellow
  & $npm.Source install -g "@openai/codex@latest"
  if ($LASTEXITCODE -ne 0) { throw "npm failed to install @openai/codex@latest." }

  $npmPrefix = (& $npm.Source prefix -g 2>$null | Out-String).Trim()
  $candidatePaths = @(
    (Join-Path $env:APPDATA "npm\codex.cmd"),
    (Join-Path $npmPrefix "codex.cmd"),
    (Join-Path $npmPrefix "codex.exe")
  ) | Where-Object { $_ -and (Test-Path $_) }

  if ($candidatePaths.Count -gt 0) {
    $codexPath = $candidatePaths[0]
  } else {
    $codex = Get-Command codex.cmd -ErrorAction SilentlyContinue
    if (-not $codex) { $codex = Get-Command codex -ErrorAction SilentlyContinue }
    if (-not $codex) { throw "Codex package installed but executable was not found." }
    $codexPath = $codex.Source
  }
} else {
  $codexPath = $codex.Source
}

Write-Host ("CODEX_BIN // " + $codexPath) -ForegroundColor Green
try {
  $version = (& $codexPath --version 2>&1 | Out-String).Trim()
  Write-Host ("CODEX_VERSION // " + $version) -ForegroundColor Green
} catch {
  throw ("Codex executable is present but failed to run: " + $_.Exception.Message)
}

$statusBefore = ""
try { $statusBefore = (& $codexPath login status 2>&1 | Out-String).Trim() } catch {}
if ($statusBefore) { Write-Host ("CODEX_AUTH_BEFORE // " + ($statusBefore -replace '\r?\n',' | ')) }

# The stale DRIZNET Codex session was explicitly cleared by the first successful
# repair. On subsequent runs, a current authenticated session is verification
# evidence and must not be logged out again.
if ($statusBefore -match '(?i)logged in') {
  if ($azureJoined -or $workplaceJoined) {
    throw "Unexpected Windows organization enrollment detected; refusing to alter the authenticated Codex session."
  }
  Write-Host "VERIFY_PASS // Codex is authenticated and this PC remains unmanaged." -ForegroundColor Green
  exit 0
}

# The user explicitly reported the current Codex profile is wrong. Clear only
# Codex's own session. Do not delete CODEX_HOME configuration, projects, or
# unrelated Windows/browser credentials.
try {
  & $codexPath logout 2>&1 | ForEach-Object { Write-Host ("CODEX_LOGOUT // " + $_) }
} catch {
  Write-Host ("CODEX_LOGOUT_WARN // " + $_.Exception.Message) -ForegroundColor DarkYellow
}

# Provider sign-in is a separate security boundary. Open only supported,
# normal user surfaces; never automate passwords/MFA or identity-provider UI.
# Keep DRIZNET unmanaged: do not open Access work or school and do not
# invoke dsregcmd join/leave, workplace enrollment, MDM, or Entra device join.
# If a Microsoft work-account browser session is needed, use the normal
# supported system Edge session only.
try {
  $orgUrl = "https://myaccount.microsoft.com/"
  $edge = $null
  try {
    $safeProc = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue |
      Where-Object {
        $_.ExecutablePath -and (Test-Path $_.ExecutablePath) -and
        ($_.CommandLine -notmatch 'Clintware\\QuillgeistLite\\browser-profile') -and
        ($_.CommandLine -notmatch '--remote-debugging-(port|pipe)')
      } | Select-Object -First 1
    if ($safeProc) { $edge = $safeProc.ExecutablePath }
  } catch {}
  if (-not $edge) {
    foreach ($regPath in @(
      "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe",
      "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe",
      "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe"
    )) {
      try {
        $candidate = Get-ItemPropertyValue -Path $regPath -Name "(default)" -ErrorAction Stop
        if ($candidate -and (Test-Path $candidate)) { $edge = $candidate; break }
      } catch {}
    }
  }
  if ($edge) {
    Start-Process -FilePath $edge -ArgumentList @("--new-tab",$orgUrl) -ErrorAction Stop
  } else {
    Start-Process -FilePath ("microsoft-edge:" + $orgUrl) -ErrorAction Stop
  }
  Write-Host "ORG_HANDOFF // normal Edge work-account page opened; device join/enrollment not invoked" -ForegroundColor Yellow
} catch {
  Write-Host ("ORG_HANDOFF_WARN // " + $_.Exception.Message) -ForegroundColor DarkYellow
}

$pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
$hostExe = if ($pwsh) { $pwsh.Source } else { "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" }
$loginCommand = "& '" + ($codexPath -replace "'","''") + "' login; Write-Host ''; & '" + ($codexPath -replace "'","''") + "' login status"
$args = @("-NoLogo","-NoExit","-Command",$loginCommand)
Start-Process -FilePath $hostExe -ArgumentList $args
Write-Host "CODEX_HANDOFF // interactive Codex login opened in a normal terminal/browser flow" -ForegroundColor Yellow

$appx = Get-AppxPackage -ErrorAction SilentlyContinue | Where-Object {
  $_.Name -match '(?i)(OpenAI|ChatGPT|Codex)' -or $_.PackageFamilyName -match '(?i)(OpenAI|ChatGPT|Codex)'
} | Select-Object Name,Version,PackageFamilyName
if ($appx) {
  Write-Host "APPX // installed OpenAI/ChatGPT/Codex packages:"
  $appx | Format-Table -AutoSize | Out-String | Write-Host
}

Write-Host "STATUS // local repair complete; waiting only on user-controlled provider sign-in" -ForegroundColor Green
Write-Host "VERIFY_AFTER_SIGNIN // run this QQ task again or use codex login status after completing the opened sign-in surfaces." -ForegroundColor Cyan
