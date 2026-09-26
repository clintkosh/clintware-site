$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$LocalRoot = "C:\AI\LOCAL-CHATGPT"
$DockerRoot = Join-Path $LocalRoot "docker"
$ComposePath = Join-Path $DockerRoot "docker-compose.yml"
$EnvPath = Join-Path $DockerRoot ".env"
$GatewayRoot = Join-Path $LocalRoot "quillgeist-gateway"
$PackageRoot = Join-Path $GatewayRoot "agentbridge_node"
$ScriptRoot = Join-Path $LocalRoot "scripts"
$DataRoot = "F:\AI-Data"
$SecretRoot = Join-Path $DataRoot "Config\LOCAL-CHATGPT"
$BackupRoot = Join-Path $DataRoot "Backups\LOCAL-CHATGPT"
$GatewayKeyPath = Join-Path $SecretRoot "quillgeist-gateway.key"
$GatewayPort = 11435
$BitNetPort = 11436
$GatewayTask = "MEMORIA Quillgeist Local Gateway"
$BitNetTask = "MEMORIA BitNet Server"

function Log([string]$Message) { Write-Host ("LOCAL_AI // " + $Message) }

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Resolve-RealPython {
  $candidates = New-Object System.Collections.Generic.List[string]
  $miniconda = Join-Path $env:USERPROFILE "Miniconda3\python.exe"
  if (Test-Path $miniconda) { $candidates.Add($miniconda) }
  foreach ($name in @("python.exe","python3.exe")) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) { $candidates.Add([string]$cmd.Source) }
  }
  foreach ($path in ($candidates | Select-Object -Unique)) {
    if ($path -match '(?i)\\WindowsApps\\') { continue }
    try {
      $version = (& $path --version 2>&1 | Out-String).Trim()
      if ($LASTEXITCODE -eq 0 -and $version -match '^Python 3\.') { return $path }
    } catch {}
  }
  throw "A working Python 3 runtime was not found; Windows Store aliases are ignored."
}

function New-LocalKey {
  $bytes = New-Object byte[] 48
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+","-").Replace("/","_")
}

function Get-ReviewedAsset {
  param(
    [Parameter(Mandatory=$true)][string]$Relative,
    [Parameter(Mandatory=$true)][string]$Destination,
    [Parameter(Mandatory=$true)][string]$Required
  )
  $uri = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/" + $Relative
  $temp = $Destination + ".new"
  New-Item -ItemType Directory -Force -Path (Split-Path $Destination -Parent) | Out-Null
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
  try {
    Invoke-WebRequest -Uri $uri -OutFile $temp -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
    $body = Get-Content -LiteralPath $temp -Raw
    if ($body.Length -lt 20 -or -not $body.Contains($Required)) {
      throw "Reviewed runtime asset failed structural validation: $Relative"
    }
    Move-Item -LiteralPath $temp -Destination $Destination -Force
  } finally {
    Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
  }
}

function Set-EnvValue {
  param([string]$Path,[string]$Name,[string]$Value)
  $lines = @()
  if (Test-Path $Path) { $lines = @(Get-Content -LiteralPath $Path) }
  $pattern = '^' + [Regex]::Escape($Name) + '='
  $out = New-Object System.Collections.Generic.List[string]
  $written = $false
  foreach ($line in $lines) {
    if ($line -match $pattern) {
      if (-not $written) {
        $out.Add($Name + "=" + $Value)
        $written = $true
      }
    } else {
      $out.Add([string]$line)
    }
  }
  if (-not $written) { $out.Add($Name + "=" + $Value) }
  [IO.File]::WriteAllLines($Path,$out,(New-Object Text.UTF8Encoding($false)))
}

