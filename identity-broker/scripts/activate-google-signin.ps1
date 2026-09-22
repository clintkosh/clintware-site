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

Require-Command gh
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  gh auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { throw "GitHub authentication failed." }
}

Write-Host ""
Write-Host "=== ACTIVATE CLINTWARE GOOGLE SIGN-IN ===" -ForegroundColor Cyan
Write-Host "This activates identity only: openid + email + profile." -ForegroundColor Green
Write-Host "It does NOT request Gmail, Calendar, offline access, or a Google refresh token." -ForegroundColor Yellow
Write-Host ""
Write-Host "Before continuing, the EXISTING Clintware Google Cloud project must contain one Web application OAuth client with:" -ForegroundColor White
Write-Host "  Authorized redirect URI: https://auth.clintware.com/callback" -ForegroundColor White
Write-Host ""

$ClientId = Read-Host "Google OAuth Client ID"
$ClientSecretSecure = Read-Host "Google OAuth Client Secret" -AsSecureString
$ClientSecret = Secure-To-Plain $ClientSecretSecure

if ([string]::IsNullOrWhiteSpace($ClientId) -or [string]::IsNullOrWhiteSpace($ClientSecret)) {
  throw "OAuth client ID and secret are required."
}

$ClientId = $ClientId.Trim()
if ($ClientId -notmatch '^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com
Write-Host ""
Write-Host "Saving Google sign-in credentials as encrypted GitHub Actions secrets..." -ForegroundColor Cyan
Set-GitHubSecret "GOOGLE_OAUTH_CLIENT_ID" $ClientId
Set-GitHubSecret "GOOGLE_OAUTH_CLIENT_SECRET" $ClientSecret

$ClientSecret = $null
$ClientSecretSecure = $null

Write-Host "Starting Clintware Identity Broker deployment..." -ForegroundColor Cyan
gh workflow run deploy-identity-broker.yml --repo $Repo --ref main
if ($LASTEXITCODE -ne 0) { throw "Could not start Clintware Identity Broker deployment." }

Start-Sleep -Seconds 3
$RunId = gh run list --repo $Repo --workflow deploy-identity-broker.yml --limit 1 --json databaseId --jq '.[0].databaseId'
if ([string]::IsNullOrWhiteSpace($RunId)) { throw "Could not resolve the Identity Broker workflow run." }

gh run watch --repo $Repo $RunId --exit-status
if ($LASTEXITCODE -ne 0) { throw "Clintware Identity Broker deployment failed." }

Write-Host ""
Write-Host "Checking auth.clintware.com..." -ForegroundColor Cyan
$Health = Invoke-RestMethod "https://auth.clintware.com/health"
$Health | ConvertTo-Json -Depth 6
if (-not $Health.ok -or -not $Health.configured -or -not $Health.google_configured) {
  throw "Clintware Identity Broker deployed but Google sign-in is not reporting active."
}

$Mail = Invoke-RestMethod "https://auth.clintware.com/client-config/mail"
$N7 = Invoke-RestMethod "https://auth.clintware.com/client-config/neuron7-case"
if ($Mail.client_id -ne $N7.client_id) { throw "First-party products are not using one central Clintware OAuth client." }
if ($Mail.client_id -ne "https://auth.clintware.com/client/clintware-web") {
  throw "Unexpected Clintware first-party client ID: $($Mail.client_id)"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " CLINTWARE GOOGLE SIGN-IN IS ACTIVE" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Authority : https://auth.clintware.com"
Write-Host "Client ID : https://auth.clintware.com/client/clintware-web"
Write-Host "N7 login  : https://n7.clintware.com/operator"
Write-Host ""
Write-Host "Gmail/Calendar delegated access remains separate and can be added later without changing the sign-in architecture." -ForegroundColor Yellow
) {
  throw "This does not look like a Google Web OAuth Client ID. Expected a value ending in .apps.googleusercontent.com. Do not paste the Clintware client metadata URL or an email address here."
}

Write-Host "Validating that Google recognizes this OAuth client before saving it..." -ForegroundColor Cyan
$ProbeUri = "https://accounts.google.com/o/oauth2/v2/auth?client_id=$([uri]::EscapeDataString($ClientId))&redirect_uri=$([uri]::EscapeDataString('https://auth.clintware.com/callback'))&response_type=code&scope=openid%20email%20profile&state=clintware-preflight&nonce=clintware-preflight"
try {
  $Probe = Invoke-WebRequest -Uri $ProbeUri -MaximumRedirection 5 -UseBasicParsing
  $ProbeBody = [string]$Probe.Content
  if ($ProbeBody -match 'OAuth client was not found|Error 401:\s*invalid_client|invalid_client') {
    throw "Google reports this OAuth client is invalid or not found. Open Google Auth Platform > Clients in the EXISTING Clintware project, create/select the Web application client, and use that generated Client ID."
  }
} catch {
  if ($_.Exception.Message -match 'OAuth client is invalid|not found') { throw }
  Write-Host "Google preflight could not be conclusively evaluated from PowerShell; continuing with format validation only." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Saving Google sign-in credentials as encrypted GitHub Actions secrets..." -ForegroundColor Cyan
Set-GitHubSecret "GOOGLE_OAUTH_CLIENT_ID" $ClientId
Set-GitHubSecret "GOOGLE_OAUTH_CLIENT_SECRET" $ClientSecret

$ClientSecret = $null
$ClientSecretSecure = $null

Write-Host "Starting Clintware Identity Broker deployment..." -ForegroundColor Cyan
gh workflow run deploy-identity-broker.yml --repo $Repo --ref main
if ($LASTEXITCODE -ne 0) { throw "Could not start Clintware Identity Broker deployment." }

Start-Sleep -Seconds 3
$RunId = gh run list --repo $Repo --workflow deploy-identity-broker.yml --limit 1 --json databaseId --jq '.[0].databaseId'
if ([string]::IsNullOrWhiteSpace($RunId)) { throw "Could not resolve the Identity Broker workflow run." }

gh run watch --repo $Repo $RunId --exit-status
if ($LASTEXITCODE -ne 0) { throw "Clintware Identity Broker deployment failed." }

Write-Host ""
Write-Host "Checking auth.clintware.com..." -ForegroundColor Cyan
$Health = Invoke-RestMethod "https://auth.clintware.com/health"
$Health | ConvertTo-Json -Depth 6
if (-not $Health.ok -or -not $Health.configured -or -not $Health.google_configured) {
  throw "Clintware Identity Broker deployed but Google sign-in is not reporting active."
}

$Mail = Invoke-RestMethod "https://auth.clintware.com/client-config/mail"
$N7 = Invoke-RestMethod "https://auth.clintware.com/client-config/neuron7-case"
if ($Mail.client_id -ne $N7.client_id) { throw "First-party products are not using one central Clintware OAuth client." }
if ($Mail.client_id -ne "https://auth.clintware.com/client/clintware-web") {
  throw "Unexpected Clintware first-party client ID: $($Mail.client_id)"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " CLINTWARE GOOGLE SIGN-IN IS ACTIVE" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Authority : https://auth.clintware.com"
Write-Host "Client ID : https://auth.clintware.com/client/clintware-web"
Write-Host "N7 login  : https://n7.clintware.com/operator"
Write-Host ""
Write-Host "Gmail/Calendar delegated access remains separate and can be added later without changing the sign-in architecture." -ForegroundColor Yellow
