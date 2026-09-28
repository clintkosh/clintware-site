param(
    [string]$HomeDir = (Join-Path $env:LOCALAPPDATA 'Clintware\QuillgeistLite'),
    [string]$Revision = ''
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$qqDir = [IO.Path]::GetFullPath($HomeDir)
$runtime = Join-Path $qqDir 'runtime'
$registry = Join-Path $qqDir 'tasks.json'
$work = Join-Path $env:TEMP ('qq-runtime-restore-' + [guid]::NewGuid().ToString('n'))
$stage = Join-Path $qqDir ('runtime.new-' + [guid]::NewGuid().ToString('n'))
$backup = Join-Path $qqDir ('runtime.backup-' + [guid]::NewGuid().ToString('n'))
$movedOld = $false
$movedNew = $false
$syncLock = $null

function Test-RuntimeBundle {
    param([string]$Root)
    $taskMap = Get-Content -LiteralPath (Join-Path $Root 'quillgeist-lite\tasks.json') -Raw | ConvertFrom-Json
    if (-not $taskMap.tasks) { throw 'QQ task registry is invalid.' }
    foreach ($task in $taskMap.tasks.PSObject.Properties) {
        $relative = [string]$task.Value.script
        if ($relative -notmatch '^(quillgeist-lite|identity-broker)/[A-Za-z0-9_./-]+$' -or $relative.Contains('..')) { throw 'Invalid QQ task source path.' }
        if (-not (Test-Path -LiteralPath (Join-Path $Root $relative) -PathType Leaf)) { throw "Missing task source: $($task.Name)" }
    }
    foreach ($relative in @('runner.ps1','launcher.ps1','tasks/auto-repair-runtime.ps1','service/QuillgeistLiteHealthService.cs','service/recovery-watch.ps1')) {
        if (-not (Test-Path -LiteralPath (Join-Path $Root ('quillgeist-lite/' + $relative)) -PathType Leaf)) { throw "Missing runtime source: $relative" }
    }
}

try {
    New-Item -ItemType Directory -Path $qqDir -Force | Out-Null
    $deadline = (Get-Date).AddMinutes(5)
    while (-not $syncLock) {
        try { $syncLock = [IO.File]::Open((Join-Path $qqDir 'runtime-sync.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None) }
        catch [IO.IOException] {
            if ((Get-Date) -ge $deadline) { throw 'QQ runtime sync is already in progress.' }
            Start-Sleep -Seconds 1
        }
    }
    if (-not $Revision) {
        try {
            $release = Invoke-RestMethod -Uri 'https://mcp.clintware.com/api/v1/quillgeist-lite/runtime-version' -TimeoutSec 15
            $Revision = [string]$release.source_revision
        } catch {
            Test-RuntimeBundle $runtime
            Write-Output 'QQ RUNTIME OFFLINE // complete local bundle retained'
            return
        }
    }
    if ($Revision -notmatch '^[a-f0-9]{40}$') { throw 'Control plane did not supply a pinned QQ source revision.' }
    $revisionPath = Join-Path $runtime 'source-revision.txt'
    if ((Test-Path $revisionPath) -and (Get-Content $revisionPath -Raw).Trim() -eq $Revision) {
        try {
            Test-RuntimeBundle $runtime
            $registryTemp = $registry + '.new'
            Copy-Item -LiteralPath (Join-Path $runtime 'quillgeist-lite\tasks.json') -Destination $registryTemp -Force
            Move-Item -LiteralPath $registryTemp -Destination $registry -Force
            Write-Output 'QQ RUNTIME CACHE // complete reviewed bundle already installed'
            return
        } catch {}
    }
    New-Item -ItemType Directory -Path $work,$stage -Force | Out-Null
    $runtimeBase = 'https://mcp.clintware.com/api/v1/quillgeist-lite/runtime'

    function Get-ReviewedRuntimeFile {
        param(
            [Parameter(Mandatory=$true)][string]$RemotePath,
            [Parameter(Mandatory=$true)][string]$Destination
        )
        $parent = Split-Path -Parent $Destination
        if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        $temp = $Destination + '.new'
        Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
        try {
            $uri = $runtimeBase.TrimEnd('/') + '/' + ($RemotePath -replace '\\','/')
            Invoke-WebRequest -Uri $uri -OutFile $temp -UseBasicParsing -TimeoutSec 60 -Headers @{'Cache-Control'='no-cache'}
            if (-not (Test-Path -LiteralPath $temp -PathType Leaf) -or (Get-Item -LiteralPath $temp).Length -lt 1) {
                throw "Reviewed QQ runtime asset is empty: $RemotePath"
            }
            Move-Item -LiteralPath $temp -Destination $Destination -Force
        } finally {
            Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
        }
    }

    $qqRoot = Join-Path $stage 'quillgeist-lite'
    $registryStage = Join-Path $qqRoot 'tasks.json'
    Get-ReviewedRuntimeFile -RemotePath 'tasks.json' -Destination $registryStage
    $taskMap = Get-Content -LiteralPath $registryStage -Raw | ConvertFrom-Json
    if (-not $taskMap.tasks) { throw 'The Control Plane runtime has no qq task registry.' }

    $core = @(
        'runner.ps1',
        'launcher.ps1',
        'bootstrap.ps1',
        'install.ps1',
        'launch-visible.ps1',
        'uninstall.ps1',
        'bootstrapper/bootstrap.ps1',
        'service/QuillgeistLiteHealthService.cs',
        'service/install-service.ps1',
        'service/recovery-watch.ps1',
        'tools/restore-runtime.ps1',
        'tools/terminal_repair.py',
        'tools/boot_splash.py',
        'tools/browser_agent.py',
        'tools/local_ai.py',
        'tools/provider_responder.py',
        'tasks/start-qq-window.ps1',
        'tasks/mcp-console.ps1',
        'tasks/dedupe-qq-windows.ps1',
        'tasks/ensure-browser-runtime.ps1',
        'tasks/browser-work.ps1',
        'tasks/ensure-powershell.ps1',
        'tasks/auto-repair-runtime.ps1',
        'tasks/repair-local-service.ps1',
        'assets/clintware-terminal-logo.b64'
    )
    foreach ($relative in $core | Select-Object -Unique) {
        Get-ReviewedRuntimeFile -RemotePath $relative -Destination (Join-Path $qqRoot ($relative -replace '/','\'))
    }

    foreach ($task in $taskMap.tasks.PSObject.Properties) {
        $repoRelative = [string]$task.Value.script
        if ($repoRelative -notmatch '^(quillgeist-lite|identity-broker)/[A-Za-z0-9_./-]+$' -or $repoRelative.Contains('..')) {
            throw "Invalid task source path: $($task.Name)"
        }
        $destination = Join-Path $stage ($repoRelative -replace '/','\')
        if (-not (Test-Path -LiteralPath $destination -PathType Leaf)) {
            Get-ReviewedRuntimeFile -RemotePath $repoRelative -Destination $destination
        }
    }

    foreach ($repoRelative in @(
        'agentbridge-node/agentbridge_node/__init__.py',
        'agentbridge-node/agentbridge_node/local_gateway.py',
        'agentbridge-node/agentbridge_node/local_inference.py'
    )) {
        Get-ReviewedRuntimeFile -RemotePath $repoRelative -Destination (Join-Path $stage ($repoRelative -replace '/','\'))
    }

    Test-RuntimeBundle $stage
    [IO.File]::WriteAllText((Join-Path $stage 'source-revision.txt'),$Revision)

    $stagedRegistry = Join-Path $stage 'quillgeist-lite\tasks.json'
    $taskMap = Get-Content -LiteralPath $stagedRegistry -Raw | ConvertFrom-Json
    if (-not $taskMap.tasks -or @($taskMap.tasks.PSObject.Properties).Count -lt 20) {
        throw 'The restored qq task registry is incomplete.'
    }
    $stageRoot = [IO.Path]::GetFullPath($stage + [IO.Path]::DirectorySeparatorChar)
    foreach ($task in $taskMap.tasks.PSObject.Properties) {
        $relative = [string]$task.Value.script
        if ($relative -notmatch '^(quillgeist-lite|identity-broker)/[A-Za-z0-9_./-]+$' -or $relative.Contains('..')) {
            throw "Invalid task path in registry: $($task.Name)"
        }
        $file = [IO.Path]::GetFullPath((Join-Path $stage ($relative -replace '/', '\')))
        if (-not $file.StartsWith($stageRoot,[StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $file -PathType Leaf)) {
            throw "Missing task source: $($task.Name)"
        }
        if ($file.EndsWith('.ps1',[StringComparison]::OrdinalIgnoreCase)) {
            $tokens = $null; $errors = $null
            [Management.Automation.Language.Parser]::ParseFile($file,[ref]$tokens,[ref]$errors) | Out-Null
            if ($errors.Count) { throw "Invalid PowerShell task source: $($task.Name)" }
        }
    }

    foreach ($target in @($runtime,$backup,$stage)) {
        if (-not [IO.Path]::GetFullPath($target).StartsWith($qqDir.TrimEnd('\') + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'QQ runtime path escaped its workspace.' }
    }
    if (Test-Path $runtime) {
        Move-Item -LiteralPath $runtime -Destination $backup
        $movedOld = $true
    }
    Move-Item -LiteralPath $stage -Destination $runtime
    $movedNew = $true
    $registryTemp = $registry + '.new'
    Copy-Item -LiteralPath (Join-Path $runtime 'quillgeist-lite\tasks.json') -Destination $registryTemp -Force
    Move-Item -LiteralPath $registryTemp -Destination $registry -Force
    Write-Output ("QQ RUNTIME RESTORED VIA CONTROL PLANE // $(@($taskMap.tasks.PSObject.Properties).Count) reviewed tasks")
    Write-Output 'QQ DEVICE CONNECTION PRESERVED // retry a fresh job'
} catch {
    if ($movedNew) { Move-Item -LiteralPath $runtime -Destination ($stage + '.failed') }
    if ($movedOld -and (Test-Path $backup)) { Move-Item -LiteralPath $backup -Destination $runtime }
    throw
} finally {
    if ($syncLock) { $syncLock.Dispose() }
    foreach ($temporary in @($work,$stage)) {
        $resolved = [IO.Path]::GetFullPath($temporary)
        $allowedParent = if ($temporary -eq $work) { [IO.Path]::GetFullPath($env:TEMP) } else { $qqDir }
        if (-not $resolved.StartsWith($allowedParent.TrimEnd('\') + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'QQ cleanup path escaped its workspace.' }
        if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction SilentlyContinue }
    }
}
