$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=== CLINTWARE QUILLGEIST LITE DOCTOR ===" -ForegroundColor Cyan

$rows = @()
foreach ($name in @("powershell","gh","git","gcloud","python","node")) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  $rows += [PSCustomObject]@{
    Tool = $name
    Found = [bool]$cmd
    Path = if ($cmd) { $cmd.Source } else { "" }
  }
}
$rows | Format-Table -AutoSize

if (Get-Command gh -ErrorAction SilentlyContinue) {
  Write-Host ""
  Write-Host "GitHub authentication:" -ForegroundColor Cyan
  gh auth status
}

if (Get-Command gcloud -ErrorAction SilentlyContinue) {
  Write-Host ""
  Write-Host "Google Cloud accounts:" -ForegroundColor Cyan
  gcloud auth list --format="table(account,status)"
}

Write-Host ""
Write-Host "Quillgeist Lite doctor complete." -ForegroundColor Green
