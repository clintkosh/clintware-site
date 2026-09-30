[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Prompt,
    [string]$Project = "",
    [string]$StateScope = "",
    [ValidateRange(1, 6)][int]$MaxDepth = 2
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$Python = Get-Command python -ErrorAction SilentlyContinue
if (-not $Python) { $Python = Get-Command py -ErrorAction SilentlyContinue }
if (-not $Python) { throw "Python runtime not found." }

$env:PYTHONPATH = Join-Path $RepoRoot "agentbridge-node"
$argsList = @(
    "-m", "agentbridge_node.big_prompt_cli",
    $Prompt,
    "--max-depth", [string]$MaxDepth
)
if ($Project) { $argsList += @("--project", $Project) }
if ($StateScope) { $argsList += @("--state-scope", $StateScope) }
$argsList += "--force"

& $Python.Source @argsList
if ($LASTEXITCODE -ne 0) {
    throw "Quillgeist big-prompt planning failed with exit code $LASTEXITCODE."
}
