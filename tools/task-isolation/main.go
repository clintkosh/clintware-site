//go:build windows

package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unicode/utf16"
	"unsafe"
)

const version = "1.1.0"

var (
	user32 = syscall.NewLazyDLL("user32.dll")
	messageBoxW = user32.NewProc("MessageBoxW")
)

type workerSpec struct {
	Command string `json:"command"`
	Arguments string `json:"arguments"`
	WorkingDir string `json:"working_dir"`
}

func main() {
	args := os.Args[1:]
	if i := indexOf(args, "--worker-b64"); i >= 0 && i+1 < len(args) {
		os.Exit(runWorker(args[i+1]))
	}
	if has(args, "--selftest") {
		if selfTest() { os.Exit(0) }
		os.Exit(1)
	}
	if !isAdmin() {
		if err := elevate(); err != nil { msg("Clintware Task Isolation", "Administrator access is required.\n\n"+err.Error(), 0x10) }
		return
	}
	installed, err := installSelf()
	if err != nil {
		msg("Clintware Task Isolation", "Could not install the background helper.\n\n"+err.Error(), 0x10)
		return
	}
	mode := "apply"
	if has(args, "--scan") { mode = "scan" }
	if has(args, "--restore") { mode = "restore" }
	quiet := has(args, "--quiet") || has(args, "--qq-auto")
	restartRunning := !has(args, "--no-restart-running")

	out, runErr := runPowerShell(buildScript(installed, mode, restartRunning))
	writeLog(mode, out, runErr)
	if !quiet {
		flags := uintptr(0x40)
		if runErr != nil { flags = 0x10 }
		msg("Clintware Task Isolation", trimForBox(out)+"\n\nLog:\n"+logPath(), flags)
	}
	if runErr != nil { os.Exit(1) }
}

func selfTest() bool {
	s := buildScript(`C:\ProgramData\Clintware\TaskIsolation\Clintware-TaskIsolation.exe`, "apply", true)
	ok := strings.Contains(s, "Get-ScheduledTask") &&
		strings.Contains(s, "Export-ScheduledTask") &&
		strings.Contains(s, "Set-ScheduledTask") &&
		strings.Contains(s, "--worker-b64") &&
		strings.Contains(s, "Stop-ScheduledTask") &&
		strings.Contains(s, "Start-ScheduledTask") &&
		strings.Contains(s, "\\Microsoft\\*") &&
		strings.Contains(s, "launch-visible.ps1")
	if ok { fmt.Println("CLINTWARE_TASK_ISOLATION_SELFTEST=PASS") } else { fmt.Println("CLINTWARE_TASK_ISOLATION_SELFTEST=FAIL") }
	return ok
}

func runWorker(encoded string) int {
	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil { return 87 }
	var spec workerSpec
	if err = json.Unmarshal(raw, &spec); err != nil || strings.TrimSpace(spec.Command) == "" { return 87 }

	line := quoteCmd(spec.Command)
	if strings.TrimSpace(spec.Arguments) != "" { line += " " + spec.Arguments }
	c := exec.Command("cmd.exe", "/D", "/S", "/C", line)
	if spec.WorkingDir != "" { c.Dir = spec.WorkingDir }
	c.Stdin, c.Stdout, c.Stderr = nil, nil, nil
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	if err := c.Run(); err != nil {
		if ee, ok := err.(*exec.ExitError); ok { return ee.ExitCode() }
		return 1
	}
	return 0
}

func quoteCmd(s string) string { return `"` + strings.ReplaceAll(s, `"`, `\"`) + `"` }

func isAdmin() bool {
	c := exec.Command("cmd.exe", "/D", "/C", "net session >nul 2>&1")
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	return c.Run() == nil
}

func elevate() error {
	exe, err := os.Executable()
	if err != nil { return err }
	var aa []string
	for _, a := range os.Args[1:] { aa = append(aa, strings.ReplaceAll(a, "'", "''")) }
	ps := fmt.Sprintf("Start-Process -FilePath '%s' -ArgumentList '%s' -Verb RunAs",
		strings.ReplaceAll(exe, "'", "''"),
		strings.ReplaceAll(strings.Join(aa, " "), "'", "''"))
	c := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ps)
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	return c.Run()
}

