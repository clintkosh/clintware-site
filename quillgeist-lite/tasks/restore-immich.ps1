param()

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$ApprovedRoots = @(
  "C:\AI\LOCAL-CHATGPT",
  "F:\AI-Data"
)
$ImmichPort = 2283

function Log([string]$Message) { Write-Host ("IMMICH // " + $Message) }

function Test-Immich {
  foreach($url in @(
    "http://127.0.0.1:$ImmichPort/api/server/ping",
    "http://127.0.0.1:$ImmichPort/api/server/version",
    "http://127.0.0.1:$ImmichPort/"
  )){
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
      if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){ return $true }
    } catch {}
  }
  return $false
}

function Resolve-Docker {
  $d = (Get-Command docker.exe -ErrorAction SilentlyContinue).Source
  if(-not $d){ $d = (Get-Command docker -ErrorAction SilentlyContinue).Source }
  if(-not $d){ throw "Docker CLI is unavailable." }
  return $d
}

function Get-ExistingImmichContainers([string]$Docker) {
  try {
    $ids = & $Docker ps -aq --filter "label=com.docker.compose.project=immich"
    if($LASTEXITCODE -ne 0){ return @() }
    return @($ids | Where-Object { $_ })
  } catch { return @() }
}

function Get-ComposeCandidates {
  $patterns = @("compose.yml","compose.yaml","docker-compose.yml","docker-compose.yaml")
  $found = New-Object System.Collections.Generic.List[string]
  foreach($root in $ApprovedRoots){
    if(-not (Test-Path $root)){ continue }
    foreach($pattern in $patterns){
      Get-ChildItem -Path $root -Filter $pattern -File -Recurse -ErrorAction SilentlyContinue |
        ForEach-Object {
          try {
            $text = Get-Content -Raw -LiteralPath $_.FullName -ErrorAction Stop
            if($text -match '(?i)immich-app|immich_server|immich-server|ghcr\.io/immich-app'){
              $found.Add($_.FullName)
            }
          } catch {}
        }
    }
  }
  return @($found | Select-Object -Unique)
}

$docker = Resolve-Docker

if(Test-Immich){
  Log "PASS already healthy on localhost:$ImmichPort"
  exit 0
}

$containers = Get-ExistingImmichContainers $docker
$composeFiles = Get-ComposeCandidates

if($composeFiles.Count -gt 0){
  $compose = $composeFiles[0]
  Log ("Found existing compose: " + $compose)
  Push-Location (Split-Path $compose -Parent)
  try {
    & $docker compose -f $compose up -d
    if($LASTEXITCODE -ne 0){ throw "Existing Immich compose failed to start." }
  } finally { Pop-Location }
} elseif($containers.Count -gt 0) {
  Log ("No compose file found, but existing Immich containers exist: " + $containers.Count)
  foreach($id in $containers){
    & $docker start $id | Out-Null
    if($LASTEXITCODE -ne 0){ throw "Failed starting existing Immich container $id" }
  }
} else {
  throw "No existing Immich deployment was found under approved roots C:\AI\LOCAL-CHATGPT or F:\AI-Data, and no existing Docker compose project named immich is present. Refusing to create a fresh media database blindly because that could detach from existing libraries."
}

for($i=1; $i -le 18; $i++){
  if(Test-Immich){
    Log "PASS healthy"
    & $docker ps --filter "label=com.docker.compose.project=immich" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    exit 0
  }
  Start-Sleep -Seconds 5
}

& $docker ps -a --filter "label=com.docker.compose.project=immich" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
throw "Immich was started but did not become healthy on localhost:$ImmichPort."
