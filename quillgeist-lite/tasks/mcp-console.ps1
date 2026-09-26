$ErrorActionPreference = "Continue"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$RunnerLog = Join-Path $HomeDir "runner.log"
$ServiceLog = Join-Path $env:ProgramData "Clintware\QuillgeistLite\service-local.log"
$script:PromptVisible = $false
$script:PromptStartTop = -1
$script:InputBuffer = New-Object Text.StringBuilder
$script:RunnerLine = 0
$script:ServiceLine = 0
$script:LastActivity = Get-Date
$script:ShortIdleShown = $false
$script:LongIdleShown = $false
$script:LastHealth = ""
$script:LastHealthCheck = [DateTime]::MinValue

function Test-Admin {
  try {
    $id=[Security.Principal.WindowsIdentity]::GetCurrent()
    return (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  } catch { return $false }
}

function Suspend-McpPrompt {
  if (-not $script:PromptVisible) { return }
  try {
    $width=[Math]::Max(20,[Console]::BufferWidth-1)
    $row=[Math]::Max(0,$script:PromptStartTop)
    [Console]::SetCursorPosition(0,$row)
    [Console]::Write(" " * $width)
    [Console]::SetCursorPosition(0,$row)
  } catch { Write-Host "" }
  $script:PromptVisible=$false
}

function Show-McpPrompt {
  if ($script:PromptVisible) { return }
  $mode=if(Test-Admin){"admin"}else{"user"}
  try { $script:PromptStartTop=[Console]::CursorTop } catch { $script:PromptStartTop=-1 }
  Write-Host "mcp" -ForegroundColor Cyan -NoNewline
  Write-Host ("("+$mode+")") -ForegroundColor White -NoNewline
  Write-Host "> " -ForegroundColor Cyan -NoNewline
  $existing=$script:InputBuffer.ToString()
  if($existing){Write-Host $existing -ForegroundColor White -NoNewline}
  $script:PromptVisible=$true
}

function Mark-Activity {
  $script:LastActivity=Get-Date
  $script:ShortIdleShown=$false
  $script:LongIdleShown=$false
}

function Emit([string]$Text,[ConsoleColor]$Color=[ConsoleColor]::DarkGray) {
  Suspend-McpPrompt
  Write-Host $Text -ForegroundColor $Color
  Mark-Activity
  Show-McpPrompt
}

function Read-McpInput {
  try {
    while([Console]::KeyAvailable){
      $key=[Console]::ReadKey($true)
      if($key.Key -eq [ConsoleKey]::Enter){
        $line=$script:InputBuffer.ToString(); $null=$script:InputBuffer.Clear()
        Write-Host ""; $script:PromptVisible=$false
        return [pscustomobject]@{Ready=$true;Line=$line}
      }
      if($key.Key -eq [ConsoleKey]::Backspace){
        if($script:InputBuffer.Length -gt 0){
          $script:InputBuffer.Remove($script:InputBuffer.Length-1,1)|Out-Null
          Write-Host (([string][char]8)+" "+([string][char]8)) -NoNewline
        }
        continue
      }
      if(($key.Modifiers -band [ConsoleModifiers]::Control) -and $key.Key -eq [ConsoleKey]::C){
        Suspend-McpPrompt; $null=$script:InputBuffer.Clear(); Write-Host "^C" -ForegroundColor DarkYellow; Show-McpPrompt; continue
      }
      if(-not [char]::IsControl($key.KeyChar)){
        $null=$script:InputBuffer.Append($key.KeyChar); Write-Host ([string]$key.KeyChar) -ForegroundColor White -NoNewline
      }
    }
  } catch {}
  return [pscustomobject]@{Ready=$false;Line=$null}
}

function Get-ClintwareLineColor([string]$Line){
  $text=([string]$Line).ToUpperInvariant()
  if($text -match '\[(THREAT|CRITICAL|FATAL|ERROR)\]' -or $text -match 'THREAT|FATAL'){return [ConsoleColor]::Red}
  if($text -match '\[SECURITY\]' -or $text -match 'SECURITY'){return [ConsoleColor]::Magenta}
  if($text -match '\[(WARN|WARNING)\]' -or $text -match 'DEGRADED|OFFLINE|WAITING'){return [ConsoleColor]::Yellow}
  if($text -match '\[(OK|SUCCESS)\]' -or $text -match 'HEALTHY|CONNECTED|ACTIVE'){return [ConsoleColor]::Green}
  if($text -match '\[(INFO|NOTICE)\]'){return [ConsoleColor]::Cyan}
  if($text -match '\[(TRACE|DEBUG)\]'){return [ConsoleColor]::DarkGray}
  return [ConsoleColor]::Gray
}

function Emit-NewLines([string]$Path,[ref]$Cursor,[string]$Label){
  if(-not(Test-Path $Path)){return}
  try{
    $lines=@(Get-Content -LiteralPath $Path -ErrorAction Stop)
    if($Cursor.Value -gt $lines.Count){$Cursor.Value=0}
    if($lines.Count -gt $Cursor.Value){
      for($i=$Cursor.Value;$i -lt $lines.Count;$i++){
        $line=[string]$lines[$i]
        if($line){
          $lineColor=Get-ClintwareLineColor $line
          Emit ("["+ $Label +"] "+$line) $lineColor
        }
      }
      $Cursor.Value=$lines.Count
    }
  }catch{}
}

function Check-McpHealth {
  if(((Get-Date)-$script:LastHealthCheck).TotalSeconds -lt 15){return}
  $script:LastHealthCheck=Get-Date
  $state="offline"
  try{
    $r=Invoke-RestMethod -Uri "https://mcp.clintware.com/health" -TimeoutSec 5
    $state=if($r.ok -eq $false){"degraded"}else{"online"}
  }catch{}
  if($state -ne $script:LastHealth -or ((Get-Date)-$script:LastActivity).TotalSeconds -gt 55){
    $color=if($state -eq "online"){"Cyan"}else{"DarkYellow"}
    Emit ("MCP HEALTH // "+$state.ToUpperInvariant()+" // "+(Get-Date).ToString("T")) $color
    $script:LastHealth=$state
  }
}

function Invoke-AdminCommand([string]$Line){
  $line=([string]$Line).Trim()
  if(-not $line){Show-McpPrompt;return}
  Mark-Activity
  switch($line.ToLowerInvariant()){
    "help" { Emit "COMMANDS // health | status | clear | <PowerShell command>" Cyan; return }
    "health" { $script:LastHealthCheck=[DateTime]::MinValue; Check-McpHealth; return }
    "status" {
      $svc=Get-Service -Name "ClintwareQuillgeistLiteHealth" -ErrorAction SilentlyContinue
      Emit ("STATUS // service="+$(if($svc){$svc.Status}else{"missing"})+" // user="+[Security.Principal.WindowsIdentity]::GetCurrent().Name) Cyan
      return
    }
    "clear" { try{Clear-Host}catch{}; $script:PromptVisible=$false; Show-McpPrompt; return }
  }
  Suspend-McpPrompt
  Write-Host ("PS ADMIN // "+$line) -ForegroundColor DarkYellow
  try { Invoke-Expression $line *>&1 | ForEach-Object { Write-Host ([string]$_) -ForegroundColor White } }
  catch { Write-Host $_.Exception.Message -ForegroundColor Red }
  Show-McpPrompt
}

try{
  [Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
  $Host.UI.RawUI.BackgroundColor="Black"
  $Host.UI.RawUI.ForegroundColor="White"
  $Host.UI.RawUI.WindowTitle="Clintware™ MCP // CONTROL PLANE"
}catch{}
try{Clear-Host}catch{}
Write-Host "CLINTWARE™ MCP" -ForegroundColor White -NoNewline
Write-Host " // CONTROL PLANE" -ForegroundColor Cyan
Write-Host "Live health + QQ/service activity. Local PowerShell executes in this pane." -ForegroundColor DarkGray
Write-Host "LEVELS  " -ForegroundColor DarkGray -NoNewline
Write-Host "OK" -ForegroundColor Green -NoNewline
Write-Host "  INFO" -ForegroundColor Cyan -NoNewline
Write-Host "  WARN" -ForegroundColor Yellow -NoNewline
Write-Host "  SECURITY" -ForegroundColor Magenta -NoNewline
Write-Host "  ERROR/THREAT" -ForegroundColor Red
Write-Host ""
Show-McpPrompt

while($true){
  Emit-NewLines $RunnerLog ([ref]$script:RunnerLine) "QQ"
  Emit-NewLines $ServiceLog ([ref]$script:ServiceLine) "SERVICE"
  Check-McpHealth

  $input=Read-McpInput
  if($input.Ready){Invoke-AdminCommand ([string]$input.Line)}

  $idle=((Get-Date)-$script:LastActivity).TotalSeconds
  if($idle -ge 90 -and -not $script:LongIdleShown){
    Suspend-McpPrompt
    Write-Host "IDLE // long standby expected; MCP health polling and live logs remain active." -ForegroundColor DarkGray
    $script:LongIdleShown=$true; $script:ShortIdleShown=$true; Show-McpPrompt
  }elseif($idle -ge 12 -and -not $script:ShortIdleShown){
    Suspend-McpPrompt
    Write-Host "IDLE // short quiet period; watching for MCP, service, or qq activity." -ForegroundColor DarkGray
    $script:ShortIdleShown=$true; Show-McpPrompt
  }
  Start-Sleep -Milliseconds 180
}