func installSelf() (string, error) {
	exe, err := os.Executable()
	if err != nil { return "", err }
	dir := filepath.Join(os.Getenv("ProgramData"), "Clintware", "TaskIsolation")
	if err = os.MkdirAll(dir, 0755); err != nil { return "", err }
	dst := filepath.Join(dir, "Clintware-TaskIsolation.exe")
	a, _ := filepath.Abs(exe)
	b, _ := filepath.Abs(dst)
	if strings.EqualFold(a, b) { return dst, nil }
	data, err := os.ReadFile(exe)
	if err != nil { return "", err }
	if err = os.WriteFile(dst, data, 0755); err != nil { return "", err }
	return dst, nil
}

func runPowerShell(script string) (string, error) {
	enc := base64.StdEncoding.EncodeToString(utf16le(script))
	c := exec.Command("powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", enc)
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	b, err := c.CombinedOutput()
	return strings.TrimSpace(string(b)), err
}

func buildScript(helper, mode string, restart bool) string {
	h := strings.ReplaceAll(helper, "'", "''")
	restartPS := "$RestartRunning=$false"
	if restart { restartPS = "$RestartRunning=$true" }
	return fmt.Sprintf(`$ErrorActionPreference='Stop'
$Mode='%s'
$Helper='%s'
%s
$Root=Join-Path $env:ProgramData 'Clintware\TaskIsolation'
$Backup=Join-Path $Root 'backups'
$Manifest=Join-Path $Root 'manifest.json'
New-Item -ItemType Directory -Force -Path $Root,$Backup | Out-Null

function Is-InteractiveConsoleAction($a){
  $x=(([string]$a.Execute)+' '+([string]$a.Arguments)).ToLowerInvariant()
  if($x -match 'launch-visible\.ps1|start-qq-window\.ps1'){ return $false }
  return ($x -match '(^|[\\/ ])(powershell|pwsh|cmd|conhost)(\.exe)?([ "''\\/]|$)|\.ps1([ "'' ]|$)|\.cmd([ "'' ]|$)|\.bat([ "'' ]|$)|(^|[\\/ ])python(w)?(\.exe)?([ "'' ]|$)|(^|[\\/ ])node(\.exe)?([ "'' ]|$)')
}
function Safe-Name($t){ return (($t.TaskPath+$t.TaskName) -replace '[^a-zA-Z0-9._-]','_') }
function Encode-Spec($a){
  $o=[ordered]@{command=[string]$a.Execute;arguments=[string]$a.Arguments;working_dir=[string]$a.WorkingDirectory}
  $j=$o|ConvertTo-Json -Compress
  return [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($j))
}
function Candidates {
  $rows=@()
  Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object {
    $_.TaskPath -notlike '\Microsoft\*' -and $_.TaskName -notlike 'Clintware Task Isolation*'
  } | ForEach-Object {
    $t=$_
    $allExec=(@($t.Actions | Where-Object { -not $_.Execute }).Count -eq 0)
    if(-not $allExec){ return }
    $matches=@($t.Actions | Where-Object { Is-InteractiveConsoleAction $_ })
    if($matches.Count -gt 0){ $rows += [pscustomobject]@{Task=$t;Matches=$matches.Count;State=[string]$t.State} }
  }
  return $rows
}
function Backup-Task($t){
  $f=Join-Path $Backup ((Safe-Name $t)+'.xml')
  if(!(Test-Path $f)){ Export-ScheduledTask -TaskName $t.TaskName -TaskPath $t.TaskPath | Set-Content -LiteralPath $f -Encoding Unicode }
  return $f
}
function Restore-All {
  $n=0
  Get-ChildItem $Backup -Filter *.xml -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $doc=[xml](Get-Content $_.FullName -Raw)
      $uri=[string]$doc.Task.RegistrationInfo.URI
      if(!$uri){ return }
      $name=Split-Path $uri -Leaf
      $path=$uri.Substring(0,$uri.Length-$name.Length)
      $acts=@()
      foreach($e in @($doc.Task.Actions.Exec)){
        if($null -eq $e){ continue }
        $p=@{Execute=[string]$e.Command}
        if([string]$e.Arguments){$p.Argument=[string]$e.Arguments}
        if([string]$e.WorkingDirectory){$p.WorkingDirectory=[string]$e.WorkingDirectory}
        $acts += New-ScheduledTaskAction @p
      }
      if($acts.Count -gt 0){ Set-ScheduledTask -TaskName $name -TaskPath $path -Action $acts | Out-Null; $n++ }
    } catch {}
  }
  Write-Output ('Restored original actions for '+$n+' task(s).')
}
if($Mode -eq 'restore'){ Restore-All; exit 0 }

$c=@(Candidates)
if($Mode -eq 'scan'){
  Write-Output ('Found '+$c.Count+' task(s) with desktop-interactive console actions.')
  foreach($r in $c){ Write-Output (' - '+$r.Task.TaskPath+$r.Task.TaskName+' | state='+$r.State+' | matching-actions='+$r.Matches) }
  exit 0
}

$manifest=@(); $changed=0; $restarted=0
foreach($r in $c){
  $t=$r.Task
  try {
    $backupFile=Backup-Task $t
    $new=@(); $modified=$false
    foreach($a in @($t.Actions)){
      if(Is-InteractiveConsoleAction $a){
        $spec=Encode-Spec $a
        $new += New-ScheduledTaskAction -Execute $Helper -Argument ('--worker-b64 '+$spec)
        $modified=$true
      } else {
        $p=@{Execute=[string]$a.Execute}
        if([string]$a.Arguments){$p.Argument=[string]$a.Arguments}
        if([string]$a.WorkingDirectory){$p.WorkingDirectory=[string]$a.WorkingDirectory}
        $new += New-ScheduledTaskAction @p
      }
    }
    if($modified){
      $wasRunning=([string]$t.State -eq 'Running')
      Set-ScheduledTask -TaskName $t.TaskName -TaskPath $t.TaskPath -Action $new | Out-Null
      $changed++
      if($RestartRunning -and $wasRunning){
        Stop-ScheduledTask -TaskName $t.TaskName -TaskPath $t.TaskPath -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 250
        Start-ScheduledTask -TaskName $t.TaskName -TaskPath $t.TaskPath -ErrorAction Stop
        $restarted++
      }
      $manifest += [pscustomobject]@{task_path=$t.TaskPath;task_name=$t.TaskName;backup=$backupFile;was_running=$wasRunning;updated=(Get-Date).ToUniversalTime().ToString('o')}
    }
  } catch { Write-Output ('SKIP '+$t.TaskPath+$t.TaskName+' :: '+$_.Exception.Message) }
}
$manifest|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $Manifest -Encoding UTF8
Write-Output ('Found '+$c.Count+' candidate task(s).')
Write-Output ('Converted '+$changed+' task(s) to true no-console background execution.')
Write-Output ('Restarted '+$restarted+' currently-running task(s) under the new background wrapper.')
Write-Output ('Microsoft tasks and Clintware Quillgeist Lite managed tasks were left unchanged.')
Write-Output ('Backups: '+$Backup)
Write-Output ('Restore: Clintware-TaskIsolation.exe --restore')
`, mode, h, restartPS)
}

func utf16le(s string) []byte { u:=utf16.Encode([]rune(s)); b:=make([]byte,0,len(u)*2); for _,x:=range u{b=append(b,byte(x),byte(x>>8))}; return b }
func has(a []string,w string) bool { return indexOf(a,w)>=0 }
func indexOf(a []string,w string) int { for i,x:=range a{if strings.EqualFold(x,w){return i}}; return -1 }
func logPath() string { return filepath.Join(os.Getenv("ProgramData"),"Clintware","TaskIsolation","last-run.log") }
func writeLog(mode,out string,err error){ _=os.MkdirAll(filepath.Dir(logPath()),0755); s:="version="+version+"\nmode="+mode+"\n\n"+out+"\n"; if err!=nil{s+="\nerror="+err.Error()+"\n"}; _=os.WriteFile(logPath(),[]byte(s),0644) }
func trimForBox(s string) string { if s==""{return "Completed."}; if len(s)>3500{return s[:3500]+"\n..."}; return s }
func msg(title,text string,flags uintptr){ t,_:=syscall.UTF16PtrFromString(text); c,_:=syscall.UTF16PtrFromString(title); messageBoxW.Call(0,uintptr(unsafe.Pointer(t)),uintptr(unsafe.Pointer(c)),flags) }
