[CmdletBinding()]
param(
  [ValidateSet("describe","validate","plan","materialize","check","deploy","full")]
  [string]$Action = "check",
  [ValidatePattern("^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$")][string]$Project = "bm-crm",
  [string]$Manifest = "",
  [ValidateSet("true","false")][string]$SkipInstall = "false",
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
$RuntimeRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$Validator = Join-Path $RuntimeRoot "quillgeist-lite\tools\crm_astro.py"
$ControlPlaneRuntimeVersion = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime-version"

function Test-ClintwareRepo([string]$Root,[string]$ProjectId) {
  if (-not $Root) { return $false }
  try {
    $full = [IO.Path]::GetFullPath($Root)
    return (Test-Path -LiteralPath (Join-Path $full "quillgeist-lite\tasks.json") -PathType Leaf) -and
           (Test-Path -LiteralPath (Join-Path $full ("projects\{0}" -f $ProjectId)) -PathType Container)
  } catch { return $false }
}

function Get-ControlPlaneRevision {
  try {
    $v = Invoke-RestMethod -Uri $ControlPlaneRuntimeVersion -TimeoutSec 15 -Headers @{"Cache-Control"="no-cache"}
    $rev = [string]$v.source_revision
    if ($rev -match '^[a-f0-9]{40}$') { return $rev }
  } catch {}
  return ""
}

function Sync-DedicatedCache([string]$Root,[string]$TargetRevision) {
  $git = Get-Command git -ErrorAction SilentlyContinue
  if (-not $git) { throw "Git is required only to create or refresh the dedicated Clintware source cache." }
  $parent = Split-Path -Parent $Root
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  if (-not (Test-Path -LiteralPath (Join-Path $Root ".git") -PathType Container)) {
    if (Test-Path -LiteralPath $Root) { Remove-Item -LiteralPath $Root -Recurse -Force }
    & $git.Source clone --depth 1 --branch main --single-branch "https://github.com/clintkosh/clintware-site.git" $Root
    if ($LASTEXITCODE -ne 0) { throw "Could not create the dedicated Clintware source cache." }
  }
  $head = (& $git.Source -C $Root rev-parse HEAD 2>$null).Trim()
  if ($TargetRevision -and $head -ne $TargetRevision) {
    & $git.Source -C $Root fetch origin $TargetRevision --depth 1
    if ($LASTEXITCODE -ne 0) {
      & $git.Source -C $Root fetch origin main --depth 1
      if ($LASTEXITCODE -ne 0) { throw "Could not refresh the dedicated Clintware source cache." }
      $TargetRevision = (& $git.Source -C $Root rev-parse origin/main).Trim()
    }
    & $git.Source -C $Root reset --hard $TargetRevision
    if ($LASTEXITCODE -ne 0) { throw "Could not align the dedicated Clintware source cache." }
    & $git.Source -C $Root clean -fd
    if ($LASTEXITCODE -ne 0) { throw "Could not clean the dedicated Clintware source cache." }
  }
}

function Resolve-ClintwareRepo {
  param([string]$Requested,[string]$ProjectId)
  if ($Requested) {
    $candidate = [IO.Path]::GetFullPath($Requested)
    if (-not (Test-ClintwareRepo $candidate $ProjectId)) { throw "RepoRoot is not a usable Clintware source tree for project $ProjectId." }
    return [pscustomobject]@{Root=$candidate;Mode="explicit-local";Refreshed=$false}
  }
  if ($env:CLINTWARE_REPO_ROOT -and (Test-ClintwareRepo $env:CLINTWARE_REPO_ROOT $ProjectId)) {
    return [pscustomobject]@{Root=[IO.Path]::GetFullPath($env:CLINTWARE_REPO_ROOT);Mode="environment-local";Refreshed=$false}
  }

  # Running directly from the source checkout is the cheapest path.
  $sourceCandidate = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
  if (Test-ClintwareRepo $sourceCandidate $ProjectId) {
    return [pscustomobject]@{Root=$sourceCandidate;Mode="source-checkout";Refreshed=$false}
  }

  # Installed QQ reuses the same dedicated full checkout used by repo-code-search.
  # It contacts the small runtime-version endpoint first and only performs a Git
  # refresh when that pinned source revision differs from the local cache.
  $localBase = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { Join-Path $HOME ".clintware" }
  $cache = Join-Path $localBase "Clintware\code-search\clintware-site"
  $target = Get-ControlPlaneRevision
  $before = ""
  $git = Get-Command git -ErrorAction SilentlyContinue
  if ($git -and (Test-Path -LiteralPath (Join-Path $cache ".git"))) {
    try { $before = (& $git.Source -C $cache rev-parse HEAD 2>$null).Trim() } catch {}
  }
  if (-not (Test-ClintwareRepo $cache $ProjectId) -or ($target -and $before -ne $target)) {
    Sync-DedicatedCache $cache $target
  }
  if (-not (Test-ClintwareRepo $cache $ProjectId)) { throw "The dedicated Clintware source cache does not contain project $ProjectId." }
  $after = ""
  if ($git) { try { $after = (& $git.Source -C $cache rev-parse HEAD 2>$null).Trim() } catch {} }
  return [pscustomobject]@{Root=[IO.Path]::GetFullPath($cache);Mode="dedicated-cache";Refreshed=($before -ne $after)}
}

if (-not (Test-Path -LiteralPath $Validator -PathType Leaf)) {
  $validatorParent = Split-Path -Parent $Validator
  New-Item -ItemType Directory -Force -Path $validatorParent | Out-Null
  $temp = $Validator + ".new"
  try {
    Invoke-WebRequest -Uri "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/tools/crm_astro.py" -OutFile $temp -UseBasicParsing -TimeoutSec 25 -Headers @{"Cache-Control"="no-cache"}
    if (-not (Test-Path -LiteralPath $temp) -or (Get-Item -LiteralPath $temp).Length -lt 500) { throw "CRM ASTRO validator download was incomplete." }
    Move-Item -LiteralPath $temp -Destination $Validator -Force
  } finally {
    Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
  }
}

$source = Resolve-ClintwareRepo -Requested $RepoRoot -ProjectId $Project
$Repo = $source.Root

# The project source cache is revision-pinned by the control plane. Prefer the
# validator that ships with that exact source revision so an installed QQ
# runtime cannot validate a newer project with a stale ASTRO contract.
$RepoValidator = Join-Path $Repo "quillgeist-lite\tools\crm_astro.py"
if (Test-Path -LiteralPath $RepoValidator -PathType Leaf) {
  $Validator = $RepoValidator
}

if (-not $Manifest) { $Manifest = Join-Path $Repo ("projects\{0}\manifest.json" -f $Project) }
elseif (-not [IO.Path]::IsPathRooted($Manifest)) { $Manifest = Join-Path $Repo $Manifest }
$ProjectRoot = Join-Path $Repo ("projects\{0}" -f $Project)
$Materializer = Join-Path $ProjectRoot "scripts\materialize.mjs"
$BuildRoot = Join-Path $Repo (".build\{0}" -f $Project)

function Invoke-Validator([string]$Mode) {
  & python $Validator --Action $Mode --Manifest $Manifest --Json
  if ($LASTEXITCODE -ne 0) { throw "CRM ASTRO manifest validation failed." }
}

if ($Action -in @("describe","validate","plan")) {
  Invoke-Validator $Action
  [pscustomobject]@{
    ok=$true
    source_mode=$source.Mode
    source_refreshed=$source.Refreshed
    repo=$Repo
    project=$Project
  } | ConvertTo-Json
  exit 0
}

Invoke-Validator "validate"
if (-not (Test-Path -LiteralPath $Materializer -PathType Leaf)) { throw "Missing materializer: $Materializer" }

& node $Materializer
if ($LASTEXITCODE -ne 0) { throw "CRM materialization failed." }
if (-not (Test-Path -LiteralPath $BuildRoot -PathType Container)) { throw "Materializer did not produce $BuildRoot" }

$ManifestData = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
$PersistenceMode = if ($ManifestData.persistence_mode) { [string]$ManifestData.persistence_mode } else { "browser-local" }
$RemoteStateRequired = [bool]$ManifestData.remote_state_required
$DurableObjectsRequired = [bool]$ManifestData.durable_objects_required
if ($PersistenceMode -in @("browser-local","stateless")) {
  $GeneratedWrangler = Join-Path $BuildRoot "wrangler.jsonc"
  if (Test-Path -LiteralPath $GeneratedWrangler -PathType Leaf) {
    $WranglerText = Get-Content -LiteralPath $GeneratedWrangler -Raw
    if ($WranglerText -match '"durable_objects"\s*:') {
      throw "Quota-independence gate failed: $Project is $PersistenceMode but generated wrangler still requires Durable Objects."
    }
  }
  if ($DurableObjectsRequired) {
    throw "Manifest contradiction: $Project cannot require Durable Objects in $PersistenceMode mode."
  }
}

if ($Action -eq "materialize") {
  [pscustomobject]@{
    ok=$true; action=$Action; project=$Project; build=$BuildRoot; local_first=$true
    persistence_mode=$PersistenceMode; remote_state_required=$RemoteStateRequired; durable_objects_required=$DurableObjectsRequired
    source_mode=$source.Mode; source_refreshed=$source.Refreshed
  } | ConvertTo-Json
  exit 0
}

Push-Location $BuildRoot
try {
  if ($SkipInstall -ne "true") {
    & npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
  }
  & npm run check
  if ($LASTEXITCODE -ne 0) { throw "CRM source checks failed." }

  if ($Action -in @("deploy","full")) {
    & npx wrangler deploy
    if ($LASTEXITCODE -ne 0) { throw "Wrangler deploy failed." }
  }
}
finally {
  Pop-Location
}

[pscustomobject]@{
  ok=$true
  action=$Action
  project=$Project
  build=$BuildRoot
  local_first=$true
  persistence_mode=$PersistenceMode
  remote_state_required=$RemoteStateRequired
  durable_objects_required=$DurableObjectsRequired
  source_mode=$source.Mode
  source_refreshed=$source.Refreshed
  deployed=($Action -in @("deploy","full"))
  note="Live-domain and browser verification remain separate evidence gates."
} | ConvertTo-Json