function Set-ComposeServiceEnvironment {
  param(
    [string[]]$Lines,
    [string]$Service,
    [hashtable]$Values
  )

  $start = -1
  for ($i=0; $i -lt $Lines.Count; $i++) {
    if ($Lines[$i] -match ('^  ' + [Regex]::Escape($Service) + ':\s*$')) { $start=$i; break }
  }
  if ($start -lt 0) { throw "Compose service not found: $Service" }

  $end = $Lines.Count
  for ($i=$start+1; $i -lt $Lines.Count; $i++) {
    if ($Lines[$i] -match '^  [A-Za-z0-9_.-]+:\s*$') { $end=$i; break }
  }

  $envLine = -1
  for ($i=$start+1; $i -lt $end; $i++) {
    if ($Lines[$i] -match '^    environment:\s*$') { $envLine=$i; break }
  }

  $keys = @($Values.Keys | Sort-Object)
  $out = New-Object System.Collections.Generic.List[string]

  if ($envLine -lt 0) {
    for ($i=0; $i -lt $Lines.Count; $i++) {
      $out.Add([string]$Lines[$i])
      if ($i -eq $start) {
        $out.Add("    environment:")
        foreach ($key in $keys) { $out.Add("      - " + $key + "=" + [string]$Values[$key]) }
      }
    }
    return $out.ToArray()
  }

  for ($i=0; $i -lt $Lines.Count; $i++) {
    $line = [string]$Lines[$i]
    if ($i -gt $envLine -and $i -lt $end -and $line -match '^      -\s*([A-Za-z0-9_]+)=') {
      $name = [string]$matches[1]
      if ($Values.ContainsKey($name)) { continue }
    }
    $out.Add($line)
    if ($i -eq $envLine) {
      foreach ($key in $keys) { $out.Add("      - " + $key + "=" + [string]$Values[$key]) }
    }
  }
  return $out.ToArray()
}

function Test-Url([string]$Url,[int]$Timeout=5) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $Timeout
    return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500)
  } catch { return $false }
}

function Wait-Url([string]$Url,[int]$Seconds=60) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  do {
    if (Test-Url $Url 4) { return $true }
    Start-Sleep -Milliseconds 750
  } while ((Get-Date) -lt $deadline)
  return $false
}

function Register-HiddenTask {
  param([string]$Name,[string]$ScriptPath,[string]$Pwsh)
  $args = '-NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $ScriptPath + '"'
  $action = New-ScheduledTaskAction -Execute $Pwsh -Argument $args -WorkingDirectory (Split-Path $ScriptPath -Parent)
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
  $principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Highest
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
  Register-ScheduledTask -TaskName $Name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
  Enable-ScheduledTask -TaskName $Name | Out-Null
}

function Invoke-GatewayModels {
  param([string]$Key)
  $headers = @{ Authorization = "Bearer " + $Key }
  return Invoke-RestMethod -Uri ("http://127.0.0.1:" + $GatewayPort + "/v1/models") -Headers $headers -TimeoutSec 12
}

if (-not (Test-Administrator)) { throw "Local AI integration must run through the elevated QQ task." }
if (-not (Test-Path $LocalRoot)) { throw "Existing local AI root is missing: $LocalRoot" }
if (-not (Test-Path $DataRoot)) { throw "F: local AI data root is unavailable: $DataRoot" }
if (-not (Test-Path $ComposePath)) { throw "Existing Docker Compose file is missing: $ComposePath" }

$python = Resolve-RealPython
$pwshCmd = Get-Command pwsh.exe -ErrorAction SilentlyContinue
$pwsh = if ($pwshCmd) { [string]$pwshCmd.Source } else { "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" }
$dockerCmd = Get-Command docker.exe -ErrorAction SilentlyContinue
if (-not $dockerCmd) { $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue }
if (-not $dockerCmd -or -not $dockerCmd.Source) { throw "Docker CLI is unavailable." }
$docker = [string]$dockerCmd.Source

New-Item -ItemType Directory -Force -Path $GatewayRoot,$PackageRoot,$ScriptRoot,$SecretRoot,$BackupRoot | Out-Null

Log "Refreshing maintained local inference gateway sources"
Get-ReviewedAsset -Relative "agentbridge-node/agentbridge_node/__init__.py" -Destination (Join-Path $PackageRoot "__init__.py") -Required "__version__"
Get-ReviewedAsset -Relative "agentbridge-node/agentbridge_node/local_inference.py" -Destination (Join-Path $PackageRoot "local_inference.py") -Required "def launch_plan"
Get-ReviewedAsset -Relative "agentbridge-node/agentbridge_node/local_gateway.py" -Destination (Join-Path $PackageRoot "local_gateway.py") -Required "QUILLGEIST_GATEWAY_API_KEY"

