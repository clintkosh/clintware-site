param(
  [string]$Endpoint = "wss://mcp.clintware.com/api/v1/quillgeist-lite/stream",
  [string]$RegistryUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/tasks.json"
)

$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$CacheDir = Join-Path $HomeDir "cache"
$LogPath = Join-Path $HomeDir "runner.log"
$StatePath = Join-Path $HomeDir "state.json"
$RepoRaw = "https://raw.githubusercontent.com/clintkosh/clintware-site/main"

New-Item -ItemType Directory -Force -Path $HomeDir,$CacheDir | Out-Null

function Write-Log {
  param([string]$Message,[string]$Level="INFO")
  $line = "{0} [{1}] {2}" -f (Get-Date).ToString("s"),$Level,$Message
  Add-Content -Path $LogPath -Value $line
  $color = "Gray"
  if ($Level -eq "ERROR") { $color = "Red" }
  elseif ($Level -eq "WARN") { $color = "Yellow" }
  elseif ($Level -eq "OK") { $color = "Green" }
  Write-Host $line -ForegroundColor $color
}

$mutex = New-Object System.Threading.Mutex($false, "Local\ClintwareQuillgeistLite")
if (-not $mutex.WaitOne(0,$false)) {
  Write-Log "Another Quillgeist Lite runner is already active." "WARN"
  exit 0
}

function Get-Completed {
  if (-not (Test-Path $StatePath)) { return @{} }
  try {
    $s = Get-Content $StatePath -Raw | ConvertFrom-Json
    $map = @{}
    foreach ($p in $s.PSObject.Properties) { $map[$p.Name] = $p.Value }
    return $map
  } catch {
    return @{}
  }
}

function Save-Completed {
  param([hashtable]$Map)
  $copy = @{}
  $keys = @($Map.Keys)
  if ($keys.Count -gt 200) { $keys = $keys[($keys.Count-200)..($keys.Count-1)] }
  foreach ($k in $keys) { $copy[$k] = $Map[$k] }
  $copy | ConvertTo-Json -Depth 10 | Set-Content -Path $StatePath -Encoding UTF8
}

function Get-GitHubToken {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI (gh) is required. Run the Quillgeist Lite installer again."
  }

  gh auth status 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "GitHub CLI is not authenticated." }

  $login = (gh api user --jq .login).Trim()
  if ($LASTEXITCODE -ne 0 -or $login.ToLowerInvariant() -ne "clintkosh") {
    throw "Expected GitHub identity clintkosh. Current identity: $login"
  }

  $token = (gh auth token).Trim()
  if (-not $token) { throw "GitHub CLI did not return an authentication token." }
  return $token
}

function Get-Registry {
  $registry = Invoke-RestMethod -Uri $RegistryUrl -Headers @{"Cache-Control"="no-cache"}
  if (-not $registry.tasks) { throw "Quillgeist Lite task registry is invalid." }
  return $registry
}

function Send-Json {
  param(
    [System.Net.WebSockets.ClientWebSocket]$Socket,
    [object]$Value
  )

  $json = $Value | ConvertTo-Json -Depth 12 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $seg = New-Object "System.ArraySegment[byte]" -ArgumentList (,$bytes)
  $Socket.SendAsync(
    $seg,
    [Net.WebSockets.WebSocketMessageType]::Text,
    $true,
    [Threading.CancellationToken]::None
  ).GetAwaiter().GetResult()
}

function Receive-Json {
  param([System.Net.WebSockets.ClientWebSocket]$Socket)

  $buffer = New-Object byte[] 65536
  $ms = New-Object IO.MemoryStream

  try {
    do {
      $seg = New-Object "System.ArraySegment[byte]" -ArgumentList (,$buffer)
      $r = $Socket.ReceiveAsync(
        $seg,
        [Threading.CancellationToken]::None
      ).GetAwaiter().GetResult()

      if ($r.MessageType -eq [Net.WebSockets.WebSocketMessageType]::Close) {
        return $null
      }

      $ms.Write($buffer,0,$r.Count)
      if ($ms.Length -gt 1048576) { throw "Incoming Quillgeist Lite message exceeded 1 MB." }
    } until ($r.EndOfMessage)

    $text = [Text.Encoding]::UTF8.GetString($ms.ToArray())
    return $text | ConvertFrom-Json
  } finally {
    $ms.Dispose()
  }
}

function Find-Task {
  param([object]$Registry,[string]$TaskId)

  foreach ($p in $Registry.tasks.PSObject.Properties) {
    if ($p.Name -eq $TaskId) { return $p.Value }
  }

  return $null
}

function Redact-LogLine {
  param([string]$Line)
  if ($null -eq $Line) { return "" }

  $s = [string]$Line
  $patterns = @(
    '(?i)(client_secret|refresh_token|access_token|authorization|api[_-]?key|password)\s*[:=]\s*([^\s,;]+)',
    'gh[pousr]_[A-Za-z0-9_]{20,}',
    'github_pat_[A-Za-z0-9_]{20,}',
    'ya29\.[A-Za-z0-9._-]+'
  )

  foreach ($pattern in $patterns) {
    $s = [regex]::Replace($s,$pattern,'$1=[REDACTED]')
  }

  if ($s.Length -gt 4000) { $s = $s.Substring(0,4000) + " …[truncated]" }
  return $s
}

