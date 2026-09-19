param(
  [string]$Repo = "clintkosh/clintware-site",
  [int]$Port = 53682,
  [string[]]$Scopes = @("https://www.googleapis.com/auth/gmail.send")
)

$ErrorActionPreference = "Stop"
$Scope = ($Scopes -join " ")
$RedirectUri = "http://127.0.0.1:$Port/"

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
Write-Host "Clintware Google delegated-access setup" -ForegroundColor Cyan
Write-Host "OAuth client credentials are shared with auth.clintware.com; delegated refresh access remains a separate grant." -ForegroundColor DarkGray
Write-Host ("Requested delegated scopes: " + ($Scopes -join ", ")) -ForegroundColor DarkGray
Write-Host ""

$ClientId = Read-Host "Google OAuth Client ID"
$ClientSecretSecure = Read-Host "Google OAuth Client Secret" -AsSecureString
$ClientSecret = Secure-To-Plain $ClientSecretSecure
if ([string]::IsNullOrWhiteSpace($ClientId) -or [string]::IsNullOrWhiteSpace($ClientSecret)) {
  throw "OAuth client ID and secret are required."
}

$State = [Guid]::NewGuid().ToString("N")
$AuthParams = @{
  client_id = $ClientId
  redirect_uri = $RedirectUri
  response_type = "code"
  scope = $Scope
  access_type = "offline"
  prompt = "consent"
  include_granted_scopes = "true"
  state = $State
}
$Query = ($AuthParams.GetEnumerator() | ForEach-Object {
  [Uri]::EscapeDataString($_.Key) + "=" + [Uri]::EscapeDataString([string]$_.Value)
}) -join "&"
$AuthUrl = "https://accounts.google.com/o/oauth2/v2/auth?$Query"

$Listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
$Listener.Start()
try {
  Write-Host ""
  Write-Host "Opening Google authorization in your browser..." -ForegroundColor Cyan
  Start-Process $AuthUrl
  Write-Host "Approve Gmail send access for the Clintware mailbox." -ForegroundColor Yellow

  $Client = $Listener.AcceptTcpClient()
  try {
    $Stream = $Client.GetStream()
    $Reader = [IO.StreamReader]::new($Stream, [Text.Encoding]::ASCII, $false, 4096, $true)
    $RequestLine = $Reader.ReadLine()
    while ($true) {
      $line = $Reader.ReadLine()
      if ([string]::IsNullOrEmpty($line)) { break }
    }

    if ($RequestLine -notmatch '^GET\s+([^\s]+)\s+HTTP/') { throw "Invalid OAuth callback." }
    $Callback = [Uri]("http://127.0.0.1:$Port" + $Matches[1])
    $Params = [Web.HttpUtility]::ParseQueryString($Callback.Query)
    if ($Params["state"] -ne $State) { throw "OAuth state validation failed." }
    if ($Params["error"]) { throw "Google authorization failed: $($Params["error"])" }
    $Code = $Params["code"]
    if ([string]::IsNullOrWhiteSpace($Code)) { throw "Google did not return an authorization code." }

    $Body = "<!doctype html><html><body style='font-family:Segoe UI,Arial;padding:32px;background:#080a0e;color:#f4f7fb'><h1>Clintware authorization received.</h1><p>You can close this tab and return to PowerShell.</p></body></html>"
    $Bytes = [Text.Encoding]::UTF8.GetBytes($Body)
    $nl = [Environment]::NewLine
    $Headers = "HTTP/1.1 200 OK" + $nl + "Content-Type: text/html; charset=utf-8" + $nl + "Content-Length: " + $Bytes.Length + $nl + "Connection: close" + $nl + $nl
    $HeaderBytes = [Text.Encoding]::ASCII.GetBytes($Headers)
    $Stream.Write($HeaderBytes,0,$HeaderBytes.Length)
    $Stream.Write($Bytes,0,$Bytes.Length)
    $Stream.Flush()
  }
  finally {
    if ($Reader) { $Reader.Dispose() }
    if ($Stream) { $Stream.Dispose() }
    $Client.Close()
  }
}
finally {
  $Listener.Stop()
}

