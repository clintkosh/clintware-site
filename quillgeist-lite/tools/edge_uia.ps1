param(
  [ValidateSet("inspect","skill-single","skills","form")]
  [string]$Action = "inspect",
  [string]$WindowTitle = "",
  [string]$Query = "Skills",
  [string]$Value = "",
  [string]$StepsJson = "",
  [string]$Approved = "false",
  [ValidateRange(1,100)][int]$MaxResults = 30,
  [ValidateRange(0,5000)][int]$WaitMs = 450
)
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class QQEdgeNative {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

function Emit-Json([object]$Object) {
  $Object | ConvertTo-Json -Depth 8 -Compress
}

function Get-ControlTypeName($Element) {
  try { return [string]$Element.Current.ControlType.ProgrammaticName.Replace("ControlType.","") } catch { return "" }
}

function Get-Rect($Element) {
  try {
    $r = $Element.Current.BoundingRectangle
    return [ordered]@{
      left=[math]::Round($r.Left,1); top=[math]::Round($r.Top,1)
      width=[math]::Round($r.Width,1); height=[math]::Round($r.Height,1)
      right=[math]::Round($r.Right,1); bottom=[math]::Round($r.Bottom,1)
    }
  } catch { return $null }
}

function Summarize($Element) {
  if (-not $Element) { return $null }
  $rect = Get-Rect $Element
  $patterns = New-Object System.Collections.Generic.List[string]
  foreach ($pair in @(
    @("Value",[Windows.Automation.ValuePattern]::Pattern),
    @("Invoke",[Windows.Automation.InvokePattern]::Pattern),
    @("SelectionItem",[Windows.Automation.SelectionItemPattern]::Pattern),
    @("ExpandCollapse",[Windows.Automation.ExpandCollapsePattern]::Pattern),
    @("Toggle",[Windows.Automation.TogglePattern]::Pattern)
  )) {
    try {
      $patternObject = $null
      if ($Element.TryGetCurrentPattern($pair[1],[ref]$patternObject)) { $patterns.Add($pair[0]) }
    } catch {}
  }
  return [ordered]@{
    name=[string]$Element.Current.Name
    automation_id=[string]$Element.Current.AutomationId
    class=[string]$Element.Current.ClassName
    control_type=(Get-ControlTypeName $Element)
    enabled=[bool]$Element.Current.IsEnabled
    focusable=[bool]$Element.Current.IsKeyboardFocusable
    rect=$rect
    patterns=@($patterns)
  }
}

function Get-EdgeWindow {
  param([string]$Title)
  $candidates = @(Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 })
  if (-not $candidates) { throw "No visible Microsoft Edge window is available." }
  if ($Title) {
    $match = $candidates | Where-Object { $_.MainWindowTitle -like ("*" + $Title + "*") } | Select-Object -First 1
    if ($match) { return $match }
  }
  $paylocity = $candidates | Where-Object { $_.MainWindowTitle -match "(?i)(Paylocity|Product Director|Red Rover)" } | Select-Object -First 1
  if ($paylocity) { return $paylocity }
  $titles = ($candidates | Select-Object -First 8 | ForEach-Object { $_.MainWindowTitle }) -join " | "
  throw ("Requested Edge window was not found. Visible Edge titles: " + $titles)
}

function Get-AllDescendants($Root) {
  return $Root.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)
}

function Find-Anchors($All,[string]$Text) {
  $out = New-Object System.Collections.Generic.List[object]
  foreach ($el in $All) {
    try {
      $name=[string]$el.Current.Name
      if ($name -and $name.Trim().Equals($Text,[StringComparison]::OrdinalIgnoreCase)) { $out.Add($el) }
    } catch {}
  }
  if ($out.Count -eq 0) {
    foreach ($el in $All) {
      try {
        $name=[string]$el.Current.Name
        if ($name -and $name.IndexOf($Text,[StringComparison]::OrdinalIgnoreCase) -ge 0) { $out.Add($el) }
      } catch {}
    }
  }
  return @($out)
}

