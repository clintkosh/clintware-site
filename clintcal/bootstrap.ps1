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

function Set-DotEnvValue([string]$Path, [string]$Key, [string]$Value) {
    $content = Get-Content $Path -Raw
    $pattern = "(?m)^" + [regex]::Escape($Key) + "=.*$"
    $line = "$Key=$Value"
    if ([regex]::IsMatch($content, $pattern)) {
        $content = [regex]::Replace($content, $pattern, $line)
    } else {
        $content = $content.TrimEnd() + [Environment]::NewLine + $line + [Environment]::NewLine
    }
    Set-Content -Path $Path -Value $content -NoNewline
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
}

$PublicDefaults = Join-Path $PSScriptRoot "clintcal.public.env"
Get-Content $PublicDefaults | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $parts = $line.Split("=", 2)
    Set-DotEnvValue -Path $EnvPath -Key $parts[0].Trim() -Value $parts[1].Trim()
}

$Overlay = Join-Path $PSScriptRoot "overlay"
if (Test-Path $Overlay) {
    Copy-Item (Join-Path $Overlay "*") $Destination -Recurse -Force
}

Write-Host "ClintCal runtime prepared at: $Destination"
Write-Host "Pinned Cal.diy commit: $PinnedCommit"
Write-Host "Applied Clintware public URL/branding defaults."
Write-Host "Next: populate runtime/.env secrets, create .stack.env from .stack.env.example, configure Google Calendar OAuth/email, then launch the Docker stack."
