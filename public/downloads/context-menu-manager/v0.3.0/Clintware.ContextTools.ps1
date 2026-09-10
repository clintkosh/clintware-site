#requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'Core\Backup.ps1')
. (Join-Path $here 'Modules\RegistryClean.ps1')
. (Join-Path $here 'Modules\TuneUp.ps1')
. (Join-Path $here 'Modules\ModularEditor.ps1')

function Show-ClintwareContextToolsMenu {
    while ($true) {
        Clear-Host
        Write-Host 'CLINTWARE™ CONTEXT TOOLS v0.3.0' -ForegroundColor Cyan
        Write-Host 'Preview first. Backup before mutation. Rollback available.'
        Write-Host ''
        Write-Host '[1] Registry Clean - scan'
        Write-Host '[2] Registry Clean - apply known-safe candidates'
        Write-Host '[3] Tune-Up - report'
        Write-Host '[4] Tune-Up - clear user temp files'
        Write-Host '[5] Modular Registry Editor - inspect path'
        Write-Host '[6] Modular Registry Editor - set value'
        Write-Host '[7] Modular Registry Editor - remove value'
        Write-Host '[8] List backups'
        Write-Host '[9] Restore backup'
        Write-Host '[R] Restart Explorer'
        Write-Host '[Q] Quit'
        $choice = Read-Host 'Select'

        try {
            switch ($choice.ToUpperInvariant()) {
                '1' { Get-ClintwareRegistryCleanCandidates | Format-Table -AutoSize; Pause }
                '2' {
                    $c = @(Get-ClintwareRegistryCleanCandidates)
                    $safe = @($c | Where-Object RecommendedAction -eq 'RemoveValue')
                    $safe | Format-Table -AutoSize
                    if ($safe.Count -eq 0) { Write-Host 'No known-safe candidates found.'; Pause; break }
                    if ((Read-Host "Apply $($safe.Count) change(s)? Type APPLY") -ceq 'APPLY') {
                        Invoke-ClintwareRegistryClean -Candidates $safe -Apply -Confirm:$false | Format-List
                    }
                    Pause
                }
                '3' { Get-ClintwareTuneUpPlan | Format-List; Pause }
                '4' {
                    $preview = Clear-ClintwareUserTemp
                    $preview | Format-List
                    if ((Read-Host 'Delete these unlocked temp files? Type APPLY') -ceq 'APPLY') {
                        Clear-ClintwareUserTemp -Apply -Confirm:$false | Format-List
                    }
                    Pause
                }
                '5' { $p=Read-Host 'Registry path'; Get-ClintwareRegistryItem -Path $p | Format-List; Pause }
                '6' {
                    $p=Read-Host 'Registry path'; $n=Read-Host 'Value name'; $v=Read-Host 'Value'; $t=Read-Host 'Type [String/DWord/QWord/ExpandString/MultiString/Binary]'
                    if (-not $t) { $t='String' }
                    Set-ClintwareRegistryValue -Path $p -Name $n -Value $v -Type $t | Format-List
                    if ((Read-Host 'Apply this edit? Type APPLY') -ceq 'APPLY') { Set-ClintwareRegistryValue -Path $p -Name $n -Value $v -Type $t -Apply -Confirm:$false | Format-List }
                    Pause
                }
                '7' {
                    $p=Read-Host 'Registry path'; $n=Read-Host 'Value name'
                    Remove-ClintwareRegistryValue -Path $p -Name $n | Format-List
                    if ((Read-Host 'Apply this removal? Type APPLY') -ceq 'APPLY') { Remove-ClintwareRegistryValue -Path $p -Name $n -Apply -Confirm:$false | Format-List }
                    Pause
                }
                '8' { Get-ClintwareBackups | Select-Object Name,FullName,LastWriteTime | Format-Table -AutoSize; Pause }
                '9' {
                    Get-ClintwareBackups | Select-Object Name,FullName,LastWriteTime | Format-Table -AutoSize
                    $p=Read-Host 'Paste backup FullName to restore'
                    Restore-ClintwareBackup -BackupDirectory $p -Confirm
                    Pause
                }
                'R' { Restart-ClintwareExplorer -Confirm }
                'Q' { return }
                default { Write-Host 'Unknown selection.'; Start-Sleep 1 }
            }
        } catch {
            Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
            Pause
        }
    }
}

if ($MyInvocation.InvocationName -ne '.') { Show-ClintwareContextToolsMenu }
