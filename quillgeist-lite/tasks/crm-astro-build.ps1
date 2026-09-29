[CmdletBinding()]
param(
  [ValidateSet("describe","validate","plan","materialize","check","deploy","full")]
  [string]$Action = "check",
  [string]$Project = "bm-crm",
  [string]$Manifest = "",
  [bool]$SkipInstall = $false
)

$ErrorActionPreference = "Stop"
$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if (-not $Manifest) { $Manifest = Join-Path $Repo ("projects\{0}\manifest.json" -f $Project) }
$ProjectRoot = Join-Path $Repo ("projects\{0}" -f $Project)
$Materializer = Join-Path $ProjectRoot "scripts\materialize.mjs"
$BuildRoot = Join-Path $Repo (".build\{0}" -f $Project)
$Validator = Join-Path $Repo "quillgeist-lite\tools\crm_astro.py"

function Invoke-Validator([string]$Mode) {
  & python $Validator --Action $Mode --Manifest $Manifest --Json
  if ($LASTEXITCODE -ne 0) { throw "CRM ASTRO manifest validation failed." }
}

if ($Action -in @("describe","validate","plan")) {
  Invoke-Validator $Action
  exit 0
}

Invoke-Validator "validate"
if (-not (Test-Path $Materializer)) { throw "Missing materializer: $Materializer" }

& node $Materializer
if ($LASTEXITCODE -ne 0) { throw "CRM materialization failed." }
if (-not (Test-Path $BuildRoot)) { throw "Materializer did not produce $BuildRoot" }

if ($Action -eq "materialize") {
  [pscustomobject]@{ ok=$true; action=$Action; project=$Project; build=$BuildRoot; local_first=$true } | ConvertTo-Json
  exit 0
}

Push-Location $BuildRoot
try {
  if (-not $SkipInstall) {
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
  deployed=($Action -in @("deploy","full"))
  note="Live-domain and browser verification remain separate evidence gates."
} | ConvertTo-Json
