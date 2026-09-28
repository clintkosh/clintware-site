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
    $zip = Join-Path $work 'source.zip'
    $url = 'https://codeload.github.com/clintkosh/clintware-site/zip/' + $revision
    Invoke-WebRequest -Uri $url -OutFile $zip -TimeoutSec 120
    Expand-Archive -LiteralPath $zip -DestinationPath $work -Force

    $source = Join-Path $work ('clintware-site-' + $revision)
    $qqSource = Join-Path $source 'quillgeist-lite'
    $identitySource = Join-Path $source 'identity-broker'
    if (-not (Test-Path (Join-Path $qqSource 'tasks.json'))) {
        throw 'The pinned source archive has no qq task registry.'
    }
    Copy-Item -LiteralPath $qqSource -Destination (Join-Path $stage 'quillgeist-lite') -Recurse
    if (Test-Path $identitySource) {
        Copy-Item -LiteralPath $identitySource -Destination (Join-Path $stage 'identity-broker') -Recurse
    }
    Copy-Item -LiteralPath (Join-Path $source 'agentbridge-node') -Destination (Join-Path $stage 'agentbridge-node') -Recurse
    Test-RuntimeBundle $stage
    [IO.File]::WriteAllText((Join-Path $stage 'source-revision.txt'),$Revision)

    $stagedRegistry = Join-Path $stage 'quillgeist-lite\tasks.json'
    $taskMap = Get-Content -LiteralPath $stagedRegistry -Raw | ConvertFrom-Json
    if (-not $taskMap.tasks -or @($taskMap.tasks.PSObject.Properties).Count -lt 20) {
        throw 'The downloaded qq task registry is incomplete.'
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
    Write-Output ("QQ RUNTIME RESTORED // $(@($taskMap.tasks.PSObject.Properties).Count) reviewed tasks")
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
