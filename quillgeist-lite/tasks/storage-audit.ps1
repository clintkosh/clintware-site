param(
  [string]$ExpectedComputer = "",
  [int]$LargestFiles = 40
)

$ErrorActionPreference = "Continue"
if($ExpectedComputer -and $env:COMPUTERNAME -ne $ExpectedComputer){
  throw "Machine mismatch. Expected $ExpectedComputer but running on $env:COMPUTERNAME."
}

function Format-GiB([double]$bytes){ [Math]::Round(($bytes / 1GB),2) }
function Get-DirBytes([string]$Path){
  if(-not (Test-Path -LiteralPath $Path -PathType Container)){ return $null }
  try {
    $sum = (Get-ChildItem -LiteralPath $Path -File -Recurse -Force -ErrorAction SilentlyContinue |
      Measure-Object -Property Length -Sum).Sum
    if($null -eq $sum){ return 0 }
    return [double]$sum
  } catch { return $null }
}
function Add-PathRow([System.Collections.ArrayList]$Rows,[string]$Label,[string]$Path,[string]$Class){
  $bytes=Get-DirBytes $Path
  if($null -ne $bytes){
    [void]$Rows.Add([pscustomobject]@{Label=$Label;Path=$Path;Class=$Class;GiB=Format-GiB $bytes})
  }
}

Write-Output ("STORAGE_AUDIT_HOST=" + $env:COMPUTERNAME)
try {
  $cs=Get-CimInstance Win32_ComputerSystem
  Write-Output ("STORAGE_AUDIT_MODEL=" + [string]$cs.Manufacturer + " " + [string]$cs.Model)
} catch {}

Write-Output "=== DRIVES ==="
Get-CimInstance Win32_LogicalDisk | Sort-Object DeviceID | ForEach-Object {
  $type = switch([int]$_.DriveType){2{"Removable"}3{"Fixed"}4{"Network"}5{"Optical"}default{"Other"}}
  [pscustomobject]@{
    Drive=$_.DeviceID;Type=$type;Volume=[string]$_.VolumeName
    SizeGiB=if($_.Size){Format-GiB $_.Size}else{$null}
    FreeGiB=if($_.FreeSpace){Format-GiB $_.FreeSpace}else{$null}
  }
} | Format-Table -AutoSize | Out-String | Write-Output

$rows=New-Object System.Collections.ArrayList
$home=$env:USERPROFILE
$local=$env:LOCALAPPDATA
$roam=$env:APPDATA

$candidates=@(
  @("Ollama model store",(Join-Path $home ".ollama\models"),"MOVE_CANDIDATE"),
  @("Ollama local data",(Join-Path $local "Ollama"),"KEEP_OR_MOVE"),
  @("Hugging Face cache",(Join-Path $home ".cache\huggingface"),"CACHE_OR_MOVE"),
  @("Torch cache",(Join-Path $home ".cache\torch"),"CACHE_OR_MOVE"),
  @("User cache",(Join-Path $home ".cache"),"CACHE_REVIEW"),
  @("Downloads",(Join-Path $home "Downloads"),"REVIEW"),
  @("User temp",(Join-Path $local "Temp"),"SAFE_CACHE_REVIEW"),
  @("pip cache",(Join-Path $local "pip\Cache"),"SAFE_CACHE_REVIEW"),
  @("npm cache",(Join-Path $local "npm-cache"),"SAFE_CACHE_REVIEW"),
  @("Docker Desktop data",(Join-Path $local "Docker"),"MOVE_WITH_DOCKER"),
  @("Docker roaming data",(Join-Path $roam "Docker"),"KEEP"),
  @("Docker WSL package",(Join-Path $local "Docker\wsl"),"MOVE_WITH_DOCKER"),
  @("Windows package cache","C:\ProgramData\Package Cache","DO_NOT_BLIND_DELETE"),
  @("C AI root","C:\AI","AI_REVIEW"),
  @("C models","C:\models","AI_REVIEW"),
  @("ComfyUI","C:\ComfyUI","AI_REVIEW")
)
foreach($c in $candidates){ Add-PathRow $rows $c[0] $c[1] $c[2] }

Write-Output "=== SELECTED DIRECTORY SIZES ==="
$rows | Sort-Object GiB -Descending | Format-Table -AutoSize | Out-String | Write-Output

Write-Output "=== LARGE FILES IN USER / AI AREAS ==="
$scanRoots=@($home,"C:\AI","C:\models","C:\ProgramData\DockerDesktop","C:\ProgramData\Docker") | Where-Object { Test-Path -LiteralPath $_ }
$files=@()
foreach($root in $scanRoots | Select-Object -Unique){
  try {
    $files += Get-ChildItem -LiteralPath $root -File -Recurse -Force -ErrorAction SilentlyContinue |
      Where-Object { $_.Length -ge 512MB } |
      Select-Object FullName,Length,LastWriteTime
  } catch {}
}
$files | Sort-Object Length -Descending | Select-Object -First ([Math]::Max(10,[Math]::Min($LargestFiles,100))) |
  ForEach-Object {
    [pscustomobject]@{GiB=Format-GiB $_.Length;LastWrite=$_.LastWriteTime;Path=$_.FullName}
  } | Format-Table -AutoSize | Out-String -Width 300 | Write-Output

Write-Output "=== OLLAMA MODELS ==="
$ollama=Get-Command ollama.exe -ErrorAction SilentlyContinue
if($ollama){ try { & $ollama.Source list 2>&1 | Out-String | Write-Output } catch {} }

Write-Output "=== DOCKER DISK USAGE ==="
$docker=Get-Command docker.exe -ErrorAction SilentlyContinue
if($docker){ try { & $docker.Source system df -v 2>&1 | Out-String -Width 300 | Write-Output } catch {} }

Write-Output "=== COMMON OFFLOAD DESTINATIONS ==="
Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -in 2,3 -and $_.DeviceID -ne "C:" } |
  ForEach-Object {
    [pscustomobject]@{
      Drive=$_.DeviceID;Volume=[string]$_.VolumeName
      Type=$(if($_.DriveType -eq 2){"Removable"}else{"Fixed"})
      FreeGiB=if($_.FreeSpace){Format-GiB $_.FreeSpace}else{$null}
    }
  } | Format-Table -AutoSize | Out-String | Write-Output

Write-Output "STORAGE_AUDIT_COMPLETE"
