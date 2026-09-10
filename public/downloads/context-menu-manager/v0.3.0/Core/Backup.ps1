Set-StrictMode -Version Latest

function Get-ClintwareStateRoot {
    $root = Join-Path $env:LOCALAPPDATA 'Clintware\ContextTools'
    if (-not (Test-Path $root)) { New-Item -ItemType Directory -Force -Path $root | Out-Null }
    $root
}

function New-ClintwareBackup {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string[]]$RegistryPaths,
        [string]$Label = 'change'
    )

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $safeLabel = ($Label -replace '[^A-Za-z0-9._-]','_')
    $dir = Join-Path (Get-ClintwareStateRoot) "Backups\$stamp-$safeLabel"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    $manifest = [ordered]@{
        Version = 1
        CreatedUtc = (Get-Date).ToUniversalTime().ToString('o')
        Label = $Label
        Entries = @()
    }

    foreach ($path in ($RegistryPaths | Sort-Object -Unique)) {
        $native = $path -replace '^HKCU:','HKEY_CURRENT_USER' -replace '^HKLM:','HKEY_LOCAL_MACHINE' -replace '^HKCR:','HKEY_CLASSES_ROOT'
        $name = (($native -replace '[\\/:*?"<>| ]','_').Trim('_')) + '.reg'
        $file = Join-Path $dir $name
        $exists = Test-Path $path
        $entry = [ordered]@{ Path=$path; NativePath=$native; Existed=$exists; BackupFile=$null }
        if ($exists) {
            & reg.exe export $native $file /y | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "Registry backup failed for $native" }
            $entry.BackupFile = $name
        }
        $manifest.Entries += [pscustomobject]$entry
    }

    $manifestPath = Join-Path $dir 'manifest.json'
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $manifestPath
    $dir
}

function Restore-ClintwareBackup {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][string]$BackupDirectory)

    $manifestPath = Join-Path $BackupDirectory 'manifest.json'
    if (-not (Test-Path $manifestPath)) { throw 'Backup manifest not found.' }
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

    foreach ($entry in $manifest.Entries) {
        if ($entry.Existed -and $entry.BackupFile) {
            $file = Join-Path $BackupDirectory $entry.BackupFile
            if ($PSCmdlet.ShouldProcess($entry.NativePath,'Restore registry backup')) {
                & reg.exe import $file | Out-Null
                if ($LASTEXITCODE -ne 0) { throw "Registry restore failed for $($entry.NativePath)" }
            }
        } elseif (-not $entry.Existed -and (Test-Path $entry.Path)) {
            if ($PSCmdlet.ShouldProcess($entry.Path,'Remove key created after backup')) {
                Remove-Item -LiteralPath $entry.Path -Recurse -Force
            }
        }
    }
}

function Get-ClintwareBackups {
    $root = Join-Path (Get-ClintwareStateRoot) 'Backups'
    if (-not (Test-Path $root)) { return @() }
    Get-ChildItem $root -Directory | Sort-Object LastWriteTime -Descending
}
