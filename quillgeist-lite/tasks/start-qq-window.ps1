param(
  [string]$LauncherPath = (Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite\launcher.ps1"),
  [string]$HomeDir = (Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite")
)

$ErrorActionPreference = "Stop"
$PidPath = Join-Path $HomeDir "runner.pid"
$HeartbeatPath = Join-Path $HomeDir "runner-heartbeat.json"
$MutexName = "Local\Clintware.QuillgeistLite.WindowHost"
$mutex = New-Object Threading.Mutex($false,$MutexName)
$acquired = $false

function Get-QQLauncherProcesses {
  $escapedHome=[Regex]::Escape($HomeDir)
  $escapedLauncher=[Regex]::Escape($LauncherPath)
  @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessId -ne $PID -and
    $_.Name -match '^(pwsh|powershell)\.exe$' -and
    $_.CommandLine -and
    ($_.CommandLine -match $escapedLauncher -or ($_.CommandLine -match $escapedHome -and $_.CommandLine -match 'launcher\.ps1'))
  } | Sort-Object CreationDate)
}

function Test-RunnerAlive {
  try {
    if(-not(Test-Path $PidPath)){return $false}
    $raw=(Get-Content $PidPath -Raw).Trim()
    $runnerPid=0
    if(-not [int]::TryParse($raw,[ref]$runnerPid) -or $runnerPid -le 0){return $false}
    return -not (Get-Process -Id $runnerPid -ErrorAction Stop).HasExited
  } catch { return $false }
}

function Repair-RunnerPidFromExistingProcess {
  $existing=@(Get-QQLauncherProcesses)
  if($existing.Count -eq 0){return $false}
  $keepPid=0
  try {
    if(Test-Path $HeartbeatPath){
      $heartbeat=Get-Content $HeartbeatPath -Raw | ConvertFrom-Json
      $candidate=[int]$heartbeat.pid
      $stamp=[DateTime]::Parse([string]$heartbeat.timestamp).ToUniversalTime()
      if(((Get-Date).ToUniversalTime()-$stamp).TotalSeconds -le 180 -and ($existing.ProcessId -contains $candidate)){$keepPid=$candidate}
    }
  } catch {}
  if($keepPid -le 0){$keepPid=[int]$existing[0].ProcessId}
  [IO.File]::WriteAllText($PidPath,[string]$keepPid,(New-Object Text.UTF8Encoding($false)))
  return $true
}

function Stop-StaleMcpMonitor {
  $escapedHome=[Regex]::Escape($HomeDir)
  @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessId -ne $PID -and
    $_.Name -match '^(pwsh|powershell)\.exe$' -and
    $_.CommandLine -and
    $_.CommandLine -match $escapedHome -and
    $_.CommandLine -match 'mcp-console\.ps1'
  }) | ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {}
  }
}

function Quote-Native([string]$Value) {
  if($null -eq $Value){return '""'}
  return '"' + ($Value -replace '"','\"') + '"'
}

try {
  try { $acquired=$mutex.WaitOne(0) }
  catch [Threading.AbandonedMutexException] { $acquired=$true }
  if(-not $acquired){exit 0}

  if(Test-RunnerAlive){exit 0}
  if(Repair-RunnerPidFromExistingProcess){exit 0}
  if(-not(Test-Path $LauncherPath)){throw "qq launcher is missing: $LauncherPath"}

  $McpConsolePath=Join-Path $HomeDir "mcp-console.ps1"
  if(-not(Test-Path $McpConsolePath)){
    $runtimeCopy=Join-Path $HomeDir "runtime\quillgeist-lite\tasks\mcp-console.ps1"
    if(Test-Path $runtimeCopy){Copy-Item -LiteralPath $runtimeCopy -Destination $McpConsolePath -Force}
  }

  $pwsh=Get-Command pwsh.exe -ErrorAction SilentlyContinue
  $exe=$null
  if($pwsh){$exe=[string]$pwsh.Source}
  if(-not $exe){
    $candidate=Join-Path $env:ProgramFiles "PowerShell\7\pwsh.exe"
    if(Test-Path $candidate){$exe=$candidate}
  }
  if(-not $exe){
    $candidate="$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    if(Test-Path $candidate){$exe=$candidate}
  }
  if(-not $exe -or -not(Test-Path $exe)){throw "No usable PowerShell executable was found."}

  $wt=Get-Command wt.exe -ErrorAction SilentlyContinue
  if($wt -and (Test-Path $McpConsolePath)){
    Stop-StaleMcpMonitor
    Start-Sleep -Milliseconds 200

    # Start-Process joins string-array arguments and loses important quoting.
    # Build one explicitly quoted Windows Terminal command line instead.
    $commandLine = @(
      '-w qq',
      '-F',
      'new-tab',
      '--title ' + (Quote-Native 'Clintware MCP // ADMIN'),
      '--',
      (Quote-Native $exe),
      '-NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File ' + (Quote-Native $McpConsolePath),
      ';',
      'split-pane -H --size 0.50',
      '--title ' + (Quote-Native 'Quillgeist Lite'),
      '--',
      (Quote-Native $exe),
      '-NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File ' + (Quote-Native $LauncherPath) + ' -TerminalHost'
    ) -join ' '

    $psi=New-Object Diagnostics.ProcessStartInfo
    $psi.FileName=[string]$wt.Source
    $psi.Arguments=$commandLine
    $psi.WorkingDirectory=$HomeDir
    $psi.UseShellExecute=$true
    [void][Diagnostics.Process]::Start($psi)

    $deadline=(Get-Date).AddSeconds(12)
    do {
      Start-Sleep -Milliseconds 150
      if(Test-RunnerAlive){break}
      [void](Repair-RunnerPidFromExistingProcess)
      if(Test-RunnerAlive){break}
    } while((Get-Date)-lt $deadline)
    exit 0
  }

  $args=@("-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File",$LauncherPath,"-TerminalHost")
  $child=Start-Process -FilePath $exe -ArgumentList $args -WorkingDirectory $HomeDir -PassThru
  [IO.File]::WriteAllText($PidPath,[string]$child.Id,(New-Object Text.UTF8Encoding($false)))
}
finally {
  if($acquired){try{$mutex.ReleaseMutex()}catch{}}
  try{$mutex.Dispose()}catch{}
}

exit 0
