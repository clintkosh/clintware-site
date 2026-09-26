param(
  [string]$Repo = "clintkosh/clintware-site"
)

$ErrorActionPreference = "Stop"
if ($PSVersionTable.PSVersion.Major -ge 7) {
  $PSNativeCommandUseErrorActionPreference = $true
}

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required but was not found."
  }
}

function Secure-To-Plain {
  param([Security.SecureString]$Value)
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Set-GitHubSecret {
  param([string]$Name,[string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { throw "$Name is empty." }
  $Value | gh secret set $Name --repo $Repo --body -
  if ($LASTEXITCODE -ne 0) { throw "Could not save GitHub secret $Name." }
}

function Get-LatestWorkflowRunId {
  param([string]$Workflow)
  $json = gh run list --repo $Repo --workflow $Workflow --limit 1 --json databaseId 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($json)) {
    throw "Could not list workflow runs for $Workflow."
  }
  $rows = $json | ConvertFrom-Json
  if (-not $rows -or -not $rows[0].databaseId) {
    throw "Could not resolve the latest workflow run ID for $Workflow."
  }
  return [string]$rows[0].databaseId
}

function Test-GoogleClientPair {
  param([string]$ClientId,[string]$ClientSecret)

  $Body = @{
    code = "clintware-local-intentionally-invalid-code"
    client_id = $ClientId
    client_secret = $ClientSecret
    redirect_uri = "https://auth.clintware.com/callback"
    grant_type = "authorization_code"
  }

  try {
    Invoke-RestMethod -Method Post -Uri "https://oauth2.googleapis.com/token" -ContentType "application/x-www-form-urlencoded" -Body $Body | Out-Null
    return $true
  } catch {
    $Message = $_.ErrorDetails.Message
    if ([string]::IsNullOrWhiteSpace($Message)) { $Message = $_.Exception.Message }
    if ($Message -match '"error"\s*:\s*"invalid_client"') { return $false }
    if ($Message -match '"error"\s*:\s*"invalid_grant"') { return $true }
    throw "Unexpected Google token preflight response: $Message"
  }
}

Require-Command gh

gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  gh auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { throw "GitHub authentication failed." }
}

Write-Host ""
Write-Host "=== REPAIR CLINTWARE GOOGLE + CALENDAR AUTH ===" -ForegroundColor Cyan
Write-Host "This verifies one Web OAuth client ID + secret pair, deploys the broker, then authorizes Calendar/Meet." -ForegroundColor Green
Write-Host ""
Write-Host "Use the Google Web application OAuth client from the EXISTING Clintware Google Cloud project." -ForegroundColor White
Write-Host "Authorized redirect URI must be exactly:" -ForegroundColor White
Write-Host "  https://auth.clintware.com/callback" -ForegroundColor Cyan
Write-Host ""

$ClientId = (Read-Host "Google OAuth Client ID").Trim()
$ClientSecretSecure = Read-Host "Google OAuth Client Secret" -AsSecureString
$ClientSecret = Secure-To-Plain $ClientSecretSecure

if ([string]::IsNullOrWhiteSpace($ClientId) -or [string]::IsNullOrWhiteSpace($ClientSecret)) {
  throw "OAuth client ID and secret are required."
}

if ($ClientId -notmatch '^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$') {
  throw "Invalid Google OAuth Client ID format. It must be the Google-issued Web client ID ending in .apps.googleusercontent.com."
}

Write-Host ""
Write-Host "Checking Google OAuth client ID + secret as a pair..." -ForegroundColor Cyan
if (-not (Test-GoogleClientPair -ClientId $ClientId -ClientSecret $ClientSecret)) {
  throw "Google rejected this OAuth client ID + secret pair with invalid_client. Nothing was saved."
}
Write-Host "PASS // Google accepts the client credentials as a pair." -ForegroundColor Green
Write-Host ""
Write-Host "Saving credentials as encrypted GitHub Actions secrets..." -ForegroundColor Cyan

Set-GitHubSecret "GOOGLE_OAUTH_CLIENT_ID" $ClientId
Set-GitHubSecret "GOOGLE_OAUTH_CLIENT_SECRET" $ClientSecret

$ClientSecret = $null
$ClientSecretSecure = $null

Write-Host "Starting Clintware Identity Broker deployment..." -ForegroundColor Cyan
gh workflow run deploy-identity-broker.yml --repo $Repo --ref main
if ($LASTEXITCODE -ne 0) { throw "Could not start Clintware Identity Broker deployment." }

Start-Sleep -Seconds 4
$RunId = Get-LatestWorkflowRunId "deploy-identity-broker.yml"

Write-Host "Watching workflow run $RunId..." -ForegroundColor Cyan
gh run watch --repo $Repo $RunId --exit-status
if ($LASTEXITCODE -ne 0) { throw "Clintware Identity Broker deployment failed." }

Write-Host ""
Write-Host "Checking auth.clintware.com..." -ForegroundColor Cyan
$Health = Invoke-RestMethod "https://auth.clintware.com/health"
$Health | ConvertTo-Json -Depth 6

if (-not $Health.ok -or -not $Health.configured -or -not $Health.google_configured) {
  throw "Clintware Identity Broker deployed but Google sign-in is not reporting configured."
}

$Mail = Invoke-RestMethod "https://auth.clintware.com/client-config/mail"
$N7 = Invoke-RestMethod "https://auth.clintware.com/client-config/neuron7-case"
$Admin = Invoke-RestMethod "https://auth.clintware.com/client-config/control-plane-admin"

if ($Mail.client_id -ne $N7.client_id -or $Mail.client_id -ne $Admin.client_id) {
  throw "First-party products are not using one central Clintware OAuth client."
}

if ($Mail.client_id -ne "https://auth.clintware.com/client/clintware-web") {
  throw "Unexpected Clintware first-party client ID: $($Mail.client_id)"
}

Write-Host ""
Write-Host "Opening delegated Gmail/Calendar authorization..." -ForegroundColor Cyan
$DelegatedUrl = "https://auth.clintware.com/delegated/google/start"
Start-Process $DelegatedUrl
Write-Host "Approve Gmail send, Calendar events, and Calendar free/busy using the account that owns the calendar." -ForegroundColor Yellow

$Deadline = (Get-Date).AddMinutes(4)
do {
  Start-Sleep -Seconds 2
  $Delegated = Invoke-RestMethod "https://auth.clintware.com/delegated/google/status"
  if ($Delegated.connected) { break }
} while ((Get-Date) -lt $Deadline)

if (-not $Delegated.connected) {
  $Delegated | ConvertTo-Json -Depth 6
  throw "Delegated Google authorization did not reach connected state."
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " GOOGLE CALENDAR AUTH IS CONNECTED" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Authority  : https://auth.clintware.com"
Write-Host "Scheduler  : https://meet.clintware.com"
Write-Host "Host invite: clint@clintware.com"
Write-Host ""
$Delegated | ConvertTo-Json -Depth 6
