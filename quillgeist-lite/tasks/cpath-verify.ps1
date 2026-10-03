[CmdletBinding()]
param(
  [ValidateSet("full","local","live")]
  [string]$Action = "full"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Machine = [string]$env:COMPUTERNAME
if ($Machine -notmatch '(?i)^(MEMORIA|DRIZNET)$') {
  throw "cpath-verify is restricted to MEMORIA or DRIZNET."
}

$LocalBase = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { Join-Path $HOME ".clintware" }
$Cache = Join-Path $LocalBase "Clintware\code-search\clintware-site"
$RepoUrl = "https://github.com/clintkosh/clintware-site.git"
$RuntimeVersionUrl = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime-version"

function Get-TargetRevision {
  try {
    $r = Invoke-RestMethod -Uri $RuntimeVersionUrl -TimeoutSec 15 -Headers @{"Cache-Control"="no-cache"}
    $rev = [string]$r.source_revision
    if ($rev -match '^[a-f0-9]{40}$') { return $rev }
  } catch {}
  return ""
}

function Sync-RepoCache {
  $git = Get-Command git -ErrorAction Stop
  $parent = Split-Path -Parent $Cache
  New-Item -ItemType Directory -Force -Path $parent | Out-Null

  if (-not (Test-Path -LiteralPath (Join-Path $Cache ".git") -PathType Container)) {
    if (Test-Path -LiteralPath $Cache) { Remove-Item -LiteralPath $Cache -Recurse -Force }
    & $git.Source clone --depth 1 --branch main --single-branch $RepoUrl $Cache
    if ($LASTEXITCODE -ne 0) { throw "Unable to create dedicated Clintware source cache." }
  }

  $target = Get-TargetRevision
  if ($target) {
    & $git.Source -C $Cache fetch origin $target --depth 1
    if ($LASTEXITCODE -eq 0) {
      & $git.Source -C $Cache reset --hard $target
      if ($LASTEXITCODE -ne 0) { throw "Unable to align cache to control-plane source revision." }
    } else {
      & $git.Source -C $Cache fetch origin main --depth 1
      if ($LASTEXITCODE -ne 0) { throw "Unable to refresh Clintware source cache." }
      & $git.Source -C $Cache reset --hard origin/main
      if ($LASTEXITCODE -ne 0) { throw "Unable to align cache to origin/main." }
    }
  } else {
    & $git.Source -C $Cache fetch origin main --depth 1
    if ($LASTEXITCODE -ne 0) { throw "Unable to refresh Clintware source cache." }
    & $git.Source -C $Cache reset --hard origin/main
    if ($LASTEXITCODE -ne 0) { throw "Unable to align cache to origin/main." }
  }

  & $git.Source -C $Cache clean -fd | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Unable to clean dedicated Clintware source cache." }
}

Sync-RepoCache

$git = Get-Command git -ErrorAction Stop
$Commit = (& $git.Source -C $Cache rev-parse HEAD 2>$null).Trim()
$Verifier = Join-Path $Cache "cpath-worker\verify-memoria.ps1"
$Index = Join-Path $Cache "cpath-worker\public\index.html"
$Worker = Join-Path $Cache "cpath-worker\src\worker.js"

if (-not (Test-Path -LiteralPath $Verifier -PathType Leaf)) { throw "Missing CodePath verifier: $Verifier" }
if (-not (Test-Path -LiteralPath $Index -PathType Leaf)) { throw "Missing CodePath index: $Index" }
if (-not (Test-Path -LiteralPath $Worker -PathType Leaf)) { throw "Missing CodePath worker: $Worker" }

$checks = New-Object System.Collections.Generic.List[object]

if ($Action -in @("full","local")) {
  $html = Get-Content -LiteralPath $Index -Raw
  foreach ($marker in @(
    "Claude Corps Delivery OS",
    "10 mentors · 200 fellows at scale",
    "for(let i=0;i<20;i++)",
    "cpath-claude-corps-delivery-v2",
    "cohort:cohorts",
    "project:projects",
    "track:tracks"
  )) {
    if (-not $html.Contains($marker)) { throw "CodePath local seed marker missing: $marker" }
  }

  $mentorCount = ([regex]::Matches($html, "\{name:'[^']+',pod:'[^']+'")).Count
  if ($mentorCount -lt 10) { throw "Expected at least 10 seeded mentors, found $mentorCount." }
  $checks.Add([pscustomobject]@{name="seed";ok=$true;detail="10 mentors x 20 fellows; enriched seed v2"}) | Out-Null

  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    & $node.Source --check $Worker
    if ($LASTEXITCODE -ne 0) { throw "CodePath worker.js failed node --check." }
    $checks.Add([pscustomobject]@{name="worker_syntax";ok=$true;detail="node --check passed"}) | Out-Null
  } else {
    $checks.Add([pscustomobject]@{name="worker_syntax";ok=$null;detail="node not installed; skipped"}) | Out-Null
  }
}

if ($Action -in @("full","live")) {
  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $health = Invoke-RestMethod -Uri ("https://cpath.clintware.com/health?qq=" + $stamp) -TimeoutSec 20
  if (-not [bool]$health.ok) { throw "Live CodePath health did not return ok=true." }
  if ([string]$health.jobId -ne "5204061007") { throw "Live CodePath jobId mismatch: $($health.jobId)" }
  if ([string]$health.surface -ne "mentor-delivery-accountability-system") { throw "Live CodePath surface mismatch: $($health.surface)" }

  $page = Invoke-WebRequest -Uri ("https://cpath.clintware.com/?qq=" + $stamp) -UseBasicParsing -TimeoutSec 25
  if ($page.StatusCode -ne 200) { throw "Live CodePath page returned HTTP $($page.StatusCode)." }
  foreach ($marker in @("Claude Corps Delivery OS","10 mentors · 200 fellows at scale","cpath-claude-corps-delivery-v2")) {
    if (-not $page.Content.Contains($marker)) { throw "Live CodePath page missing release marker: $marker" }
  }
  $checks.Add([pscustomobject]@{name="live";ok=$true;detail="health + current 200-fellow release verified"}) | Out-Null
}

[ordered]@{
  ok = $true
  task = "cpath-verify"
  action = $Action
  machine = $Machine
  commit = $Commit
  role_job_id = "5204061007"
  scale = "10 mentors / 200 seeded fellows"
  confirmation_target = "https://cpath.clintware.com"
  checks = @($checks)
  verified_at = [DateTimeOffset]::UtcNow.ToString("o")
} | ConvertTo-Json -Depth 6
