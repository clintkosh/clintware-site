param(
  [ValidateSet("install","update","status","on","off","run","scan","ui","kill","unkill","report","uninstall")]
  [string]$Action = "status"
)

$ErrorActionPreference = "Stop"
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite\responder-agent"
$PythonPath = Join-Path $HomeDir "responder_agent.py"
$WrapperPath = Join-Path $HomeDir "responder-agent.ps1"
$TaskName = "ClintwareResponderAgent"
$RawBase = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite"
$ReportEndpoint = "https://mcp.clintware.com/api/v1/quillgeist-lite/responder-report"

function Resolve-Python {
  foreach ($name in @("python","python3","py")) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  throw "Python is required for the responder agent. Run qq task python-runtime-check after installing Python."
}

function Sync-ResponderFiles {
  New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null
  $files = @{
    $PythonPath = "$RawBase/tools/responder_agent.py"
    $WrapperPath = "$RawBase/tasks/responder-agent.ps1"
  }
  foreach ($target in $files.Keys) {
    $temp = $target + ".new"
    Invoke-WebRequest -Uri ($files[$target] + "?cb=" + [Guid]::NewGuid().ToString("n")) -OutFile $temp -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
    if (-not (Test-Path $temp) -or (Get-Item $temp).Length -lt 200) { throw "Responder update failed for $target" }
    Move-Item $temp $target -Force
  }
}

function Invoke-ResponderPython {
  param([string]$Mode)
  $python = Resolve-Python
  if (-not (Test-Path $PythonPath)) { Sync-ResponderFiles }
  $output = & $python $PythonPath $Mode "--json" 2>&1
  $code = $LASTEXITCODE
  $text = ($output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
  if ($code -ne 0) { throw "Responder $Mode failed: $text" }
  $jsonLine = ($output | Where-Object { ([string]$_).Trim().StartsWith("{") } | Select-Object -Last 1)
  if (-not $jsonLine) { return @{ ok=$true; raw=$text } }
  return ([string]$jsonLine | ConvertFrom-Json)
}

function Send-DailyReport {
  param([object]$Report)
  if (-not $Report -or -not [string]$Report.to) { return @{ ok=$false; skipped="report_to_not_configured" } }
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { return @{ ok=$false; skipped="github_cli_unavailable" } }
  gh auth status 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { return @{ ok=$false; skipped="github_auth_unavailable" } }
  $login = (gh api user --jq .login 2>$null).Trim()
  if ($login.ToLowerInvariant() -ne "clintkosh") { return @{ ok=$false; skipped="github_identity_mismatch" } }
  $token = (gh auth token).Trim()
  if (-not $token) { return @{ ok=$false; skipped="github_token_unavailable" } }
  try {
    $payload = @{
      to = [string]$Report.to
      subject = [string]$Report.subject
      body = [string]$Report.body
      runner_id = $env:COMPUTERNAME
      generated_at = (Get-Date).ToUniversalTime().ToString("o")
    } | ConvertTo-Json -Depth 5
    return Invoke-RestMethod -Method Post -Uri $ReportEndpoint -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $payload
  } finally {
    $token = $null
  }
}

function Register-ResponderSchedule {
  $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
  if (-not $pwsh) { $pwsh = Get-Command powershell -ErrorAction Stop }
  $arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $WrapperPath + '" -Action scan'
  $taskAction = New-ScheduledTaskAction -Execute $pwsh.Source -Argument $arguments
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650)
  $settings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
  $principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
  Register-ScheduledTask -TaskName $TaskName -Action $taskAction -Trigger $trigger -Settings $settings -Principal $principal -Description "Clintware qq policy-aware responder opportunity scan" -Force | Out-Null
}

switch ($Action) {
  "install" {
    Sync-ResponderFiles
    $null = Invoke-ResponderPython "status"
    Register-ResponderSchedule
    $status = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
    @{ ok=$true; installed=$true; scheduled_task=$TaskName; state=[string]$status.State; home=$HomeDir; ui="http://127.0.0.1:8765/" } | ConvertTo-Json -Compress
  }
  "update" {
    Sync-ResponderFiles
    @{ ok=$true; updated=$true; home=$HomeDir } | ConvertTo-Json -Compress
  }
  "status" {
    $result = Invoke-ResponderPython "status"
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    $result | Add-Member -NotePropertyName scheduled_task -NotePropertyValue $(if($task){[string]$task.State}else{"not_installed"}) -Force
    $result | ConvertTo-Json -Depth 8
  }
  "on" { (Invoke-ResponderPython "on") | ConvertTo-Json -Depth 8 }
  "off" { (Invoke-ResponderPython "off") | ConvertTo-Json -Depth 8 }
  "kill" { (Invoke-ResponderPython "kill") | ConvertTo-Json -Depth 8 }
  "unkill" { (Invoke-ResponderPython "unkill") | ConvertTo-Json -Depth 8 }
  "run" {
    $result = Invoke-ResponderPython "run"
    $mail = if ($result.email_report) { Send-DailyReport $result.email_report } else { @{ok=$true;skipped="not_due"} }
    @{ ok=[bool]$result.ok; scan=$result; mail=$mail } | ConvertTo-Json -Depth 10
  }
  "scan" {
    $result = Invoke-ResponderPython "scan"
    $mail = if ($result.email_report) { Send-DailyReport $result.email_report } else { @{ok=$true;skipped="not_due"} }
    @{ ok=[bool]$result.ok; scan=$result; mail=$mail } | ConvertTo-Json -Depth 10
  }
  "report" {
    $result = Invoke-ResponderPython "report"
    $mail = Send-DailyReport $result.email_report
    @{ ok=[bool]$mail.ok; report=$result.email_report; mail=$mail } | ConvertTo-Json -Depth 8
  }
  "ui" {
    Sync-ResponderFiles
    $url = "http://127.0.0.1:8765/"
    $already = $false
    try {
      $client = New-Object Net.Sockets.TcpClient
      $connect = $client.BeginConnect("127.0.0.1",8765,$null,$null)
      $already = $connect.AsyncWaitHandle.WaitOne(250)
      if ($already) { $client.EndConnect($connect) }
      $client.Close()
    } catch {}
    if (-not $already) {
      $python = Resolve-Python
      Start-Process -FilePath $python -ArgumentList @($PythonPath,"ui") -WindowStyle Hidden | Out-Null
      Start-Sleep -Milliseconds 700
    }
    Start-Process $url
    @{ ok=$true; ui=$url; already_running=$already } | ConvertTo-Json -Compress
  }
  "uninstall" {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    @{ ok=$true; scheduled_task_removed=$true; state_preserved=$true; home=$HomeDir } | ConvertTo-Json -Compress
  }
}
