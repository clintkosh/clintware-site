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

$script:RunnerSocket = $null
$script:RunnerDiagSeq = 0
$script:PendingDiagnostics = @()

function Queue-RunnerDiagnostic {
  param(
    [string]$Level,
    [string]$Message,
    [string]$Phase = "runner"
  )

  $script:RunnerDiagSeq++
  $entry = @{
    type = "runner_log"
    seq = $script:RunnerDiagSeq
    level = $Level
    phase = $Phase
    line = [string]$Message
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
  }

  if ($script:RunnerSocket -and $script:RunnerSocket.State -eq [Net.WebSockets.WebSocketState]::Open) {
    try {
      Send-Json $script:RunnerSocket $entry
      return
    } catch {}
  }

  $script:PendingDiagnostics += ,$entry
}

function Flush-RunnerDiagnostics {
  if (-not $script:RunnerSocket -or $script:RunnerSocket.State -ne [Net.WebSockets.WebSocketState]::Open) { return }

  $pending = $script:PendingDiagnostics
  $script:PendingDiagnostics = @()

  foreach ($entry in $pending) {
    try {
      Send-Json $script:RunnerSocket $entry
    } catch {
      $script:PendingDiagnostics.Add($entry)
      break
    }
  }
}

function Show-QuillgeistSplash {
  try { $Host.UI.RawUI.WindowTitle = "Clintware Quillgeist Lite" } catch {}
  try { [Console]::CursorVisible = $false } catch {}

  $frames = @(
@'
                         .##~~~~~~~~~~~~~-.
                    .-~~'                 '~~-.
                 .~~'                         '~~.
               .~'                               '~.
              /                                     \
             /                                       \
            |                                         |
            |          C L I N T W A R E  (TM)       |
            |                                         |
             \                                       /
              \                                     /
               '~.                               .~'
                 '~~.                         .~~'
                    '-~~.                 .~~-'
                         '-~~~~~~~~~~~~~-'
'@,
@'
                         .-~~~~~##~~~~~~~~.
                    .-~~'                 '~~-.
                 .~~'                         '~~.
               .~'                               '~.
              /                                     \
             /                                       \
            |                                         |
            |          C L I N T W A R E  (TM)       |
            |                                         |
             \                                       /
              \                                     /
               '~.                               .~'
                 '~~.                         .~~'
                    '-~~.                 .~~-'
                         '-~~~~~~~~~~~~~-'
'@,
@'
                         .-~~~~~~~~~~~~~##.
                    .-~~'                 '~~-.
                 .~~'                         '~~.
               .~'                               '~.
              /                                     \
             /                                       ##
            |                                         |
            |          C L I N T W A R E  (TM)       |
            |                                         |
             \                                       /
              \                                     /
               '~.                               .~'
                 '~~.                         .~~'
                    '-~~.                 .~~-'
                         '-~~~~~~~~~~~~~-'
'@,
@'
                         .-~~~~~~~~~~~~~~-.
                    .-~~'                 '~~-.
                 .~~'                         '~~.
               .~'                               '~.
              /                                     \
             /                                       \
            |                                        ##
            |          C L I N T W A R E  (TM)       |
            |                                         |
             \                                       /
              \                                     /
               '~.                               .~'
                 '~~.                         .~~'
                    '-~~.                 .~~-'
                         '-~~~~~~~~~~~~~-'
'@,
@'
                         .-~~~~~~~~~~~~~~-.
                    .-~~'                 '~~-.
                 .~~'                         '~~.
               .~'                               '~.
              /                                     \
             /                                       \
            |                                         |
            |          C L I N T W A R E  (TM)       |
            |                                         |
             \                                       /
              \                                     /
               '~.                               .~'
                 '~~.                         .~~'
                    '-~~.                 .~~-'
                         '-~~~~~~~~~~~~~##'
'@,
@'
                         .-~~~~~~~~~~~~~~-.
                    .-~~'                 '~~-.
                 .~~'                         '~~.
               .~'                               '~.
              /                                     \
             /                                       \
            |                                         |
            |          C L I N T W A R E  (TM)       |
            |                                         |
             \                                       /
              \                                     /
               '~.                               .~'
                 '~~.                         .~~'
                    '-~~.                 .~~-'
                         ##~~~~~~~~~~~~~~-'
'@,
@'
                         .-~~~~~~~~~~~~~~-.
                    .-~~'                 '~~-.
                 .~~'                         '~~.
               .~'                               '~.
              /                                     \
             /                                       \
           ##                                         |
            |          C L I N T W A R E  (TM)       |
            |                                         |
             \                                       /
              \                                     /
               '~.                               .~'
                 '~~.                         .~~'
                    '-~~.                 .~~-'
                         '-~~~~~~~~~~~~~-'
'@,
@'
                         .-~~~~~~~~~~~~~~-.
                    .-~~'                 '~~-.
                 .~~'                         '~~.
               .~'                               '~.
              /                                     \
            ##                                       \
            |                                         |
            |          C L I N T W A R E  (TM)       |
            |                                         |
             \                                       /
              \                                     /
               '~.                               .~'
                 '~~.                         .~~'
                    '-~~.                 .~~-'
                         '-~~~~~~~~~~~~~-'
'@
  )

  function Write-LogoLine {
    param([string]$Line)

    $wordStart = $Line.IndexOf("C L I N T W A R E")

    for ($i = 0; $i -lt $Line.Length; $i++) {
      if ($i + 1 -lt $Line.Length -and $Line.Substring($i,2) -eq "##") {
        Write-Host "##" -ForegroundColor Cyan -NoNewline
        $i++
        continue
      }

      if ($wordStart -ge 0 -and $i -ge $wordStart) {
        Write-Host $Line[$i] -ForegroundColor White -NoNewline
      } else {
        Write-Host $Line[$i] -ForegroundColor DarkCyan -NoNewline
      }
    }

    Write-Host ""
  }

  function Draw-SplashFrame {
    param([string]$Frame)

    try {
      [Console]::SetCursorPosition(0,0)
      [Console]::Write((" " * 88 + [Environment]::NewLine) * 27)
      [Console]::SetCursorPosition(0,0)
    } catch {
      try { Clear-Host } catch {}
    }

    foreach ($line in ($Frame -split '\r?\n')) {
      Write-LogoLine $line
    }

    Write-Host ""
    Write-Host "                    Q U I L L G E I S T   L I T E" -ForegroundColor White
    Write-Host ""
    Write-Host "                        GO FURTHEST. (TM)" -ForegroundColor Cyan
    Write-Host "                  EST. 2026  //  ALL RIGHTS RESERVED" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "                 MCP  <->  LOCAL EXECUTION BRIDGE" -ForegroundColor DarkGray
    Write-Host "                      PS1  |  PYTHON  |  C" -ForegroundColor DarkGray
  }

  try { Clear-Host } catch {}

  for ($spin = 0; $spin -lt 2; $spin++) {
    for ($i = 0; $i -lt $frames.Count; $i++) {
      Draw-SplashFrame $frames[$i]
      Start-Sleep -Milliseconds 85
    }
  }

  Draw-SplashFrame $frames[0]
  Write-Host ""
  Write-Host "                 EVENT-DRIVEN // STREAMING EVIDENCE" -ForegroundColor DarkGray
  Write-Host ""

  try { [Console]::CursorVisible = $true } catch {}
}

