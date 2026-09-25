param(
  [ValidateSet("install","update","status","on","off","run","ui","uninstall")]
  [string]$Action = "status",
  [string]$At = "08:00"
)

$ErrorActionPreference = "Stop"
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite\career-signal-agent"
$PythonPath = Join-Path $HomeDir "career_signal_agent.py"
$WrapperPath = Join-Path $HomeDir "career-signal-agent.ps1"
$TaskName = "ClintwareCareerSignalAgent"
$RawBase = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite"

function Resolve-Python {
  foreach ($name in @("python","python3","py")) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  throw "Python is required. Use the qq Python runtime check/install path first."
}

function Sync-AgentFiles {
  New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null
  $files = @{
    $PythonPath = "$RawBase/tools/career_signal_agent.py"
    $WrapperPath = "$RawBase/tasks/career-signal-agent.ps1"
  }
  foreach ($target in $files.Keys) {
    $temp = $target + ".new"
    Invoke-WebRequest -Uri ($files[$target] + "?cb=" + [Guid]::NewGuid().ToString("n")) -OutFile $temp -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
    if (-not (Test-Path $temp) -or (Get-Item $temp).Length -lt 200) { throw "Career Signal update failed for $target" }
    Move-Item $temp $target -Force
  }
}

function Invoke-Agent([string]$Mode) {
  if (-not (Test-Path $PythonPath)) { Sync-AgentFiles }
  $python = Resolve-Python
  $output = & $python $PythonPath $Mode --json 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Career Signal $Mode failed: $($output -join [Environment]::NewLine)" }
  $line = ($output | Where-Object { ([string]$_).Trim().StartsWith("{") } | Select-Object -Last 1)
  if (-not $line) { return @{ok=$true; raw=($output -join [Environment]::NewLine)} }
  return ([string]$line | ConvertFrom-Json)
}

function Register-DailyTask {
  param([string]$Clock)
  $time = [DateTime]::ParseExact($Clock,"HH:mm",[Globalization.CultureInfo]::InvariantCulture)
  $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
  if (-not $pwsh) { $pwsh = Get-Command powershell -ErrorAction Stop }
  $arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $WrapperPath + '" -Action run'
  $action = New-ScheduledTaskAction -Execute $pwsh.Source -Argument $arguments
  $trigger = New-ScheduledTaskTrigger -Daily -At $time
  $settings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
  $principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "LandThePlane daily hiring + YC career signal plan. Does not automate LinkedIn." -Force | Out-Null
}

switch ($Action) {
  "install" {
    Sync-AgentFiles
    Register-DailyTask -Clock $At
    $result = Invoke-Agent "run"
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
    @{ok=$true;installed=$true;scheduled_task=$TaskName;state=[string]$task.State;at=$At;home=$HomeDir;latest=$result.generated_at;linkedin_mode=$result.linkedin_mode} | ConvertTo-Json -Depth 8
  }
  "update" { Sync-AgentFiles; @{ok=$true;updated=$true;home=$HomeDir} | ConvertTo-Json -Compress }
  "status" {
    $result = Invoke-Agent "status"
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    $result | Add-Member -NotePropertyName scheduled_task -NotePropertyValue $(if($task){[string]$task.State}else{"not_installed"}) -Force
    $result | ConvertTo-Json -Depth 8
  }
  "on" { (Invoke-Agent "on") | ConvertTo-Json -Depth 8 }
  "off" { (Invoke-Agent "off") | ConvertTo-Json -Depth 8 }
  "run" { (Invoke-Agent "run") | ConvertTo-Json -Depth 12 }
  "ui" {
    $url = "https://www.clintware.com/tools/landtheplane/signal-engine/"
    Start-Process $url
    @{ok=$true;ui=$url;local_home=$HomeDir} | ConvertTo-Json -Compress
  }
  "uninstall" {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    @{ok=$true;scheduled_task_removed=$true;state_preserved=$true;home=$HomeDir} | ConvertTo-Json -Compress
  }
}
