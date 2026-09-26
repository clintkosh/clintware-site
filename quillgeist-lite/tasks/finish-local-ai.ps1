param(
  [int]$MaxPasses = 4
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$WorkflowDir = Join-Path $HomeDir "workflows"
$StatePath = Join-Path $WorkflowDir "local-ai-finish.json"
$RuntimeRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$ToolsDir = Join-Path $RuntimeRoot "quillgeist-lite\tools"
$TasksDir = Join-Path $RuntimeRoot "quillgeist-lite\tasks"
$LocalRoot = "C:\AI\LOCAL-CHATGPT"
$DockerRoot = Join-Path $LocalRoot "docker"
$ComposePath = Join-Path $DockerRoot "docker-compose.yml"

New-Item -ItemType Directory -Force -Path $WorkflowDir | Out-Null

function Log([string]$Message) { Write-Host ("AUTOPILOT // " + $Message) }

function Save-State([string]$Stage,[string]$Status,[string]$Detail="") {
  $payload = [ordered]@{
    workflow = "finish-local-ai"
    stage = $Stage
    status = $Status
    detail = $Detail
    updated_at = (Get-Date).ToUniversalTime().ToString("o")
  }
  [IO.File]::WriteAllText($StatePath,($payload | ConvertTo-Json -Depth 6),(New-Object Text.UTF8Encoding($false)))
}

function Test-Url([string]$Url,[int]$Timeout=4) {
  try {
    $r=Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $Timeout
    return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500)
  } catch { return $false }
}

function Resolve-Python {
  foreach($candidate in @(
    (Join-Path $env:USERPROFILE "Miniconda3\python.exe"),
    (Get-Command python.exe -ErrorAction SilentlyContinue).Source,
    (Get-Command python3.exe -ErrorAction SilentlyContinue).Source
  )){
    if($candidate -and (Test-Path $candidate) -and $candidate -notmatch '(?i)\\WindowsApps\\'){ return [string]$candidate }
  }
  throw "No working Python runtime was found."
}

function Run-Checked([string]$Label,[scriptblock]$Body) {
  Log ("BEGIN " + $Label)
  Save-State $Label "running"
  & $Body
  if($LASTEXITCODE -ne 0){ throw ($Label + " failed with exit code " + $LASTEXITCODE) }
  Save-State $Label "passed"
  Log ("PASS " + $Label)
}

if(-not (Test-Path $LocalRoot)){ throw "Existing local AI root is missing: $LocalRoot" }
if(-not (Test-Path $ComposePath)){ throw "Existing Docker Compose file is missing: $ComposePath" }

$python=Resolve-Python
$pwsh=(Get-Command pwsh.exe -ErrorAction SilentlyContinue).Source
if(-not $pwsh){ $pwsh="$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" }
$docker=(Get-Command docker.exe -ErrorAction SilentlyContinue).Source
if(-not $docker){ $docker=(Get-Command docker -ErrorAction SilentlyContinue).Source }
if(-not $docker){ throw "Docker CLI is unavailable." }

Save-State "preflight" "passed"
Log "preflight passed"

$reconcilePy = Join-Path $ToolsDir "local_ai.py"
$parityPy = Join-Path $ToolsDir "local_ai_parity_check.py"
$bitnetPs = Join-Path $TasksDir "bitnet-setup.ps1"
$integratePs = Join-Path $TasksDir "integrate-local-ai.ps1"
foreach($p in @($reconcilePy,$parityPy,$bitnetPs,$integratePs)){
  if(-not (Test-Path $p)){ throw "Required reviewed workflow asset missing: $p" }
}

$pass=0
$complete=$false
$lastMissing=@()

while(-not $complete -and $pass -lt [Math]::Max(1,$MaxPasses)){
  $pass++
  Log ("CHUNK " + $pass + "/" + $MaxPasses)
  Save-State ("chunk-" + $pass) "running"

  Run-Checked "reconcile-existing-stack" {
    & $python $reconcilePy --Action reconcile
  }

  if(-not (Test-Url "http://127.0.0.1:11436/health" 3)){
    Run-Checked "bitnet-setup" {
      & $pwsh -NoProfile -ExecutionPolicy Bypass -File $bitnetPs
    }
  } else {
    Log "PASS bitnet already healthy"
  }

  Run-Checked "local-ai-integrate" {
    & $pwsh -NoProfile -ExecutionPolicy Bypass -File $integratePs
  }

  Push-Location $DockerRoot
  try {
    Run-Checked "compose-all-services" {
      & $docker compose -f $ComposePath up -d
    }
  } finally { Pop-Location }

  Run-Checked "local-ai-parity" {
    & $python $parityPy
  }

  $expected=[ordered]@{
    "Open WebUI"="http://127.0.0.1:3015"
    "Ollama"="http://127.0.0.1:11434/api/tags"
    "n8n"="http://127.0.0.1:5678"
    "Quillgeist Gateway"="http://127.0.0.1:11435/health"
    "BitNet"="http://127.0.0.1:11436/health"
    "SearXNG"="http://127.0.0.1:8088"
    "Pipelines"="http://127.0.0.1:9099"
    "Web Search Agent"="http://127.0.0.1:8788/health"
    "Media Agent"="http://127.0.0.1:8799/health"
    "ComfyUI"="http://127.0.0.1:8188/system_stats"
  }

  $missing=New-Object System.Collections.Generic.List[string]
  foreach($entry in $expected.GetEnumerator()){
    if(Test-Url $entry.Value 4){ Log ("HEALTHY " + $entry.Key) }
    else { $missing.Add([string]$entry.Key); Log ("MISSING " + $entry.Key) }
  }

  if($missing.Count -eq 0){
    $complete=$true
    Save-State "verify-all-services" "passed" "All expected local AI services are healthy."
    break
  }

  $lastMissing=@($missing)
  Save-State "verify-all-services" "retrying" ("Missing: " + ($lastMissing -join ", "))
  if($pass -lt $MaxPasses){
    Log ("CONTINUE // unresolved services: " + ($lastMissing -join ", "))
    Start-Sleep -Seconds ([Math]::Min(20,4*$pass))
  }
}

if(-not $complete){
  Save-State "blocked" "failed" ("Still unhealthy after $MaxPasses chunks: " + ($lastMissing -join ", "))
  Write-Host ""
  Write-Host ("AUTOPILOT BLOCKED // " + ($lastMissing -join ", "))
  Write-Host "The workflow preserved its checkpoint and can resume on the next run."
  exit 2
}

Save-State "complete" "passed" "Local AI stack completed and verified."
Write-Host ""
Write-Host "AUTOPILOT COMPLETE // local AI server work verified end-to-end."
exit 0
