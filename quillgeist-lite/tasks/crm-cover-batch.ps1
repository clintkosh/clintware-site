[CmdletBinding()]
param(
  [string]$Projects = "gtl-crm,aso-crm,cwn-crm,tkm-crm,aim-crm",
  [ValidateSet("plan","materialize","check","full-local")][string]$Action = "full-local",
  [int]$Workers = 0,
  [ValidateSet("true","false")][string]$GenerateCopy = "false",
  [string]$Model = "",
  [string]$OllamaUrl = "http://127.0.0.1:11434",
  [string]$RepoRoot = ""
)
$ErrorActionPreference="Stop"
$Root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$Tool=Join-Path $Root "quillgeist-lite\tools\crm_cover_batch.py"
$Marker=Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite\python3-check.json"
if(-not (Test-Path -LiteralPath $Marker)){ throw "QQ Python runtime marker missing. Run ensure-python first." }
$Py=(Get-Content -LiteralPath $Marker -Raw | ConvertFrom-Json).path
if(-not $RepoRoot){$RepoRoot=$Root}
$argsList=@($Tool,"--Projects",$Projects,"--Action",$Action,"--RepoRoot",$RepoRoot,"--OllamaUrl",$OllamaUrl)
if($Workers -gt 0){$argsList+=@("--Workers",[string]$Workers)}
if($GenerateCopy -eq "true"){$argsList+="--GenerateCopy"}
if($Model){$argsList+=@("--Model",$Model)}
& $Py @argsList
exit $LASTEXITCODE
