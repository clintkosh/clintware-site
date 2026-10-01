[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$JobPath,
    [Parameter(Mandatory=$true)][string]$ResultPath,
    [Parameter(Mandatory=$true)][string]$LogPath,
    [Parameter(Mandatory=$true)][string]$RegistryPath,
    [Parameter(Mandatory=$true)][string]$RuntimeRoot,
    [int]$WorkerSlot = 0,
    [int]$GpuIndex = -1
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Resolve-WorkerPython {
    $marker = Join-Path $env:LOCALAPPDATA 'Clintware\QuillgeistLite\python3-check.json'
    if (Test-Path -LiteralPath $marker -PathType Leaf) {
        try {
            $state = Get-Content -LiteralPath $marker -Raw | ConvertFrom-Json
            $candidate = [string]$state.path
            if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $candidate }
        } catch {}
    }
    $mini = Join-Path $env:USERPROFILE 'Miniconda3\python.exe'
    if (Test-Path -LiteralPath $mini -PathType Leaf) { return $mini }
    foreach ($name in @('python.exe','py.exe','python3.exe')) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd -and $cmd.Source -and $cmd.Source -notmatch '(?i)\\WindowsApps\\') { return [string]$cmd.Source }
    }
    throw 'A working Python 3 runtime was not found.'
}

function Resolve-WorkerCompiler {
    foreach ($candidate in @('clang','gcc','cl')) {
        $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($cmd) { return @{ Name=$candidate; Path=$cmd.Source } }
    }
    throw 'C compiler not found.'
}

function Get-Task {
    param([object]$Registry,[string]$TaskId)
    foreach ($p in $Registry.tasks.PSObject.Properties) {
        if ($p.Name -eq $TaskId) { return $p.Value }
    }
    return $null
}

function Get-Arguments {
    param([object]$Task,[object]$Job,[string]$Runtime)
    $allowed = @($Task.parameters)
    $args = New-Object System.Collections.Generic.List[string]
    if ($Job.args) {
        foreach ($p in $Job.args.PSObject.Properties) {
            if ($allowed -notcontains $p.Name) { throw "Argument '$($p.Name)' is not allowed for task '$($Job.task_id)'." }
            if ($Runtime -eq 'powershell') {
                $args.Add('-' + $p.Name)
                $args.Add([string]$p.Value)
            } else {
                $args.Add('--' + $p.Name)
                $args.Add([string]$p.Value)
            }
        }
    }
    return $args.ToArray()
}

$started = Get-Date
$job = $null
$result = $null

try {
    $job = Get-Content -LiteralPath $JobPath -Raw | ConvertFrom-Json
    $registry = Get-Content -LiteralPath $RegistryPath -Raw | ConvertFrom-Json
    $task = Get-Task $registry ([string]$job.task_id)
    if (-not $task) { throw "Task '$($job.task_id)' is not in the local allowlist." }
    if (-not [bool]$task.parallel_safe) { throw "Task '$($job.task_id)' is not approved for parallel worker execution." }

    $runtime = ([string]$task.runtime).ToLowerInvariant()
    if (@('powershell','python','c') -notcontains $runtime) { throw "Unsupported task runtime '$runtime'." }

    $relative = [string]$task.script
    if ($relative.Contains('..') -or $relative.StartsWith('/') -or $relative.StartsWith('\')) { throw 'Invalid task source path.' }
    $source = Join-Path $RuntimeRoot ($relative -replace '/','\')
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Task source missing: $relative" }

    $env:QQ_WORKER_SLOT = [string]$WorkerSlot
    $env:QQ_GPU_INDEX = [string]$GpuIndex
    if ($GpuIndex -ge 0) {
        $env:CUDA_VISIBLE_DEVICES = [string]$GpuIndex
        $env:HIP_VISIBLE_DEVICES = [string]$GpuIndex
    }

    $args = Get-Arguments $task $job $runtime
    $output = New-Object System.Collections.Generic.List[string]
    $code = 1

    if ($runtime -eq 'powershell') {
        $ps = Get-Command pwsh -ErrorAction SilentlyContinue
        if (-not $ps) { $ps = Get-Command powershell -ErrorAction Stop }
        & $ps.Source -NoProfile -ExecutionPolicy Bypass -File $source @args 2>&1 |
            Tee-Object -FilePath $LogPath -Append |
            ForEach-Object { $output.Add([string]$_) }
        $code = $LASTEXITCODE
    }
    elseif ($runtime -eq 'python') {
        $python = Resolve-WorkerPython
        & $python $source @args 2>&1 |
            Tee-Object -FilePath $LogPath -Append |
            ForEach-Object { $output.Add([string]$_) }
        $code = $LASTEXITCODE
    }
    else {
        $compiler = Resolve-WorkerCompiler
        $exe = Join-Path ([IO.Path]::GetDirectoryName($ResultPath)) (([string]$job.job_id -replace '[^A-Za-z0-9._-]','_') + '.exe')
        if ($compiler.Name -eq 'cl') {
            & $compiler.Path /nologo /W3 /O2 "/Fe:$exe" $source 2>&1 |
                Tee-Object -FilePath $LogPath -Append |
                ForEach-Object { $output.Add([string]$_) }
        } else {
            & $compiler.Path -std=c11 -Wall -Wextra -O2 $source -o $exe 2>&1 |
                Tee-Object -FilePath $LogPath -Append |
                ForEach-Object { $output.Add([string]$_) }
        }
        $compileCode = $LASTEXITCODE
        if ($compileCode -eq 0) {
            & $exe @args 2>&1 |
                Tee-Object -FilePath $LogPath -Append |
                ForEach-Object { $output.Add([string]$_) }
            $code = $LASTEXITCODE
        } else {
            $code = $compileCode
        }
    }

    $text = ($output -join [Environment]::NewLine)
    if ($text.Length -gt 40000) { $text = $text.Substring($text.Length - 40000) }

    $result = [ordered]@{
        type = 'result'
        job_id = [string]$job.job_id
        task_id = [string]$job.task_id
        runtime = $runtime
        status = $(if($code -eq 0){'passed'}else{'failed'})
        exit_code = [int]$code
        duration_ms = [int]((Get-Date)-$started).TotalMilliseconds
        output = $text
        log_lines = $output.Count
        worker_slot = $WorkerSlot
        gpu_index = $GpuIndex
        resource_class = [string]$task.resource_class
        concurrency_group = [string]$task.concurrency_group
        completed_at = (Get-Date).ToUniversalTime().ToString('o')
    }
}
catch {
    $message = $_.Exception.Message
    try { Add-Content -LiteralPath $LogPath -Value $message -Encoding UTF8 } catch {}
    $result = [ordered]@{
        type = 'result'
        job_id = $(if($job){[string]$job.job_id}else{''})
        task_id = $(if($job){[string]$job.task_id}else{''})
        runtime = ''
        status = 'failed'
        exit_code = 1
        duration_ms = [int]((Get-Date)-$started).TotalMilliseconds
        output = $message
        log_lines = 1
        worker_slot = $WorkerSlot
        gpu_index = $GpuIndex
        resource_class = ''
        concurrency_group = ''
        completed_at = (Get-Date).ToUniversalTime().ToString('o')
    }
}

$temp = $ResultPath + '.new'
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $temp -Encoding UTF8
Move-Item -LiteralPath $temp -Destination $ResultPath -Force
exit $(if($result.status -eq 'passed'){0}else{1})
