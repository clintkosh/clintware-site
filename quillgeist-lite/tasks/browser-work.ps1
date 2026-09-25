param(
  [Parameter(Mandatory=$true)][string]$Action,
  [string]$Url = "",
  [string]$Selector = "",
  [string]$Value = "",
  [string]$StepsJson = "",
  [string]$Query = "",
  [ValidateSet("auto","google","brave","bing","duckduckgo")][string]$Engine = "auto",
  [ValidateRange(1,20)][int]$MaxResults = 8,
  [ValidateRange(1000,100000)][int]$MaxChars = 20000,
  [string]$Approved = "false",
  [string]$AllowPrivate = "false",
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
$invokeArgs = @($AgentPath,"--action",$Action,"--headless",$Headless,"--wait-ms",[string]$WaitMs,"--engine",$Engine,"--max-results",[string]$MaxResults,"--max-chars",[string]$MaxChars,"--approved",$Approved,"--allow-private",$AllowPrivate)
if ($Url) { $invokeArgs += @("--url",$Url) }
if ($Selector) { $invokeArgs += @("--selector",$Selector) }
if ($Value) { $invokeArgs += @("--value",$Value) }
if ($StepsJson) { $invokeArgs += @("--steps-json",$StepsJson) }
if ($Query) { $invokeArgs += @("--query",$Query) }
$previousPythonIo = $env:PYTHONIOENCODING
$env:PYTHONIOENCODING = "utf-8"
try { & $RuntimePython @invokeArgs } finally { $env:PYTHONIOENCODING = $previousPythonIo }
if ($LASTEXITCODE -ne 0) { throw "qq browser agent failed with exit code $LASTEXITCODE." }
