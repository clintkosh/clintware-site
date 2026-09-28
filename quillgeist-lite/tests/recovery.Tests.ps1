$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
function Import-Function {
    param([string]$Path,[string]$Name)
    $tokens=$null
    $errors=$null
    $ast=[Management.Automation.Language.Parser]::ParseFile($Path,[ref]$tokens,[ref]$errors)
    $functionAst=$ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $Name},$true)
    if (-not $functionAst) { throw "Missing function: $Name" }
    Set-Item -Path ('Function:script:' + $Name) -Value ([scriptblock]::Create($functionAst.Body.Extent.Text.TrimStart('{').TrimEnd('}')))
}
function Assert-Throws {
    param([scriptblock]$Action,[string]$Expected)
    try { & $Action } catch { if ($_.Exception.Message -like ('*'+$Expected+'*')) { return }; throw }
    throw "Expected failure: $Expected"
}
Import-Function (Join-Path $root 'runner.ps1') 'Test-QQCredentialAgainstControlPlane'
Import-Function (Join-Path $root 'runner.ps1') 'Get-QQDeviceCredential'
Import-Function (Join-Path $root 'runner.ps1') 'Get-Registry'
Import-Function (Join-Path $root 'tools/restore-runtime.ps1') 'Test-RuntimeBundle'
Import-Function (Join-Path $root 'service/recovery-watch.ps1') 'Get-RunnerHeartbeatHealth'
function Invoke-RestMethod { throw [Net.WebException]::new('temporary network failure') }
$credential=[pscustomobject]@{Endpoint='https://example.com';DeviceId='TEST';Token='test-only'}
Assert-Throws {Test-QQCredentialAgainstControlPlane $credential} 'retaining existing credentials'
function Invoke-RestMethod { return @{ok=$true} }
if (-not (Test-QQCredentialAgainstControlPlane $credential)) { throw 'Valid credential rejected' }
function Read-QQCredentialConfig { return $null }
function Request-QQSelfEnrollment { throw 'Browser enrollment must never be invoked' }
Assert-Throws {Get-QQDeviceCredential} 'background enrollment is disabled'

$fixture=Join-Path ([IO.Path]::GetTempPath()) ('qq-recovery-test-'+[guid]::NewGuid().ToString('n'))
try {
    $RuntimeRoot=Join-Path $fixture 'runtime'
    $RegistryPath=Join-Path $fixture 'tasks.json'
    $bundle=Join-Path $RuntimeRoot 'quillgeist-lite'
    New-Item -ItemType Directory -Path (Join-Path $bundle 'tasks'),(Join-Path $bundle 'service') -Force | Out-Null
    foreach($relative in @('runner.ps1','launcher.ps1','tasks/auto-repair-runtime.ps1','service/QuillgeistLiteHealthService.cs','service/recovery-watch.ps1')) {
        Set-Content -LiteralPath (Join-Path $bundle $relative) -Value 'fixture'
    }
    $registry=@{version=1;tasks=@{doctor=@{script='quillgeist-lite/tasks/doctor.ps1'}}}|ConvertTo-Json -Depth 5
    Set-Content -LiteralPath $RegistryPath -Value $registry
    Set-Content -LiteralPath (Join-Path $bundle 'tasks.json') -Value $registry
    Assert-Throws {Test-RuntimeBundle $RuntimeRoot} 'Missing task source'
    Assert-Throws {Get-Registry} 'restore the reviewed bundle before connecting'
    Set-Content -LiteralPath (Join-Path $bundle 'tasks/doctor.ps1') -Value 'fixture'
    Test-RuntimeBundle $RuntimeRoot
    if ((Get-Registry).version -ne 1) { throw 'Complete registry rejected' }
    $RunnerHeartbeatStaleSeconds=90
    $RunnerHeartbeatStartupGraceSeconds=180
    $RunnerBusyMaxMinutes=45
    $pidPath=Join-Path $fixture 'runner.pid'
    Set-Content -LiteralPath $pidPath -Value $PID
    @{state='starting';timestamp=(Get-Date).ToUniversalTime().AddSeconds(-150).ToString('o')}|ConvertTo-Json|Set-Content (Join-Path $fixture 'runner-heartbeat.json')
    if (-not (Get-RunnerHeartbeatHealth $pidPath).Healthy) { throw 'Asset sync incorrectly triggers recovery' }
    @{state='starting';timestamp=(Get-Date).ToUniversalTime().AddSeconds(-601).ToString('o')}|ConvertTo-Json|Set-Content (Join-Path $fixture 'runner-heartbeat.json')
    $stalled=Get-RunnerHeartbeatHealth $pidPath
    if ($stalled.Healthy) { throw ('Stalled startup incorrectly accepted: '+($stalled|ConvertTo-Json -Compress)) }
    Write-Output 'PASS: credential outages, no background enrollment, missing task gating, complete bundle, bounded startup grace'
} finally {
    $resolved=[IO.Path]::GetFullPath($fixture)
    if (-not $resolved.StartsWith([IO.Path]::GetFullPath([IO.Path]::GetTempPath()),[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe fixture path' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}

& (Join-Path $PSScriptRoot 'launcher-ownership.Tests.ps1')

