# CWInteract™
# Canonical governed desktop interaction task for visible Windows apps and signed-in browser windows.
# Uses Windows UI Automation and never types credentials or other sensitive values.
param(
  [ValidateSet("discover","launch","inspect","form")]
  [string]$Action = "discover",
  [string]$AppName = "LinkedIn",
  [string]$WindowTitle = "LinkedIn",
  [string]$Query = "",
  [string]$StepsJson = "",
  [string]$Approved = "false",
  [ValidateRange(1,100)][int]$MaxResults = 60,
  [ValidateRange(0,5000)][int]$WaitMs = 450
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class CWInteractNative {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

function Emit-Json([object]$Object) {
  $Object | ConvertTo-Json -Depth 10 -Compress
}

function Get-ControlTypeName($Element) {
  try { return [string]$Element.Current.ControlType.ProgrammaticName.Replace("ControlType.","") } catch { return "" }
}

function Get-Rect($Element) {
  try {
    $r=$Element.Current.BoundingRectangle
    [ordered]@{
      left=[math]::Round($r.Left,1); top=[math]::Round($r.Top,1)
      width=[math]::Round($r.Width,1); height=[math]::Round($r.Height,1)
      right=[math]::Round($r.Right,1); bottom=[math]::Round($r.Bottom,1)
    }
  } catch { $null }
}

function Test-Pattern($Element,$Pattern) {
  try {
    $obj=$null
    return [bool]$Element.TryGetCurrentPattern($Pattern,[ref]$obj)
  } catch { return $false }
}

function Summarize($Element) {
  if(-not $Element){ return $null }
  $patterns=@()
  if(Test-Pattern $Element ([Windows.Automation.ValuePattern]::Pattern)){$patterns+="Value"}
  if(Test-Pattern $Element ([Windows.Automation.InvokePattern]::Pattern)){$patterns+="Invoke"}
  if(Test-Pattern $Element ([Windows.Automation.SelectionItemPattern]::Pattern)){$patterns+="SelectionItem"}
  if(Test-Pattern $Element ([Windows.Automation.ExpandCollapsePattern]::Pattern)){$patterns+="ExpandCollapse"}
  if(Test-Pattern $Element ([Windows.Automation.TogglePattern]::Pattern)){$patterns+="Toggle"}
  [ordered]@{
    name=[string]$Element.Current.Name
    automation_id=[string]$Element.Current.AutomationId
    class=[string]$Element.Current.ClassName
    control_type=(Get-ControlTypeName $Element)
    enabled=[bool]$Element.Current.IsEnabled
    focusable=[bool]$Element.Current.IsKeyboardFocusable
    rect=(Get-Rect $Element)
    patterns=$patterns
  }
}

function Get-Apps([string]$Needle) {
  $apps=@(Get-StartApps | Where-Object {
    -not $Needle -or $_.Name -like ("*" + $Needle + "*")
  } | Sort-Object Name)
  return $apps
}

function Start-App([string]$Needle) {
  $apps=Get-Apps $Needle
  if(-not $apps -or $apps.Count -eq 0){ throw ("CWInteract™ could not find a Start-menu app matching: " + $Needle) }
  $exact=$apps | Where-Object { $_.Name -eq $Needle } | Select-Object -First 1
  $app=if($exact){$exact}else{$apps | Select-Object -First 1}
  Start-Process explorer.exe ("shell:AppsFolder\" + $app.AppID) | Out-Null
  return $app
}

function Get-AppWindow([string]$Needle,[int]$TimeoutSeconds=12) {
  $deadline=(Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $candidates=@(Get-Process -ErrorAction SilentlyContinue | Where-Object {
      $_.MainWindowHandle -ne 0 -and (
        -not $Needle -or $_.MainWindowTitle -like ("*" + $Needle + "*")
      )
    })
    if($candidates.Count -gt 0){
      return $candidates | Sort-Object StartTime -Descending | Select-Object -First 1
    }
    Start-Sleep -Milliseconds 300
  } while((Get-Date) -lt $deadline)
  $titles=@(Get-Process -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowHandle -ne 0} | Select-Object -ExpandProperty MainWindowTitle -First 20)
  throw ("CWInteract™ found no visible app window matching '" + $Needle + "'. Visible windows: " + ($titles -join " | "))
}

function Get-AllDescendants($Root) {
  $Root.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)
}

function Test-SensitiveElement($Element) {
  try {
    $material = (([string]$Element.Current.Name) + " " + ([string]$Element.Current.AutomationId) + " " + ([string]$Element.Current.ClassName))
    return $material -match "(?i)(password|passwd|passcode|one.?time|otp|verification.?code|security.?code|api.?key|access.?token|refresh.?token|private.?key|credit.?card|card.?number|cvv|cvc|social.?security|ssn)"
  } catch { return $false }
}

function Send-SafeText([string]$Text) {
  $escaped=$Text
  foreach($ch in @("+","^","%","~","(",")","[","]","{","}")){
    $escaped=$escaped.Replace($ch,"{" + $ch + "}")
  }
  [Windows.Forms.SendKeys]::SendWait($escaped)
}

function Find-Control($All,$Step) {
  $name=[string]$Step.name
  $contains=[string]$Step.contains
  $automationId=[string]$Step.automation_id
  $controlType=[string]$Step.control_type
  foreach($el in $All){
    try{
      $type=Get-ControlTypeName $el
      if($controlType -and -not $type.Equals($controlType,[StringComparison]::OrdinalIgnoreCase)){continue}
      $nm=[string]$el.Current.Name
      $aid=[string]$el.Current.AutomationId
      if($automationId -and -not $aid.Equals($automationId,[StringComparison]::OrdinalIgnoreCase)){continue}
      if($name -and -not $nm.Equals($name,[StringComparison]::OrdinalIgnoreCase)){continue}
      if($contains -and $nm.IndexOf($contains,[StringComparison]::OrdinalIgnoreCase) -lt 0){continue}
      if(-not $automationId -and -not $name -and -not $contains){continue}
      $r=Get-Rect $el
      if($r -and $r.width -gt 0 -and $r.height -gt 0 -and $el.Current.IsEnabled){return $el}
    }catch{}
  }
  return $null
}

function Invoke-Control($Element) {
  $obj=$null
  if($Element.TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern,[ref]$obj)){
    ([Windows.Automation.InvokePattern]$obj).Invoke()
    return
  }
  $obj=$null
  if($Element.TryGetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern,[ref]$obj)){
    ([Windows.Automation.SelectionItemPattern]$obj).Select()
    return
  }
  $Element.SetFocus()
  [Windows.Forms.SendKeys]::SendWait("{ENTER}")
}

