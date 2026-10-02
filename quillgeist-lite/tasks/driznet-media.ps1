param([ValidateSet("setup","verify")][string]$Action="setup")
$ErrorActionPreference="Stop";$ProgressPreference="SilentlyContinue"
if($env:COMPUTERNAME -notmatch '(?i)^DRIZNET$'){throw"DRIZNET-only"}
$R="C:\AI\LOCAL-CHATGPT";$S=Join-Path $R "scripts";$L=Join-Path $R "logs";$C="C:\AI\ComfyUI"
function T($u,$t=5){try{$r=Invoke-WebRequest $u -UseBasicParsing -TimeoutSec $t;return($r.StatusCode-ge 200-and $r.StatusCode-lt 500)}catch{return$false}}
function W($u,$s=120){$e=(Get-Date).AddSeconds($s);do{if(T $u 5){return$true};Start-Sleep 2}while((Get-Date)-lt $e);return$false}
function Py(){foreach($p in @((Join-Path $env:USERPROFILE "Miniconda3\python.exe"),(Get-Command python.exe -ErrorAction SilentlyContinue).Source)){if($p -and(Test-Path $p)-and $p -notmatch'WindowsApps'){return$p}};throw"Python missing"}
function Pw(){if($p=Get-Command pwsh.exe -ErrorAction SilentlyContinue){return$p.Source};"$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"}
function ST($n,$f,$wd){$u=[Security.Principal.WindowsIdentity]::GetCurrent().Name;$a=New-ScheduledTaskAction -Execute (Pw) -Argument ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$f+'"') -WorkingDirectory $wd;$tr=New-ScheduledTaskTrigger -AtLogOn -User $u;$pr=New-ScheduledTaskPrincipal -UserId $u -LogonType Interactive -RunLevel Highest;$st=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1);Register-ScheduledTask -TaskName $n -Action $a -Trigger $tr -Principal $pr -Settings $st -Force|Out-Null;Start-ScheduledTask $n}
New-Item -ItemType Directory -Force -Path $R,$S,$L,(Split-Path $C -Parent)|Out-Null
if($Action -eq"setup"){
 $py=Py;if(-not($g=Get-Command git.exe -ErrorAction SilentlyContinue)){$g=Get-Command git -ErrorAction SilentlyContinue};if(-not$g){throw"Git missing"}
 if(-not(Test-Path (Join-Path $C "main.py"))){&$g.Source clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git $C;if($LASTEXITCODE){throw"ComfyUI clone failed"}}
 $v=Join-Path $C "venv\Scripts\python.exe";if(-not(Test-Path $v)){&$py -m venv (Join-Path $C "venv");if($LASTEXITCODE){throw"venv failed"}}
 $m=Join-Path $C "venv\.driznet-ready";if(-not(Test-Path $m)){&$v -m pip install --upgrade pip;if($LASTEXITCODE){throw"pip failed"};&$v -m pip install -r (Join-Path $C "requirements.txt");if($LASTEXITCODE){throw"requirements failed"};Set-Content $m (Get-Date).ToUniversalTime().ToString("o") -Encoding ASCII}
 New-Item -ItemType Directory -Force -Path (Join-Path $C "output"),(Join-Path $C "input"),(Join-Path $C "temp")|Out-Null
 $cs=Join-Path $S "START-COMFYUI.ps1";Set-Content $cs ('$ErrorActionPreference="Stop"'+[Environment]::NewLine+'Set-Location "'+$C+'"'+[Environment]::NewLine+'& "'+$v+'" main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch *>> "'+(Join-Path $L "comfyui.log")+'"') -Encoding UTF8;ST "DRIZNET ComfyUI" $cs $C
 if(-not(W "http://127.0.0.1:8188/system_stats" 240)){if(Test-Path(Join-Path $L "comfyui.log")){Get-Content (Join-Path $L "comfyui.log") -Tail 60};throw"ComfyUI failed"}
 $a=Join-Path $S "media_agent.py";@'
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import json,urllib.request
B="http://127.0.0.1:8188"
class H(BaseHTTPRequestHandler):
 def j(self,s,d):
  b=json.dumps(d).encode();self.send_response(s);self.send_header("content-type","application/json");self.send_header("content-length",str(len(b)));self.end_headers();self.wfile.write(b)
 def do_GET(self):
  if self.path=="/health":
   try:urllib.request.urlopen(B+"/system_stats",timeout=5).close();self.j(200,{"ok":True,"comfyui":True})
   except Exception as e:self.j(503,{"ok":False,"error":type(e).__name__})
  elif self.path=="/system_stats":
   try:
    with urllib.request.urlopen(B+"/system_stats",timeout=10) as r:self.j(200,json.loads(r.read().decode()))
   except Exception as e:self.j(502,{"ok":False,"error":type(e).__name__})
  else:self.j(404,{"error":"not_found"})
 def do_POST(self):
  if self.path!="/prompt":self.j(404,{"error":"not_found"});return
  try:
   n=int(self.headers.get("content-length") or 0);body=self.rfile.read(n);q=urllib.request.Request(B+"/prompt",data=body,method="POST",headers={"content-type":"application/json"})
   with urllib.request.urlopen(q,timeout=30) as r:raw=r.read()
   self.send_response(200);self.send_header("content-type","application/json");self.send_header("content-length",str(len(raw)));self.end_headers();self.wfile.write(raw)
  except Exception as e:self.j(502,{"ok":False,"error":type(e).__name__})
 def log_message(self,*a):pass
ThreadingHTTPServer(("127.0.0.1",8799),H).serve_forever()
'@|Set-Content $a -Encoding UTF8
 $as=Join-Path $S "START-MEDIA-AGENT.ps1";Set-Content $as ('$ErrorActionPreference="Stop"'+[Environment]::NewLine+'& "'+$py+'" "'+$a+'"') -Encoding UTF8;ST "DRIZNET Media Agent" $as $S
}
$comfy=T "http://127.0.0.1:8188/system_stats" 8;$agent=T "http://127.0.0.1:8799/health" 8
$gpu=$false;try{$j=& (Join-Path $C "venv\Scripts\python.exe") -c "import torch;print(str(torch.cuda.is_available()).lower())" 2>$null;$gpu=("$j".Trim()-eq"true")}catch{}
$ok=$comfy -and $agent;[ordered]@{ok=$ok;device=$env:COMPUTERNAME;comfyui=$comfy;media_agent=$agent;gpu_acceleration=$gpu;root=$C;internal_storage_only=$true;external_drive_required=$false}|ConvertTo-Json;if(-not$ok){exit 2}
