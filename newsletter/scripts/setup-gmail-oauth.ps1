param(
  [string]$Repo = "clintkosh/clintware-site",
  [int]$WaitSeconds = 180
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required but was not found."
  }
}

function Wait-ForRun {
  param([string]$Workflow)
  Start-Sleep -Seconds 3
  $Run = gh run list --repo $Repo --workflow $Workflow --limit 1 --json databaseId --jq '.[0].databaseId'
  if ([string]::IsNullOrWhiteSpace($Run)) { throw "Could not find the $Workflow run." }
  gh run watch --repo $Repo $Run --exit-status
  if ($LASTEXITCODE -ne 0) { throw "$Workflow failed." }
}

Require-Command gh
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  gh auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { throw "GitHub authentication failed." }
}

Write-Host ""
Write-Host "Clintware delegated Google setup" -ForegroundColor Cyan
Write-Host "The Identity Broker owns the long-lived refresh grant. Product Workers receive only short-lived access through the broker." -ForegroundColor DarkGray
Write-Host ""

$StatusUri = "https://auth.clintware.com/delegated/google/status"
$StartUri = "https://auth.clintware.com/delegated/google/start"

$Status = Invoke-RestMethod $StatusUri
if (-not $Status.connected) {
  Write-Host "Opening the one-time Google consent flow..." -ForegroundColor Cyan
  Start-Process $StartUri
  Write-Host "Approve Gmail send plus Calendar event and availability access, then return here." -ForegroundColor Yellow

  $Deadline = (Get-Date).AddSeconds($WaitSeconds)
  do {
    Start-Sleep -Seconds 2
    $Status = Invoke-RestMethod $StatusUri
    if ($Status.connected) { break }
  } while ((Get-Date) -lt $Deadline)

  if (-not $Status.connected) {
    throw "Delegated Google authorization was not completed within $WaitSeconds seconds."
  }
}

Write-Host "Delegated Google grant is connected." -ForegroundColor Green
$Status | ConvertTo-Json -Depth 4

Write-Host ""
Write-Host "Deploying shared Clintware mail Worker..." -ForegroundColor Cyan
gh workflow run deploy-newsletter-worker.yml --repo $Repo --ref main
if ($LASTEXITCODE -ne 0) { throw "Could not start mail Worker deployment." }
Wait-ForRun "deploy-newsletter-worker.yml"

Write-Host ""
Write-Host "Checking mail Worker health..." -ForegroundColor Cyan
$MailHealth = Invoke-RestMethod "https://newsletter.clintware.com/health"
$MailHealth | ConvertTo-Json -Depth 4
if (-not $MailHealth.ok -or -not $MailHealth.deliveryConfigured -or $MailHealth.provider -ne "gmail") {
  throw "Gmail delivery is not healthy yet."
}

Write-Host ""
Write-Host "Redeploying ClintCal..." -ForegroundColor Cyan
gh workflow run deploy-meet-worker.yml --repo $Repo --ref main
if ($LASTEXITCODE -ne 0) { throw "Could not start ClintCal deployment." }
Wait-ForRun "deploy-meet-worker.yml"

Write-Host ""
Write-Host "Checking ClintCal health..." -ForegroundColor Cyan
$MeetHealth = Invoke-RestMethod "https://meet.clintware.com/health"
$MeetHealth | ConvertTo-Json -Depth 4
if (-not $MeetHealth.ok -or $MeetHealth.mailer -ne "gmail") {
  throw "ClintCal is not reporting Gmail mail health."
}

Write-Host ""
Write-Host "Gmail transport is active through the centralized Identity Broker." -ForegroundColor Green
Write-Host "Newsletter: https://newsletter.clintware.com" -ForegroundColor White
Write-Host "ClintCal: https://meet.clintware.com" -ForegroundColor White