function Set-ControlValue($Element,[string]$Text) {
  if(Test-SensitiveElement $Element){throw "Refusing to type into a sensitive control."}
  $obj=$null
  if($Element.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern,[ref]$obj)){
    ([Windows.Automation.ValuePattern]$obj).SetValue($Text)
    return
  }
  $Element.SetFocus()
  Start-Sleep -Milliseconds 100
  [Windows.Forms.SendKeys]::SendWait("^a")
  [Windows.Forms.SendKeys]::SendWait("{BACKSPACE}")
  Send-SafeText $Text
}

function Toggle-Control($Element,[bool]$Wanted) {
  $obj=$null
  if($Element.TryGetCurrentPattern([Windows.Automation.TogglePattern]::Pattern,[ref]$obj)){
    $toggle=[Windows.Automation.TogglePattern]$obj
    $isOn=$toggle.Current.ToggleState -eq [Windows.Automation.ToggleState]::On
    if($isOn -ne $Wanted){$toggle.Toggle()}
    return
  }
  Invoke-Control $Element
}

if($Action -eq "discover"){
  $apps=Get-Apps $AppName
  Emit-Json ([ordered]@{ok=$true;action="discover";query=$AppName;apps=@($apps | ForEach-Object {[ordered]@{name=$_.Name;app_id=$_.AppID}})})
  exit 0
}

$launched=$null
if($Action -eq "launch"){
  $launched=Start-App $AppName
  Start-Sleep -Milliseconds 1200
  $window=Get-AppWindow $WindowTitle 12
  Emit-Json ([ordered]@{ok=$true;action="launch";app=[ordered]@{name=$launched.Name;app_id=$launched.AppID};window_title=$window.MainWindowTitle;pid=$window.Id})
  exit 0
}

