param(
  [string]$Endpoint = "wss://mcp.clintware.com/api/v1/quillgeist-lite/stream",
  [string]$RegistryPath = (Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite\tasks.json")
)

$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$CacheDir = Join-Path $HomeDir "cache"
$LogPath = Join-Path $HomeDir "runner.log"
$StatePath = Join-Path $HomeDir "state.json"
$PendingResultPath = Join-Path $HomeDir "pending-results.json"
$UiInputPath = Join-Path $HomeDir "ui-input.jsonl"
$UiInputCursorPath = Join-Path $HomeDir "ui-input.cursor"
$HeartbeatPath = Join-Path $HomeDir "runner-heartbeat.json"
$LogoAssetPath = Join-Path $HomeDir "clintware-terminal-logo.b64"
$RuntimeRoot = Join-Path $HomeDir "runtime"
$DeviceConfigPath = Join-Path $env:ProgramData "Clintware\QuillgeistLite\service.json"
$UserDeviceConfigPath = Join-Path $HomeDir "device.json"

New-Item -ItemType Directory -Force -Path $HomeDir,$CacheDir | Out-Null

$script:RunnerSocket = $null
$script:RunnerDiagSeq = 0
$script:PendingDiagnostics = @()
$script:QQPromptVisible = $false
$script:QQPromptStartTop = -1
$script:QQInputBuffer = New-Object Text.StringBuilder
$script:QQReceiveBuffer = New-Object byte[] 65536
$script:QQReceiveStream = New-Object IO.MemoryStream
$script:QQReceiveTask = $null
$script:PendingQuestions = @{}
$script:LastQuestionPoll = [DateTime]::MinValue
$script:LastHeartbeatWrite = [DateTime]::MinValue

function Write-RunnerHeartbeat {
  param(
    [string]$State = "connected",
    [string]$JobId = "",
    [string]$TaskId = "",
    [switch]$Force
  )

  $now = Get-Date
  if (-not $Force -and (($now - $script:LastHeartbeatWrite).TotalSeconds -lt 15)) { return }

  try {
    $payload = [ordered]@{
      version = "1"
      runner_id = $env:COMPUTERNAME
      pid = $PID
      state = $State
      job_id = $JobId
      task_id = $TaskId
      timestamp = $now.ToUniversalTime().ToString("o")
    }
    $temp = $HeartbeatPath + ".new"
    [IO.File]::WriteAllText(
      $temp,
      ($payload | ConvertTo-Json -Depth 4),
      (New-Object Text.UTF8Encoding($false))
    )
    Move-Item $temp $HeartbeatPath -Force
    $script:LastHeartbeatWrite = $now
  } catch {}
}

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

function Test-QQAdministrator {
  try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  } catch {
    return $false
  }
}

function Suspend-QQPrompt {
  if (-not $script:QQPromptVisible) { return }
  try {
    $width = [Math]::Max(20,[Console]::BufferWidth - 1)
    $endTop = [Console]::CursorTop
    $startTop = [int]$script:QQPromptStartTop
    if ($startTop -lt 0 -or $startTop -gt $endTop) { $startTop = $endTop }
    for ($row = $startTop; $row -le $endTop; $row++) {
      [Console]::SetCursorPosition(0,$row)
      [Console]::Write(" " * $width)
    }
    [Console]::SetCursorPosition(0,$startTop)
  } catch {
    Write-Host ""
  }
  $script:QQPromptStartTop = -1
  $script:QQPromptVisible = $false
}

function Show-QQPrompt {
  if ($script:QQPromptVisible) { return }
  $mode = if (Test-QQAdministrator) { "admin" } else { "user" }
  try { $script:QQPromptStartTop = [Console]::CursorTop } catch { $script:QQPromptStartTop = -1 }
  Write-Host "qq" -ForegroundColor Cyan -NoNewline
  Write-Host ("(" + $mode + ")") -ForegroundColor White -NoNewline
  Write-Host "> " -ForegroundColor Cyan -NoNewline
  $existing = $script:QQInputBuffer.ToString()
  if ($existing) { Write-Host $existing -ForegroundColor White -NoNewline }
  $script:QQPromptVisible = $true
}

function Read-QQConsoleLine {
  try {
    if ([Console]::IsInputRedirected) { return [pscustomobject]@{Ready=$false;Line=$null} }
  } catch {
    return [pscustomobject]@{Ready=$false;Line=$null}
  }

  try {
    while ([Console]::KeyAvailable) {
      $key = [Console]::ReadKey($true)

      if ($key.Key -eq [ConsoleKey]::Enter) {
        $line = $script:QQInputBuffer.ToString()
        $null = $script:QQInputBuffer.Clear()
        Write-Host ""
        $script:QQPromptVisible = $false
        return [pscustomobject]@{Ready=$true;Line=$line}
      }

      if ($key.Key -eq [ConsoleKey]::Backspace) {
        if ($script:QQInputBuffer.Length -gt 0) {
          $script:QQInputBuffer.Remove($script:QQInputBuffer.Length-1,1) | Out-Null
          Write-Host (([string][char]8) + " " + ([string][char]8)) -NoNewline
        }
        continue
      }

      if ($key.Key -eq [ConsoleKey]::Escape) {
        Suspend-QQPrompt
        $null = $script:QQInputBuffer.Clear()
        Show-QQPrompt
        continue
      }

      if (($key.Modifiers -band [ConsoleModifiers]::Control) -and $key.Key -eq [ConsoleKey]::C) {
        Suspend-QQPrompt
        $null = $script:QQInputBuffer.Clear()
        Write-Host "^C" -ForegroundColor DarkYellow
        Show-QQPrompt
        continue
      }

      if (-not [char]::IsControl($key.KeyChar)) {
        $null = $script:QQInputBuffer.Append($key.KeyChar)
        Write-Host ([string]$key.KeyChar) -ForegroundColor White -NoNewline
      }
    }
  } catch {}

  return [pscustomobject]@{Ready=$false;Line=$null}
}

function Initialize-ClintwareTerminal {
  try {
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    [Console]::BackgroundColor = [ConsoleColor]::Black
    [Console]::ForegroundColor = [ConsoleColor]::White
  } catch {}

  try {
    $raw = $Host.UI.RawUI
    $raw.BackgroundColor = "Black"
    $raw.ForegroundColor = "White"
    $mode = if (Test-QQAdministrator) { "ADMIN" } else { "USER" }
    $raw.WindowTitle = "Clintware Quillgeist Lite [$mode]"

    $targetWidth = [Math]::Min(118,[Math]::Max(92,$raw.MaxPhysicalWindowSize.Width))
    if ($raw.BufferSize.Width -lt $targetWidth) {
      $buffer = $raw.BufferSize
      $buffer.Width = $targetWidth
      $raw.BufferSize = $buffer
    }

    if ($raw.WindowSize.Width -lt $targetWidth) {
      $window = $raw.WindowSize
      $window.Width = [Math]::Min($targetWidth,$raw.MaxPhysicalWindowSize.Width)
      $raw.WindowSize = $window
    }
  } catch {}

  try { Clear-Host } catch {}
}