$bitnetRoot = @(
  $env:QUILLGEIST_BITNET_HOME,
  "F:\AI-Data\BitNet",
  "C:\AI\BitNet"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $bitnetRoot) { throw "BitNet runtime is not installed. Run bitnet-setup first." }

$bitnetServer = @(
  (Join-Path $bitnetRoot "build\bin\Release\llama-server.exe"),
  (Join-Path $bitnetRoot "build\bin\llama-server.exe")
) | Where-Object { Test-Path $_ } | Select-Object -First 1
$bitnetModel = @(
  (Join-Path $bitnetRoot "models\BitNet-b1.58-2B-4T\ggml-model-i2_s.gguf")
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $bitnetServer -or -not $bitnetModel) { throw "BitNet server or validated model is missing." }

if (-not (Test-Path $GatewayKeyPath)) {
  [IO.File]::WriteAllText($GatewayKeyPath,(New-LocalKey),(New-Object Text.UTF8Encoding($false)))
}
$key = (Get-Content -LiteralPath $GatewayKeyPath -Raw).Trim()
if ($key.Length -lt 32) { throw "Local gateway key is invalid." }

try {
  & icacls.exe $GatewayKeyPath /inheritance:r /grant:r ($env:USERNAME + ":(R,W)") "SYSTEM:F" "Administrators:F" | Out-Null
} catch {}

$bitnetStart = Join-Path $ScriptRoot "START-BITNET-SERVER.ps1"
$bitnetStartBody = @'
$ErrorActionPreference = "Stop"
$server = "__SERVER__"
$model = "__MODEL__"
if (-not (Test-Path $server) -or -not (Test-Path $model)) { throw "BitNet runtime is incomplete." }
& $server -m $model -c 4096 -t ([math]::Max(2,[math]::Min(8,[Environment]::ProcessorCount))) -ngl 0 --host 127.0.0.1 --port __PORT__
'@
$bitnetStartBody = $bitnetStartBody.Replace("__SERVER__",$bitnetServer).Replace("__MODEL__",$bitnetModel).Replace("__PORT__",[string]$BitNetPort)
[IO.File]::WriteAllText($bitnetStart,$bitnetStartBody,(New-Object Text.UTF8Encoding($false)))

$gatewayStart = Join-Path $ScriptRoot "START-QUILLGEIST-LOCAL-GATEWAY.ps1"
$gatewayStartBody = @'
$ErrorActionPreference = "Stop"
$env:QUILLGEIST_GATEWAY_API_KEY = (Get-Content -LiteralPath "__KEY__" -Raw).Trim()
$env:QUILLGEIST_BITNET_HOME = "__BITNET__"
$env:QUILLGEIST_BITNET_SERVER_URL = "http://127.0.0.1:__BITNET_PORT__"
$env:PYTHONPATH = "__GATEWAY_ROOT__"
& "__PYTHON__" -c "from agentbridge_node.local_gateway import serve; serve({}, host='0.0.0.0', port=__GATEWAY_PORT__)"
'@
$gatewayStartBody = $gatewayStartBody.Replace("__KEY__",$GatewayKeyPath).Replace("__BITNET__",$bitnetRoot).Replace("__BITNET_PORT__",[string]$BitNetPort).Replace("__GATEWAY_ROOT__",$GatewayRoot).Replace("__PYTHON__",$python).Replace("__GATEWAY_PORT__",[string]$GatewayPort)
[IO.File]::WriteAllText($gatewayStart,$gatewayStartBody,(New-Object Text.UTF8Encoding($false)))

Log "Registering hidden startup tasks"
Register-HiddenTask -Name $BitNetTask -ScriptPath $bitnetStart -Pwsh $pwsh
Register-HiddenTask -Name $GatewayTask -ScriptPath $gatewayStart -Pwsh $pwsh

