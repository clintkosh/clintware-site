Set-StrictMode -Version Latest

function Get-ClintwareTuneUpPlan {
    [CmdletBinding()]
    param()

    $temp = [IO.Path]::GetTempPath()
    $tempBytes = 0L
    if (Test-Path $temp) {
        $tempBytes = (Get-ChildItem $temp -Force -File -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
        if (-not $tempBytes) { $tempBytes = 0L }
    }

    $startup = @()
    foreach ($root in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Run','HKLM:\Software\Microsoft\Windows\CurrentVersion\Run')) {
        if (Test-Path $root) {
            $item = Get-ItemProperty $root
            foreach ($p in $item.PSObject.Properties | Where-Object Name -NotMatch '^PS') {
                $startup += [pscustomobject]@{ Scope=$root; Name=$p.Name; Command=[string]$p.Value }
            }
        }
    }

    [pscustomobject]@{
        TempPath = $temp
        TempBytes = [int64]$tempBytes
        StartupEntries = $startup
        ExplorerCompactMenuDisabled = Test-Path 'HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}'
        Actions = @(
            'Clear files from the current-user temp folder that are not locked',
            'Optionally restart Explorer after shell changes',
            'Report startup entries for review without disabling them automatically'
        )
    }
}

function Clear-ClintwareUserTemp {
    [CmdletBinding(SupportsShouldProcess)]
    param([switch]$Apply)

    $temp = [IO.Path]::GetTempPath()
    $files = @(Get-ChildItem $temp -Force -File -Recurse -ErrorAction SilentlyContinue)
    $before = ($files | Measure-Object Length -Sum).Sum
    if (-not $before) { $before = 0L }

    if (-not $Apply) {
        return [pscustomobject]@{ Path=$temp; Files=$files.Count; Bytes=[int64]$before; Applied=$false }
    }

    $removed = 0; $freed = 0L
    foreach ($f in $files) {
        if ($PSCmdlet.ShouldProcess($f.FullName,'Delete temporary file')) {
            try {
                $len = $f.Length
                Remove-Item -LiteralPath $f.FullName -Force -ErrorAction Stop
                $removed++; $freed += $len
            } catch { }
        }
    }
    [pscustomobject]@{ Path=$temp; FilesRemoved=$removed; BytesFreed=$freed; Applied=$true }
}

function Restart-ClintwareExplorer {
    [CmdletBinding(SupportsShouldProcess)]
    param()
    if ($PSCmdlet.ShouldProcess('explorer.exe','Restart Windows Explorer')) {
        Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
        Start-Process explorer.exe
    }
}