function Write-Log {
  param([string]$Message,[string]$Level="INFO")
  $line = "{0} [{1}] {2}" -f (Get-Date).ToString("s"),$Level,$Message
  Add-Content -Path $LogPath -Value $line
  $color = "Gray"
  if ($Level -eq "ERROR") { $color = "Red" }
  elseif ($Level -eq "WARN") { $color = "Yellow" }
  elseif ($Level -eq "OK") { $color = "Green" }
  Write-Host $line -ForegroundColor $color
  try { Queue-RunnerDiagnostic $Level $Message "runner" } catch {}
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
  $seg = [System.ArraySegment[byte]]::new([byte[]]$bytes,0,$bytes.Length)
  $null = $Socket.SendAsync(
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
      $seg = [System.ArraySegment[byte]]::new([byte[]]$buffer,0,$buffer.Length)
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

  if ($s.Length -gt 4000) { $s = $s.Substring(0,4000) + " ...[truncated]" }
  return $s
}

function Emit-TaskLine {
  param(
    [System.Net.WebSockets.ClientWebSocket]$Socket,
    [object]$Job,
    [ref]$Sequence,
    [System.Collections.Generic.List[string]]$Captured,
    [string]$Line,
    [string]$Phase
  )

  $safe = Redact-LogLine $Line
  if (-not $safe) { return }

  $Sequence.Value++
  $Captured.Add("[$Phase] $safe")
  Write-Host $safe

  if ($Socket -and $Socket.State -eq [Net.WebSockets.WebSocketState]::Open) {
    Send-Json $Socket @{
      type = "log"
      job_id = [string]$Job.job_id
      task_id = [string]$Job.task_id
      seq = $Sequence.Value
      phase = $Phase
      line = $safe
      timestamp = (Get-Date).ToUniversalTime().ToString("o")
    }
  }
}

function Invoke-ExternalStreaming {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [System.Net.WebSockets.ClientWebSocket]$Socket,
    [object]$Job,
    [ref]$Sequence,
    [System.Collections.Generic.List[string]]$Captured,
    [string]$Phase
  )

  $global:LASTEXITCODE = 0
  & $FilePath @Arguments *>&1 | ForEach-Object {
    Emit-TaskLine $Socket $Job $Sequence $Captured ([string]$_) $Phase
  }

  $code = $LASTEXITCODE
  if ($null -eq $code) { $code = 0 }
  return [int]$code
}

