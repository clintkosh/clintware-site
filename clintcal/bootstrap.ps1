[CmdletBinding()]
param(
    [string]$Destination = (Join-Path $PSScriptRoot "runtime"),
    [switch]$UpdateExisting
)

$ErrorActionPreference = "Stop"
$Upstream = "https://github.com/calcom/cal.diy.git"
$PinnedCommit = "6bc45298226f96ff79e0c070c8b2ce39727e8477"

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

Assert-Command git
Assert-Command node

if (Test-Path $Destination) {
    if (-not $UpdateExisting) {
        throw "Destination already exists: $Destination. Re-run with -UpdateExisting to reset it to the pinned upstream commit."
    }
    git -C $Destination fetch origin $PinnedCommit --depth 1
} else {
    git clone --filter=blob:none --no-checkout $Upstream $Destination
    git -C $Destination fetch origin $PinnedCommit --depth 1
}

git -C $Destination checkout --detach $PinnedCommit

$EnvPath = Join-Path $Destination ".env"
if (-not (Test-Path $EnvPath)) {
    Copy-Item (Join-Path $Destination ".env.example") $EnvPath
    Write-Host "Created runtime .env from upstream template. Populate secrets before starting ClintCal."
}

$Overlay = Join-Path $PSScriptRoot "overlay"
if (Test-Path $Overlay) {
    Copy-Item (Join-Path $Overlay "*") $Destination -Recurse -Force
}

Write-Host "ClintCal runtime prepared at: $Destination"
Write-Host "Pinned Cal.diy commit: $PinnedCommit"
Write-Host "Next: configure runtime/.env, PostgreSQL, Google Calendar OAuth, email, and the meet.clintware.com reverse proxy."