function Get-NearbyControls($All,$Anchor,[int]$Limit) {
  $anchorRect = Get-Rect $Anchor
  $rows = New-Object System.Collections.Generic.List[object]
  foreach ($el in $All) {
    try {
      $type=Get-ControlTypeName $el
      if ($type -notin @("Edit","ComboBox","Button","List","ListItem","Custom","Text","Document","Pane")) { continue }
      $s=Summarize $el
      if (-not $s.rect -or $s.rect.width -le 0 -or $s.rect.height -le 0) { continue }
      $distance = if ($anchorRect) {
        $dy = if ($s.rect.top -ge $anchorRect.bottom) { $s.rect.top - $anchorRect.bottom } else { [math]::Abs($s.rect.top - $anchorRect.top) }
        $dx = [math]::Abs($s.rect.left - $anchorRect.left)
        [math]::Round(($dy * 2) + ($dx * 0.15),1)
      } else { 999999 }
      if ($distance -le 900 -or $type -in @("Edit","ComboBox")) {
        $s["distance"]=$distance
        $rows.Add([pscustomobject]$s)
      }
    } catch {}
  }
  return @($rows | Sort-Object distance | Select-Object -First $Limit)
}

function Send-SafeText([string]$Text) {
  # Escape SendKeys metacharacters while preserving ordinary text.
  $escaped = $Text
  foreach ($ch in @("+","^","%","~","(",")","[","]","{","}")) {
    $escaped = $escaped.Replace($ch,"{" + $ch + "}")
  }
  [Windows.Forms.SendKeys]::SendWait($escaped)
}

function Find-SkillEditor($All,$Anchor) {
  $anchorRect=Get-Rect $Anchor
  $candidates=New-Object System.Collections.Generic.List[object]
  foreach($el in $All){
    try{
      $type=Get-ControlTypeName $el
      if($type -notin @("Edit","ComboBox")){continue}
      $r=Get-Rect $el
      if(-not $r -or $r.width -le 0 -or $r.height -le 0){continue}
      if($anchorRect){
        $dy=$r.top-$anchorRect.bottom
        if($dy -lt -40 -or $dy -gt 500){continue}
        $dx=[math]::Abs($r.left-$anchorRect.left)
        $score=[math]::Round(($dy*2)+($dx*0.1),1)
      } else {$score=999999}
      $candidates.Add([pscustomobject]@{element=$el;score=$score;summary=(Summarize $el)})
    }catch{}
  }
  return $candidates | Sort-Object score | Select-Object -First 1
}

function Test-SensitiveElement($Element) {
  try {
    $material = (([string]$Element.Current.Name) + " " + ([string]$Element.Current.AutomationId) + " " + ([string]$Element.Current.ClassName))
    return $material -match "(?i)(password|passwd|passcode|one.?time|otp|verification.?code|security.?code|api.?key|access.?token|refresh.?token|private.?key|credit.?card|card.?number|cvv|cvc|social.?security|ssn)"
  } catch { return $false }
}

