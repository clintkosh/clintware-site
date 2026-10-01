param()

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$ApprovedRoots = @(
  "C:\AI\LOCAL-CHATGPT",
  "C:\AI",
  "F:\AI-Data",
  "F:\Immich",
  "F:\Docker",
  (Join-Path $env:USERPROFILE "Desktop"),
  (Join-Path $env:USERPROFILE "Documents"),
  (Join-Path $env:USERPROFILE "Downloads")
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique
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
      if($r.StatusCode -eq 200 -and $url.EndsWith("/api/server/ping") -and (($r.Content | ConvertFrom-Json).res -eq "pong")){ return $true }
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
    $ids = & $Docker ps -aq --filter "name=immich"
    if($LASTEXITCODE -ne 0){ return @() }
    return @($ids | Where-Object { $_ })
  } catch { return @() }
}

function Get-ComposeCandidates {
  $names = @("compose.yml","compose.yaml","docker-compose.yml","docker-compose.yaml")
  $skip = @(".git","node_modules","venv",".venv","Models","HF","pipcache","Temp","Logs")
  $found = New-Object System.Collections.Generic.List[string]
  $deadline = (Get-Date).AddSeconds(25)

  foreach($root in $ApprovedRoots){
    if(-not (Test-Path $root)){ continue }
    $queue = New-Object System.Collections.Generic.Queue[object]
    $queue.Enqueue([pscustomobject]@{Path=$root;Depth=0})
    while($queue.Count -gt 0 -and (Get-Date) -lt $deadline){
      $row = $queue.Dequeue()
      try { $items = @(Get-ChildItem -LiteralPath $row.Path -Force -ErrorAction Stop) } catch { continue }
      foreach($item in $items){
        if($item.PSIsContainer){
          if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){ continue }
          $isImmich = $item.Name -match '(?i)immich'
          if($row.Depth -lt 4 -and ($isImmich -or ($skip -notcontains $item.Name))){
            $queue.Enqueue([pscustomobject]@{Path=$item.FullName;Depth=($row.Depth+1)})
          }
          continue
        }
        if($names -notcontains $item.Name){ continue }
        if($item.Length -gt 2097152){ continue }
        try {
          $text = Get-Content -Raw -LiteralPath $item.FullName -ErrorAction Stop
          if($text -match '(?i)immich-app|immich_server|immich-server|ghcr\.io/immich-app'){
            $found.Add($item.FullName)
          }
        } catch {}
      }
    }
  }
  return @($found | Select-Object -Unique)
}

function Get-ImmichVolumeEvidence([string]$Docker) {
  $rows = New-Object System.Collections.Generic.List[string]
  try {
    $names = & $Docker volume ls --format '{{.Name}}'
    if($LASTEXITCODE -ne 0){ return @() }
    foreach($name in @($names | Where-Object { $_ -match '(?i)immich' })){
      $rows.Add([string]$name)
    }
  } catch {}
  return @($rows | Select-Object -Unique)
}

$docker = Resolve-Docker

if(Test-Immich){
  Log "PASS already healthy on localhost:$ImmichPort"
  exit 0
}

$containers = Get-ExistingImmichContainers $docker
$composeFiles = Get-ComposeCandidates
$volumeEvidence = Get-ImmichVolumeEvidence $docker

if($composeFiles.Count -gt 0){
  $compose = $composeFiles[0]
  Log ("Found existing compose: " + $compose)
  Push-Location (Split-Path $compose -Parent)
  try {
    $rawConfig = & $docker compose -f $compose config --format json 2>$null | Out-String
    if ($LASTEXITCODE -ne 0) { throw "Existing Immich compose cannot be validated." }
    $config = $rawConfig | ConvertFrom-Json
    foreach ($service in $config.services.PSObject.Properties) {
      foreach ($mount in @($service.Value.volumes)) {
        if ($mount.type -eq "bind" -and [string]$mount.source -match '(?i)^(D:|/mnt/d/|/run/desktop/mnt/host/d/)') {
          throw "Existing Immich compose depends on the excluded drive; preserved without starting."
        }
      }
    }
    # start never creates containers, volumes or an empty replacement database.
    & $docker compose -f $compose start
    if($LASTEXITCODE -ne 0){ throw "Existing Immich compose failed to start." }
  } finally { Pop-Location }
} elseif($containers.Count -gt 0) {
  Log ("No compose file found, but existing Immich containers exist: " + $containers.Count)
  foreach($id in $containers){
    $rawMounts = & $docker inspect --format '{{json .Mounts}}' $id | Out-String
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect existing Immich mounts." }
    foreach ($mount in @($rawMounts | ConvertFrom-Json)) {
      if ([string]$mount.Source -match '(?i)^(D:|/mnt/d/|/run/desktop/mnt/host/d/)') {
        throw "Existing Immich container depends on the excluded drive; preserved without starting."
      }
    }
  }
  foreach($id in $containers){
    & $docker start $id | Out-Null
    if($LASTEXITCODE -ne 0){ throw "Failed starting existing Immich container $id" }
  }
} else {
  $volumeNote = if($volumeEvidence.Count -gt 0){ " Existing Immich-named Docker volumes preserved: " + ($volumeEvidence -join ", ") + "." } else { "" }
  throw ("No startable existing Immich deployment was found under the approved MEMORIA roots (" + ($ApprovedRoots -join ", ") + "), and no existing Immich Docker container is present." + $volumeNote + " Refusing to create a fresh media database blindly because that could detach from existing libraries.")
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
