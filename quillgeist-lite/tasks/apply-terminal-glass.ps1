$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$RunnerPath = Join-Path $HomeDir "runner.ps1"
$FragmentDir = Join-Path $env:LOCALAPPDATA "Microsoft\Windows Terminal\Fragments\Clintware"
$FragmentPath = Join-Path $FragmentDir "quillgeist-lite.json"
$LogoPath = Join-Path $FragmentDir "clintware-logo.png"
$LogoUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/assets/clintware-terminal-logo.b64"
$ProfileName = "Clintware(TM) Quillgeist Lite"
$ProfileGuid = "{5c7d2c59-4989-4f24-9f07-cbd0a38acb6d}"

Write-Host "Configuring Clintware Quillgeist Lite glass terminal..." -ForegroundColor Cyan

$wt = Get-Command wt.exe -ErrorAction SilentlyContinue
if (-not $wt) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "Windows Terminal is not installed and winget is unavailable."
  }

  Write-Host "Windows Terminal not found. Installing..." -ForegroundColor Cyan
  winget install --id Microsoft.WindowsTerminal --exact --source winget --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    throw "Windows Terminal installation failed."
  }

  Start-Sleep -Seconds 2
  $wt = Get-Command wt.exe -ErrorAction SilentlyContinue
  if (-not $wt) {
    $aliasPath = Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps\wt.exe"
    if (Test-Path $aliasPath) {
      $wt = Get-Item $aliasPath
    }
  }
}

if (-not $wt) {
  throw "Windows Terminal is installed but wt.exe could not be resolved."
}

New-Item -ItemType Directory -Force -Path $FragmentDir | Out-Null

Write-Host "Installing Clintware image asset..." -ForegroundColor Cyan
$raw = (Invoke-WebRequest -Uri $LogoUrl -UseBasicParsing).Content
$bytes = [Convert]::FromBase64String(($raw -replace '\s',''))
[IO.File]::WriteAllBytes($LogoPath,$bytes)

$escapedRunner = $RunnerPath.Replace('"','\"')
$commandLine = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File "' + $RunnerPath + '"'

$fragment = @{
  profiles = @(
    @{
      guid = $ProfileGuid
      name = $ProfileName
      commandline = $commandLine
      startingDirectory = $HomeDir
      tabTitle = "Quillgeist Lite"
      suppressApplicationTitle = $true
      colorScheme = "Clintware Glass"
      opacity = 20
      useAcrylic = $true
      background = "#000000"
      foreground = "#EAF7FF"
      selectionBackground = "#244A66"
      cursorColor = "#57C7FF"
      cursorShape = "vintage"
      cursorHeight = 22
      padding = "16, 12, 16, 12"
      scrollbarState = "hidden"
      intenseTextStyle = "bright"
      adjustIndistinguishableColors = "never"
      backgroundImage = $LogoPath
      backgroundImageAlignment = "center"
      backgroundImageOpacity = 0.16
      backgroundImageStretchMode = "none"
      "experimental.retroTerminalEffect" = $false
      font = @{
        face = "Cascadia Mono"
        size = 11
        weight = "normal"
      }
      unfocusedAppearance = @{
        opacity = 20
        useAcrylic = $true
        backgroundImageOpacity = 0.11
      }
    }
  )
  schemes = @(
    @{
      name = "Clintware Glass"
      background = "#000000"
      foreground = "#EAF7FF"
      cursorColor = "#57C7FF"
      selectionBackground = "#244A66"
      black = "#05080D"
      red = "#FF4B4B"
      green = "#8FE388"
      yellow = "#FF9F1C"
      blue = "#168BFF"
      purple = "#A880FF"
      cyan = "#35BFFF"
      white = "#EAF7FF"
      brightBlack = "#617382"
      brightRed = "#FF6B6B"
      brightGreen = "#B5F5AE"
      brightYellow = "#FFB84D"
      brightBlue = "#53B7FF"
      brightPurple = "#C0A7FF"
      brightCyan = "#78D9FF"
      brightWhite = "#FFFFFF"
    }
  )
}

$json = $fragment | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText($FragmentPath,$json,(New-Object Text.UTF8Encoding($false)))

Write-Host "Windows Terminal fragment: $FragmentPath" -ForegroundColor White
Write-Host "Acrylic opacity: 20%" -ForegroundColor Cyan
Write-Host "Normal: Clintware blue / white" -ForegroundColor Cyan
Write-Host "Warnings: orange" -ForegroundColor DarkYellow
Write-Host "Errors: red" -ForegroundColor Red

$StartupDir = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $StartupDir "Clintware Quillgeist Lite.lnk"
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = [string]$wt.Source
if (-not $Shortcut.TargetPath) { $Shortcut.TargetPath = [string]$wt.FullName }
$Shortcut.Arguments = '-w new -p "' + $ProfileName + '"'
$Shortcut.WorkingDirectory = $HomeDir
$Shortcut.WindowStyle = 1
$Shortcut.Description = "Clintware Quillgeist Lite acrylic control-plane terminal"
$Shortcut.Save()

$oldRunnerPid = 0
try {
  $current = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
  if ($current.ParentProcessId) {
    $parent = Get-CimInstance Win32_Process -Filter ("ProcessId=" + [int]$current.ParentProcessId)
    if ([string]$parent.CommandLine -match '(?i)QuillgeistLite.*runner\.ps1|runner\.ps1') {
      $oldRunnerPid = [int]$current.ParentProcessId
    }
  }
} catch {}

$restartHelper = Join-Path $HomeDir "restart-glass-terminal.ps1"
$helper = @'
param(
  [int]$OldRunnerPid,
  [string]$WtPath,
  [string]$ProfileName
)

Start-Sleep -Seconds 5
if ($OldRunnerPid -gt 0) {
  try { Stop-Process -Id $OldRunnerPid -Force -ErrorAction Stop } catch {}
}
Start-Sleep -Seconds 1
Start-Process -FilePath $WtPath -ArgumentList ('-w new -p "' + $ProfileName + '"')
'@
[IO.File]::WriteAllText($restartHelper,$helper,(New-Object Text.UTF8Encoding($false)))

$wtPath = [string]$wt.Source
if (-not $wtPath) { $wtPath = [string]$wt.FullName }
$restartArgs = '-NoProfile -ExecutionPolicy Bypass -File "' + $restartHelper + '" -OldRunnerPid ' + $oldRunnerPid + ' -WtPath "' + $wtPath + '" -ProfileName "' + $ProfileName + '"'
Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList $restartArgs -WindowStyle Hidden

Write-Host "Glass profile installed. Quillgeist Lite will reopen in Windows Terminal after this task result is returned." -ForegroundColor Green
