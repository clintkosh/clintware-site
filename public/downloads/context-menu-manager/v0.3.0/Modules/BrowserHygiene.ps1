#requires -Version 5.1
Set-StrictMode -Version Latest

function Get-ClintwareBrowserDefinitions {
    @(
        [pscustomobject]@{ Name='Chrome'; Process='chrome'; Root=(Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data'); ExeCandidates=@("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"); Policy='HKCU:\Software\Policies\Google\Chrome'; Settings='chrome://settings/searchEngines' },
        [pscustomobject]@{ Name='Edge'; Process='msedge'; Root=(Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\User Data'); ExeCandidates=@("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"); Policy='HKCU:\Software\Policies\Microsoft\Edge'; Settings='edge://settings/searchEngines' },
        [pscustomobject]@{ Name='Brave'; Process='brave'; Root=(Join-Path $env:LOCALAPPDATA 'BraveSoftware\Brave-Browser\User Data'); ExeCandidates=@("$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe", "${env:ProgramFiles(x86)}\BraveSoftware\Brave-Browser\Application\brave.exe"); Policy='HKCU:\Software\Policies\BraveSoftware\Brave'; Settings='brave://settings/searchEngines' }
    )
}

function Get-ClintwareDirectorySizeMB {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return 0 }
    $sum = (Get-ChildItem -LiteralPath $Path -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    if (-not $sum) { return 0 }
    [math]::Round($sum / 1MB, 1)
}

function Get-ClintwareChromiumProfiles {
    foreach ($b in Get-ClintwareBrowserDefinitions) {
        if (-not (Test-Path -LiteralPath $b.Root)) { continue }
        $exe = $b.ExeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
        foreach ($dir in Get-ChildItem -LiteralPath $b.Root -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq 'Default' -or $_.Name -like 'Profile *' }) {
            [pscustomobject]@{ Browser=$b.Name; Process=$b.Process; Root=$b.Root; Profile=$dir.Name; Path=$dir.FullName; Exe=$exe; Policy=$b.Policy; Settings=$b.Settings }
        }
    }
}

function Get-ClintwareExtensionAudit {
    param([Parameter(Mandatory)][string]$ProfilePath,[Parameter(Mandatory)][string]$Browser,[Parameter(Mandatory)][string]$Profile)
    $root = Join-Path $ProfilePath 'Extensions'
    if (-not (Test-Path -LiteralPath $root)) { return }
    $sensitive = @('<all_urls>','*://*/*','debugger','management','nativeMessaging','proxy','webRequestBlocking','privacy')
    foreach ($idDir in Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue) {
        $ver = Get-ChildItem -LiteralPath $idDir.FullName -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
        if (-not $ver) { continue }
        $manifest = Join-Path $ver.FullName 'manifest.json'
        if (-not (Test-Path -LiteralPath $manifest)) { continue }
        try {
            $m = Get-Content -LiteralPath $manifest -Raw -Encoding UTF8 | ConvertFrom-Json
            $perms = @($m.permissions) + @($m.host_permissions) + @($m.optional_permissions) + @($m.optional_host_permissions)
            $perms = @($perms | Where-Object { $_ } | ForEach-Object { [string]$_ } | Sort-Object -Unique)
            $flags = @($perms | Where-Object { $sensitive -contains $_ -or $_ -match '^\*://|^https?://\*/|<all_urls>' })
            $risk = if ($flags.Count -ge 3) {'High'} elseif ($flags.Count -ge 1) {'Review'} else {'Normal'}
            [pscustomobject]@{ Browser=$Browser; Profile=$Profile; Id=$idDir.Name; Name=([string]$m.name); Version=([string]$m.version); Risk=$risk; FlaggedPermissions=($flags -join ', '); PermissionCount=$perms.Count }
        } catch {
            [pscustomobject]@{ Browser=$Browser; Profile=$Profile; Id=$idDir.Name; Name='Unreadable manifest'; Version=''; Risk='Review'; FlaggedPermissions='Manifest parse failed'; PermissionCount=0 }
        }
    }
}

function Get-ClintwareBrowserHygieneReport {
    foreach ($p in Get-ClintwareChromiumProfiles) {
        $cachePaths = @('Cache','Code Cache','GPUCache','Service Worker\CacheStorage') | ForEach-Object { Join-Path $p.Path $_ }
        $sum = ($cachePaths | ForEach-Object { Get-ClintwareDirectorySizeMB $_ } | Measure-Object -Sum).Sum
        if (-not $sum) { $sum = 0 }
        $ext = @(Get-ClintwareExtensionAudit -ProfilePath $p.Path -Browser $p.Browser -Profile $p.Profile)
        [pscustomobject]@{
            Browser=$p.Browser; Profile=$p.Profile; Running=[bool](Get-Process -Name $p.Process -ErrorAction SilentlyContinue);
            CacheMB=[math]::Round($sum,1); CookiesPresent=(Test-Path -LiteralPath (Join-Path $p.Path 'Network\Cookies'));
            HistoryPresent=(Test-Path -LiteralPath (Join-Path $p.Path 'History'));
            SavedPasswordStorePresent=(Test-Path -LiteralPath (Join-Path $p.Path 'Login Data'));
            ExtensionCount=$ext.Count; ExtensionReviewCount=@($ext | Where-Object Risk -ne 'Normal').Count;
            ProfilePath=$p.Path
        }
    }
}

function Backup-ClintwareBrowserProfileItems {
    param([Parameter(Mandatory)][string]$ProfilePath,[Parameter(Mandatory)][string[]]$RelativePaths)
    $root = Join-Path $env:LOCALAPPDATA 'Clintware\ContextTools\Backups\Browser'
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $dest = Join-Path $root $stamp
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    foreach ($rel in $RelativePaths) {
        $src = Join-Path $ProfilePath $rel
        if (-not (Test-Path -LiteralPath $src)) { continue }
        $target = Join-Path $dest ($rel -replace '[\\/:*?"<>|]','_')
        $item = Get-Item -LiteralPath $src
        if ($item.PSIsContainer) { Copy-Item -LiteralPath $src -Destination $target -Recurse -Force -ErrorAction SilentlyContinue }
        else { Copy-Item -LiteralPath $src -Destination $target -Force -ErrorAction SilentlyContinue }
    }
    [pscustomobject]@{ BackupDirectory=$dest; SourceProfile=$ProfilePath; CreatedUtc=(Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $dest 'manifest.json') -Encoding UTF8
    $dest
}

function Clear-ClintwareBrowserData {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)][ValidateSet('Chrome','Edge','Brave')][string]$Browser,
        [string]$Profile='Default',
        [switch]$Cache,[switch]$Cookies,[switch]$History,[switch]$SiteData,[switch]$Apply
    )
    $p = Get-ClintwareChromiumProfiles | Where-Object { $_.Browser -eq $Browser -and $_.Profile -eq $Profile } | Select-Object -First 1
    if (-not $p) { throw "Browser/profile not found: $Browser / $Profile" }
    if (Get-Process -Name $p.Process -ErrorAction SilentlyContinue) { throw "$Browser is running. Close it first so profile databases are not corrupted." }
    $targets = @()
    if ($Cache) { $targets += @('Cache','Code Cache','GPUCache') }
    if ($Cookies) { $targets += 'Network\Cookies' }
    if ($History) { $targets += @('History','History-journal') }
    if ($SiteData) { $targets += @('Local Storage','Session Storage','Service Worker\CacheStorage','WebStorage') }
    $targets = @($targets | Sort-Object -Unique)
    if ($targets.Count -eq 0) { throw 'Select at least one data class.' }
    $preview = [pscustomobject]@{ Browser=$Browser; Profile=$Profile; Targets=($targets -join '; '); Passwords='PRESERVED'; Autofill='PRESERVED'; Bookmarks='PRESERVED'; Apply=[bool]$Apply }
    if (-not $Apply) { return $preview }
    $backup = Backup-ClintwareBrowserProfileItems -ProfilePath $p.Path -RelativePaths $targets
    foreach ($rel in $targets) {
        $path = Join-Path $p.Path $rel
        if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue }
    }
    [pscustomobject]@{ Browser=$Browser; Profile=$Profile; Backup=$backup; Removed=($targets -join '; '); Passwords='PRESERVED'; Autofill='PRESERVED'; Bookmarks='PRESERVED' }
}

