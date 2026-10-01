param(
  [ValidateSet("discover","launch","inspect","form")]
  [string]$Action = "discover",
  [string]$AppName = "LinkedIn",
  [string]$WindowTitle = "LinkedIn",
  [string]$Query = "",
  [string]$StepsJson = "",
  [string]$Approved = "false",
  [ValidateRange(1,100)][int]$MaxResults = 60,
  [ValidateRange(0,5000)][int]$WaitMs = 450
)
$ErrorActionPreference = "Stop"
$canonical = Join-Path $PSScriptRoot "cwinteract.ps1"
if (-not (Test-Path -LiteralPath $canonical)) { throw "CWInteract™ canonical task is missing: $canonical" }
& $canonical -Action $Action -AppName $AppName -WindowTitle $WindowTitle -Query $Query -StepsJson $StepsJson -Approved $Approved -MaxResults $MaxResults -WaitMs $WaitMs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
