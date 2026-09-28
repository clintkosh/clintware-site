$ErrorActionPreference = 'Stop'
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('qq-owner-' + [guid]::NewGuid().ToString('n'))
New-Item -ItemType Directory $fixture | Out-Null
$owner = $null
try {
  $HomeDir = $fixture
  $PidPath = Join-Path $fixture 'runner.pid'
  $CrashLog = Join-Path $fixture 'crash.log'
  $RunnerPath = Join-Path $fixture 'runner.ps1'
  Set-Content $RunnerPath 'Write-Output "fixture runner"'
  function Set-ClintwareBaseTheme {}
  function Ensure-QuillgeistHealthService {}
  function Initialize-QQRuntimeVersion { return $false }
  function Ensure-ModernPowerShell {}
  function Sync-LatestQQFunctionality {}
  function Show-WindowLoadSplash {}
  function Update-LocalRunner { return $false }
  $source = Get-Content (Join-Path $PSScriptRoot '../launcher.ps1') -Raw
  $block = [scriptblock]::Create($source.Substring($source.IndexOf('# Claim the same OS-owned mutex')))
  $ready = Join-Path $fixture 'ready'
  $owner = Start-Job -ArgumentList $ready -ScriptBlock {
    param($Ready)
    $m = New-Object Threading.Mutex($false,'Local\ClintwareQuillgeistLiteV3')
    try {
      if (-not $m.WaitOne(0,$false)) { throw 'Test mutex occupied' }
      Set-Content $Ready 'ready'
      Start-Sleep -Seconds 25
    } finally { try {$m.ReleaseMutex()}catch{}; $m.Dispose() }
  }
  for ($i=0;$i -lt 100 -and -not (Test-Path $ready);$i++) { Start-Sleep -Milliseconds 100 }
  if (-not (Test-Path $ready)) { throw 'Fixture owner did not start' }
  Set-Content $PidPath '424242'
  & $block
  if ((Get-Content $PidPath -Raw).Trim() -ne '424242') { throw 'Duplicate damaged active owner PID' }
  if (Test-Path (Join-Path $fixture 'runner-heartbeat.json')) { throw 'Duplicate wrote heartbeat' }
  Stop-Job $owner
  Remove-Job $owner
  $owner = $null
  & $block
  if (Test-Path $PidPath) { throw 'Owner failed to clean its own PID' }
  Set-Content $RunnerPath 'Set-Content -LiteralPath $PidPath -Value "999999"'
  & $block
  if ((Get-Content $PidPath -Raw).Trim() -ne '999999') { throw 'Cleanup removed another owner PID' }
  Write-Output 'PASS: duplicate ownership, heartbeat isolation, owned cleanup, replacement preservation'
} finally {
  if ($owner) { Stop-Job $owner; Remove-Job $owner }
  Remove-Item -LiteralPath $fixture -Recurse -Force
}
