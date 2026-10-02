param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$SkipPull
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$jobId = "CWS-120-CODEPATH-VERIFY"
$machine = $env:COMPUTERNAME
$preferred = @("MEMORIA","DRIZNET")
$result = [ordered]@{
  job_id = $jobId
  machine = $machine
  status = "FAIL"
  commit = $null
  timestamp = [DateTimeOffset]::UtcNow.ToString("o")
  checks = @()
  error = $null
}

function Add-Check([string]$Name,[string]$Status,[string]$Detail) {
  $result.checks += [ordered]@{ name=$Name; status=$Status; detail=$Detail }
}

try {
  if ($preferred -notcontains $machine.ToUpperInvariant()) {
    Add-Check "machine_target" "WARN" "Running on $machine; preferred targets are MEMORIA then DRIZNET."
  } else {
    Add-Check "machine_target" "PASS" "Running on preferred local target $machine."
  }

  if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
    throw "RepoRoot is not a Git working tree: $RepoRoot"
  }

  Push-Location $RepoRoot
  try {
    if (-not $SkipPull) {
      & git fetch origin main
      if ($LASTEXITCODE -ne 0) { throw "git fetch failed" }

      $branch = (& git branch --show-current).Trim()
      if ($branch -ne "main") {
        & git checkout main
        if ($LASTEXITCODE -ne 0) { throw "git checkout main failed" }
      }

      & git pull --ff-only origin main
      if ($LASTEXITCODE -ne 0) { throw "git pull --ff-only failed" }
      Add-Check "repo_sync" "PASS" "main synchronized with origin."
    } else {
      Add-Check "repo_sync" "SKIP" "SkipPull requested."
    }

    $result.commit = (& git rev-parse HEAD).Trim()

    $verify = Join-Path $RepoRoot "cpath-worker\verify-memoria.ps1"
    if (-not (Test-Path $verify)) { throw "Missing verifier: $verify" }

    $out = & pwsh -NoProfile -File $verify 2>&1
    $exit = $LASTEXITCODE
    $detail = ($out | Out-String).Trim()

    if ($exit -ne 0) {
      Add-Check "codepath_verification" "FAIL" $detail
      throw "CodePath verifier failed with exit code $exit"
    }

    Add-Check "codepath_verification" "PASS" $detail
    $result.status = "PASS"
  }
  finally {
    Pop-Location
  }
}
catch {
  $result.error = $_.Exception.Message
}

$json = $result | ConvertTo-Json -Depth 8
Write-Output $json

$logDir = Join-Path $RepoRoot ".clintware\qq-results"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $logDir "$jobId-$machine-$stamp.json"
$json | Set-Content -Path $logPath -Encoding UTF8

if ($result.status -ne "PASS") { exit 1 }
