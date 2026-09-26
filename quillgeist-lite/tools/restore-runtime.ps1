param()

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$revision = 'eef4e6bf7d3295dc29acc69a1fe5bab2ab9e09d4'
$qqDir = Join-Path $env:LOCALAPPDATA 'Clintware\QuillgeistLite'
$runtime = Join-Path $qqDir 'runtime'
$registry = Join-Path $qqDir 'tasks.json'
$work = Join-Path $env:TEMP ('qq-runtime-restore-' + [guid]::NewGuid().ToString('n'))
$stage = Join-Path $qqDir ('runtime.new-' + [guid]::NewGuid().ToString('n'))
$backup = Join-Path $qqDir ('runtime.backup-' + [guid]::NewGuid().ToString('n'))
$movedOld = $false
$movedNew = $false

try {
    New-Item -ItemType Directory -Path $qqDir,$work,$stage -Force | Out-Null
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

    # A previous unbounded model inventory may still be running. Stop only that
    # qq-owned status probe after the replacement bundle has passed validation.
    Get-CimInstance Win32_Process | Where-Object {
        $_.Name -match '^python(?:\.exe)?$' -and
        $_.CommandLine -match 'Clintware\\QuillgeistLite\\runtime' -and
        $_.CommandLine -match 'local_ai\.py' -and
        $_.CommandLine -match '(?i)--Action\s+status'
    } | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Output 'QQ STALLED INVENTORY STOPPED'
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
    foreach ($name in @('runner.ps1','launcher.ps1')) {
        $target = Join-Path $qqDir $name
        $temp = $target + '.new'
        Copy-Item -LiteralPath (Join-Path $runtime ('quillgeist-lite\' + $name)) -Destination $temp -Force
        Move-Item -LiteralPath $temp -Destination $target -Force
    }
    Write-Output ("QQ RUNTIME RESTORED // $(@($taskMap.tasks.PSObject.Properties).Count) reviewed tasks")
    Write-Output 'QQ DEVICE CONNECTION PRESERVED // retry a fresh job'
} catch {
    if ($movedNew) { Remove-Item -LiteralPath $runtime -Recurse -Force -ErrorAction SilentlyContinue }
    if ($movedOld -and (Test-Path $backup)) { Move-Item -LiteralPath $backup -Destination $runtime }
    throw
} finally {
    Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue }
}