function Write-ClintwareCentered {
  param(
    [string]$Text,
    [ConsoleColor]$Color = [ConsoleColor]::White
  )

  $width = 100
  try { $width = [Console]::WindowWidth } catch {}
  $pad = [Math]::Max(0,[int](($width - $Text.Length) / 2))
  Write-Host ((" " * $pad) + $Text) -ForegroundColor $Color
}

function Write-ClintwareSplitLine {
  param(
    [string]$Left,
    [string]$Center,
    [string]$Right,
    [ConsoleColor]$CenterColor = [ConsoleColor]::White
  )

  $raw = $Left + $Center + $Right
  $width = 100
  try { $width = [Console]::WindowWidth } catch {}
  $pad = [Math]::Max(0,[int](($width - $raw.Length) / 2))

  Write-Host (" " * $pad) -NoNewline
  Write-Host $Left -ForegroundColor Cyan -NoNewline
  Write-Host $Center -ForegroundColor $CenterColor -NoNewline
  Write-Host $Right -ForegroundColor Cyan
}

function Ensure-ClintwareLogoAsset {
  if (-not (Test-Path $LogoAssetPath)) { return $false }
  try {
    $raw = (Get-Content $LogoAssetPath -Raw).Trim()
    return $raw.StartsWith("iVBOR")
  } catch {
    return $false
  }
}

function Write-ClintwareLogoImage {
  param([int]$MaxColumns = 58)

  try {
    $windowWidth = 100
    try { $windowWidth = [Console]::WindowWidth } catch {}

    $esc = [char]27
    $cyan1 = "$esc[38;2;24;115;170m"
    $cyan2 = "$esc[38;2;41;199;255m"
    $cyan3 = "$esc[38;2;114;230;255m"
    $white = "$esc[38;2;247;251;255m"
    $dim = "$esc[38;2;72;104;128m"
    $reset = "$esc[0m"

    # Deliberately draw the mark as terminal-native text instead of rasterizing
    # a PNG. This stays crisp at any DPI/terminal zoom and cannot become the
    # giant pixelated block image that the old bitmap renderer produced.
    $art = @(
      @{ c=$dim;   t="              .  .  .  .  .              " },
      @{ c=$cyan1; t="         .:*##############*:.         " },
      @{ c=$cyan2; t="      .:*##*:          :*##*:.      " },
      @{ c=$cyan2; t="     :##*.                .*##:     " },
      @{ c=$cyan3; t="    *##:                    :##*    " },
      @{ c=$cyan3; t="   :##.                      .##:   " },
      @{ c=$white; t="   ##:      Clintware(TM)     :##   " },
      @{ c=$cyan3; t="   :##.                      .##:   " },
      @{ c=$cyan3; t="    *##:                    :##*    " },
      @{ c=$cyan2; t="     :##*.                .*##:     " },
      @{ c=$cyan2; t="      .:*##*:          :*##*:.      " },
      @{ c=$cyan1; t="         .:*##############*:.         " },
      @{ c=$dim;   t="              .  .  .  .  .              " }
    )

    $contentWidth = 44
    $padCount = [Math]::Max(0,[int](($windowWidth - $contentWidth) / 2))
    $pad = " " * $padCount
    foreach ($row in $art) {
      [Console]::WriteLine($pad + $row.c + $row.t + $reset)
    }
    return $true
  } catch {
    return $false
  }
}

function Show-QuillgeistSplash {
  param(
    [string]$Status = "CONNECTING"
  )

  Initialize-ClintwareTerminal

  try { [Console]::CursorVisible = $false } catch {}
  try { Clear-Host } catch {}

  Write-Host ""
  $rendered = Write-ClintwareLogoImage -MaxColumns 58
  if (-not $rendered) {
    Write-ClintwareCentered "CLINTWARE™" White
    Write-ClintwareCentered "EST. 2026" DarkGray
  }

  Write-Host ""
  Write-ClintwareCentered "Q U I L L G E I S T   L I T E" White
  Write-ClintwareCentered "Go Furthest.™" Cyan
  Write-Host ""

  $statusLabel = ("STATUS  //  " + $Status.ToUpperInvariant())
  $statusColor = if ($Status -match '(?i)active|ready|healthy|connected') { [ConsoleColor]::Cyan } else { [ConsoleColor]::DarkCyan }
  Write-ClintwareCentered $statusLabel $statusColor
  Write-ClintwareCentered "Local execution  •  Governed browser  •  Control Plane" DarkGray
  Write-Host ""

  try { [Console]::CursorVisible = $true } catch {}
}

function Write-Log {
  param([string]$Message,[string]$Level="INFO")

  Suspend-QQPrompt
  $stamp = (Get-Date).ToString("s")
  $line = "{0} [{1}] {2}" -f $stamp,$Level,$Message
  Add-Content -Path $LogPath -Value $line

  $labelColor = "Cyan"
  $messageColor = "Cyan"

  switch ($Level.ToUpperInvariant()) {
    "OK" {
      $labelColor = "White"
      $messageColor = "White"
    }
    "WARN" {
      $labelColor = "DarkYellow"
      $messageColor = "DarkYellow"
    }
    "ERROR" {
      $labelColor = "Red"
      $messageColor = "Red"
    }
    default {
      $labelColor = "Cyan"
      $messageColor = "Cyan"
    }
  }

  Write-Host $stamp -ForegroundColor DarkGray -NoNewline
  Write-Host (" [{0}] " -f $Level) -ForegroundColor $labelColor -NoNewline
  Write-Host $Message -ForegroundColor $messageColor

  try { Queue-RunnerDiagnostic $Level $Message "runner" } catch {}
  Show-QQPrompt
}

# V3 deliberately moves off the legacy V2 mutex. Older qq builds could leave a
# live-but-disconnected PowerShell process holding V2 after runner.pid vanished,
# which caused the health service to restart an endless series of runners that
# immediately exited. V3 breaks that stale generation once, then uses the normal
# OS-owned mutex lifecycle for single-instance enforcement.
$mutex = New-Object System.Threading.Mutex($false, "Local\ClintwareQuillgeistLiteV3")
$ownsMutex = $false
try {
  $ownsMutex = $mutex.WaitOne(0,$false)
} catch [System.Threading.AbandonedMutexException] {
  $ownsMutex = $true
  Write-Log "Recovered an abandoned Quillgeist Lite single-instance mutex." "WARN"
}
if (-not $ownsMutex) {
  Write-Log "Another Quillgeist Lite V3 runner is already active." "WARN"
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

function Get-PendingResults {
  if (-not (Test-Path $PendingResultPath)) { return @{} }
  try {
    $s = Get-Content $PendingResultPath -Raw | ConvertFrom-Json
    $map = @{}
    foreach ($p in $s.PSObject.Properties) { $map[$p.Name] = $p.Value }
    return $map
  } catch {
    return @{}
  }
}

function Save-PendingResults {
  param([hashtable]$Map)
  if ($Map.Count -eq 0) {
    Remove-Item $PendingResultPath -Force -ErrorAction SilentlyContinue
    return
  }
  $Map | ConvertTo-Json -Depth 10 | Set-Content -Path $PendingResultPath -Encoding UTF8
}

function New-QQDeviceToken {
  $bytes = New-Object byte[] 48
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+","-").Replace("/","_")
}

function Get-QQTokenHash {
  param([Parameter(Mandatory=$true)][string]$Token)
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    $hashBytes = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Token))
  } finally {
    $sha.Dispose()
  }
  return (-join ($hashBytes | ForEach-Object { $_.ToString("x2") }))
}