function Get-ClintwareSearchEngineCatalog {
    @(
        [pscustomobject]@{ Name='Google'; SearchURL='https://www.google.com/search?q={searchTerms}'; SuggestURL='https://www.google.com/complete/search?output=chrome&q={searchTerms}'; Class='Quality default' },
        [pscustomobject]@{ Name='Brave Search'; SearchURL='https://search.brave.com/search?q={searchTerms}'; SuggestURL=''; Class='Privacy / independent-index alternative' },
        [pscustomobject]@{ Name='DuckDuckGo'; SearchURL='https://duckduckgo.com/?q={searchTerms}'; SuggestURL='https://duckduckgo.com/ac/?q={searchTerms}&type=list'; Class='Privacy alternative' },
        [pscustomobject]@{ Name='Startpage'; SearchURL='https://www.startpage.com/sp/search?query={searchTerms}'; SuggestURL=''; Class='Privacy / Google-derived-results alternative' }
    )
}

function Open-ClintwareBrowserSearchSettings {
    param([Parameter(Mandatory)][ValidateSet('Chrome','Edge','Brave')][string]$Browser,[ValidateSet('Google','Brave Search','DuckDuckGo','Startpage')][string]$Engine='Google')
    $b = Get-ClintwareBrowserDefinitions | Where-Object Name -eq $Browser | Select-Object -First 1
    $exe = $b.ExeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
    if (-not $exe) { throw "$Browser executable not found." }
    Set-Clipboard -Value $Engine
    Start-Process -FilePath $exe -ArgumentList $b.Settings
    [pscustomobject]@{ Browser=$Browser; RecommendedEngine=$Engine; Mode='Guided'; Note='Engine name copied to clipboard. Browser search settings opened.' }
}