function Find-Control($All,$Step) {
  $name = [string]$Step.name
  $contains = [string]$Step.contains
  $automationId = [string]$Step.automation_id
  $controlType = [string]$Step.control_type
  $matches = New-Object System.Collections.Generic.List[object]
  foreach($el in $All){
    try {
      $type = Get-ControlTypeName $el
      if($controlType -and -not $type.Equals($controlType,[StringComparison]::OrdinalIgnoreCase)){ continue }
      $nm = [string]$el.Current.Name
      $aid = [string]$el.Current.AutomationId
      if($automationId -and -not $aid.Equals($automationId,[StringComparison]::OrdinalIgnoreCase)){ continue }
      if($name -and -not $nm.Equals($name,[StringComparison]::OrdinalIgnoreCase)){ continue }
      if($contains -and $nm.IndexOf($contains,[StringComparison]::OrdinalIgnoreCase) -lt 0){ continue }
      if(-not $automationId -and -not $name -and -not $contains){ continue }
      $r = Get-Rect $el
      if($r -and $r.width -gt 0 -and $r.height -gt 0 -and $el.Current.IsEnabled){ $matches.Add($el) }
    } catch {}
  }
  if($matches.Count -eq 0){ return $null }
  return $matches | Sort-Object { try { $_.Current.BoundingRectangle.Top } catch { 999999 } } | Select-Object -First 1
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
  if(Test-SensitiveElement $Element){ throw "Refusing to type into a credential/sensitive control." }
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

function Toggle-Control($Element,[bool]$Wanted=$true) {
  $obj=$null
  if($Element.TryGetCurrentPattern([Windows.Automation.TogglePattern]::Pattern,[ref]$obj)){
    $toggle=[Windows.Automation.TogglePattern]$obj
    $isOn = $toggle.Current.ToggleState -eq [Windows.Automation.ToggleState]::On
    if($isOn -ne $Wanted){ $toggle.Toggle() }
    return
  }
  Invoke-Control $Element
}

$window=Get-EdgeWindow -Title $WindowTitle
$root=[Windows.Automation.AutomationElement]::FromHandle($window.MainWindowHandle)
if(-not $root){throw "Could not attach Windows UI Automation to the selected Edge window."}
$all=Get-AllDescendants $root

if($Action -eq "inspect"){
  $anchors=if($Query){Find-Anchors $all $Query}else{@()}
  if($anchors -and $anchors.Count -gt 0){
    $anchor=$anchors | Sort-Object { try { $_.Current.BoundingRectangle.Top } catch { 999999 } } | Select-Object -First 1
    $nearby=Get-NearbyControls $all $anchor $MaxResults
    Emit-Json ([ordered]@{
      ok=$true;action="inspect";window_title=$window.MainWindowTitle;query=$Query
      anchor=(Summarize $anchor);nearby=$nearby
    })
    exit 0
  }
  $interactive=New-Object System.Collections.Generic.List[object]
  foreach($el in $all){
    try{
      $type=Get-ControlTypeName $el
      if($type -notin @("Edit","ComboBox","Button","CheckBox","RadioButton","Hyperlink","Text")){continue}
      $s=Summarize $el
      if(-not $s.rect -or $s.rect.width -le 0 -or $s.rect.height -le 0){continue}
      if($Query -and ([string]$s.name).IndexOf($Query,[StringComparison]::OrdinalIgnoreCase) -lt 0 -and $interactive.Count -ge [math]::Floor($MaxResults/2)){continue}
      $interactive.Add([pscustomobject]$s)
      if($interactive.Count -ge $MaxResults){break}
    }catch{}
  }
  Emit-Json ([ordered]@{ok=$true;action="inspect";window_title=$window.MainWindowTitle;query=$Query;anchor=$null;nearby=@($interactive)})
  exit 0
}

if($Action -eq "form"){
  if($Approved.Trim().ToLowerInvariant() -notin @("1","true","yes")){
    throw "Edge UI Automation write actions require Approved=true."
  }
  if(-not $StepsJson){throw "StepsJson is required for form."}
  $parsed=$StepsJson | ConvertFrom-Json
  $steps=if($parsed.steps){@($parsed.steps)}else{@($parsed)}
  if($steps.Count -gt 60){throw "At most 60 UI steps are allowed."}

  [void][QQEdgeNative]::ShowWindow($window.MainWindowHandle,9)
  [void][QQEdgeNative]::SetForegroundWindow($window.MainWindowHandle)
  Start-Sleep -Milliseconds 250

  $results=New-Object System.Collections.Generic.List[object]
  foreach($step in $steps){
    $op=([string]$step.op).ToLowerInvariant()
    if($op -eq "wait"){
      $ms=[math]::Min(5000,[math]::Max(0,[int]$step.ms))
      Start-Sleep -Milliseconds $ms
      $results.Add([pscustomobject]@{op="wait";ok=$true;ms=$ms})
      continue
    }

    # Refresh the accessibility tree after each navigation-affecting action.
    $all=Get-AllDescendants $root
    $el=Find-Control $all $step
    if(-not $el){throw ("UI control not found for step: " + ($step | ConvertTo-Json -Compress))}
    if(Test-SensitiveElement $el){throw "Refusing to interact with a credential/sensitive control."}

    if($op -eq "fill"){
      Set-ControlValue $el ([string]$step.value)
    } elseif($op -eq "click"){
      Invoke-Control $el
    } elseif($op -eq "check"){
      Toggle-Control $el $true
    } elseif($op -eq "uncheck"){
      Toggle-Control $el $false
    } elseif($op -eq "select"){
      $el.SetFocus()
      Start-Sleep -Milliseconds 120
      [Windows.Forms.SendKeys]::SendWait("%{DOWN}")
      Start-Sleep -Milliseconds 150
      Send-SafeText ([string]$step.value)
      [Windows.Forms.SendKeys]::SendWait("{ENTER}")
    } elseif($op -eq "upload"){
      $file=[string]$step.value
      if(-not $file -or -not (Test-Path -LiteralPath $file)){throw ("Upload file does not exist: " + $file)}
      Invoke-Control $el
      Start-Sleep -Milliseconds 700
      Send-SafeText $file
      [Windows.Forms.SendKeys]::SendWait("{ENTER}")
    } else {
      throw ("Unsupported form op: " + $op)
    }

    Start-Sleep -Milliseconds ([math]::Max(150,$WaitMs))
    $results.Add([pscustomobject]@{op=$op;ok=$true;control=(Summarize $el)})
  }

  $all=Get-AllDescendants $root
  $post=New-Object System.Collections.Generic.List[object]
  foreach($el in $all){
    try{
      $type=Get-ControlTypeName $el
      if($type -notin @("Edit","ComboBox","Button","CheckBox","RadioButton","Hyperlink")){continue}
      $s=Summarize $el
      if($s.rect -and $s.rect.width -gt 0 -and $s.rect.height -gt 0){$post.Add([pscustomobject]$s)}
      if($post.Count -ge $MaxResults){break}
    }catch{}
  }
  Emit-Json ([ordered]@{ok=$true;action="form";window_title=$window.MainWindowTitle;results=@($results);post=@($post)})
  exit 0
}

# Existing Skills editor compatibility.
$anchors=Find-Anchors $all $Query
if(-not $anchors -or $anchors.Count -eq 0){
  $named=@()
  foreach($el in $all){
    try{
      $name=[string]$el.Current.Name
      if($name -and $name -match "(?i)(skill|cover letter|desired salary|available to start)"){
        $named += Summarize $el
        if($named.Count -ge $MaxResults){break}
      }
    }catch{}
  }
  Emit-Json ([ordered]@{ok=$false;action=$Action;window_title=$window.MainWindowTitle;reason="Skills anchor not found";relevant=$named})
  exit 2
}
$anchor=$anchors | Sort-Object { try { $_.Current.BoundingRectangle.Top } catch { 999999 } } | Select-Object -First 1

if($Approved.Trim().ToLowerInvariant() -notin @("1","true","yes")){
  throw "Edge UI Automation write actions require Approved=true."
}

$values=@()
if($Action -eq "skill-single"){
  if(-not $Value){throw "Value is required for skill-single."}
  $values=@($Value)
} elseif($Action -eq "skills"){
  if($StepsJson){
    $parsed=$StepsJson | ConvertFrom-Json
    if($parsed -is [System.Collections.IEnumerable] -and $parsed -isnot [string]){$values=@($parsed)}
    elseif($parsed.skills){$values=@($parsed.skills)}
  }
  if($values.Count -eq 0){throw "StepsJson must contain a skill array for skills."}
}

$editor=Find-SkillEditor $all $anchor
if(-not $editor){
  Emit-Json ([ordered]@{ok=$false;action=$Action;reason="No editable skill control found near Skills";anchor=(Summarize $anchor);nearby=(Get-NearbyControls $all $anchor $MaxResults)})
  exit 3
}

[void][QQEdgeNative]::ShowWindow($window.MainWindowHandle,9)
[void][QQEdgeNative]::SetForegroundWindow($window.MainWindowHandle)
Start-Sleep -Milliseconds 250

$added=New-Object System.Collections.Generic.List[string]
$failed=New-Object System.Collections.Generic.List[object]
foreach($raw in $values){
  $skill=[string]$raw
  if([string]::IsNullOrWhiteSpace($skill)){continue}
  try{
    $editor.element.SetFocus()
    Start-Sleep -Milliseconds 100
    [Windows.Forms.SendKeys]::SendWait("^a")
    [Windows.Forms.SendKeys]::SendWait("{BACKSPACE}")
    Send-SafeText $skill
    Start-Sleep -Milliseconds ([math]::Max(250,$WaitMs))
    [Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Milliseconds ([math]::Max(250,$WaitMs))
    $verifyAll=Get-AllDescendants $root
    $seen=$false
    foreach($el in $verifyAll){
      try{
        $nm=[string]$el.Current.Name
        if($nm -and $nm.Trim().Equals($skill,[StringComparison]::OrdinalIgnoreCase)){$seen=$true;break}
      }catch{}
    }
    if($seen){$added.Add($skill)}else{$failed.Add([pscustomobject]@{skill=$skill;reason="No visible exact-match skill token after Enter"})}
  }catch{
    $failed.Add([pscustomobject]@{skill=$skill;reason=$_.Exception.Message})
  }
}

Emit-Json ([ordered]@{
  ok=($failed.Count -eq 0);action=$Action;window_title=$window.MainWindowTitle
  editor=$editor.summary;added=@($added);failed=@($failed)
})
if($failed.Count -gt 0){exit 4}
exit 0
