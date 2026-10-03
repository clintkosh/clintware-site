param([ValidateSet("diagnose","repair")][string]$Action="diagnose")
$ErrorActionPreference="Stop"
if($env:COMPUTERNAME -notmatch '(?i)^DRIZNET$'){throw "DRIZNET-only"}
$Root="C:\AI\LOCAL-CHATGPT"
$DockerRoot=Join-Path $Root "docker"
$DataRoot=Join-Path $Root "data\n8n"
$EnvPath=Join-Path $DockerRoot ".env"
$Compose=Join-Path $DockerRoot "docker-compose.yml"
$BackupRoot=Join-Path $Root "backups"
New-Item -ItemType Directory -Force -Path $BackupRoot|Out-Null
$docker=(Get-Command docker.exe -ErrorAction SilentlyContinue)
if(-not $docker){$docker=Get-Command docker -ErrorAction Stop}
function Healthy(){try{$r=Invoke-WebRequest "http://127.0.0.1:5678" -UseBasicParsing -TimeoutSec 5;return($r.StatusCode-ge 200-and$r.StatusCode-lt 500)}catch{return $false}}
function Logs(){try{return((& $docker.Source logs --tail 160 driznet-n8n 2>&1|Out-String).Trim())}catch{return $_.Exception.Message}}
function ContainerState(){try{return((& $docker.Source inspect -f "{{.State.Status}}|{{.State.ExitCode}}|{{.State.Error}}" driznet-n8n 2>&1|Out-String).Trim())}catch{return "missing"}}
function TailText([string]$text){if(-not $text){return ""};if($text.Length-le 5000){return $text};return $text.Substring($text.Length-5000)}
function SetEnv($name,$value){$lines=@();if(Test-Path $EnvPath){$lines=@(Get-Content $EnvPath)};$out=New-Object System.Collections.Generic.List[string];$done=$false;foreach($line in $lines){if($line -match ("^"+[Regex]::Escape($name)+"=")){if(-not $done){$out.Add($name+"="+$value);$done=$true}}else{$out.Add([string]$line)}};if(-not $done){$out.Add($name+"="+$value)};[IO.File]::WriteAllLines($EnvPath,$out,(New-Object Text.UTF8Encoding($false)))}
function WaitHealthy($seconds){$end=(Get-Date).AddSeconds($seconds);do{if(Healthy){return $true};Start-Sleep 3}while((Get-Date)-lt$end);return $false}

$before=Logs
$config=Join-Path $DataRoot "config"
$db=Join-Path $DataRoot "database.sqlite"
$configKeyPresent=$false
if(Test-Path $config){
 try{$cfg=Get-Content $config -Raw|ConvertFrom-Json;$configKeyPresent=[bool]$cfg.encryptionKey}catch{}
}
if($Action-eq"repair"){
 $recovered=$false
 if(Test-Path $config){
  try{$cfg=Get-Content $config -Raw|ConvertFrom-Json;if($cfg.encryptionKey){SetEnv "N8N_ENCRYPTION_KEY" ([string]$cfg.encryptionKey);$recovered=$true}}catch{}
 }
 Push-Location $DockerRoot
 try{
   & $docker.Source compose -f $Compose up -d --force-recreate n8n
   if($LASTEXITCODE-ne 0){throw "n8n recreate failed"}
 }finally{Pop-Location}
 $healthy=WaitHealthy 90
 $reset=$false;$backup=""
 if(-not $healthy){
   $afterFirst=Logs
   # Preserve all existing n8n state before a clean reinitialization.
   $stamp=Get-Date -Format "yyyyMMdd-HHmmss"
   $backup=Join-Path $BackupRoot ("n8n-pre-repair-"+$stamp)
   Push-Location $DockerRoot
   try{& $docker.Source compose -f $Compose stop n8n|Out-Null;& $docker.Source compose -f $Compose rm -f n8n|Out-Null}finally{Pop-Location}
   if(Test-Path $DataRoot){Move-Item $DataRoot $backup -Force}
   New-Item -ItemType Directory -Force -Path $DataRoot|Out-Null
   # Generate a new key only for the new empty state; the backup retains the prior state.
   $bytes=New-Object byte[] 48;$rng=[Security.Cryptography.RandomNumberGenerator]::Create();try{$rng.GetBytes($bytes)}finally{$rng.Dispose()}
   $newKey=[Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+","-").Replace("/","_")
   SetEnv "N8N_ENCRYPTION_KEY" $newKey
   Push-Location $DockerRoot
   try{& $docker.Source compose -f $Compose up -d n8n;if($LASTEXITCODE-ne 0){throw "n8n clean start failed"}}finally{Pop-Location}
   $healthy=WaitHealthy 120
   $reset=$true
 }
 $after=Logs
 [ordered]@{ok=$healthy;action="repair";state=(ContainerState);config_key_present_before=$configKeyPresent;recovered_existing_key=$recovered;clean_reinitialize_performed=$reset;backup_path=$backup;database_present_before=(Test-Path $db);logs_before=(TailText $before);logs_after=(TailText $after)}|ConvertTo-Json -Depth 5
 if(-not $healthy){exit 2}
}else{
 [ordered]@{ok=(Healthy);action="diagnose";state=(ContainerState);config_key_present=$configKeyPresent;database_present=(Test-Path $db);database_bytes=$(if(Test-Path $db){(Get-Item $db).Length}else{0});logs=$before}|ConvertTo-Json -Depth 5
}
