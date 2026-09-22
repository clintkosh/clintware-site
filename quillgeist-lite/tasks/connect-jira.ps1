$ErrorActionPreference = "Stop"

$ControlPlane = "https://mcp.clintware.com"

function Get-GitHubToken {
  $gh = Get-Command gh.exe -ErrorAction SilentlyContinue
  if (-not $gh) { $gh = Get-Command gh -ErrorAction SilentlyContinue }
  if (-not $gh) { throw "GitHub CLI (gh) is required because qq uses your existing Clintware receiver identity to start Jira authorization." }

  $token = (& $gh.Source auth token 2>$null | Out-String).Trim()
  if (-not $token) { throw "GitHub CLI is not authenticated. Run: gh auth login" }
  return $token
}

$token = Get-GitHubToken
$headers = @{ Authorization = "Bearer $token" }

Write-Host "Requesting a scoped Jira authorization link from the Clintware Control Plane..." -ForegroundColor Cyan
$start = Invoke-RestMethod -Method Post -Uri "$ControlPlane/api/v1/jira/oauth/start" -Headers $headers -ContentType "application/json" -Body "{}"

if (-not $start.ok -or -not $start.authorize_url) {
  throw "The Control Plane could not start Jira authorization. Check /health and Atlassian client configuration."
}

Write-Host ""
Write-Host "Opening Atlassian authorization in your default browser." -ForegroundColor White
Write-Host "qq never receives the Jira access or refresh token." -ForegroundColor DarkGray
Start-Process $start.authorize_url

$deadline = (Get-Date).AddMinutes(3)
do {
  Start-Sleep -Seconds 2
  try {
    $status = Invoke-RestMethod -Method Get -Uri "$ControlPlane/api/v1/jira/status" -Headers $headers
    if ($status.connected) {
      Write-Host ""
      Write-Host "JIRA CONNECTED" -ForegroundColor Green
      if ($status.sites) {
        foreach ($site in $status.sites) {
          Write-Host ("  {0}  [{1}]" -f $site.name, $site.id) -ForegroundColor Cyan
          Write-Host ("  {0}" -f $site.url) -ForegroundColor DarkGray
        }
      }
      exit 0
    }
  } catch {
    # The authorization callback may still be completing. Keep the bounded poll quiet.
  }
} while ((Get-Date) -lt $deadline)

throw "Jira was not connected within the authorization window. Run qq connect-jira again after confirming the Atlassian app callback and credentials."
