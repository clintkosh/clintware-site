$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=== CLINTWARE QUILLGEIST LITE DOCTOR ===" -ForegroundColor Cyan

Write-Host ""
Write-Host "Machine identity:" -ForegroundColor Cyan
try {
  $cs = Get-CimInstance Win32_ComputerSystem
  $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
  $gpu = Get-CimInstance Win32_VideoController | Select-Object -First 2
  $memGiB = [Math]::Round(([double]$cs.TotalPhysicalMemory / 1GB),1)
  Write-Host ("  Computer:     " + $env:COMPUTERNAME)
  Write-Host ("  Manufacturer: " + [string]$cs.Manufacturer)
  Write-Host ("  Model:        " + [string]$cs.Model)
  Write-Host ("  Memory GiB:   " + $memGiB)
  Write-Host ("  CPU:          " + [string]$cpu.Name)
  foreach($g in @($gpu)){ if($g.Name){ Write-Host ("  GPU:          " + [string]$g.Name) } }
  foreach($driveName in @("C","F")){
    $drive = Get-CimInstance Win32_LogicalDisk -Filter ("DeviceID='" + $driveName + ":'") -ErrorAction SilentlyContinue
    if($drive){
      Write-Host ("  Drive " + $driveName + ":      " + [Math]::Round(([double]$drive.FreeSpace / 1GB),1) + " GiB free / " + [Math]::Round(([double]$drive.Size / 1GB),1) + " GiB")
    } else {
      Write-Host ("  Drive " + $driveName + ":      not present")
    }
  }
} catch {
  Write-Host ("  Computer:     " + $env:COMPUTERNAME)
  Write-Host "  Hardware:     unavailable"
}

$rows = @()
foreach ($name in @("powershell","pwsh","gh","git","gcloud","python","python3","node","docker","ollama","clang","gcc","cl")) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  $rows += [PSCustomObject]@{
    Tool = $name
    Found = [bool]$cmd
    Path = if ($cmd) { $cmd.Source } else { "" }
  }
}
$rows | Format-Table -AutoSize

if (Get-Command gh -ErrorAction SilentlyContinue) {
  Write-Host ""
  Write-Host "GitHub authentication:" -ForegroundColor Cyan
  gh auth status
}

if (Get-Command gcloud -ErrorAction SilentlyContinue) {
  Write-Host ""
  Write-Host "Google Cloud accounts:" -ForegroundColor Cyan
  gcloud auth list --format="table(account,status)"
}

Write-Host ""
Write-Host "Runtime summary:" -ForegroundColor Cyan
Write-Host ("  PowerShell: " + [bool](Get-Command powershell -ErrorAction SilentlyContinue))
Write-Host ("  Python:     " + [bool]((Get-Command python -ErrorAction SilentlyContinue) -or (Get-Command python3 -ErrorAction SilentlyContinue)))
Write-Host ("  C compiler: " + [bool]((Get-Command clang -ErrorAction SilentlyContinue) -or (Get-Command gcc -ErrorAction SilentlyContinue) -or (Get-Command cl -ErrorAction SilentlyContinue)))
Write-Host ""
Write-Host "Quillgeist Lite doctor complete." -ForegroundColor Green