function Test-QQCredentialConfig {
  param([object]$Config)
  return [bool]($Config -and $Config.DeviceId -and $Config.Token)
}

function Read-QQCredentialConfig {
  foreach ($path in @($DeviceConfigPath,$UserDeviceConfigPath)) {
    if (-not (Test-Path $path)) { continue }
    try {
      $config = Get-Content $path -Raw | ConvertFrom-Json
      if (Test-QQCredentialConfig $config) {
        return $config
      }
    } catch {}
  }
  return $null
}

function Save-QQUserCredential {
  param(
    [Parameter(Mandatory=$true)][string]$DeviceId,
    [Parameter(Mandatory=$true)][string]$Token
  )
  $config = [ordered]@{
    Endpoint = "https://mcp.clintware.com"
    DeviceId = $DeviceId
    Token = $Token
    RegisteredAt = (Get-Date).ToUniversalTime().ToString("o")
    Source = "clintware-identity-self-enrollment"
  }
  $config | ConvertTo-Json -Depth 5 | Set-Content -Path $UserDeviceConfigPath -Encoding UTF8

  # If qq is elevated, also restore the machine-level credential consumed by
  # the Windows health service. Failure here must not prevent the interactive
  # runner from reconnecting with its user-local credential.
  try {
    $programDir = Split-Path $DeviceConfigPath -Parent
    New-Item -ItemType Directory -Force -Path $programDir | Out-Null
    if (Test-Path $DeviceConfigPath) {
      $machine = Get-Content $DeviceConfigPath -Raw | ConvertFrom-Json
    } else {
      $machine = [pscustomobject]@{}
    }
    $merged = [ordered]@{
      Endpoint = $(if($machine.Endpoint){[string]$machine.Endpoint}else{"https://mcp.clintware.com"})
      DeviceId = $DeviceId
      Token = $Token
      TaskName = $(if($machine.TaskName){[string]$machine.TaskName}else{"Clintware Quillgeist Lite Runner"})
      RunnerPidPath = $(if($machine.RunnerPidPath){[string]$machine.RunnerPidPath}else{Join-Path $HomeDir "runner.pid"})
      RunnerLogPath = $(if($machine.RunnerLogPath){[string]$machine.RunnerLogPath}else{$LogPath})
      CrashLogPath = $(if($machine.CrashLogPath){[string]$machine.CrashLogPath}else{Join-Path $HomeDir "runner-crash.log"})
      LocalServiceLogPath = $(if($machine.LocalServiceLogPath){[string]$machine.LocalServiceLogPath}else{Join-Path $programDir "service-local.log"})
      AutoRepairPath = $(if($machine.AutoRepairPath){[string]$machine.AutoRepairPath}else{Join-Path $HomeDir "auto-repair-runtime.ps1"})
    }
    $merged | ConvertTo-Json -Depth 6 | Set-Content -Path $DeviceConfigPath -Encoding UTF8 -ErrorAction Stop
  } catch {
    Write-Log ("DEVICE // interactive credential restored; machine-level service config not writable: " + $_.Exception.Message) "WARN"
  }
}

function Request-QQSelfEnrollment {
  $deviceId = $env:COMPUTERNAME
  if (-not $deviceId) { $deviceId = "qq-" + [Guid]::NewGuid().ToString("n").Substring(0,12) }
  $deviceToken = New-QQDeviceToken
  $tokenHash = Get-QQTokenHash $deviceToken
  $nonce = [Guid]::NewGuid().ToString("n") + [Guid]::NewGuid().ToString("n")

  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
  $listener.Start()
  try {
    $port = ([Net.IPEndPoint]$listener.LocalEndpoint).Port
    $callback = [Uri]::EscapeDataString("http://127.0.0.1:$port/")
    $device = [Uri]::EscapeDataString($deviceId)
    $label = [Uri]::EscapeDataString("$deviceId / $env:USERNAME")
    $hash = [Uri]::EscapeDataString($tokenHash)
    $safeNonce = [Uri]::EscapeDataString($nonce)
    $authorize = "https://mcp.clintware.com/admin/qq/enroll?device_id=$device&token_hash=$hash&label=$label&callback=$callback&nonce=$safeNonce"

    Write-Log "DEVICE // local credential missing; Clintware Identity enrollment required." "WARN"
    $opened = $false
    try {
      Start-Process -FilePath $authorize -ErrorAction Stop | Out-Null
      $opened = $true
    } catch {
      try {
        Start-Process -FilePath "explorer.exe" -ArgumentList $authorize -ErrorAction Stop | Out-Null
        $opened = $true
      } catch {}
    }
    # A successful Start-Process does not prove a browser tab appeared. Always
    # show the link and copy it locally so enrollment can continue if Windows
    # silently drops the URL association.
    Suspend-QQPrompt
    Write-Host "DEVICE // Open this enrollment link on MEMORIA in your browser:" -ForegroundColor DarkYellow
    Write-Host $authorize -ForegroundColor Cyan
    try {
      Set-Clipboard -Value $authorize -ErrorAction Stop
      Write-Host "DEVICE // Link copied to clipboard. Paste it into the browser address bar." -ForegroundColor DarkYellow
    } catch {
      Write-Host "DEVICE // Copy the link above into the browser address bar." -ForegroundColor DarkYellow
    }
    if (-not $opened) {
      Write-Host "DEVICE // Windows did not launch a browser automatically." -ForegroundColor DarkYellow
    }
    Show-QQPrompt

    $pending = $listener.AcceptTcpClientAsync()
    if (-not $pending.Wait([TimeSpan]::FromMinutes(5))) {
      throw "Clintware device enrollment timed out."
    }

    $client = $pending.Result
    try {
      $stream = $client.GetStream()
      $reader = New-Object IO.StreamReader($stream,[Text.Encoding]::ASCII,$false,4096,$true)
      $requestLine = $reader.ReadLine()
      while ($true) {
        $line = $reader.ReadLine()
        if ($null -eq $line -or $line -eq "") { break }
      }

      if ($requestLine -notmatch '^GET\s+([^\s]+)\s+HTTP/') {
        throw "Invalid local enrollment callback."
      }

      $callbackUri = [Uri]("http://127.0.0.1" + $matches[1])
      $query = @{}
      foreach ($pair in $callbackUri.Query.TrimStart("?").Split("&",[StringSplitOptions]::RemoveEmptyEntries)) {
        $kv = $pair.Split("=",2)
        $key = [Uri]::UnescapeDataString([string]$kv[0])
        $value = if ($kv.Count -gt 1) { [Uri]::UnescapeDataString([string]$kv[1]) } else { "" }
        $query[$key] = $value
      }
      $status = [string]$query["status"]
      $returnedNonce = [string]$query["nonce"]

      $ok = ($status -eq "ok" -and $returnedNonce -eq $nonce)
      $html = if ($ok) {
        "<!doctype html><html><body style='font-family:Segoe UI;padding:40px'><h1>QQ connected</h1><p>Clintware device identity restored. You can close this tab.</p></body></html>"
      } else {
        "<!doctype html><html><body style='font-family:Segoe UI;padding:40px'><h1>QQ connection failed</h1><p>Return to the qq window.</p></body></html>"
      }
      $body = [Text.Encoding]::UTF8.GetBytes($html)
      $headers = "HTTP/1.1 " + $(if($ok){"200 OK"}else{"400 Bad Request"}) + "`r`nContent-Type: text/html; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $head = [Text.Encoding]::ASCII.GetBytes($headers)
      $stream.Write($head,0,$head.Length)
      $stream.Write($body,0,$body.Length)
      $stream.Flush()

      if (-not $ok) { throw "Clintware device enrollment was not approved." }
    } finally {
      try { $client.Close() } catch {}
    }
  } finally {
    try { $listener.Stop() } catch {}
  }

  Save-QQUserCredential -DeviceId $deviceId -Token $deviceToken
  Write-Log "DEVICE // Clintware Identity enrollment complete; qq device credential restored." "OK"
  return @{
    DeviceId = $deviceId
    Token = $deviceToken
    Endpoint = "https://mcp.clintware.com"
  }
}

