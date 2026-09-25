package main

import (
  "encoding/base64"
  "fmt"
  "os"
  "os/exec"
  "strings"
  "unicode/utf16"
)

const version = "2.1.0"

func main() {
  args := os.Args[1:]
  if has(args, "--selftest") {
    s := script(false, true)
    ok := strings.Contains(s, "Get-ScheduledTask") && strings.Contains(s, "Hidden = $true") && strings.Contains(s, "Listen to this device") && strings.Contains(s, "Jabra")
    if !ok { fmt.Println("CLINTWARE_AUDIO_FOCUS_FIX_SELFTEST=FAIL"); os.Exit(1) }
    fmt.Println("CLINTWARE_AUDIO_FOCUS_FIX_SELFTEST=PASS")
    fmt.Println("VERSION="+version)
    return
  }
  if !admin() { if err:=elevate(); err!=nil { fmt.Println("Administrator access is required:",err); fmt.Scanln() }; return }
  fmt.Println("============================================================")
  fmt.Println(" CLINTWARE // AUDIO + FOCUS FIX")
  fmt.Println(" Windows echo isolation + recurring task popup repair")
  fmt.Println(" Version",version)
  fmt.Println("============================================================")
  var ps string
  switch {
  case has(args,"--diagnose"): ps = common + `\nDiagnoseAudio\nDiagnoseTasks\n`
  case has(args,"--tasks-only"): ps = common + `\nDiagnoseTasks\nHideRecurringTasks\n`
  case has(args,"--restore-tasks"): ps = common + `\nRestoreTasks\n`
  case has(args,"--audio-only"): ps = script(has(args,"--deep"), false)
  default: ps = script(has(args,"--deep"), true)
  }
  runPS(ps)
  if !has(args,"--quiet") { fmt.Println("\nPress Enter to close."); fmt.Scanln() }
}

func has(a []string,w string) bool { for _,x:=range a { if strings.EqualFold(x,w){return true} }; return false }
func admin() bool { return exec.Command("cmd.exe","/C","net session >nul 2>&1").Run()==nil }
func elevate() error {
  exe,e:=os.Executable(); if e!=nil{return e}
  var a []string; for _,x:=range os.Args[1:] { a=append(a,strings.ReplaceAll(x,"'","''")) }
  ps:=fmt.Sprintf("Start-Process -FilePath '%s' -ArgumentList '%s' -Verb RunAs",strings.ReplaceAll(exe,"'","''"),strings.ReplaceAll(strings.Join(a," "),"'","''"))
  return exec.Command("powershell.exe","-NoProfile","-NonInteractive","-Command",ps).Run()
}
func runPS(s string) {
  enc:=base64.StdEncoding.EncodeToString(utf16le(s))
  c:=exec.Command("powershell.exe","-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-EncodedCommand",enc)
  c.Stdout,c.Stderr,c.Stdin=os.Stdout,os.Stderr,os.Stdin
  if e:=c.Run();e!=nil{fmt.Println("[ERROR]",e)}
}
func utf16le(s string) []byte { u:=utf16.Encode([]rune(s)); b:=make([]byte,0,len(u)*2); for _,x:=range u {b=append(b,byte(x),byte(x>>8))}; return b }

