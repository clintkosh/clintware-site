param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$LiveUrl = "https://cpath.clintware.com"
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Pass([string]$Message) { Write-Host ("PASS // " + $Message) -ForegroundColor Green }
function Fail([string]$Message) { throw ("FAIL // " + $Message) }

$index = Join-Path $PSScriptRoot "public\index.html"
$worker = Join-Path $PSScriptRoot "src\worker.js"
$wrangler = Join-Path $PSScriptRoot "wrangler.jsonc"

foreach ($path in @($index,$worker,$wrangler)) {
  if (-not (Test-Path $path)) { Fail "Missing $path" }
}
Pass "Required CPath files present"

$html = Get-Content $index -Raw
$workerText = Get-Content $worker -Raw

$required = @(
  "Claude Corps Delivery OS",
  "10 mentors · 200 fellows at scale",
  "for(let i=0;i<20;i++)",
  "highByMentor",
  "cohort:cohorts",
  "project:projects",
  "track:tracks",
  "cpath-claude-corps-delivery-v2",
  "G-DCY144YM9P"
)
foreach ($marker in $required) {
  if (-not $html.Contains($marker)) { Fail "Missing HTML marker: $marker" }
}
Pass "Full-scale demo seed markers present"

$mentorCount = ([regex]::Matches($html, "\{name:'[^']+',pod:'[^']+'")).Count
if ($mentorCount -lt 10) { Fail "Expected >=10 seeded mentors, found $mentorCount" }
Pass "Seeded mentor count >= 10"

if (-not $workerText.Contains("mentor-delivery-accountability-system")) { Fail "Worker health surface marker missing" }
if (-not $workerText.Contains('"jobId": "5204061007"')) { Fail "Worker job id missing" }
Pass "Worker role-specific health markers present"

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  & node --check $worker
  if ($LASTEXITCODE -ne 0) { Fail "worker.js failed node --check" }
  Pass "worker.js syntax valid"
} else {
  Write-Host "SKIP // node not installed; worker syntax check deferred" -ForegroundColor Yellow
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$health = Invoke-RestMethod -Uri "$LiveUrl/health?memoria=$stamp" -TimeoutSec 20
if (-not $health.ok) { Fail "Live health did not return ok=true" }
if ($health.jobId -ne "5204061007") { Fail "Live jobId mismatch: $($health.jobId)" }
if ($health.surface -ne "mentor-delivery-accountability-system") { Fail "Live surface mismatch: $($health.surface)" }
Pass "Live health endpoint matches Claude Corps Delivery OS"

$live = Invoke-WebRequest -Uri "$LiveUrl/?memoria=$stamp" -UseBasicParsing -TimeoutSec 25
if ($live.StatusCode -ne 200) { Fail "Live page HTTP $($live.StatusCode)" }
foreach ($marker in @("Claude Corps Delivery OS","10 mentors · 200 fellows at scale","cpath-claude-corps-delivery-v2")) {
  if (-not $live.Content.Contains($marker)) { Fail "Live page missing marker: $marker" }
}
Pass "Live page contains current full-scale seed release"

Write-Host ""
Write-Host "MEMORIA // CPath verification complete" -ForegroundColor Cyan
Write-Host "ROLE    // Senior Manager of AI Practice, Claude Corps"
Write-Host "SCALE   // 10 mentors / 200 seeded fellows"
Write-Host "STATE   // browser-local demo data"
Write-Host "LIVE    // $LiveUrl"
