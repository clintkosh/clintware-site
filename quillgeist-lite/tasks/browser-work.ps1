param(
  [Parameter(Mandatory=$true)][string]$Action,
  [string]$Url = "",
  [string]$Selector = "",
  [string]$Value = "",
  [string]$StepsJson = "",
  [string]$Headless = "true",
  [int]$WaitMs = 700
)
$ErrorActionPreference = "Stop"
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$AgentPath = Join-Path $HomeDir "browser_agent.py"
$SetupPath = Join-Path $HomeDir "ensure-browser-runtime.ps1"
$RuntimePython = Join-Path $HomeDir "browser-runtime\Scripts\python.exe"
$Base = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite"
New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

function Refresh-File([string]$Remote,[string]$Target) {
  $temp = $Target + ".new"
  Invoke-WebRequest -Uri ($Base + "/" + $Remote + "?cb=" + [Guid]::NewGuid().ToString("n")) -OutFile $temp -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
  if (-not (Test-Path $temp) -or (Get-Item $temp).Length -lt 500) { throw "qq browser component download failed: $Remote" }
  Move-Item $temp $Target -Force
}
Refresh-File "tools/browser_agent.py" $AgentPath
Refresh-File "tasks/ensure-browser-runtime.ps1" $SetupPath
if (-not (Test-Path $RuntimePython)) { & $SetupPath }
if (-not (Test-Path $RuntimePython)) { throw "qq browser runtime is unavailable after self-repair." }

$args = @($AgentPath,"--action",$Action,"--headless",$Headless,"--wait-ms",[string]$WaitMs)
if ($Url) { $args += @("--url",$Url) }
if ($Selector) { $args += @("--selector",$Selector) }
if ($Value) { $args += @("--value",$Value) }
if ($StepsJson) { $args += @("--steps-json",$StepsJson) }
& $RuntimePython @args
if ($LASTEXITCODE -ne 0) { throw "qq browser agent failed with exit code $LASTEXITCODE." }
