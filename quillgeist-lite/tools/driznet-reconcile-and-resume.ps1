param(
  [string]$TargetDevice = "DRIZNET",
  [int]$MaxGraceMinutes = 90,
  [switch]$ForceOtherDevice,
  [switch]$SkipNomaValidation
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# QQ HEALTH CONTRACT // DRIZNET RECONCILE + RESUME
$Repo = "clintkosh/clintware-site"
$RawBase = "https://raw.githubusercontent.com/$Repo/main"
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$ProgramDir = Join-Path $env:ProgramData "Clintware\QuillgeistLite"
$HeartbeatPath = Join-Path $HomeDir "runner-heartbeat.json"
$RunnerPidPath = Join-Path $HomeDir "runner.pid"
$RunnerLogPath = Join-Path $HomeDir "runner.log"
$RegistryPath = Join-Path $HomeDir "tasks.json"
$MaintenancePath = Join-Path $ProgramDir "maintenance.lock"
$AdminLog = Join-Path $ProgramDir "admin-reconcile.log"
$LockPath = Join-Path $ProgramDir "admin-reconcile.lock"

New-Item -ItemType Directory -Force -Path $HomeDir,$ProgramDir | Out-Null

function Write-AdminLog {
  param([string]$Message,[ConsoleColor]$Color=[ConsoleColor]::Gray)
  $stamp=(Get-Date).ToUniversalTime().ToString("o")
  try { Add-Content -LiteralPath $AdminLog -Value "$stamp $Message" -Encoding UTF8 } catch {}
  Write-Host $Message -ForegroundColor $Color
}

function Test-Administrator {
  try {
    $id=[Security.Principal.WindowsIdentity]::GetCurrent()
    $p=New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  } catch { return $false }
}

if (-not (Test-Administrator)) {
  Write-Host "ADMIN // elevation required; reopening as Administrator." -ForegroundColor Yellow
  $exe=Get-Command pwsh.exe -ErrorAction SilentlyContinue
  $hostExe=if($exe){$exe.Source}else{"$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"}
  $argList=@("-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-File",$PSCommandPath,"-TargetDevice",$TargetDevice,"-MaxGraceMinutes",$MaxGraceMinutes)
  if($ForceOtherDevice){$argList += "-ForceOtherDevice"}
  if($SkipNomaValidation){$argList += "-SkipNomaValidation"}
  Start-Process -FilePath $hostExe -ArgumentList $argList -Verb RunAs
  exit 0
}

if((-not $ForceOtherDevice) -and ($env:COMPUTERNAME -ne $TargetDevice)){
  throw "Target is $TargetDevice; current machine is $env:COMPUTERNAME. Use -ForceOtherDevice only intentionally."
}

$lock=$null
try {$lock=[IO.File]::Open($LockPath,[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)}
catch {throw "Another QQ admin reconcile is already running."}

function Read-JsonSafe {
  param([string]$Path)
  if(-not (Test-Path -LiteralPath $Path)){return $null}
  try {return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json}catch{return $null}
}

function Get-RunnerPid {
  try {
    if(-not (Test-Path $RunnerPidPath)){return 0}
    $n=0; [void][int]::TryParse((Get-Content $RunnerPidPath -Raw).Trim(),[ref]$n); return $n
  } catch {return 0}
}

function Test-RunnerAlive {
  $p=Get-RunnerPid
  if($p -le 0){return $false}
  try {
    $proc=Get-CimInstance Win32_Process -Filter ("ProcessId="+$p) -ErrorAction Stop
    return ([string]$proc.CommandLine -match '(?i)(quillgeist|runner|launcher)\.ps1')
  } catch {return $false}
}

function Get-TaskTimeoutSeconds {
  param([string]$TaskId)
  $registry=Read-JsonSafe $RegistryPath
  if(-not $registry -or -not $registry.tasks -or -not $TaskId){return 3600}
  try {
    $task=$registry.tasks.PSObject.Properties[$TaskId].Value
    if($task.timeout_seconds){return [Math]::Max(60,[int]$task.timeout_seconds)}
    if($task.timeout){return [Math]::Max(60,[int]$task.timeout)}
  } catch {}
  return 3600
}

function Get-HeartbeatHealth {
  $hb=Read-JsonSafe $HeartbeatPath
  $now=[DateTimeOffset]::UtcNow
  if(-not $hb){return [pscustomobject]@{Exists=$false;State="missing";JobId="";TaskId="";HeartbeatAge=1e99;ProgressAge=1e99;Healthy=$false;Busy=$false;Reason="heartbeat_missing"}}
  try {$stamp=[DateTimeOffset]::Parse([string]$hb.timestamp).ToUniversalTime()}catch{$stamp=$null}
  $hbAge=if($stamp){[Math]::Max(0,($now-$stamp).TotalSeconds)}else{1e99}
  $progress=$null
  try {if($hb.progress_at){$progress=[DateTimeOffset]::Parse([string]$hb.progress_at).ToUniversalTime()}}catch{}
  if(-not $progress){try{if(Test-Path $RunnerLogPath){$progress=[DateTimeOffset](Get-Item $RunnerLogPath).LastWriteTimeUtc}}catch{}}
  $progressAge=if($progress){[Math]::Max(0,($now-$progress).TotalSeconds)}else{1e99}
  $state=[string]$hb.state; $task=[string]$hb.task_id; $job=[string]$hb.job_id; $busy=($state -eq "busy")
  $alive=Test-RunnerAlive; $healthy=$alive -and ($hbAge -le 120); $reason="healthy"
  if(-not $alive){$healthy=$false;$reason="runner_not_alive"}
  elseif($hbAge -gt 120){$healthy=$false;$reason="heartbeat_stale"}
  elseif($busy){
    $progressBudget=[Math]::Max(300,[Math]::Min((Get-TaskTimeoutSeconds $task),900))
    if($progressAge -gt $progressBudget){$healthy=$false;$reason="busy_no_progress"}else{$reason="busy_progress_fresh"}
  }
  [pscustomobject]@{Exists=$true;State=$state;JobId=$job;TaskId=$task;HeartbeatAge=$hbAge;ProgressAge=$progressAge;Healthy=$healthy;Busy=$busy;Reason=$reason}
}

function Wait-ForActiveJobGracefully {
  $started=Get-Date
  while($true){
    $h=Get-HeartbeatHealth
    if(-not $h.Busy){Write-AdminLog "JOB // no active QQ job owns the runner." Green; return $true}
    $max=[Math]::Min($MaxGraceMinutes*60,(Get-TaskTimeoutSeconds $h.TaskId)+300)
    Write-AdminLog ("JOB // {0}/{1}; hb={2:n0}s progress={3:n0}s reason={4}" -f $h.TaskId,$h.JobId,$h.HeartbeatAge,$h.ProgressAge,$h.Reason) Cyan
    if(-not $h.Healthy){Write-AdminLog ("STALE // "+$h.Reason) Yellow;return $false}
    if(((Get-Date)-$started).TotalSeconds -ge $max){Write-AdminLog "STALE // task timeout/grace exceeded." Yellow;return $false}
    Start-Sleep 5
  }
}

function Enter-Maintenance {Set-Content $MaintenancePath ((Get-Date).ToUniversalTime().ToString("o")) -Encoding ASCII;Write-AdminLog "MAINTENANCE // restart suppression active." DarkCyan}
function Exit-Maintenance {Remove-Item $MaintenancePath -Force -ErrorAction SilentlyContinue;Write-AdminLog "MAINTENANCE // guardian supervision restored." DarkCyan}

function Stop-OwnedRunner {
  $p=Get-RunnerPid
  if($p -le 0){return}
  try {
    $proc=Get-CimInstance Win32_Process -Filter ("ProcessId="+$p) -ErrorAction Stop
    if([string]$proc.CommandLine -match '(?i)(quillgeist|runner|launcher)\.ps1'){
      Write-AdminLog ("RECOVERY // ending owned runner PID "+$p) Yellow
      Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
  } catch {}
}

function Download-Canonical {
  param([string]$Relative,[string]$Destination,[string]$Contains="")
  $tmp=$Destination+".new"
  New-Item -ItemType Directory -Force -Path (Split-Path $Destination -Parent) | Out-Null
  Invoke-WebRequest -Uri "$RawBase/$Relative" -OutFile $tmp -UseBasicParsing -TimeoutSec 30
  if((Get-Item $tmp).Length -lt 20){throw "Downloaded file too small: $Relative"}
  if($Contains -and -not (Get-Content $tmp -Raw).Contains($Contains)){throw "Structural check failed: $Relative"}
  Move-Item $tmp $Destination -Force
}

function Refresh-CanonicalRuntime {
  $assets=@(
    @("quillgeist-lite/runner.ps1",(Join-Path $HomeDir "runner.ps1"),"Write-RunnerHeartbeat"),
    @("quillgeist-lite/launcher.ps1",(Join-Path $HomeDir "launcher.ps1"),"runner-heartbeat.json"),
    @("quillgeist-lite/tasks.json",$RegistryPath,"big-prompt-plan"),
    @("quillgeist-lite/tasks/self-update.ps1",(Join-Path $HomeDir "tasks\self-update.ps1"),"canonical QQ runner restart"),
    @("quillgeist-lite/tasks/repair-local-service.ps1",(Join-Path $HomeDir "repair-local-service.ps1"),"SERVICE_DEFERRED"),
    @("quillgeist-lite/service/recovery-watch.ps1",(Join-Path $ProgramDir "recovery-watch.ps1"),"runner_stale_detected"),
    @("quillgeist-lite/tools/driznet-reconcile-and-resume.ps1",(Join-Path $HomeDir "driznet-reconcile-and-resume.ps1"),"QQ HEALTH CONTRACT")
  )
  foreach($a in $assets){Download-Canonical $a[0] $a[1] $a[2];Write-AdminLog ("SYNC // "+$a[0]) DarkGray}
}

function Repair-Supervision {
  $repair=Join-Path $HomeDir "repair-local-service.ps1"
  & $repair -SkipRunnerRestart
  if($LASTEXITCODE -ne 0){throw "health-service repair failed: $LASTEXITCODE"}
}

function Start-CanonicalRunner {
  $name="Clintware Quillgeist Lite Runner"
  try{Enable-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue|Out-Null}catch{}
  try{Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue}catch{}
  Start-Sleep -Milliseconds 700
  try{Start-ScheduledTask -TaskName $name -ErrorAction Stop}catch{& schtasks.exe /Run /TN $name|Out-Null}
  $deadline=(Get-Date).AddSeconds(45)
  do{
    Start-Sleep 2;$h=Get-HeartbeatHealth
    if($h.Exists -and $h.HeartbeatAge -le 30 -and (Test-RunnerAlive)){Write-AdminLog ("RUNNER // fresh local pulse; state="+$h.State) Green;return}
  }while((Get-Date)-lt $deadline)
  throw "Runner failed to publish a fresh local pulse."
}

function Invoke-QQTaskDirect {
  param([string]$TaskId,[hashtable]$Args=@{})
  $r=Read-JsonSafe $RegistryPath
  $task=$r.tasks.PSObject.Properties[$TaskId].Value
  if(-not $task){throw "Task missing: $TaskId"}
  $relative=[string]$task.script
  $local=Join-Path $HomeDir ([IO.Path]::GetFileName($relative))
  Download-Canonical $relative $local
  $argv=@();foreach($k in $Args.Keys){$argv+="-"+$k;$argv+=[string]$Args[$k]}
  Write-AdminLog ("TASK // "+$TaskId) Cyan
  if($relative -like "*.ps1"){& $local @argv}
  elseif($relative -like "*.py"){$py=Get-Command py.exe -ErrorAction SilentlyContinue;if($py){& $py.Source -3 $local @argv}else{& python.exe $local @argv}}
  else{throw "Unsupported recovery runtime: $relative"}
  if($LASTEXITCODE -ne 0){throw "$TaskId failed: $LASTEXITCODE"}
}

function Test-NomaVerified {
  try{$v=Invoke-RestMethod -Uri "$RawBase/evidence/nma-crm/VERIFICATION.json" -TimeoutSec 20;return ($v.workflow_conclusion -eq "success" -and $v.browser_acceptance.ok)}catch{return $false}
}

Write-AdminLog "============================================================" DarkCyan
Write-AdminLog "QQ HEALTH CONTRACT // RECONCILE + RESUME" White
Write-AdminLog ("DEVICE // "+$env:COMPUTERNAME) Cyan

try {
  $h=Get-HeartbeatHealth
  Write-AdminLog ("INITIAL // state={0} task={1} job={2} hb={3:n0}s progress={4:n0}s reason={5}" -f $h.State,$h.TaskId,$h.JobId,$h.HeartbeatAge,$h.ProgressAge,$h.Reason) Cyan
  $clean=Wait-ForActiveJobGracefully
  Enter-Maintenance
  if(-not $clean){Stop-OwnedRunner}
  Refresh-CanonicalRuntime
  Repair-Supervision
  Stop-OwnedRunner
  Start-CanonicalRunner
  Exit-Maintenance

  Start-Sleep 5
  $post=Get-HeartbeatHealth
  if(-not $post.Exists -or $post.HeartbeatAge -gt 30 -or -not (Test-RunnerAlive)){throw "Local pulse verification failed."}
  $svc=Get-Service "ClintwareQuillgeistLiteHealth" -ErrorAction SilentlyContinue
  if(-not $svc -or $svc.Status -ne "Running"){throw "Native health watchdog is not Running."}
  Write-AdminLog "VERIFY // local pulse fresh and native watchdog Running." Green

  if(-not $SkipNomaValidation){
    if(Test-NomaVerified){
      Write-AdminLog "NOMA // authoritative verification already passed; validate only, do not duplicate deploy." Green
      try{Invoke-QQTaskDirect "crm-astro-build" @{Action="validate";Project="nma-crm";SkipInstall="true"}}catch{Write-AdminLog ("NOMA WARN // "+$_.Exception.Message) Yellow}
    } else {
      Write-AdminLog "NOMA // no passed verification found; running full reviewed task." Yellow
      Invoke-QQTaskDirect "crm-astro-build" @{Action="full";Project="nma-crm";SkipInstall="false"}
    }
  }

  try{
    Invoke-QQTaskDirect "big-prompt-plan" @{Prompt="Validate QQ health recovery, stale-state closure, local-first routing, and resume behavior.";Project="qq-health-contract";StateScope="local";MaxDepth="2"}
    Write-AdminLog "VERIFY // big-prompt-plan installed and executable." Green
  }catch{Write-AdminLog ("BIG-PROMPT WARN // "+$_.Exception.Message) Yellow}

  Write-AdminLog "READY // QQ reconciled; healthy work preserved, stale ownership recoverable, pulse/watchdog verified, queue may resume." Green
  exit 0
}
catch {
  try{Exit-Maintenance}catch{}
  Write-AdminLog ("FATAL // "+$_.Exception.Message) Red
  Write-AdminLog ("LOG // "+$AdminLog) Yellow
  exit 1
}
finally {try{$lock.Dispose()}catch{}}