function Invoke-AllowlistedTask {
  param(
    [object]$Job,
    [System.Net.WebSockets.ClientWebSocket]$Socket
  )

  $registry = Get-Registry
  $task = Find-Task $registry ([string]$Job.task_id)

  if (-not $task) {
    throw "Task '$($Job.task_id)' is not in the local allowlist."
  }

  $scriptPath = [string]$task.script

  if (-not $scriptPath.EndsWith(".ps1",[StringComparison]::OrdinalIgnoreCase)) {
    throw "Task script is not a PowerShell file."
  }

  if ($scriptPath.Contains("..") -or $scriptPath.StartsWith("/") -or $scriptPath.StartsWith("\")) {
    throw "Task script path is invalid."
  }

  $safeName = ([string]$Job.task_id -replace '[^A-Za-z0-9._-]','_')
  $localScript = Join-Path $CacheDir ($safeName + ".ps1")

  Invoke-WebRequest -Uri ($RepoRaw + "/" + $scriptPath) -OutFile $localScript -UseBasicParsing
  if (-not (Test-Path $localScript)) {
    throw "Could not download task script '$scriptPath'."
  }

  $allowed = @($task.parameters)
  $named = @{}

  if ($Job.args) {
    foreach ($p in $Job.args.PSObject.Properties) {
      if ($allowed -notcontains $p.Name) {
        throw "Argument '$($p.Name)' is not allowed for task '$($Job.task_id)'."
      }
      $named[$p.Name] = [string]$p.Value
    }
  }

  Write-Log ("Running task {0} ({1})" -f $Job.task_id,$scriptPath)

  $started = Get-Date
  $global:LASTEXITCODE = 0
  $captured = New-Object System.Collections.Generic.List[string]
  $seq = 0

  & $localScript @named *>&1 | ForEach-Object {
    $line = Redact-LogLine ([string]$_)
    if ($line) {
      $seq++
      $captured.Add($line)
      Write-Host $line
      if ($Socket -and $Socket.State -eq [Net.WebSockets.WebSocketState]::Open) {
        Send-Json $Socket @{
          type = "log"
          job_id = [string]$Job.job_id
          task_id = [string]$Job.task_id
          seq = $seq
          line = $line
          timestamp = (Get-Date).ToUniversalTime().ToString("o")
        }
      }
    }
  }

  $code = $LASTEXITCODE
  if ($null -eq $code) { $code = 0 }
  $duration = [int]((Get-Date)-$started).TotalMilliseconds
  $output = ($captured -join [Environment]::NewLine)

  if ($output.Length -gt 40000) {
    $output = $output.Substring($output.Length-40000)
  }

  return @{
    type = "result"
    job_id = [string]$Job.job_id
    task_id = [string]$Job.task_id
    status = $(if($code -eq 0){"passed"}else{"failed"})
    exit_code = [int]$code
    duration_ms = $duration
    output = $output
    log_lines = $seq
    completed_at = (Get-Date).ToUniversalTime().ToString("o")
  }
}

$completed = Get-Completed

Write-Log "Clintware Quillgeist Lite starting."
Write-Log "Event-driven mode: waiting on an outbound WebSocket, not polling."

try {
  while ($true) {
    $ws = $null

    try {
      $token = Get-GitHubToken
      $ws = New-Object System.Net.WebSockets.ClientWebSocket
      $ws.Options.SetRequestHeader("Authorization","Bearer $token")
      $ws.Options.SetRequestHeader("X-Quillgeist-Runner-Id",$env:COMPUTERNAME)

      $ws.ConnectAsync(
        [Uri]$Endpoint,
        [Threading.CancellationToken]::None
      ).GetAwaiter().GetResult()

      Write-Log "Connected to Clintware Control Plane." "OK"

      Send-Json $ws @{
        type = "hello"
        runner_id = $env:COMPUTERNAME
        version = "1.0.0"
      }

      while ($ws.State -eq [Net.WebSockets.WebSocketState]::Open) {
        $msg = Receive-Json $ws
        if ($null -eq $msg) { break }

        if ($msg.type -eq "ping") {
          Send-Json $ws @{
            type = "pong"
            time = (Get-Date).ToUniversalTime().ToString("o")
          }
          continue
        }

        if ($msg.type -ne "job" -or -not $msg.job) {
          continue
        }

        $job = $msg.job
        $jobId = [string]$job.job_id

        if ($completed.ContainsKey($jobId)) {
          Write-Log "Duplicate job $jobId ignored; returning the prior result." "WARN"
          Send-Json $ws $completed[$jobId]
          continue
        }

        Send-Json $ws @{
          type = "ack"
          job_id = $jobId
          status = "started"
          started_at = (Get-Date).ToUniversalTime().ToString("o")
        }

        try {
          $result = Invoke-AllowlistedTask $job $ws
        } catch {
          $result = @{
            type = "result"
            job_id = $jobId
            task_id = [string]$job.task_id
            status = "failed"
            exit_code = 1
            duration_ms = 0
            output = $_.Exception.Message
            completed_at = (Get-Date).ToUniversalTime().ToString("o")
          }

          Write-Log $_.Exception.Message "ERROR"
        }

        $completed[$jobId] = $result
        Save-Completed $completed
        Send-Json $ws $result

        $level = if ($result.status -eq "passed") { "OK" } else { "ERROR" }
        Write-Log ("Job {0} finished with status {1}" -f $jobId,$result.status) $level
      }
    } catch {
      Write-Log ("Connection error: " + $_.Exception.Message) "WARN"
    } finally {
      if ($ws) {
        try { $ws.Dispose() } catch {}
      }
    }

    Write-Log "Disconnected. Reconnecting in 5 seconds..." "WARN"
    Start-Sleep -Seconds 5
  }
} finally {
  try { $mutex.ReleaseMutex() } catch {}
  $mutex.Dispose()
}