const common = `$ErrorActionPreference='Continue'
$DataDir=Join-Path $env:ProgramData 'Clintware\AudioFocusFix'
$TaskBackup=Join-Path $DataDir 'scheduled-tasks'
$Capture='HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Capture'
$Render='HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render'
$ListenName='{24dbb0fc-9311-4b3d-9cf0-18ff155639d4},1'
$FxName='{1da5d803-d492-4edd-8c23-e0c0ffee7f0e},5'
New-Item -ItemType Directory -Force -Path $DataDir,$TaskBackup|Out-Null
function Friendly($i){
 try{$p=Join-Path $i.PSPath 'Properties';if(Test-Path $p){foreach($n in (Get-Item $p).Property){$v=Get-ItemPropertyValue -Path $p -Name $n -ErrorAction SilentlyContinue;if($v -is [string] -and $v -match 'Jabra|TCL|Microphone|Speaker|Headphone|Headset|Realtek|Bluetooth|Stereo Mix|Loopback'){return $v}}}}catch{}
 return $i.PSChildName
}
function Endpoints($base,$cap){$r=@();if(!(Test-Path $base)){return $r};Get-ChildItem $base -ErrorAction SilentlyContinue|%{$st=Get-ItemPropertyValue -Path $_.PSPath -Name DeviceState -ErrorAction SilentlyContinue;if($null -ne $st -and [int]$st -ne 1){return};$n=Friendly $_;$m=$false;if($cap){$raw=Get-ItemPropertyValue -Path $_.PSPath -Name $ListenName -ErrorAction SilentlyContinue;if($raw -is [byte[]] -and (@($raw|?{$_ -eq 255})).Count -ge 2){$m=$true}};$r+=[pscustomobject]@{Name=$n;Path=$_.PSPath;Monitor=$m;Capture=$cap}};return $r}
function DiagnoseAudio{
 Write-Host '--- AUDIO DIAGNOSTIC ----------------------------------------' -ForegroundColor Cyan
 $i=@(Endpoints $Capture $true);$o=@(Endpoints $Render $false)
 foreach($d in $i){$f='';if($d.Monitor){$f=' <-- Listen to this device / mic monitoring may be on'}elseif($d.Name -match 'Stereo Mix|Loopback|What U Hear|Wave Out'){$f=' <-- LOOPBACK INPUT'}elseif($d.Name -match 'Jabra'){$f=' <-- JABRA INPUT'};Write-Host ('INPUT  '+$d.Name+$f)}
 foreach($d in $o){$f='';if($d.Name -match 'Hands-Free|Headset'){$f=' <-- HANDS-FREE PROFILE'}elseif($d.Name -match 'Jabra'){$f=' <-- JABRA OUTPUT'}elseif($d.Name -match 'TCL'){$f=' <-- TCL OUTPUT'};Write-Host ('OUTPUT '+$d.Name+$f)}
 if((@($i|? Monitor)).Count -gt 0){Write-Host 'LIKELY ROOT CAUSE: Windows Listen to this device / microphone monitoring.' -ForegroundColor Yellow}else{Write-Host 'No definite Listen flag found. Jabra sidetone, Bluetooth profile, driver state, hardware, or acoustic feedback can still cause echo.' -ForegroundColor DarkYellow}
}
function RepairAudio([bool]$Deep){
 & reg.exe export "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Capture" (Join-Path $DataDir 'capture-backup.reg') /y|Out-Null
 & reg.exe export "HKCU\Software\Microsoft\Multimedia\Audio" (Join-Path $DataDir 'audio-user-backup.reg') /y|Out-Null
 $c=0;if(Test-Path $Capture){Get-ChildItem $Capture -ErrorAction SilentlyContinue|%{$n=Friendly $_;try{if($null -ne (Get-ItemPropertyValue -Path $_.PSPath -Name $ListenName -ErrorAction SilentlyContinue)){Remove-ItemProperty -Path $_.PSPath -Name $ListenName -ErrorAction Stop;Write-Host ('Disabled mic monitoring: '+$n) -ForegroundColor Green;$c++}}catch{};if($Deep){try{$fx=Join-Path $_.PSPath 'FxProperties';if(Test-Path $fx){New-ItemProperty -Path $fx -Name $FxName -PropertyType DWord -Value 1 -Force|Out-Null;Write-Host ('Disabled capture effects: '+$n) -ForegroundColor Green;$c++}}catch{}}}}
 try{$k='HKCU:\Software\Microsoft\Multimedia\Audio';New-Item -Path $k -Force|Out-Null;New-ItemProperty -Path $k -Name UserDuckingPreference -PropertyType DWord -Value 3 -Force|Out-Null}catch{}
 try{Restart-Service AudioSrv -Force -ErrorAction Stop;Write-Host 'Windows Audio restarted.' -ForegroundColor Green}catch{Write-Host 'Audio service restart warning.' -ForegroundColor Yellow}
 Write-Host ('Audio changes applied: '+$c)
}
function Candidates{
 $r=@();Get-ScheduledTask -ErrorAction SilentlyContinue|?{$_.TaskPath -notlike '\Microsoft\*'}|%{$t=$_;try{$x=[xml](Export-ScheduledTask -TaskName $t.TaskName -TaskPath $t.TaskPath)}catch{return};$mins=@();@($x.Task.Triggers.ChildNodes|%{$_.Repetition.Interval}|?{$_})|%{try{$mins+=[xml.XmlConvert]::ToTimeSpan([string]$_).TotalMinutes}catch{}};$a=(@($t.Actions|%{($_.Execute+' '+$_.Arguments)}))-join ' ';$freq=($mins|?{$_ -le 5}).Count -gt 0;$interesting=$a -match 'powershell|pwsh|cmd\.exe|\.ps1|\.bat|\.cmd|python|quillgeist|qq|clintware';if($freq -or $interesting){$r+=[pscustomobject]@{Task=$t;Minutes=($mins -join ',');Action=$a;Frequent=$freq}}};return $r
}
function DiagnoseTasks{Write-Host '--- RECURRING TASK DIAGNOSTIC -------------------------------' -ForegroundColor Cyan;$r=@(Candidates);if($r.Count -eq 0){Write-Host 'No non-Microsoft frequent/script tasks detected.';return};foreach($x in $r){$f=if($x.Frequent){'FREQUENT'}else{'SCRIPT'};Write-Host ('['+$f+'] '+$x.Task.TaskPath+$x.Task.TaskName+' interval='+$x.Minutes+' action='+$x.Action)}}
function HideRecurringTasks{
 $c=0;foreach($x in @(Candidates)){$t=$x.Task;try{$safe=(($t.TaskPath+$t.TaskName)-replace '[^a-zA-Z0-9._-]','_');Export-ScheduledTask -TaskName $t.TaskName -TaskPath $t.TaskPath|Set-Content (Join-Path $TaskBackup ($safe+'.xml')) -Encoding Unicode;$s=$t.Settings;if($s.Hidden -ne $true){$s.Hidden=$true;Set-ScheduledTask -TaskName $t.TaskName -TaskPath $t.TaskPath -Settings $s|Out-Null;Write-Host ('Hidden/background task: '+$t.TaskPath+$t.TaskName) -ForegroundColor Green;$c++}}catch{Write-Host ('Task update warning: '+$t.TaskName) -ForegroundColor Yellow}};Write-Host ('Recurring task display changes: '+$c)
}
function RestoreTasks{if(!(Test-Path $TaskBackup)){Write-Host 'No task backups found.';return};Get-ChildItem $TaskBackup -Filter *.xml|%{try{$raw=Get-Content $_.FullName -Raw;$doc=[xml]$raw;$uri=[string]$doc.Task.RegistrationInfo.URI;if(!$uri){return};$leaf=Split-Path $uri -Leaf;$path=$uri.Substring(0,$uri.Length-$leaf.Length);Register-ScheduledTask -TaskName $leaf -TaskPath $path -Xml $raw -Force|Out-Null;Write-Host ('Restored task: '+$uri) -ForegroundColor Green}catch{Write-Host ('Restore warning: '+$_.Name) -ForegroundColor Yellow}}}
`

func script(deep,tasks bool) string {
  d := "$Deep=$false"; if deep { d="$Deep=$true" }
  s := common+"\n"+d+"\nDiagnoseAudio\nRepairAudio $Deep\n"
  if tasks { s += "\nDiagnoseTasks\nHideRecurringTasks\n" }
  s += `
Write-Host ''
Write-Host 'TEST ORDER:' -ForegroundColor Cyan
Write-Host '1. Keep Discord closed and test the TCL/external speaker.'
Write-Host '2. If echo remains, disconnect Jabra completely and test again.'
Write-Host '3. If Jabra removal stops it, investigate Jabra sidetone, Hands-Free profile, firmware/driver, or hardware.'
`
  return s
}