if (-not (Test-Url ("http://127.0.0.1:" + $BitNetPort + "/health") 3)) {
  Start-ScheduledTask -TaskName $BitNetTask
}
if (-not (Wait-Url ("http://127.0.0.1:" + $BitNetPort + "/health") 90)) {
  throw "Persistent BitNet server did not become healthy."
}

if (-not (Test-Url ("http://127.0.0.1:" + $GatewayPort + "/health") 3)) {
  Start-ScheduledTask -TaskName $GatewayTask
}
if (-not (Wait-Url ("http://127.0.0.1:" + $GatewayPort + "/health") 45)) {
  throw "Quillgeist local gateway did not become healthy."
}

$models = Invoke-GatewayModels -Key $key
$modelIds = @($models.data | ForEach-Object { [string]$_.id })
$ollamaModel = $modelIds | Where-Object { $_ -like "ollama/*" -and $_ -notlike "*embed*" } | Select-Object -First 1
$bitnetAlias = $modelIds | Where-Object { $_ -like "bitnet/*" } | Select-Object -First 1
if (-not $ollamaModel) { throw "Gateway model inventory did not expose an Ollama chat model." }
if (-not $bitnetAlias) { throw "Gateway model inventory did not expose BitNet." }

Log "Updating existing Docker configuration with local-only gateway connection"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$composeBackup = Join-Path $BackupRoot ("docker-compose." + $timestamp + ".yml")
Copy-Item -LiteralPath $ComposePath -Destination $composeBackup -Force

Set-EnvValue -Path $EnvPath -Name "QUILLGEIST_GATEWAY_API_KEY" -Value $key

$lines = @(Get-Content -LiteralPath $ComposePath)
$lines = Set-ComposeServiceEnvironment -Lines $lines -Service "open-webui" -Values @{
  ENABLE_OPENAI_API = "True"
  OPENAI_API_BASE_URL = "http://host.docker.internal:$GatewayPort/v1"
  OPENAI_API_KEY = '${QUILLGEIST_GATEWAY_API_KEY}'
}
$lines = Set-ComposeServiceEnvironment -Lines $lines -Service "n8n-local" -Values @{
  QUILLGEIST_LOCAL_AI_BASE_URL = "http://host.docker.internal:$GatewayPort/v1"
  QUILLGEIST_LOCAL_AI_API_KEY = '${QUILLGEIST_GATEWAY_API_KEY}'
}
[IO.File]::WriteAllLines($ComposePath,$lines,(New-Object Text.UTF8Encoding($false)))

Push-Location $DockerRoot
try {
  & $docker compose -f $ComposePath config -q
  if ($LASTEXITCODE -ne 0) {
    Copy-Item -LiteralPath $composeBackup -Destination $ComposePath -Force
    throw "Docker Compose validation failed; original file restored."
  }

  & $docker compose -f $ComposePath up -d open-webui n8n-local
  if ($LASTEXITCODE -ne 0) { throw "Docker services did not restart cleanly." }
} finally {
  Pop-Location
}

if (-not (Wait-Url "http://127.0.0.1:3015" 75)) { throw "Open WebUI did not recover after gateway configuration." }
if (-not (Wait-Url "http://127.0.0.1:5678" 75)) { throw "n8n did not recover after gateway configuration." }

$probeCode = @'
import json, os, urllib.request
req=urllib.request.Request(
  "http://host.docker.internal:11435/v1/models",
  headers={"Authorization":"Bearer "+os.environ["QG_KEY"]}
)
with urllib.request.urlopen(req,timeout=15) as r:
  data=json.loads(r.read().decode("utf-8"))
print(json.dumps({"ok":True,"models":[x.get("id") for x in data.get("data",[])]}))
'@

