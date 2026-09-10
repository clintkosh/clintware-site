#requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$base = 'https://www.clintware.com/downloads/context-menu-manager/v0.3.0'
$dest = Join-Path $env:LOCALAPPDATA 'Clintware\ContextTools\v0.3.0'
$files = @(
    'Clintware.ContextTools.ps1',
    'Core/Backup.ps1',
    'Modules/RegistryClean.ps1',
    'Modules/TuneUp.ps1',
    'Modules/ModularEditor.ps1'
)

foreach ($rel in $files) {
    $local = Join-Path $dest ($rel -replace '/','\')
    $dir = Split-Path -Parent $local
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $uri = "$base/$rel"
    Write-Host "Fetching $uri"
    Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $local
}

$launcherDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Clintware'
New-Item -ItemType Directory -Force -Path $launcherDir | Out-Null
$launcher = Join-Path $launcherDir 'Clintware Context Tools.cmd'
$script = Join-Path $dest 'Clintware.ContextTools.ps1'
"@echo off`r`npowershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$script`"" | Set-Content -Encoding ASCII $launcher

Write-Host ''
Write-Host "Installed to: $dest" -ForegroundColor Cyan
Write-Host "Start Menu: Clintware > Clintware Context Tools" -ForegroundColor Cyan
Write-Host 'Launching now...'
Start-Process powershell.exe -ArgumentList @('-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$script`"")
