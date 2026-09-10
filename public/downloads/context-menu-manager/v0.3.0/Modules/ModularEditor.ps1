Set-StrictMode -Version Latest

function Test-ClintwareRegistryPathAllowed {
    param([Parameter(Mandatory)][string]$Path)
    $allowed = @('HKCU:\Software\Classes','HKCU:\Software\Microsoft\Windows\CurrentVersion','HKLM:\Software\Microsoft\Windows\CurrentVersion')
    foreach ($root in $allowed) { if ($Path.StartsWith($root,[System.StringComparison]::OrdinalIgnoreCase)) { return $true } }
    $false
}

function Get-ClintwareRegistryItem {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-ClintwareRegistryPathAllowed $Path)) { throw "Path is outside the default editable registry scopes: $Path" }
    if (-not (Test-Path $Path)) { return $null }
    $item = Get-ItemProperty $Path
    [pscustomobject]@{
        Path=$Path
        Values=@($item.PSObject.Properties | Where-Object Name -NotMatch '^PS' | ForEach-Object {
            [pscustomobject]@{ Name=$_.Name; Value=$_.Value; Type=($_.Value.GetType().Name) }
        })
    }
}

function Set-ClintwareRegistryValue {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name,
        [AllowNull()]$Value,
        [ValidateSet('String','ExpandString','DWord','QWord','MultiString','Binary')][string]$Type='String',
        [switch]$Apply
    )
    if (-not (Test-ClintwareRegistryPathAllowed $Path)) { throw "Path is outside the default editable registry scopes: $Path" }
    $preview = [pscustomobject]@{ Action='SetValue'; Path=$Path; Name=$Name; Value=$Value; Type=$Type }
    if (-not $Apply) { return $preview }

    $backup = New-ClintwareBackup -RegistryPaths @($Path) -Label 'modular-edit'
    if ($PSCmdlet.ShouldProcess("$Path::$Name",'Set registry value')) {
        if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
        New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force | Out-Null
    }
    [pscustomobject]@{ Backup=$backup; Change=$preview }
}

function Remove-ClintwareRegistryValue {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name,
        [switch]$Apply
    )
    if (-not (Test-ClintwareRegistryPathAllowed $Path)) { throw "Path is outside the default editable registry scopes: $Path" }
    $preview = [pscustomobject]@{ Action='RemoveValue'; Path=$Path; Name=$Name }
    if (-not $Apply) { return $preview }
    if (-not (Test-Path $Path)) { throw "Registry path not found: $Path" }

    $backup = New-ClintwareBackup -RegistryPaths @($Path) -Label 'modular-edit'
    if ($PSCmdlet.ShouldProcess("$Path::$Name",'Remove registry value')) {
        Remove-ItemProperty -Path $Path -Name $Name -Force -ErrorAction Stop
    }
    [pscustomobject]@{ Backup=$backup; Change=$preview }
}
