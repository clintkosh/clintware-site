param(
  [switch]$NoElevate
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$BootstrapUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/bootstrap.ps1"
$ArchiveUrl = "https://codeload.github.com/clintkosh/clintware-site/zip/refs/heads/main"
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$ResultPath = Join-Path $HomeDir "bootstrap-result.json"
$TaskName = "Clintware Quillgeist Lite Runner"
$ServiceName = "ClintwareQuillgeistLiteHealth"

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not $NoElevate -and -not (Test-Administrator)) {
  $cmd = "irm '$BootstrapUrl?cb=$([Guid]::NewGuid().ToString("n"))' | iex"
  Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList @(
    "-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-Command",$cmd
  ) -Verb RunAs
  return
}

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null
$work = Join-Path $env:TEMP ("Clintware-QQ-Bootstrap-" + [Guid]::NewGuid().ToString("n"))
$zip = Join-Path $work "repo.zip"
$src = Join-Path $work "src"
New-Item -ItemType Directory -Force -Path $work,$src | Out-Null

$steps = [System.Collections.Generic.List[object]]::new()
function Record-Step([string]$Name,[bool]$Ok,[string]$Detail) {
  $steps.Add([pscustomobject]@{
    name=$Name; ok=$Ok; detail=$Detail; at=(Get-Date).ToUniversalTime().ToString("o")
  })
}
function Run-Step([string]$Name,[scriptblock]$Action,[int]$Attempts=2,[switch]$NonFatal) {
  for ($i=1; $i -le $Attempts; $i++) {
    try {
      Write-Host ""
      Write-Host ("QQ // " + $Name + " [" + $i + "/" + $Attempts + "]") -ForegroundColor Cyan
      & $Action
      Record-Step $Name $true "passed"
      Write-Host ("PASS // " + $Name) -ForegroundColor Green
      return $true
    } catch {
      $msg = $_.Exception.Message
      Write-Host ("WARN // " + $Name + " // " + $msg) -ForegroundColor DarkYellow
      if ($i -lt $Attempts) { Start-Sleep -Seconds 2 }
      else {
        Record-Step $Name $false $msg
        if (-not $NonFatal) { throw }
      }
    }
  }
  return $false
}
function Test-PowerShellFile([string]$Path) {
  $tokens=$null; $errors=$null
  [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $Path),[ref]$tokens,[ref]$errors) | Out-Null
  if ($errors.Count -gt 0) { throw "PowerShell parser rejected $Path" }
}
function Test-RunnerAlive {
  $pidPath = Join-Path $HomeDir "runner.pid"
  try {
    if (-not (Test-Path $pidPath)) { return $false }
    $raw = (Get-Content $pidPath -Raw).Trim()
    $runnerPid=0
    if (-not [int]::TryParse($raw,[ref]$runnerPid) -or $runnerPid -le 0) { return $false }
    return -not (Get-Process -Id $runnerPid -ErrorAction Stop).HasExited
  } catch { return $false }
}

try {
  Run-Step "download one canonical repository snapshot" {
    Invoke-WebRequest -Uri $ArchiveUrl -OutFile $zip -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
    if (-not (Test-Path $zip) -or (Get-Item $zip).Length -lt 1024) { throw "Repository snapshot download was empty." }
    Expand-Archive -Path $zip -DestinationPath $src -Force
  }

  $repoRoot = Get-ChildItem -Path $src -Directory | Where-Object { $_.Name -like "clintware-site-*" } | Select-Object -First 1
  if (-not $repoRoot) { throw "Repository snapshot root was not found." }
  $qq = Join-Path $repoRoot.FullName "quillgeist-lite"

  $install = Join-Path $qq "install.ps1"
  $dedupe = Join-Path $qq "tasks\dedupe-qq-windows.ps1"
  $heal = Join-Path $qq "tasks\auto-repair-runtime.ps1"

  Run-Step "verify bootstrap files" {
    foreach ($file in @($install,$dedupe,$heal)) {
      if (-not (Test-Path $file)) { throw "Missing required bootstrap file: $file" }
      Test-PowerShellFile $file
    }
  }

  Run-Step "install or repair QQ from local snapshot" {
    & $install -SourceRoot $qq
  }

  Run-Step "remove duplicate QQ launcher windows" {
    & $dedupe -HomeDir $HomeDir
  } -NonFatal

  Run-Step "reconcile QQ runtime from local snapshot" {
    & $heal -HomeDir $HomeDir -SourceRoot $qq
  }

  Run-Step "verify local supervisor" {
    $svc = Get-Service -Name $ServiceName -ErrorAction Stop
    if ($svc.Status -ne "Running") {
      Start-Service -Name $ServiceName
      $svc = Get-Service -Name $ServiceName
    }
    if ($svc.Status -ne "Running") { throw "QQ health service is not running." }

    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
    if ($task.State -eq "Disabled") { Enable-ScheduledTask -TaskName $TaskName | Out-Null }
    if (-not (Test-RunnerAlive)) {
      Start-ScheduledTask -TaskName $TaskName
      Start-Sleep -Seconds 4
    }
    if (-not (Test-RunnerAlive)) { throw "QQ runner did not become live." }
  }

  Run-Step "verify public Control Plane health" {
    $health = Invoke-RestMethod -Method Get -Uri "https://mcp.clintware.com/health" -TimeoutSec 20
    if ($health.ok -ne $true) { throw "Control Plane health response was not OK." }
  } -NonFatal

  Run-Step "request authenticated QQ status check-in" {
    $gh = Get-Command gh.exe -ErrorAction SilentlyContinue
    if (-not $gh) { $gh = Get-Command gh -ErrorAction SilentlyContinue }
    if (-not $gh) { throw "GitHub CLI is unavailable for status workflow check-in." }
    & $gh.Source workflow run qq-local-status.yml --repo clintkosh/clintware-site --ref main
    if ($LASTEXITCODE -ne 0) { throw "Could not request qq-local-status workflow." }
  } -NonFatal

  $failed = @($steps | Where-Object { -not $_.ok })
  $result = [ordered]@{
    status = if (($steps | Where-Object { -not $_.ok -and $_.name -notin @("verify public Control Plane health","request authenticated QQ status check-in") }).Count -eq 0) { "ready" } else { "degraded" }
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    service = (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue).Status.ToString()
    runner_alive = (Test-RunnerAlive)
    control_plane = "https://mcp.clintware.com"
    failed_steps = $failed
    steps = $steps
  }
  [IO.File]::WriteAllText($ResultPath,($result | ConvertTo-Json -Depth 8),(New-Object Text.UTF8Encoding($false)))

  Write-Host ""
  Write-Host ("QQ // " + $result.status.ToUpperInvariant()) -ForegroundColor Green
  Write-Host ("RESULT // " + $ResultPath) -ForegroundColor DarkCyan
}
finally {
  try { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue } catch {}
}
