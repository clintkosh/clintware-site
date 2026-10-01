[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Prompt,
    [string]$Project = "",
    [string]$StateScope = "",
    [ValidateRange(1, 6)][int]$MaxDepth = 2
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$PythonPath = ""
$PythonMarker = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite\python3-check.json"
if (Test-Path -LiteralPath $PythonMarker -PathType Leaf) {
    try {
        $PythonState = Get-Content -LiteralPath $PythonMarker -Raw | ConvertFrom-Json
        if ($PythonState.path -and (Test-Path -LiteralPath ([string]$PythonState.path) -PathType Leaf)) {
            $PythonPath = [string]$PythonState.path
        }
    } catch {}
}
if (-not $PythonPath) {
    $Mini = Join-Path $env:USERPROFILE "Miniconda3\python.exe"
    if (Test-Path -LiteralPath $Mini -PathType Leaf) { $PythonPath = $Mini }
}
if (-not $PythonPath) {
    foreach ($Name in @("python.exe","py.exe","python3.exe")) {
        $Candidate = Get-Command $Name -ErrorAction SilentlyContinue
        if ($Candidate -and $Candidate.Source -and $Candidate.Source -notmatch '(?i)\\WindowsApps\\') {
            $PythonPath = [string]$Candidate.Source
            break
        }
    }
}
if (-not $PythonPath) { throw "Python runtime not found. Run ensure-python first." }

$env:PYTHONPATH = Join-Path $RepoRoot "agentbridge-node"
$argsList = @(
    "-m", "agentbridge_node.big_prompt_cli",
    $Prompt,
    "--max-depth", [string]$MaxDepth
)
if ($Project) { $argsList += @("--project", $Project) }
if ($StateScope) { $argsList += @("--state-scope", $StateScope) }
$argsList += "--force"

& $PythonPath @argsList
if ($LASTEXITCODE -ne 0) {
    throw "Quillgeist big-prompt planning failed with exit code $LASTEXITCODE."
}