$window=Get-AppWindow $WindowTitle 12
$root=[Windows.Automation.AutomationElement]::FromHandle($window.MainWindowHandle)
if(-not $root){throw "CWInteract™ could not attach Windows UI Automation to the selected app/window."}
$all=Get-AllDescendants $root

if($Action -eq "inspect"){
  $rows=New-Object System.Collections.ArrayList
  foreach($el in $all){
    try{
      $type=Get-ControlTypeName $el
      if($type -notin @("Edit","ComboBox","Button","CheckBox","RadioButton","Hyperlink","Text","MenuItem","TabItem","ListItem")){continue}
      $s=Summarize $el
      if(-not $s.rect -or $s.rect.width -le 0 -or $s.rect.height -le 0){continue}
      if($Query -and ([string]$s.name).IndexOf($Query,[StringComparison]::OrdinalIgnoreCase) -lt 0){continue}
      [void]$rows.Add([pscustomobject]$s)
      if($rows.Count -ge $MaxResults){break}
    }catch{}
  }
  Emit-Json ([ordered]@{ok=$true;action="inspect";window_title=$window.MainWindowTitle;pid=$window.Id;query=$Query;controls=@($rows.ToArray())})
  exit 0
}

if($Action -eq "form"){
  if($Approved.Trim().ToLowerInvariant() -notin @("1","true","yes")){throw "CWInteract™ write actions require Approved=true."}
  if(-not $StepsJson){throw "StepsJson is required for form."}
  $parsed=$StepsJson | ConvertFrom-Json
  $steps=if($parsed.steps){@($parsed.steps)}else{@($parsed)}
  if($steps.Count -gt 60){throw "At most 60 UI steps are allowed."}

  [void][CWInteractNative]::ShowWindow($window.MainWindowHandle,9)
  [void][CWInteractNative]::SetForegroundWindow($window.MainWindowHandle)
  Start-Sleep -Milliseconds 250

  $results=New-Object System.Collections.ArrayList
  foreach($step in $steps){
    $op=([string]$step.op).ToLowerInvariant()
    if($op -eq "wait"){
      $ms=[math]::Min(5000,[math]::Max(0,[int]$step.ms))
      Start-Sleep -Milliseconds $ms
      [void]$results.Add([pscustomobject]@{op="wait";ok=$true;ms=$ms})
      continue
    }

    $all=Get-AllDescendants $root
    $el=Find-Control $all $step
    if(-not $el){throw ("UI control not found for step: " + ($step | ConvertTo-Json -Compress))}
    if(Test-SensitiveElement $el){throw "Refusing to interact with a sensitive control."}

    if($op -eq "fill"){Set-ControlValue $el ([string]$step.value)}
    elseif($op -eq "click"){Invoke-Control $el}
    elseif($op -eq "check"){Toggle-Control $el $true}
    elseif($op -eq "uncheck"){Toggle-Control $el $false}
    elseif($op -eq "select"){
      $el.SetFocus()
      Start-Sleep -Milliseconds 120
      [Windows.Forms.SendKeys]::SendWait("%{DOWN}")
      Start-Sleep -Milliseconds 150
      Send-SafeText ([string]$step.value)
      [Windows.Forms.SendKeys]::SendWait("{ENTER}")
    } else {throw ("Unsupported form op: " + $op)}

    Start-Sleep -Milliseconds ([math]::Max(150,$WaitMs))
    [void]$results.Add([pscustomobject]@{op=$op;ok=$true;control=(Summarize $el)})
  }

  $post=New-Object System.Collections.ArrayList
  $all=Get-AllDescendants $root
  foreach($el in $all){
    try{
      $type=Get-ControlTypeName $el
      if($type -notin @("Edit","ComboBox","Button","CheckBox","RadioButton","Hyperlink","Text","MenuItem","TabItem","ListItem")){continue}
      $s=Summarize $el
      if($s.rect -and $s.rect.width -gt 0 -and $s.rect.height -gt 0){
        [void]$post.Add([pscustomobject]$s)
        if($post.Count -ge $MaxResults){break}
      }
    }catch{}
  }
  Emit-Json ([ordered]@{ok=$true;action="form";window_title=$window.MainWindowTitle;results=@($results.ToArray());post=@($post.ToArray())})
  exit 0
}

throw ("Unsupported action: " + $Action)