function Set-ClintwareBrowserSearchPolicy {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)][ValidateSet('Chrome','Edge','Brave')][string]$Browser,
        [Parameter(Mandatory)][ValidateSet('Google','Brave Search','DuckDuckGo','Startpage')][string]$Engine,
        [switch]$Remove,[switch]$Apply
    )
    $b = Get-ClintwareBrowserDefinitions | Where-Object Name -eq $Browser | Select-Object -First 1
    $e = Get-ClintwareSearchEngineCatalog | Where-Object Name -eq $Engine | Select-Object -First 1
    $preview = [pscustomobject]@{ Browser=$Browser; Engine=$Engine; PolicyPath=$b.Policy; Action=$(if($Remove){'Remove enforcement'}else{'Enforce default search provider'}); Warning='Browser may display Managed by your organization.'; Apply=[bool]$Apply }
    if (-not $Apply) { return $preview }
    $backup = New-ClintwareBackup -RegistryPaths @($b.Policy) -Label "browser-search-$Browser"
    if ($Remove) {
        foreach ($n in 'DefaultSearchProviderEnabled','DefaultSearchProviderName','DefaultSearchProviderSearchURL','DefaultSearchProviderSuggestURL') { Remove-ItemProperty -Path $b.Policy -Name $n -ErrorAction SilentlyContinue }
    } else {
        New-Item -Path $b.Policy -Force | Out-Null
        New-ItemProperty -Path $b.Policy -Name 'DefaultSearchProviderEnabled' -PropertyType DWord -Value 1 -Force | Out-Null
        New-ItemProperty -Path $b.Policy -Name 'DefaultSearchProviderName' -PropertyType String -Value $e.Name -Force | Out-Null
        New-ItemProperty -Path $b.Policy -Name 'DefaultSearchProviderSearchURL' -PropertyType String -Value $e.SearchURL -Force | Out-Null
        if ($e.SuggestURL) { New-ItemProperty -Path $b.Policy -Name 'DefaultSearchProviderSuggestURL' -PropertyType String -Value $e.SuggestURL -Force | Out-Null }
        else { Remove-ItemProperty -Path $b.Policy -Name 'DefaultSearchProviderSuggestURL' -ErrorAction SilentlyContinue }
    }
    [pscustomobject]@{ Browser=$Browser; Engine=$Engine; Applied=$true; Backup=$backup; RestartBrowser=$true }
}

function Get-ClintwareBrowserSecurityChecks {
    foreach ($p in Get-ClintwareChromiumProfiles) {
        foreach ($e in @(Get-ClintwareExtensionAudit -ProfilePath $p.Path -Browser $p.Browser -Profile $p.Profile) | Where-Object Risk -ne 'Normal') { $e }
        [pscustomobject]@{ Browser=$p.Browser; Profile=$p.Profile; Id='PASSWORD-STORE'; Name='Saved password store'; Version=''; Risk=$(if(Test-Path (Join-Path $p.Path 'Login Data')){'Info'}else{'Normal'}); FlaggedPermissions='Presence only. Clintware never opens, decrypts, exports, or reads saved credentials.'; PermissionCount=0 }
    }
}
