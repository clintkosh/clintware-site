param(
  [ValidateSet("Check","Repair","Restore")]
  [string]$Mode = "Repair"
)

$ErrorActionPreference = "Stop"
$ProgramRoot = Join-Path $env:ProgramData "Clintware\TaskIsolation"
$InstalledExe = Join-Path $ProgramRoot "Clintware-TaskIsolation.exe"
$RuntimeRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$BundledExe = Join-Path $RuntimeRoot "quillgeist-lite\tools\Clintware-TaskIsolation.exe"
$LogPath = Join-Path $ProgramRoot "last-run.log"

function Test-Administrator {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($id)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-HashSafe([string]$Path) {
  if (-not (Test-Path $Path)) { return "" }
  try { return (Get-FileHash -LiteralPath $Path -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
  catch { return "" }
}

if (-not (Test-Administrator)) {
  Write-Output "TASK-ISOLATION // skipped: qq is not elevated; no UAC prompt was opened from the automatic health check."
  exit 0
}

if (-not (Test-Path $BundledExe)) {
  Write-Output ("TASK-ISOLATION // bundled helper missing: " + $BundledExe)
  exit 2
}

New-Item -ItemType Directory -Force -Path $ProgramRoot | Out-Null
$bundledHash = Get-HashSafe $BundledExe
$installedHash = Get-HashSafe $InstalledExe
if (-not $installedHash -or $installedHash -ne $bundledHash) {
  Copy-Item -LiteralPath $BundledExe -Destination $InstalledExe -Force
}

$args = @("--quiet")
switch ($Mode) {
  "Check" { $args += "--scan" }
  "Restore" { $args += "--restore" }
  default { $args += "--qq-auto" }
}

$p = Start-Process -FilePath $InstalledExe -ArgumentList $args -WindowStyle Hidden -Wait -PassThru
if ($p.ExitCode -ne 0) {
  $tail = ""
  try { if (Test-Path $LogPath) { $tail = Get-Content -LiteralPath $LogPath -Raw } } catch {}
  throw ("Task Isolation exited " + $p.ExitCode + ". " + $tail)
}

if (Test-Path $LogPath) {
  $raw = Get-Content -LiteralPath $LogPath -Raw
  Write-Output $raw.Trim()
} else {
  Write-Output ("TASK-ISOLATION // " + $Mode + " completed; no log file was emitted.")
}
