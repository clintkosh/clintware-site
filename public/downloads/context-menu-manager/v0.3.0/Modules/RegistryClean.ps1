Set-StrictMode -Version Latest

function Get-ClintwareRegistryCleanCandidates {
    [CmdletBinding()]
    param()

    $results = [System.Collections.Generic.List[object]]::new()

    foreach ($root in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Run','HKLM:\Software\Microsoft\Windows\CurrentVersion\Run')) {
        if (-not (Test-Path $root)) { continue }
        $item = Get-ItemProperty -Path $root
        foreach ($p in $item.PSObject.Properties | Where-Object Name -NotMatch '^PS') {
            $raw = [string]$p.Value
            $exe = $raw.Trim() -replace '^"([^\"]+)".*$','$1' -replace '^([^ ]+\.exe).*$','$1'
            if ($exe -and $exe -match '\.exe$' -and -not (Test-Path $exe)) {
                $results.Add([pscustomobject]@{
                    Category='Startup'; Severity='Low'; Path=$root; Name=$p.Name; CurrentValue=$raw;
                    Reason='Startup entry points to a missing executable'; RecommendedAction='RemoveValue'
                })
            }
        }
    }

    $uninstallRoots = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
    )
    foreach ($root in $uninstallRoots) {
        if (-not (Test-Path $root)) { continue }
        foreach ($key in Get-ChildItem $root -ErrorAction SilentlyContinue) {
            $p = Get-ItemProperty $key.PSPath -ErrorAction SilentlyContinue
            if (-not $p) { continue }
            $loc = [string]$p.InstallLocation
            if ($loc -and -not (Test-Path $loc) -and [string]$p.DisplayName) {
                $results.Add([pscustomobject]@{
                    Category='Uninstall'; Severity='Review'; Path=$key.PSPath; Name=[string]$p.DisplayName; CurrentValue=$loc;
                    Reason='InstallLocation no longer exists'; RecommendedAction='ReviewOnly'
                })
            }
        }
    }

    $results
}

function Invoke-ClintwareRegistryClean {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)][object[]]$Candidates,
        [switch]$Apply
    )

    $actionable = @($Candidates | Where-Object RecommendedAction -eq 'RemoveValue')
    if (-not $Apply) { return $actionable }
    if (-not $actionable.Count) { return @() }

    $backup = New-ClintwareBackup -RegistryPaths ($actionable.Path | Sort-Object -Unique) -Label 'registry-clean'
    foreach ($c in $actionable) {
        if ($PSCmdlet.ShouldProcess("$($c.Path)::$($c.Name)",'Remove stale registry value')) {
            Remove-ItemProperty -Path $c.Path -Name $c.Name -Force -ErrorAction Stop
        }
    }
    [pscustomobject]@{ Backup=$backup; Changed=$actionable.Count; Items=$actionable }
}
