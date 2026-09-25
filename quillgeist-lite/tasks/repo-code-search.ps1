[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Query,
  [string]$Path = "",
  [ValidateSet("text","regex")][string]$Mode = "text",
  [ValidateRange(1,5000)][int]$Max = 100,
  [ValidateSet("true","false")][string]$Json = "false",
  [ValidateSet("true","false")][string]$FilesOnly = "false"
)

$ErrorActionPreference = "Stop"
$Git = Get-Command git -ErrorAction SilentlyContinue
if (-not $Git) { throw "Git is required for the repo-code-search task." }

$LocalBase = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { Join-Path $HOME ".clintware" }
$CacheRoot = Join-Path $LocalBase "Clintware\code-search"
$RepoRoot = Join-Path $CacheRoot "clintware-site"
$RepoUrl = "https://github.com/clintkosh/clintware-site.git"

New-Item -ItemType Directory -Force -Path $CacheRoot | Out-Null

if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
  if (Test-Path $RepoRoot) { Remove-Item -Recurse -Force $RepoRoot }
  & $Git.Source clone --depth 1 --branch main --single-branch $RepoUrl $RepoRoot
  if ($LASTEXITCODE -ne 0) { throw "Could not create the read-only search cache." }
} else {
  & $Git.Source -C $RepoRoot fetch origin main --depth 1
  if ($LASTEXITCODE -ne 0) { throw "Could not refresh the repository search cache." }
  & $Git.Source -C $RepoRoot reset --hard origin/main
  if ($LASTEXITCODE -ne 0) { throw "Could not synchronize the repository search cache." }
}

$SearchScript = Join-Path $RepoRoot "scripts\code-search.ps1"
if (-not (Test-Path $SearchScript)) { throw "The repository code-search entry point is missing." }

$Args = @("-Query",$Query,"-Root",$RepoRoot,"-Max","$Max")
if ($Path) { $Args += @("-Path",$Path) }
if ($Mode -eq "regex") { $Args += "-Regex" }
if ($Json -eq "true") { $Args += "-Json" }
if ($FilesOnly -eq "true") { $Args += "-FilesOnly" }

Write-Host ("CODE SEARCH // repo=clintkosh/clintware-site mode={0} query={1}" -f $Mode,$Query)
& pwsh -NoProfile -ExecutionPolicy Bypass -File $SearchScript @Args
exit $LASTEXITCODE
