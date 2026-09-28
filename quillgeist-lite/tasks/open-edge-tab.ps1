param(
  [Parameter(Mandatory=$true)][string]$Url
)
$ErrorActionPreference = "Stop"

$uri = [Uri]$Url
if ($uri.Scheme -ne "https") { throw "Only https URLs are allowed." }

$edgeCandidates = @(
  "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { $_ -and (Test-Path $_) }

if (-not $edgeCandidates) {
  $cmd = Get-Command msedge.exe -ErrorAction SilentlyContinue
  if ($cmd) { $edgeCandidates = @($cmd.Source) }
}
if (-not $edgeCandidates) { throw "Microsoft Edge executable not found." }

$edge = $edgeCandidates[0]
Start-Process -FilePath $edge -ArgumentList @("--new-tab", $uri.AbsoluteUri)
Write-Host "OPENED EDGE TAB // $($uri.AbsoluteUri)" -ForegroundColor Green
