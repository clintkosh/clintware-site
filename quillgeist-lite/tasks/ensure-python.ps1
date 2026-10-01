param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$MarkerPath = Join-Path $HomeDir "python3-check.json"
New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

function Resolve-Python3 {
  $candidates = New-Object System.Collections.Generic.List[string]
  foreach ($path in @(
    (Join-Path $env:ProgramFiles "Python313\python.exe"),
    (Join-Path $env:ProgramFiles "Python312\python.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\python.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"),
    (Join-Path $env:USERPROFILE "Miniconda3\python.exe")
  )) {
    if ($path -and (Test-Path -LiteralPath $path)) { $candidates.Add($path) }
  }
  foreach ($name in @("python.exe","python3.exe","py.exe")) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source -and $cmd.Source -notmatch '(?i)\\WindowsApps\\') { $candidates.Add([string]$cmd.Source) }
  }
  foreach ($candidate in ($candidates | Select-Object -Unique)) {
    try {
      $version = (& $candidate --version 2>&1 | Out-String).Trim()
      if ($LASTEXITCODE -eq 0 -and $version -match '^Python 3\.') {
        return [pscustomobject]@{Path=$candidate;Version=$version}
      }
    } catch {}
  }
  return $null
}

$python = Resolve-Python3
$winget = Get-Command winget.exe -ErrorAction SilentlyContinue

if (-not $python) {
  if (-not $winget) { throw "Python 3 is not installed and winget is unavailable." }
  Write-Host "PYTHON // installing current Python 3" -ForegroundColor Cyan
  & $winget.Source install --id Python.Python.3.13 --exact --source winget --accept-package-agreements --accept-source-agreements --silent
  if ($LASTEXITCODE -ne 0) {
    Write-Host "PYTHON WARN // Python 3.13 install failed; trying Python 3.12" -ForegroundColor DarkYellow
    & $winget.Source install --id Python.Python.3.12 --exact --source winget --accept-package-agreements --accept-source-agreements --silent
  }
  $python = Resolve-Python3
  if (-not $python) { throw "Python installation completed without a discoverable Python 3 runtime." }
} elseif ($Force -and $winget) {
  try {
    & $winget.Source upgrade --id Python.Python.3.13 --exact --source winget --accept-package-agreements --accept-source-agreements --silent --include-unknown
  } catch {}
  $python = Resolve-Python3
}

[ordered]@{
  checked_at = [DateTime]::UtcNow.ToString("o")
  path = $python.Path
  version = $python.Version
} | ConvertTo-Json | Set-Content -Path $MarkerPath -Encoding UTF8

Write-Host ("PYTHON_READY // " + $python.Version + " // " + $python.Path) -ForegroundColor Green
$python.Path
