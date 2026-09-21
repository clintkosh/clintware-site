param(
  [string]$OwnerAccount = "clint.kosh@gmail.com",
  [string]$SupportAccount = "support@clintware.com",
  [string]$ProjectName = "Clintware"
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

function Invoke-GCloud {
  param(
    [Parameter(Mandatory=$true)][string[]]$Args,
    [string]$Failure = "gcloud command failed."
  )

  & gcloud @Args
  if ($LASTEXITCODE -ne 0) {
    throw $Failure
  }
}

Require-Command gcloud

Write-Host ""
Write-Host "=== CLINTWARE GOOGLE PROJECT ACCESS ===" -ForegroundColor Cyan
Write-Host "Owner:   $OwnerAccount"
Write-Host "Support: $SupportAccount"
Write-Host ""

$KnownAccounts = @(& gcloud auth list --format="value(account)")
if ($LASTEXITCODE -ne 0) { throw "Could not read gcloud authentication state." }

if ($KnownAccounts -notcontains $OwnerAccount) {
  Write-Host "Signing into $OwnerAccount..." -ForegroundColor Cyan
  & gcloud auth login $OwnerAccount
  if ($LASTEXITCODE -ne 0) { throw "Google login failed for $OwnerAccount." }
}

Invoke-GCloud -Args @("config","set","account",$OwnerAccount) -Failure "Could not select $OwnerAccount."

$ActiveAccount = (& gcloud auth list --filter="status:ACTIVE" --format="value(account)").Trim()
if ($LASTEXITCODE -ne 0) { throw "Could not determine the active Google account." }
if ($ActiveAccount -ne $OwnerAccount) {
  throw "Wrong active account. Expected $OwnerAccount but got $ActiveAccount."
}

Write-Host "Authenticated correctly as $ActiveAccount" -ForegroundColor Green

$ProjectRows = @(& gcloud projects list --format="csv[no-heading](projectId,name)")
if ($LASTEXITCODE -ne 0) { throw "Could not list Google Cloud projects for $OwnerAccount." }

$Matches = @()
foreach ($Row in $ProjectRows) {
  if (-not $Row) { continue }
  $Parts = $Row -split ",", 2
  if ($Parts.Count -lt 2) { continue }
  $Id = $Parts[0].Trim()
  $Name = $Parts[1].Trim()
  if ($Name -ieq $ProjectName) {
    $Matches += [PSCustomObject]@{ ProjectId = $Id; Name = $Name }
  }
}

if ($Matches.Count -eq 0) {
  Write-Host ""
  Write-Host "Projects visible to $OwnerAccount :" -ForegroundColor Yellow
  $ProjectRows | ForEach-Object { Write-Host "  $_" }
  throw "No existing Google Cloud project named '$ProjectName' was found."
}
if ($Matches.Count -gt 1) {
  $Matches | Format-Table -AutoSize
  throw "Multiple projects named '$ProjectName' exist. Stopping to avoid modifying the wrong project."
}

$ProjectId = $Matches[0].ProjectId
Write-Host "Found project: $ProjectName ($ProjectId)" -ForegroundColor Green

Invoke-GCloud -Args @("config","set","project",$ProjectId) -Failure "Could not select project $ProjectId."

Write-Host "Granting $SupportAccount Editor access..." -ForegroundColor Cyan
Invoke-GCloud -Args @(
  "projects","add-iam-policy-binding",$ProjectId,
  "--member=user:$SupportAccount",
  "--role=roles/editor",
  "--condition=None",
  "--quiet"
) -Failure "Failed to grant $SupportAccount access to $ProjectId."

$Policy = & gcloud projects get-iam-policy $ProjectId --flatten="bindings[].members" --filter="bindings.members:user:$SupportAccount" --format="value(bindings.role,bindings.members)"
if ($LASTEXITCODE -ne 0) { throw "Could not verify IAM membership." }
if (-not ($Policy -match [regex]::Escape($SupportAccount))) {
  throw "Google did not confirm $SupportAccount in the project IAM policy."
}

Write-Host ""
Write-Host "SUCCESS" -ForegroundColor Green
Write-Host "Project: $ProjectName ($ProjectId)"
Write-Host "Added:   $SupportAccount"
Write-Host "Role:    Editor"

$Url = "https://console.cloud.google.com/auth/overview?project=$ProjectId"
Start-Process $Url

Write-Host ""
Write-Host "Browser opened to the existing Clintware project." -ForegroundColor Cyan
Write-Host "Switch the Google account in that browser tab to $SupportAccount." -ForegroundColor Yellow