function Test-ContainerGateway([string]$Container,[string]$Runtime) {
  if ($Runtime -eq "python") {
    $output = & $docker exec -e ("QG_KEY=" + $key) $Container python -c $probeCode 2>&1 | Out-String
  } else {
    $nodeCode = 'const u="http://host.docker.internal:11435/v1/models"; fetch(u,{headers:{Authorization:"Bearer "+process.env.QG_KEY}}).then(async r=>{if(!r.ok)throw new Error("HTTP "+r.status); const j=await r.json(); console.log(JSON.stringify({ok:true,models:j.data.map(x=>x.id)}));}).catch(e=>{console.error(e.message);process.exit(2);});'
    $output = & $docker exec -e ("QG_KEY=" + $key) $Container node -e $nodeCode 2>&1 | Out-String
  }
  return [pscustomobject]@{ ok=($LASTEXITCODE -eq 0); output=$output.Trim() }
}

$webProbe = Test-ContainerGateway "open-webui-local" "python"
if (-not $webProbe.ok) {
  try {
    $inspect = (& $docker inspect open-webui-local | Out-String) | ConvertFrom-Json
    $networkProp = $inspect[0].NetworkSettings.Networks.PSObject.Properties | Select-Object -First 1
    if ($networkProp) {
      $networkName = [string]$networkProp.Name
      $network = ((& $docker network inspect $networkName | Out-String) | ConvertFrom-Json)[0]
      $subnet = [string]$network.IPAM.Config[0].Subnet
      if ($subnet) {
        Get-NetFirewallRule -DisplayName "Clintware Quillgeist Local Gateway" -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
        New-NetFirewallRule -DisplayName "Clintware Quillgeist Local Gateway" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $GatewayPort -RemoteAddress $subnet -Profile Any | Out-Null
        $webProbe = Test-ContainerGateway "open-webui-local" "python"
      }
    }
  } catch {}
}
if (-not $webProbe.ok) { throw "Open WebUI container cannot reach the authenticated local gateway." }

$n8nProbe = Test-ContainerGateway "n8n-local" "node"
if (-not $n8nProbe.ok) { throw "n8n container cannot reach the authenticated local gateway." }

function Test-ProviderFromN8n([string]$Model,[string]$Label) {
  $payload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((@{
    model=$Model
    messages=@(@{role="user";content="Reply with exactly READY."})
    max_tokens=24
    temperature=0
  } | ConvertTo-Json -Depth 8 -Compress)))
  $nodeCode = 'const p=JSON.parse(Buffer.from(process.env.QG_PAYLOAD,"base64").toString("utf8")); fetch("http://host.docker.internal:11435/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json",Authorization:"Bearer "+process.env.QG_KEY},body:JSON.stringify(p)}).then(async r=>{const j=await r.json(); if(!r.ok)throw new Error(JSON.stringify(j)); const t=String(j.choices?.[0]?.message?.content||""); if(!t.trim())throw new Error("empty response"); console.log(JSON.stringify({ok:true,model:j.model,text:t.slice(-300)}));}).catch(e=>{console.error(e.message);process.exit(2);});'
  $result = & $docker exec -e ("QG_KEY=" + $key) -e ("QG_PAYLOAD=" + $payload) n8n-local node -e $nodeCode 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw ($Label + " generation through n8n container failed: " + $result.Trim()) }
  return $result.Trim()
}

Log "Running n8n-path generation through Ollama"
$ollamaResult = Test-ProviderFromN8n -Model $ollamaModel -Label "Ollama"
Log "Running n8n-path generation through BitNet"
$bitnetResult = Test-ProviderFromN8n -Model $bitnetAlias -Label "BitNet"

[ordered]@{
  ok = $true
  gateway = "http://127.0.0.1:$GatewayPort/v1"
  gateway_auth = "bearer"
  gateway_key_exposed = $false
  bitnet_server = "http://127.0.0.1:$BitNetPort"
  open_webui = "http://127.0.0.1:3015"
  n8n = "http://127.0.0.1:5678"
  open_webui_container_gateway = $webProbe.ok
  n8n_container_gateway = $n8nProbe.ok
  ollama_model = $ollamaModel
  bitnet_model = $bitnetAlias
  ollama_n8n_test = $ollamaResult
  bitnet_n8n_test = $bitnetResult
  compose_backup = $composeBackup
  d_drive_touched = $false
  paid_provider_fallback = $false
} | ConvertTo-Json -Depth 8