$Token = Invoke-RestMethod -Method Post -Uri "https://oauth2.googleapis.com/token" -ContentType "application/x-www-form-urlencoded" -Body @{
  code = $Code
  client_id = $ClientId
  client_secret = $ClientSecret
  redirect_uri = $RedirectUri
  grant_type = "authorization_code"
}

if ([string]::IsNullOrWhiteSpace($Token.refresh_token)) {
  throw "Google did not return a refresh token. Rerun and approve consent again."
}

Write-Host ""
Write-Host "Saving OAuth credentials as encrypted GitHub Actions secrets..." -ForegroundColor Cyan
Set-GitHubSecret "GOOGLE_OAUTH_CLIENT_ID" $ClientId
Set-GitHubSecret "GOOGLE_OAUTH_CLIENT_SECRET" $ClientSecret
Set-GitHubSecret "GOOGLE_DELEGATED_REFRESH_TOKEN" $Token.refresh_token

$ClientSecret = $null
$ClientSecretSecure = $null

Write-Host "Shared Clintware OAuth client and delegated refresh grant saved." -ForegroundColor Green
Write-Host ""
Write-Host "Deploying Clintware Identity Broker..." -ForegroundColor Cyan
gh workflow run deploy-identity-broker.yml --repo $Repo --ref main
if ($LASTEXITCODE -ne 0) { throw "Could not start Clintware Identity Broker deployment." }
Start-Sleep -Seconds 3
$IdentityRun = gh run list --repo $Repo --workflow deploy-identity-broker.yml --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch --repo $Repo $IdentityRun --exit-status
if ($LASTEXITCODE -ne 0) { throw "Clintware Identity Broker deployment failed." }

Write-Host ""
Write-Host "Deploying shared Clintware mail Worker..." -ForegroundColor Cyan
gh workflow run deploy-newsletter-worker.yml --repo $Repo --ref main
if ($LASTEXITCODE -ne 0) { throw "Could not start mail Worker deployment." }
Start-Sleep -Seconds 3
$MailRun = gh run list --repo $Repo --workflow deploy-newsletter-worker.yml --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch --repo $Repo $MailRun --exit-status
if ($LASTEXITCODE -ne 0) { throw "Mail Worker deployment failed." }

Write-Host ""
Write-Host "Checking mail Worker health..." -ForegroundColor Cyan
$MailHealth = Invoke-RestMethod "https://clintware-blog-newsletter.clint-kosh.workers.dev/health"
$MailHealth | ConvertTo-Json -Depth 4
if (-not $MailHealth.ok -or -not $MailHealth.deliveryConfigured -or $MailHealth.provider -ne "gmail") {
  throw "Gmail delivery is not healthy yet."
}

Write-Host ""
Write-Host "Redeploying ClintCal..." -ForegroundColor Cyan
gh workflow run deploy-meet-worker.yml --repo $Repo --ref main
if ($LASTEXITCODE -ne 0) { throw "Could not start ClintCal deployment." }
Start-Sleep -Seconds 3
$MeetRun = gh run list --repo $Repo --workflow deploy-meet-worker.yml --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch --repo $Repo $MeetRun --exit-status
if ($LASTEXITCODE -ne 0) { throw "ClintCal deployment or health checks failed." }

Write-Host ""
Write-Host "Checking ClintCal health..." -ForegroundColor Cyan
$MeetHealth = Invoke-RestMethod "https://meet.clintware.com/health"
$MeetHealth | ConvertTo-Json -Depth 4
if (-not $MeetHealth.ok -or $MeetHealth.mailer -ne "gmail") {
  throw "ClintCal is not reporting Gmail mail health."
}

Write-Host ""
Write-Host "Gmail transport is active for Clintware and ClintCal." -ForegroundColor Green
Write-Host "https://meet.clintware.com" -ForegroundColor White
