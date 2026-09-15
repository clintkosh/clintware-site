#requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'Core\Backup.ps1')
. (Join-Path $here 'Modules\RegistryClean.ps1')
. (Join-Path $here 'Modules\TuneUp.ps1')
. (Join-Path $here 'Modules\ModularEditor.ps1')
. (Join-Path $here 'Modules\BrowserHygiene.ps1')

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
        Write-Host '[10] Browser Hygiene - profile/cache/cookie/password-store report'
        Write-Host '[11] Browser Security - extension permission audit'
        Write-Host '[12] Browser Clean - cache/cookies/history/site data'
        Write-Host '[13] Search Engine - guided browser setting'
        Write-Host '[14] Search Engine - enforce/remove policy'
        Write-Host '[15] Search Engine - recommendation catalog'
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
                    if ((Read-Host "Apply $($safe.Count) change(s)? Type APPLY") -ceq 'APPLY') { Invoke-ClintwareRegistryClean -Candidates $safe -Apply -Confirm:$false | Format-List }
                    Pause
                }
                '3' { Get-ClintwareTuneUpPlan | Format-List; Pause }
                '4' {
                    $preview = Clear-ClintwareUserTemp
                    $preview | Format-List
                    if ((Read-Host 'Delete these unlocked temp files? Type APPLY') -ceq 'APPLY') { Clear-ClintwareUserTemp -Apply -Confirm:$false | Format-List }
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
                '10' { Get-ClintwareBrowserHygieneReport | Format-Table -AutoSize; Pause }
                '11' { Get-ClintwareBrowserSecurityChecks | Format-Table Browser,Profile,Name,Risk,FlaggedPermissions -Wrap -AutoSize; Pause }
                '12' {
                    $b=Read-Host 'Browser [Chrome/Edge/Brave]'; $p=Read-Host 'Profile [Default]'; if(-not $p){$p='Default'}
                    $mode=Read-Host 'Data [cache / cookies / history / site / all]'
                    $args=@{Browser=$b;Profile=$p}
                    switch($mode.ToLowerInvariant()){'cache'{$args.Cache=$true};'cookies'{$args.Cookies=$true};'history'{$args.History=$true};'site'{$args.SiteData=$true};'all'{$args.Cache=$true;$args.Cookies=$true;$args.History=$true;$args.SiteData=$true};default{throw 'Unknown data selection.'}}
                    Clear-ClintwareBrowserData @args | Format-List
                    if ((Read-Host 'Back up then clear selected browser data? Type APPLY') -ceq 'APPLY') { $args.Apply=$true; Clear-ClintwareBrowserData @args -Confirm:$false | Format-List }
                    Pause
                }
                '13' {
                    $b=Read-Host 'Browser [Chrome/Edge/Brave]'; $e=Read-Host 'Engine [Google/Brave Search/DuckDuckGo/Startpage]'; if(-not $e){$e='Google'}
                    Open-ClintwareBrowserSearchSettings -Browser $b -Engine $e | Format-List; Pause
                }
                '14' {
                    $b=Read-Host 'Browser [Chrome/Edge/Brave]'; $e=Read-Host 'Engine [Google/Brave Search/DuckDuckGo/Startpage]'; if(-not $e){$e='Google'}
                    $remove=(Read-Host 'Type REMOVE to remove enforcement, otherwise press Enter to enforce') -ceq 'REMOVE'
                    Set-ClintwareBrowserSearchPolicy -Browser $b -Engine $e -Remove:$remove | Format-List
                    if ((Read-Host 'This can mark the browser as managed. Type APPLY') -ceq 'APPLY') { Set-ClintwareBrowserSearchPolicy -Browser $b -Engine $e -Remove:$remove -Apply -Confirm:$false | Format-List }
                    Pause
                }
                '15' { Get-ClintwareSearchEngineCatalog | Format-Table -AutoSize; Pause }
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
