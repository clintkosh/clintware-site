$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Get-Command py -ErrorAction SilentlyContinue) -and -not (Get-Command python -ErrorAction SilentlyContinue)) {
  throw "Python 3.11+ is required to build Clintware Home Office."
}
$Python = if (Get-Command py -ErrorAction SilentlyContinue) { "py" } else { "python" }

& $Python -m venv .venv
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
& .\.venv\Scripts\python.exe -m pip install -e .

Remove-Item -Recurse -Force build, dist -ErrorAction SilentlyContinue
& .\.venv\Scripts\pyinstaller.exe `
  --noconfirm `
  --clean `
  --windowed `
  --name "ClintwareHomeOffice" `
  --collect-all PySide6 `
  --collect-all docx `
  --paths "$Root\src" `
  "$Root\run.py"

Write-Host "Built: $Root\dist\ClintwareHomeOffice\ClintwareHomeOffice.exe"
Write-Host "For installer packaging, compile installer\ClintwareHomeOffice.iss with Inno Setup 6."
