[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9][a-z0-9-]{1,80}$')][string]$SkillSlug,
    [string]$CheckLive = "true"
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$PublicSkill = Join-Path $RepoRoot ("public\skills\" + $SkillSlug + "\SKILL.md")
$SourceSkill = Join-Path $RepoRoot ("skills\" + $SkillSlug + "\SKILL.md")
$PublicIndex = Join-Path $RepoRoot "public\skills\index.html"
$InventoryPath = Join-Path $RepoRoot "public\skills\inventory.json"
$BoundaryScript = Join-Path $RepoRoot "scripts\validate-public-skill-boundary.mjs"
$PositioningScript = Join-Path $RepoRoot "scripts\check_public_positioning.py"
$BuildScript = Join-Path $RepoRoot "build_site.py"

function Invoke-Checked {
    param([Parameter(Mandatory=$true)][string]$FilePath,[Parameter(Mandatory=$true)][string[]]$Arguments)
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE"
    }
}

function Find-Python {
    $candidates = @()
    $marker = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite\python3-check.json"
    if (Test-Path -LiteralPath $marker -PathType Leaf) {
        try {
            $state = Get-Content -LiteralPath $marker -Raw | ConvertFrom-Json
            if ($state.path) { $candidates += [string]$state.path }
        } catch {}
    }
    $candidates += @(
        (Join-Path $env:USERPROFILE "Miniconda3\python.exe"),
        "python.exe",
        "py.exe",
        "python3.exe"
    )
    foreach ($candidate in $candidates) {
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
        $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($cmd -and $cmd.Source -and $cmd.Source -notmatch '(?i)\\WindowsApps\\') { return [string]$cmd.Source }
    }
    throw "Python runtime not found."
}

foreach ($required in @($PublicSkill,$SourceSkill,$PublicIndex,$InventoryPath,$BoundaryScript,$PositioningScript,$BuildScript)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        throw "Required file missing: $required"
    }
}

$sourceHash = (Get-FileHash -LiteralPath $SourceSkill -Algorithm SHA256).Hash
$publicHash = (Get-FileHash -LiteralPath $PublicSkill -Algorithm SHA256).Hash
if ($sourceHash -ne $publicHash) {
    throw "Source/public skill parity failed for $SkillSlug."
}

$publicBody = Get-Content -LiteralPath $PublicSkill -Raw
if ($publicBody -notmatch "(?m)^name:\s*$([regex]::Escape($SkillSlug))\s*$") {
    throw "Public SKILL.md frontmatter name does not match $SkillSlug."
}

$catalogBody = Get-Content -LiteralPath $PublicIndex -Raw
$catalogHref = "/skills/$SkillSlug/SKILL.md"
if ($catalogBody -notlike "*$catalogHref*") {
    throw "Public skills catalog does not link $catalogHref."
}

$inventory = Get-Content -LiteralPath $InventoryPath -Raw | ConvertFrom-Json
$entry = @($inventory.skills | Where-Object { $_.clintware_path -eq $catalogHref -and $_.status -eq "published_on_clintware" })
if ($entry.Count -ne 1) {
    throw "Inventory must contain exactly one published entry for $catalogHref; found $($entry.Count)."
}

$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { $node = Get-Command node -ErrorAction SilentlyContinue }
if (-not $node) { throw "Node.js runtime not found." }
$python = Find-Python

Push-Location $RepoRoot
try {
    Invoke-Checked -FilePath $node.Source -Arguments @($BoundaryScript)
    Invoke-Checked -FilePath $python -Arguments @($BuildScript)
    Invoke-Checked -FilePath $python -Arguments @($PositioningScript)
}
finally {
    Pop-Location
}

$doLive = $CheckLive -match '^(?i:true|1|yes|on)$'
$live = [ordered]@{
    requested = $doLive
    skill_url = "https://www.clintware.com/skills/$SkillSlug/SKILL.md"
    catalog_url = "https://www.clintware.com/skills/"
    skill_ok = $null
    catalog_ok = $null
    skill_status = $null
    catalog_status = $null
}
if ($doLive) {
    $headers = @{
        "Cache-Control" = "no-cache"
        "Pragma" = "no-cache"
        "User-Agent" = "Clintware-QQ-PublicSkillVerifier/1.0"
    }
    $skillResponse = Invoke-WebRequest -UseBasicParsing -Uri ($live.skill_url + "?qq=" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) -Headers $headers -TimeoutSec 20
    $catalogResponse = Invoke-WebRequest -UseBasicParsing -Uri ($live.catalog_url + "?qq=" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) -Headers $headers -TimeoutSec 20
    $live.skill_status = [int]$skillResponse.StatusCode
    $live.catalog_status = [int]$catalogResponse.StatusCode
    $live.skill_ok = ($skillResponse.StatusCode -eq 200 -and $skillResponse.Content -match "(?m)^name:\s*$([regex]::Escape($SkillSlug))\s*$")
    $live.catalog_ok = ($catalogResponse.StatusCode -eq 200 -and $catalogResponse.Content -like "*$catalogHref*")
    if (-not $live.skill_ok) { throw "Live skill URL failed content verification." }
    if (-not $live.catalog_ok) { throw "Live skills catalog failed link verification." }
}

$result = [ordered]@{
    ok = $true
    task = "public-skill-verify"
    skill_slug = $SkillSlug
    target_device = $env:COMPUTERNAME
    repo_root = $RepoRoot
    source_sha256 = $sourceHash
    public_sha256 = $publicHash
    source_public_parity = $true
    inventory_entry_count = $entry.Count
    catalog_href = $catalogHref
    public_boundary = "passed"
    production_build = "passed"
    public_positioning = "passed"
    live = $live
    verified_at = [DateTimeOffset]::UtcNow.ToString("o")
}
$result | ConvertTo-Json -Depth 6