function Get-TaskArguments {
  param([object]$Task,[object]$Job,[string]$Runtime)

  $allowed = @($Task.parameters)
  $args = New-Object System.Collections.Generic.List[string]

  if ($Job.args) {
    foreach ($p in $Job.args.PSObject.Properties) {
      if ($allowed -notcontains $p.Name) {
        throw "Argument '$($p.Name)' is not allowed for task '$($Job.task_id)'."
      }

      if ($Runtime -eq "powershell") {
        $args.Add("-" + $p.Name)
        $args.Add([string]$p.Value)
      } else {
        $args.Add("--" + $p.Name)
        $args.Add([string]$p.Value)
      }
    }
  }

  return $args.ToArray()
}

function Resolve-Python {
  foreach ($candidate in @("python","python3","py")) {
    $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  throw "Python runtime not found. Register/run an approved Python-runtime setup task, then retry."
}

function Resolve-CCompiler {
  foreach ($candidate in @("clang","gcc","cl")) {
    $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($cmd) { return @{Name=$candidate;Path=$cmd.Source} }
  }
  throw "C compiler not found. Run the approved ensure-c-runtime task, then retry the C task."
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

  $runtime = ([string]$task.runtime).ToLowerInvariant()
  if (-not $runtime) { $runtime = "powershell" }
  if (@("powershell","python","c") -notcontains $runtime) {
    throw "Task runtime '$runtime' is not supported."
  }

  $scriptPath = [string]$task.script
  if ($scriptPath.Contains("..") -or $scriptPath.StartsWith("/") -or $scriptPath.StartsWith("\")) {
    throw "Task script path is invalid."
  }

  $requiredExtension = @{
    powershell = ".ps1"
    python = ".py"
    c = ".c"
  }[$runtime]

  if (-not $scriptPath.EndsWith($requiredExtension,[StringComparison]::OrdinalIgnoreCase)) {
    throw "Task '$($Job.task_id)' runtime '$runtime' requires a $requiredExtension source file."
  }

  $safeName = ([string]$Job.task_id -replace '[^A-Za-z0-9._-]','_')
  $localSource = Join-Path $CacheDir ($safeName + $requiredExtension)

  Invoke-WebRequest -Uri ($RepoRaw + "/" + $scriptPath) -OutFile $localSource -UseBasicParsing
  if (-not (Test-Path $localSource)) {
    throw "Could not download task source '$scriptPath'."
  }

  $taskArgs = Get-TaskArguments $task $Job $runtime
  Write-Log ("Running task {0} [{1}] ({2})" -f $Job.task_id,$runtime,$scriptPath)

  $started = Get-Date
  $captured = New-Object System.Collections.Generic.List[string]
  $seq = 0
  $code = 1

  if ($runtime -eq "powershell") {
    $ps = (Get-Command pwsh -ErrorAction SilentlyContinue)
    if (-not $ps) { $ps = Get-Command powershell -ErrorAction Stop }
    $invokeArgs = @("-NoProfile","-ExecutionPolicy","Bypass","-File",$localSource) + $taskArgs
    $code = Invoke-ExternalStreaming $ps.Source $invokeArgs $Socket $Job ([ref]$seq) $captured "run"
  }
  elseif ($runtime -eq "python") {
    $python = Resolve-Python
    $invokeArgs = @($localSource) + $taskArgs
    $code = Invoke-ExternalStreaming $python $invokeArgs $Socket $Job ([ref]$seq) $captured "run"
  }
  elseif ($runtime -eq "c") {
    $compiler = Resolve-CCompiler
    $exePath = Join-Path $CacheDir ($safeName + ".exe")

    if ($compiler.Name -eq "cl") {
      $compileArgs = @("/nologo","/W3","/O2","/Fe:$exePath",$localSource)
    } else {
      $compileArgs = @("-std=c11","-Wall","-Wextra","-O2",$localSource,"-o",$exePath)
    }

    $compileCode = Invoke-ExternalStreaming $compiler.Path $compileArgs $Socket $Job ([ref]$seq) $captured "compile"
    if ($compileCode -ne 0) {
      $code = $compileCode
    } else {
      $code = Invoke-ExternalStreaming $exePath $taskArgs $Socket $Job ([ref]$seq) $captured "run"
    }
  }

  $duration = [int]((Get-Date)-$started).TotalMilliseconds
  $output = ($captured -join [Environment]::NewLine)

  if ($output.Length -gt 40000) {
    $output = $output.Substring($output.Length-40000)
  }

  return @{
    type = "result"
    job_id = [string]$Job.job_id
    task_id = [string]$Job.task_id
    runtime = $runtime
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
Write-Log "Runtimes enabled: PowerShell, Python, C."
Write-Log "Event-driven mode: connecting control channel before UI initialization."

try {
  while ($true) {
    $ws = $null

    try {
      $token = Get-GitHubToken
      $ws = New-Object System.Net.WebSockets.ClientWebSocket
      $ws.Options.SetRequestHeader("Authorization","Bearer $token")
      $ws.Options.SetRequestHeader("X-Quillgeist-Runner-Id",$env:COMPUTERNAME)

      $null = $ws.ConnectAsync(
        [Uri]$Endpoint,
        [Threading.CancellationToken]::None
      ).GetAwaiter().GetResult()

      $script:RunnerSocket = $ws

      Send-Json $ws @{
        type = "hello"
        runner_id = $env:COMPUTERNAME
        version = "1.2.0"
        runtimes = @("powershell","python","c")
      }

      Flush-RunnerDiagnostics
      Write-Log "Connected to Clintware Control Plane." "OK"

      try {
        Show-QuillgeistSplash
        Write-Log "ASCII splash initialized." "OK"
      } catch {
        Write-Log ("Splash error: " + $_.Exception.Message) "ERROR"
        Queue-RunnerDiagnostic "ERROR" ($_.Exception.ToString()) "splash"
      }

      Write-Host ""
      Write-Host "  READY // CONTROL PLANE LINK ACTIVE" -ForegroundColor Green
      Write-Host ""

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
      Queue-RunnerDiagnostic "WARN" ($_.Exception.ToString()) "connection"
      try {
        Add-Content -Path $LogPath -Value ("FULL_EXCEPTION " + $_.Exception.ToString())
      } catch {}
    } finally {
      $script:RunnerSocket = $null
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