function Get-QQDeviceCredential {
  $config = Read-QQCredentialConfig
  if ($config) {
    return @{
      DeviceId = [string]$config.DeviceId
      Token = [string]$config.Token
      Endpoint = [string]$config.Endpoint
    }
  }

  return Request-QQSelfEnrollment
}

function Get-Registry {
  if (-not (Test-Path $RegistryPath)) {
    $packaged = Join-Path $RuntimeRoot "quillgeist-lite\tasks.json"
    if (-not (Test-Path $packaged)) {
      throw "Local QQ task registry and packaged runtime are missing. Reinstall QQ.exe to restore the complete reviewed task bundle."
    }
    $candidate = Get-Content $packaged -Raw | ConvertFrom-Json
    if (-not $candidate.tasks) { throw "Packaged QQ task registry is invalid: $packaged" }
    $temp = $RegistryPath + ".new"
    Copy-Item -LiteralPath $packaged -Destination $temp -Force
    Move-Item -LiteralPath $temp -Destination $RegistryPath -Force
    Write-Log "Recovered local task registry from the packaged QQ runtime." "OK"
  }
  $registry = Get-Content $RegistryPath -Raw | ConvertFrom-Json
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

function Reset-QQReceiveState {
  try { $script:QQReceiveStream.SetLength(0) } catch {}
  $script:QQReceiveTask = $null
}

function Poll-ReceiveJson {
  param([System.Net.WebSockets.ClientWebSocket]$Socket)

  if ($null -eq $script:QQReceiveTask) {
    $seg = [System.ArraySegment[byte]]::new([byte[]]$script:QQReceiveBuffer,0,$script:QQReceiveBuffer.Length)
    $script:QQReceiveTask = $Socket.ReceiveAsync(
      $seg,
      [Threading.CancellationToken]::None
    )
  }

  if (-not $script:QQReceiveTask.IsCompleted) {
    return [pscustomobject]@{State="pending";Message=$null}
  }

  $r = $script:QQReceiveTask.GetAwaiter().GetResult()
  $script:QQReceiveTask = $null

  if ($r.MessageType -eq [Net.WebSockets.WebSocketMessageType]::Close) {
    Reset-QQReceiveState
    return [pscustomobject]@{State="closed";Message=$null}
  }

  $script:QQReceiveStream.Write($script:QQReceiveBuffer,0,$r.Count)
  if ($script:QQReceiveStream.Length -gt 1048576) {
    Reset-QQReceiveState
    throw "Incoming Quillgeist Lite message exceeded 1 MB."
  }

  if (-not $r.EndOfMessage) {
    return [pscustomobject]@{State="pending";Message=$null}
  }

  $text = [Text.Encoding]::UTF8.GetString($script:QQReceiveStream.ToArray())
  $script:QQReceiveStream.SetLength(0)
  return [pscustomobject]@{State="message";Message=($text | ConvertFrom-Json)}
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

  $displayColor = "White"
  if ($safe -match '(?i)\\b(error|failed|fatal|exception|denied)\\b') {
    $displayColor = "Red"
  }
  elseif ($safe -match '(?i)\\b(warn|warning|retry|degraded)\\b') {
    $displayColor = "DarkYellow"
  }
  elseif ($safe -match '(?i)\\b(ok|passed|success|ready|connected|complete|completed)\\b') {
    $displayColor = "Cyan"
  }
  elseif ($Phase -eq "compile") {
    $displayColor = "DarkCyan"
  }

  Suspend-QQPrompt
  Write-Host $safe -ForegroundColor $displayColor
  Show-QQPrompt

  Write-RunnerHeartbeat -State "busy" -JobId ([string]$Job.job_id) -TaskId ([string]$Job.task_id)

  if ($Socket -and $Socket.State -eq [Net.WebSockets.WebSocketState]::Open) {
    try {
      Send-Json $Socket @{
        type = "log"
        job_id = [string]$Job.job_id
        task_id = [string]$Job.task_id
        seq = $Sequence.Value
        phase = $Phase
        line = $safe
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
      }
    } catch {
      # Transport loss must never terminate the local child task. The result is
      # persisted and replayed after reconnect.
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

  $heartbeatWorker = $null
  try {
    $heartbeatWorker = Start-Job -ArgumentList $HeartbeatPath,$env:COMPUTERNAME,$PID,([string]$Job.job_id),([string]$Job.task_id) -ScriptBlock {
      param($Path,$RunnerId,$RunnerPid,$JobId,$TaskId)
      while ($true) {
        try {
          $now = (Get-Date).ToUniversalTime()
          $payload = [ordered]@{
            version = "1"
            runner_id = $RunnerId
            pid = $RunnerPid
            state = "busy"
            job_id = $JobId
            task_id = $TaskId
            timestamp = $now.ToString("o")
          }
          $temp = $Path + ".busy"
          [IO.File]::WriteAllText($temp,($payload | ConvertTo-Json -Depth 4),(New-Object Text.UTF8Encoding($false)))
          Move-Item $temp $Path -Force
        } catch {}
        Start-Sleep -Seconds 10
      }
    }

    $global:LASTEXITCODE = 0
    & $FilePath @Arguments *>&1 | ForEach-Object {
      Emit-TaskLine $Socket $Job $Sequence $Captured ([string]$_) $Phase
    }

    $code = $LASTEXITCODE
    if ($null -eq $code) { $code = 0 }
    return [int]$code
  } finally {
    if ($heartbeatWorker) {
      try { Stop-Job $heartbeatWorker -ErrorAction SilentlyContinue | Out-Null } catch {}
      try { Remove-Job $heartbeatWorker -Force -ErrorAction SilentlyContinue | Out-Null } catch {}
    }
  }
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
  $candidates = New-Object System.Collections.Generic.List[string]
  $miniconda = Join-Path $env:USERPROFILE "Miniconda3\python.exe"
  if (Test-Path $miniconda) { $candidates.Add($miniconda) }
  foreach ($name in @("python.exe","py.exe","python3.exe")) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) { $candidates.Add([string]$cmd.Source) }
  }
  foreach ($candidate in ($candidates | Select-Object -Unique)) {
    if ($candidate -match '(?i)\\WindowsApps\\') { continue }
    try {
      $version = (& $candidate --version 2>&1 | Out-String).Trim()
      if ($LASTEXITCODE -eq 0 -and $version -match '^Python 3\.') { return $candidate }
    } catch {}
  }
  throw "A working Python 3 runtime was not found; WindowsApps Store aliases are ignored."
}

function Resolve-CCompiler {
  foreach ($candidate in @("clang","gcc","cl")) {
    $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($cmd) { return @{Name=$candidate;Path=$cmd.Source} }
  }
  throw "C compiler not found. Run the approved ensure-c-runtime task, then retry the C task."
}

function Get-QQLocalTokens {
  param([string]$Text)
  $tokens = New-Object System.Collections.Generic.List[string]
  foreach ($m in [regex]::Matches([string]$Text,'(?:"([^"]*)"|''([^'']*)''|(\S+))')) {
    if ($m.Groups[1].Success) { $tokens.Add($m.Groups[1].Value) }
    elseif ($m.Groups[2].Success) { $tokens.Add($m.Groups[2].Value) }
    else { $tokens.Add($m.Groups[3].Value) }
  }
  return $tokens.ToArray()
}

function Show-QQHelp {
  Suspend-QQPrompt
  Write-Host ""
  Write-Host "QQ LOCAL CONSOLE" -ForegroundColor White
  Write-Host "  help                         Show this command reference." -ForegroundColor Cyan
  Write-Host "  status                       Show local runner, service, and admin state." -ForegroundColor Cyan
  Write-Host "  health                       Recheck the live link and redraw the Clintware welcome." -ForegroundColor Cyan
  Write-Host "  tasks                        List reviewed qq tasks." -ForegroundColor Cyan
  Write-Host "  <natural language>           Relay a question/instruction to Clintware for an LLM response." -ForegroundColor Cyan
  Write-Host "  ask <text>                   Explicitly relay a question/instruction." -ForegroundColor Cyan
  Write-Host "  run <task> [Name=Value ...]  Run an allowlisted task locally." -ForegroundColor Cyan
  Write-Host "  jira                         Connect/reconnect Jira." -ForegroundColor Cyan
  Write-Host "  doctor                       Run Clintware local diagnostics." -ForegroundColor Cyan
  Write-Host "  update                       Update qq from Clintware source." -ForegroundColor Cyan
  Write-Host "  admin                        Upgrade/reopen qq as the supervised admin console." -ForegroundColor Cyan
  Write-Host "  heal                         Self-repair qq in place without stealing focus." -ForegroundColor Cyan
  Write-Host "  web setup                    Install/repair the local browser runtime." -ForegroundColor Cyan
  Write-Host "  responder                    Open the local responder management UI." -ForegroundColor Cyan
  Write-Host "  responder on|off             Enable or disable scheduled responder scans." -ForegroundColor Cyan
  Write-Host "  responder run                Run one responder scan immediately." -ForegroundColor Cyan
  Write-Host "  responder status             Show responder runtime state." -ForegroundColor Cyan
  Write-Host "  code search <query>          Search the maintained repository without provider indexing." -ForegroundColor Cyan
  Write-Host "  web search <query>           Search the live public web without a search API key." -ForegroundColor Cyan
  Write-Host "  web read <url>               Read a public page into structured text/links." -ForegroundColor Cyan
  Write-Host "  web login <url>              Open the persistent browser for manual local sign-in." -ForegroundColor Cyan
  Write-Host "  web open <url>               Open a governed persistent local browser session." -ForegroundColor Cyan
  Write-Host "  web inspect <url>            Return interactive fields/buttons/links from a page." -ForegroundColor Cyan
  Write-Host "  web run <json>               Execute a bounded governed browser action plan." -ForegroundColor Cyan
  Write-Host "  reconnect                    Reconnect the Control Plane channel." -ForegroundColor Cyan
  Write-Host "  clear                        Clear the terminal." -ForegroundColor Cyan
  Write-Host "  ! <PowerShell>               Local-only admin shell escape." -ForegroundColor DarkYellow
  Write-Host ""
  Write-Host "Natural-language input is relayed through the Clintware Control Plane. Remote MCP callers still cannot send arbitrary shell commands; the ! escape exists only for text physically entered in this local console." -ForegroundColor DarkGray
  Write-Host ""
  Show-QQPrompt
}

function Show-QQStatus {
  Suspend-QQPrompt
  $admin = Test-QQAdministrator
  $socketState = if ($script:RunnerSocket) { [string]$script:RunnerSocket.State } else { "Disconnected" }
  $service = Get-Service -Name "ClintwareQuillgeistLiteHealth" -ErrorAction SilentlyContinue

  Write-Host ""
  Write-Host "QQ STATUS" -ForegroundColor White
  Write-Host ("  Privilege     : " + $(if($admin){"ADMIN"}else{"STANDARD"})) -ForegroundColor $(if($admin){"Cyan"}else{"DarkYellow"})
  Write-Host ("  Control Plane : " + $socketState) -ForegroundColor Cyan
  Write-Host ("  Health service: " + $(if($service){$service.Status}else{"not installed"})) -ForegroundColor Cyan
  Write-Host ("  Machine       : " + $env:COMPUTERNAME) -ForegroundColor DarkGray
  Write-Host ("  PowerShell    : " + $PSVersionTable.PSVersion.ToString() + " / " + $PSVersionTable.PSEdition) -ForegroundColor DarkGray
  Write-Host ("  User          : " + [Security.Principal.WindowsIdentity]::GetCurrent().Name) -ForegroundColor DarkGray
  Write-Host ""
  Show-QQPrompt
}

function Invoke-QQLocalTask {
  param(
    [string]$TaskId,
    [hashtable]$Arguments = @{}
  )

  $registry = Get-Registry
  if (-not (Find-Task $registry $TaskId)) {
    Suspend-QQPrompt
    Write-Host ("Unknown qq task: " + $TaskId) -ForegroundColor Red
    Show-QQPrompt
    return
  }

  $job = [pscustomobject]@{
    job_id = "local-" + [Guid]::NewGuid().ToString("n")
    task_id = $TaskId
    args = [pscustomobject]$Arguments
    objective = "Local qq console"
  }

  Suspend-QQPrompt
  Write-Host ("LOCAL TASK // " + $TaskId) -ForegroundColor Cyan
  try {
    $result = Invoke-AllowlistedTask $job $null
    $level = if ($result.status -eq "passed") { "OK" } else { "ERROR" }
    Write-Log ("Local task {0} finished with status {1}" -f $TaskId,$result.status) $level
    if ($result.output) {
      Suspend-QQPrompt
      Write-Host "--- RESULT ---" -ForegroundColor DarkCyan
      Write-Host ([string]$result.output) -ForegroundColor White
    }
  } catch {
    Write-Log ("Local task failed: " + $_.Exception.Message) "ERROR"
  }
  Show-QQPrompt
}

function Invoke-QQLocalShell {
  param([string]$Command)

  if (-not $Command) {
    Suspend-QQPrompt
    Write-Host "Usage: ! <PowerShell command>" -ForegroundColor DarkYellow
    Show-QQPrompt
    return
  }

  Suspend-QQPrompt
  $mode = if (Test-QQAdministrator) { "ADMIN" } else { "STANDARD" }
  Write-Host ("LOCAL " + $mode + " POWERSHELL // " + $Command) -ForegroundColor DarkYellow

  $ps = Get-Command pwsh -ErrorAction SilentlyContinue
  if (-not $ps) { $ps = Get-Command powershell -ErrorAction Stop }

  try {
    & $ps.Source -NoProfile -ExecutionPolicy Bypass -Command $Command *>&1 | ForEach-Object {
      Write-Host (Redact-LogLine ([string]$_)) -ForegroundColor White
    }
    if ($LASTEXITCODE -ne 0) {
      Write-Host ("Exit code: " + $LASTEXITCODE) -ForegroundColor Red
    }
  } catch {
    Write-Host (Redact-LogLine $_.Exception.Message) -ForegroundColor Red
  }

  Show-QQPrompt
}

function Read-QQUiInput {
  $items = New-Object System.Collections.Generic.List[string]
  try {
    if (-not (Test-Path $UiInputPath)) { return $items.ToArray() }
    $lines = @(Get-Content $UiInputPath -ErrorAction Stop)
    $cursor = 0
    if (Test-Path $UiInputCursorPath) {
      $raw = (Get-Content $UiInputCursorPath -Raw -ErrorAction SilentlyContinue).Trim()
      [void][int]::TryParse($raw,[ref]$cursor)
    }
    if ($cursor -lt 0 -or $cursor -gt $lines.Count) { $cursor = 0 }
    for ($i=$cursor; $i -lt $lines.Count; $i++) {
      try {
        $row = $lines[$i] | ConvertFrom-Json
        $text = ([string]$row.text).Trim()
        if ($text -and -not $text.StartsWith("!")) { $items.Add($text) }
      } catch {}
    }
    Set-Content -Path $UiInputCursorPath -Value ([string]$lines.Count) -Encoding ASCII
  } catch {}
  return $items.ToArray()
}

function Send-QQQuestion {
  param([string]$Text)

  $Text = ([string]$Text).Trim()
  if (-not $Text) { Show-QQPrompt; return }

  # Natural-language relay follows the same local redaction boundary as task logs.
  # Obvious credential/token assignments are replaced before text leaves Windows.
  $Text = Redact-LogLine $Text

  if (-not $script:RunnerSocket -or $script:RunnerSocket.State -ne [Net.WebSockets.WebSocketState]::Open) {
    Suspend-QQPrompt
    Write-Host "RELAY OFFLINE // Control Plane is not connected yet." -ForegroundColor DarkYellow
    Show-QQPrompt
    return
  }

  try { Add-Content -Path $LogPath -Value (((Get-Date).ToString("s")) + " [USER] " + $Text) -Encoding UTF8 } catch {}
  $questionId = [Guid]::NewGuid().ToString("n")
  $script:PendingQuestions[$questionId] = @{
    text = $Text
    created_at = (Get-Date).ToUniversalTime().ToString("o")
  }

  Send-Json $script:RunnerSocket @{
    type = "question"
    protocol = "clintware-quillgeist-lite-interactive/v1"
    question_id = $questionId
    runner_id = $env:COMPUTERNAME
    text = $Text
    cwd = $(try { (Get-Location).Path } catch { "" })
    shell = ("PowerShell " + $PSVersionTable.PSVersion.ToString())
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
  }

  Suspend-QQPrompt
  Write-Host "RELAY" -ForegroundColor White -NoNewline
  Write-Host (" // " + $questionId.Substring(0,8) + " -> Clintware") -ForegroundColor Cyan
  Show-QQPrompt
}

function Show-QQAnswer {
  param([object]$Message)

  $questionId = [string]$Message.question_id
  $answer = [string]$Message.answer

  Suspend-QQPrompt
  Write-Host ""
  Write-Host "QUILLGEIST" -ForegroundColor White -NoNewline
  Write-Host (" // " + $(if($questionId.Length -ge 8){$questionId.Substring(0,8)}else{$questionId})) -ForegroundColor Cyan
  Write-Host $answer -ForegroundColor White
  Write-Host ""
  try { Add-Content -Path $LogPath -Value (((Get-Date).ToString("s")) + " [ANSWER] " + (Redact-LogLine $answer)) -Encoding UTF8 } catch {}

  if ($questionId) {
    $script:PendingQuestions.Remove($questionId)
    try {
      Send-Json $script:RunnerSocket @{
        type = "answer_ack"
        question_id = $questionId
        runner_id = $env:COMPUTERNAME
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
      }
    } catch {}
  }

  Show-QQPrompt
}

function Invoke-QQLocalCommand {
  param([string]$Line)

  $line = ([string]$Line).Trim()
  if (-not $line) { Show-QQPrompt; return }

  if ($line.StartsWith("!")) {
    Invoke-QQLocalShell ($line.Substring(1).Trim())
    return
  }

  # A damaged paste such as 'gg! $p=...' must never be relayed as a natural
  # language question or mistaken for a successfully executed local command.
  if ($line -match '!(?=\\s*\\$)' -or $line -match '(?i)Invoke-WebRequest\\s+-Uri\\s+[''\"]https://raw\\.githubusercontent\\.com') {
    Suspend-QQPrompt
    Write-Host "LOCAL INPUT REJECTED // malformed PowerShell paste. Use Administrator PowerShell for recovery commands." -ForegroundColor DarkYellow
    Show-QQPrompt
    return
  }

  $lower = $line.ToLowerInvariant()

  if ($lower.StartsWith("ask ")) {
    Send-QQQuestion ($line.Substring(4).Trim())
    return
  }

  switch ($lower) {
    "help" { Show-QQHelp; return }
    "?" { Show-QQHelp; return }
    "status" { Show-QQStatus; return }
    "health" {
      $healthStatus = if ($script:RunnerSocket -and $script:RunnerSocket.State -eq [Net.WebSockets.WebSocketState]::Open) { "HEALTHY // CONTROL PLANE LINK ACTIVE" } else { "DEGRADED // RECONNECTING" }
      try { Show-QuillgeistSplash -Status $healthStatus } catch {}
      try { Queue-RunnerDiagnostic "INFO" "manual_health_check" "health" } catch {}
      Show-QQPrompt
      return
    }
    "tasks" {
      Suspend-QQPrompt
      $registry = Get-Registry
      Write-Host ""
      Write-Host "QQ REVIEWED TASKS" -ForegroundColor White
      foreach ($p in $registry.tasks.PSObject.Properties) {
        Write-Host ("  " + $p.Name) -ForegroundColor Cyan -NoNewline
        Write-Host ("  // " + [string]$p.Value.title) -ForegroundColor DarkGray
      }
      Write-Host ""
      Show-QQPrompt
      return
    }
    "jira" { Invoke-QQLocalTask "connect-jira"; return }
    "connect jira" { Invoke-QQLocalTask "connect-jira"; return }
    "connect-jira" { Invoke-QQLocalTask "connect-jira"; return }
    "doctor" { Invoke-QQLocalTask "clintware-doctor"; return }
    "update" { Invoke-QQLocalTask "self-update"; return }
    "update qq" { Invoke-QQLocalTask "self-update"; return }
    "admin" { Invoke-QQLocalTask "bootstrap-admin-console"; return }
    "admin qq" { Invoke-QQLocalTask "bootstrap-admin-console"; return }
    "heal" { Invoke-QQLocalTask "self-heal"; return }
    "self-heal" { Invoke-QQLocalTask "self-heal"; return }
    "web setup" { Invoke-QQLocalTask "browser-setup"; return }
    "browser setup" { Invoke-QQLocalTask "browser-setup"; return }
    "responder" { Invoke-QQLocalTask "responder-agent" @{Action="ui"}; return }
    "responder ui" { Invoke-QQLocalTask "responder-agent" @{Action="ui"}; return }
    "responder install" { Invoke-QQLocalTask "responder-agent" @{Action="install"}; return }
    "responder on" { Invoke-QQLocalTask "responder-agent" @{Action="on"}; return }
    "responder off" { Invoke-QQLocalTask "responder-agent" @{Action="off"}; return }
    "responder run" { Invoke-QQLocalTask "responder-agent" @{Action="run"}; return }
    "responder status" { Invoke-QQLocalTask "responder-agent" @{Action="status"}; return }
    "responder kill" { Invoke-QQLocalTask "responder-agent" @{Action="kill"}; return }
    "responder unkill" { Invoke-QQLocalTask "responder-agent" @{Action="unkill"}; return }
    "clear" {
      try { Clear-Host } catch {}
      Show-QuillgeistSplash
      Show-QQPrompt
      return
    }
    "reconnect" {
      Write-Log "Local reconnect requested." "WARN"
      try { if ($script:RunnerSocket) { $script:RunnerSocket.Abort() } } catch {}
      return
    }
  }

  if ($lower.StartsWith("code search ")) {
    Invoke-QQLocalTask "repo-code-search" @{Query=$line.Substring(12).Trim();Mode="text";Max="100";Json="false";FilesOnly="false"}
    return
  }

  if ($lower.StartsWith("web search ")) {
    Invoke-QQLocalTask "browser-work" @{Action="search";Query=$line.Substring(11).Trim();Engine="auto";MaxResults="8";Headless="true";AllowPrivate="false"}
    return
  }

  if ($lower.StartsWith("web read ")) {
    Invoke-QQLocalTask "browser-work" @{Action="read";Url=$line.Substring(9).Trim();MaxChars="20000";Headless="true";AllowPrivate="false"}
    return
  }

  if ($lower.StartsWith("web login ")) {
    Invoke-QQLocalTask "browser-work" @{Action="login";Url=$line.Substring(10).Trim();Headless="false";AllowPrivate="false"}
    return
  }

  if ($lower.StartsWith("web open ")) {
    Invoke-QQLocalTask "browser-work" @{Action="open";Url=$line.Substring(9).Trim();Headless="false"}
    return
  }

  if ($lower.StartsWith("web inspect ")) {
    Invoke-QQLocalTask "browser-work" @{Action="inspect";Url=$line.Substring(12).Trim();Headless="true"}
    return
  }

  if ($lower.StartsWith("web run ")) {
    Invoke-QQLocalTask "browser-work" @{Action="run";StepsJson=$line.Substring(8).Trim();Headless="true"}
    return
  }

  if ($lower.StartsWith("run ")) {
    $tokens = @(Get-QQLocalTokens $line.Substring(4).Trim())
    if ($tokens.Count -lt 1) {
      Suspend-QQPrompt
      Write-Host "Usage: run <task> [Name=Value ...]" -ForegroundColor DarkYellow
      Show-QQPrompt
      return
    }

    $taskId = [string]$tokens[0]
    $args = @{}
    foreach ($token in $tokens | Select-Object -Skip 1) {
      $idx = $token.IndexOf("=")
      if ($idx -le 0) {
        Suspend-QQPrompt
        Write-Host ("Invalid task argument '" + $token + "'. Use Name=Value.") -ForegroundColor Red
        Show-QQPrompt
        return
      }
      $args[$token.Substring(0,$idx)] = $token.Substring($idx+1)
    }

    Invoke-QQLocalTask $taskId $args
    return
  }

  try {
    $registry = Get-Registry
    if (Find-Task $registry $line) {
      Invoke-QQLocalTask $line
      return
    }
  } catch {}

  Send-QQQuestion $line
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
  $localSource = Join-Path $RuntimeRoot ($scriptPath -replace "/","\")
  if (-not (Test-Path $localSource)) {
    throw "Packaged task source is missing: $scriptPath"
  }
  $resolvedRuntime = (Resolve-Path $RuntimeRoot).Path.TrimEnd("\")
  $resolvedSource = (Resolve-Path $localSource).Path
  if (-not $resolvedSource.StartsWith($resolvedRuntime + "\",[StringComparison]::OrdinalIgnoreCase)) {
    throw "Task source escaped the packaged QQ runtime."
  }

  # These reviewed maintenance sources are served by the same Clintware
  # repository-backed runtime endpoint used by the launcher. Refresh them
  # before execution so a packaged older repair can recover without another
  # local PowerShell paste or a new device enrollment.
  $freshSources = @{
    "repair-local-service" = @{ Relative = "tasks/repair-local-service.ps1"; Required = "SERVICE_DEFERRED" }
    "self-update" = @{ Relative = "tasks/self-update.ps1"; Required = "SYNC // reconciling QQ" }
    "local-ai" = @{ Relative = "tools/local_ai.py"; Required = "def gguf_files" }
    "bitnet-setup" = @{ Relative = "tasks/bitnet-setup.ps1"; Required = "Running temporary BitNet HTTP server round trip" }
    "local-ai-integrate" = @{ Relative = "tasks/integrate-local-ai.ps1"; Required = "Running n8n-path generation through BitNet" }
  }
  $fresh = $freshSources[[string]$Job.task_id]
  if ($fresh) {
    $uri = "https://mcp.clintware.com/api/v1/quillgeist-lite/runtime/" + $fresh.Relative
    $tempSource = $localSource + ".new"
    try {
      Invoke-WebRequest -Uri $uri -OutFile $tempSource -UseBasicParsing -TimeoutSec 25 -ErrorAction Stop
      $body = Get-Content -LiteralPath $tempSource -Raw
      if ($body.Length -lt 500 -or -not $body.Contains($fresh.Required)) { throw "Reviewed task source failed structural validation." }
      if ($runtime -eq "powershell") {
        $tokens = $null; $parseErrors = $null
        [Management.Automation.Language.Parser]::ParseFile($tempSource,[ref]$tokens,[ref]$parseErrors) | Out-Null
        if ($parseErrors.Count -gt 0) { throw "Reviewed task source failed PowerShell parse validation." }
      }
      Move-Item -LiteralPath $tempSource -Destination $localSource -Force
      Write-Log ("Refreshed reviewed task source: " + [string]$Job.task_id) "OK"
    } catch {
      Remove-Item -LiteralPath $tempSource -Force -ErrorAction SilentlyContinue
      throw ("Could not refresh reviewed " + [string]$Job.task_id + " source from Clintware: " + $_.Exception.Message)
    }
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
$pendingResults = Get-PendingResults

try {
  if ($env:QQ_HEADLESS -ne "1") { Show-QuillgeistSplash -Status "CONNECTING" }
} catch {
  Write-Log ("Splash error: " + $_.Exception.Message) "ERROR"
}

Write-Log "Clintware Quillgeist Lite starting."
Write-Log ("Runtime host: PowerShell " + $PSVersionTable.PSVersion.ToString() + " / " + $PSVersionTable.PSEdition + ".")
Write-Log "Runtimes enabled: PowerShell, Python, C."
Write-Log "Interactive relay mode: local questions route through the Clintware Control Plane."

try {
  while ($true) {
    $ws = $null

    try {
      $credential = Get-QQDeviceCredential
      $ws = New-Object System.Net.WebSockets.ClientWebSocket
      $ws.Options.SetRequestHeader("Authorization","Bearer " + $credential.Token)
      $ws.Options.SetRequestHeader("X-Quillgeist-Runner-Id",$env:COMPUTERNAME)
      $ws.Options.SetRequestHeader("X-Quillgeist-Device",$credential.DeviceId)
      $connectUri = $Endpoint + $(if($Endpoint.Contains("?")){"&"}else{"?"}) + "device_id=" + [Uri]::EscapeDataString($credential.DeviceId)

      $null = $ws.ConnectAsync(
        [Uri]$connectUri,
        [Threading.CancellationToken]::None
      ).GetAwaiter().GetResult()

      $script:RunnerSocket = $ws

      Send-Json $ws @{
        type = "hello"
        runner_id = $env:COMPUTERNAME
        version = "1.8.0"
        runtimes = @("powershell","python","c")
        capabilities = @("interactive_relay","question_poll","allowlisted_tasks","local_shell_escape","web_search","web_read","browser_automation","manual_browser_login","responder_agent")
      }

      Flush-RunnerDiagnostics

      if ($pendingResults.Count -gt 0) {
        foreach ($pendingJobId in @($pendingResults.Keys)) {
          try {
            Send-Json $ws $pendingResults[$pendingJobId]
            [void]$pendingResults.Remove($pendingJobId)
            Save-PendingResults $pendingResults
            Write-Log ("Replayed saved result for job " + $pendingJobId) "OK"
          } catch {
            break
          }
        }
      }

      try { Show-QuillgeistSplash -Status "CONTROL PLANE LINK ACTIVE" } catch {}
      Write-RunnerHeartbeat -State "connected" -Force
      Write-Log "Connected to Clintware Control Plane." "OK"

      Write-Log "Interactive relay channel initialized." "OK"

      Write-Host ""
      Write-Host "  " -NoNewline
      Write-Host "READY" -ForegroundColor White -NoNewline
      Write-Host " // CONTROL PLANE LINK ACTIVE" -ForegroundColor Cyan
      Write-Host ""
      Write-Host "  Interactive local console enabled. Type " -ForegroundColor DarkGray -NoNewline
      Write-Host "help" -ForegroundColor Cyan -NoNewline
      Write-Host " or use " -ForegroundColor DarkGray -NoNewline
      Write-Host "! <PowerShell>" -ForegroundColor DarkYellow -NoNewline
      Write-Host " for a local-only shell command." -ForegroundColor DarkGray
      Write-Host ""
      Show-QQPrompt

      while ($ws.State -eq [Net.WebSockets.WebSocketState]::Open) {
        Write-RunnerHeartbeat -State "connected"
        $localInput = Read-QQConsoleLine
        if ($localInput.Ready) {
          Invoke-QQLocalCommand ([string]$localInput.Line)
        }

        foreach ($uiLine in @(Read-QQUiInput)) {
          Invoke-QQLocalCommand ([string]$uiLine)
        }

        if (((Get-Date) - $script:LastQuestionPoll).TotalSeconds -ge 5) {
          try {
            Send-Json $ws @{
              type = "question_poll"
              runner_id = $env:COMPUTERNAME
              timestamp = (Get-Date).ToUniversalTime().ToString("o")
            }
            $script:LastQuestionPoll = Get-Date
          } catch {}
        }

        $incoming = Poll-ReceiveJson $ws
        if ($incoming.State -eq "pending") {
          Start-Sleep -Milliseconds 35
          continue
        }
        if ($incoming.State -eq "closed") { break }
        $msg = $incoming.Message
        if ($null -eq $msg) {
          Start-Sleep -Milliseconds 35
          continue
        }

        if ($msg.type -eq "ping") {
          Send-Json $ws @{
            type = "pong"
            time = (Get-Date).ToUniversalTime().ToString("o")
          }
          continue
        }

        if ($msg.type -eq "question_ack") {
          Suspend-QQPrompt
          $qid = [string]$msg.question_id
          Write-Host "RELAY QUEUED" -ForegroundColor DarkCyan -NoNewline
          Write-Host (" // " + $(if($qid.Length -ge 8){$qid.Substring(0,8)}else{$qid})) -ForegroundColor DarkGray
          Show-QQPrompt
          continue
        }

        if ($msg.type -eq "answer") {
          Show-QQAnswer $msg
          continue
        }

        if ($msg.type -eq "question_status") {
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

        Write-RunnerHeartbeat -State "busy" -JobId $jobId -TaskId ([string]$job.task_id) -Force
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
        $pendingResults[$jobId] = $result
        Save-PendingResults $pendingResults
        Send-Json $ws $result
        [void]$pendingResults.Remove($jobId)
        Save-PendingResults $pendingResults
        Write-RunnerHeartbeat -State "connected" -Force

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
      Write-RunnerHeartbeat -State "disconnected" -Force
      $script:RunnerSocket = $null
      Reset-QQReceiveState
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
