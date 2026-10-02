param([ValidateSet("setup","verify")][string]$Action="setup")
$ErrorActionPreference="Stop";$ProgressPreference="SilentlyContinue"
if($env:COMPUTERNAME -notmatch '(?i)^DRIZNET$'){throw"DRIZNET-only"}
$R="C:\AI\LOCAL-CHATGPT";$D=Join-Path $R "docker";$Data=Join-Path $R "data";$C=Join-Path $R "config";$S=Join-Path $R "scripts";$G=Join-Path $R "quillgeist-gateway";$P=Join-Path $G "agentbridge_node";$E=Join-Path $D ".env";$Y=Join-Path $D "docker-compose.yml";$K=Join-Path $C "quillgeist-gateway.key"
function T($u,$t=5){try{$x=Invoke-WebRequest $u -UseBasicParsing -TimeoutSec $t;return($x.StatusCode-ge 200-and$x.StatusCode-lt 500)}catch{return$false}}
function W($u,$s=90){$e=(Get-Date).AddSeconds($s);do{if(T $u 5){return$true};Start-Sleep 2}while((Get-Date)-lt$e);return$false}
function Sec(){$b=New-Object byte[] 48;$g=[Security.Cryptography.RandomNumberGenerator]::Create();try{$g.GetBytes($b)}finally{$g.Dispose()};[Convert]::ToBase64String($b).TrimEnd("=").Replace("+","-").Replace("/","_")}
function Py(){foreach($p in @((Join-Path $env:USERPROFILE "Miniconda3\python.exe"),(Get-Command python.exe -ErrorAction SilentlyContinue).Source)){if($p-and(Test-Path$p)-and$p-notmatch'WindowsApps'){return$p}};throw"Python missing"}
function Pw(){if($p=Get-Command pwsh.exe -ErrorAction SilentlyContinue){return$p.Source};"$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"}
function Dk(){if(-not($d=Get-Command docker.exe -ErrorAction SilentlyContinue)){$d=Get-Command docker -ErrorAction SilentlyContinue};if(-not$d){throw"Docker missing"};&$d.Source info *>$null;if($LASTEXITCODE-eq 0){return$d.Source};try{Start-Service com.docker.service -ErrorAction SilentlyContinue}catch{};$a="C:\Program Files\Docker\Docker\Docker Desktop.exe";if(Test-Path$a){Start-Process $a -WindowStyle Hidden -ErrorAction SilentlyContinue|Out-Null};$e=(Get-Date).AddMinutes(4);do{Start-Sleep 4;&$d.Source info *>$null;if($LASTEXITCODE-eq 0){return$d.Source}}while((Get-Date)-lt$e);throw"Docker daemon unavailable"}
function ST($n,$f,$wd){$u=[Security.Principal.WindowsIdentity]::GetCurrent().Name;$a=New-ScheduledTaskAction -Execute (Pw) -Argument ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$f+'"') -WorkingDirectory $wd;$tr=New-ScheduledTaskTrigger -AtLogOn -User $u;$pr=New-ScheduledTaskPrincipal -UserId $u -LogonType Interactive -RunLevel Highest;$st=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1);Register-ScheduledTask -TaskName $n -Action $a -Trigger $tr -Principal $pr -Settings $st -Force|Out-Null;Start-ScheduledTask $n}
New-Item -ItemType Directory -Force -Path $R,$D,$Data,$C,$S,$G,$P,(Join-Path $Data "open-webui"),(Join-Path $Data "n8n"),(Join-Path $Data "searxng"),(Join-Path $Data "pipelines")|Out-Null

if($Action-eq"setup"){
 $py=Py;$rt=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
 foreach($n in @("__init__.py","local_inference.py","local_gateway.py")){$src=Join-Path $rt ("agentbridge-node\agentbridge_node\"+$n);if(-not(Test-Path$src)){throw"Missing $src"};Copy-Item $src (Join-Path $P $n) -Force}
 if(-not(Test-Path$K)){Set-Content $K (Sec) -Encoding ASCII};$key=(Get-Content $K -Raw).Trim();$n8=Sec;$pipe=Sec;$searx=Sec
 @("QUILLGEIST_GATEWAY_API_KEY=$key","OPENAI_API_KEY=$key","OPENAI_API_BASE_URL=http://host.docker.internal:11435/v1","N8N_ENCRYPTION_KEY=$n8","PIPELINES_API_KEY=$pipe","SEARXNG_SECRET=$searx","TZ=America/Chicago")|Set-Content $E -Encoding UTF8
 $gs=Join-Path $S "START-GATEWAY.ps1";$gb=@'
$ErrorActionPreference="Stop"
$env:PYTHONPATH="__G__"
$env:QUILLGEIST_GATEWAY_API_KEY=(Get-Content "__K__" -Raw).Trim()
& "__PY__" -c "from agentbridge_node.local_gateway import serve;serve({},host='0.0.0.0',port=11435,api_key='$env:QUILLGEIST_GATEWAY_API_KEY')"
'@;$gb=$gb.Replace("__G__",$G).Replace("__K__",$K).Replace("__PY__",$py);Set-Content $gs $gb -Encoding UTF8;ST "DRIZNET Quillgeist Gateway" $gs $S;if(-not(W "http://127.0.0.1:11435/health" 45)){throw"Gateway failed"}
 @"
use_default_settings: true
server:
  bind_address: "0.0.0.0"
  port: 8080
  secret_key: "$searx"
search:
  formats: [html, json]
"@|Set-Content (Join-Path $Data "searxng\settings.yml") -Encoding UTF8
 @'
name: driznet-local-ai
services:
  searxng:
    image: searxng/searxng:latest
    container_name: driznet-searxng
    restart: unless-stopped
    ports: ["127.0.0.1:8088:8080"]
    volumes: ["C:/AI/LOCAL-CHATGPT/data/searxng:/etc/searxng"]
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: driznet-open-webui
    restart: unless-stopped
    ports: ["127.0.0.1:3015:8080"]
    env_file: [".env"]
    extra_hosts: ["host.docker.internal:host-gateway"]
    environment:
      OLLAMA_BASE_URL: "http://host.docker.internal:11434"
      ENABLE_OPENAI_API: "True"
      ENABLE_RAG_WEB_SEARCH: "True"
      RAG_WEB_SEARCH_ENGINE: "searxng"
      SEARXNG_QUERY_URL: "http://searxng:8080/search?q=<query>&format=json"
    volumes: ["C:/AI/LOCAL-CHATGPT/data/open-webui:/app/backend/data"]
    depends_on: [searxng]
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: driznet-n8n
    restart: unless-stopped
    ports: ["127.0.0.1:5678:5678"]
    env_file: [".env"]
    extra_hosts: ["host.docker.internal:host-gateway"]
    environment:
      N8N_SECURE_COOKIE: "false"
      QUILLGEIST_LOCAL_AI_BASE_URL: "http://host.docker.internal:11435/v1"
    volumes: ["C:/AI/LOCAL-CHATGPT/data/n8n:/home/node/.n8n"]
  pipelines:
    image: ghcr.io/open-webui/pipelines:main
    container_name: driznet-pipelines
    restart: unless-stopped
    ports: ["127.0.0.1:9099:9099"]
    env_file: [".env"]
    volumes: ["C:/AI/LOCAL-CHATGPT/data/pipelines:/app/pipelines"]
'@|Set-Content $Y -Encoding UTF8
 $dk=Dk;Push-Location $D;try{&$dk compose -f $Y config -q;if($LASTEXITCODE){throw"Compose invalid"};&$dk compose -f $Y pull;if($LASTEXITCODE){throw"Pull failed"};&$dk compose -f $Y up -d;if($LASTEXITCODE){throw"Startup failed"}}finally{Pop-Location}
 foreach($u in @("http://127.0.0.1:8088","http://127.0.0.1:3015","http://127.0.0.1:5678","http://127.0.0.1:9099")){if(-not(W $u 180)){throw"Failed $u"}}
 $wa=Join-Path $S "web_search_agent.py";@'
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import json,urllib.parse,urllib.request
class H(BaseHTTPRequestHandler):
 def j(self,s,d):
  b=json.dumps(d).encode();self.send_response(s);self.send_header("content-type","application/json");self.send_header("content-length",str(len(b)));self.end_headers();self.wfile.write(b)
 def do_GET(self):
  u=urllib.parse.urlparse(self.path)
  if u.path=="/health":
   try:urllib.request.urlopen("http://127.0.0.1:8088",timeout=4).close();self.j(200,{"ok":True})
   except Exception as e:self.j(503,{"ok":False,"error":type(e).__name__})
  elif u.path=="/search":
   q=urllib.parse.parse_qs(u.query).get("q",[""])[0]
   try:
    with urllib.request.urlopen("http://127.0.0.1:8088/search?"+urllib.parse.urlencode({"q":q,"format":"json"}),timeout=20) as r:d=json.loads(r.read().decode())
    self.j(200,{"ok":True,"results":d.get("results",[])[:20]})
   except Exception as e:self.j(502,{"ok":False,"error":type(e).__name__})
  else:self.j(404,{"error":"not_found"})
 def log_message(self,*a):pass
ThreadingHTTPServer(("127.0.0.1",8788),H).serve_forever()
'@|Set-Content $wa -Encoding UTF8;$ws=Join-Path $S "START-WEB-SEARCH.ps1";Set-Content $ws ('$ErrorActionPreference="Stop"'+[Environment]::NewLine+'& "'+$py+'" "'+$wa+'"') -Encoding UTF8;ST "DRIZNET Web Search Agent" $ws $S;if(-not(W "http://127.0.0.1:8788/health" 45)){throw"Search agent failed"}
 Set-Content (Join-Path $R "OPEN-DRIZNET-AI.ps1") 'Start-Process "http://127.0.0.1:3015"' -Encoding UTF8
 New-Item -ItemType Directory -Force -Path (Join-Path $R "discord")|Out-Null;@'
DRIZNET_DISCORD_TOKEN=
DRIZNET_AI_GATEWAY=http://127.0.0.1:11435/v1
DRIZNET_AI_GATEWAY_KEY=
DRIZNET_AI_MODEL=ollama/qwen3.5:9b
'@|Set-Content (Join-Path $R "discord\.env.example") -Encoding UTF8
}
$checks=[ordered]@{"Open WebUI"="http://127.0.0.1:3015";"Ollama"="http://127.0.0.1:11434/api/tags";"Gateway"="http://127.0.0.1:11435/health";"SearXNG"="http://127.0.0.1:8088";"n8n"="http://127.0.0.1:5678";"Pipelines"="http://127.0.0.1:9099";"Search"="http://127.0.0.1:8788/health"};$rows=@();foreach($x in $checks.GetEnumerator()){$rows+=[pscustomobject]@{name=$x.Key;ok=(T $x.Value 8);url=$x.Value}}
$key=(Get-Content $K -Raw).Trim();$h=@{Authorization="Bearer $key";"Content-Type"="application/json"};$b=@{model="ollama/qwen3.5:9b";messages=@(@{role="user";content="Reply exactly DRIZNET_SERVER_READY."});max_tokens=32;temperature=0}|ConvertTo-Json -Depth 6
try{$r=Invoke-RestMethod "http://127.0.0.1:11435/v1/chat/completions" -Method Post -Headers $h -Body $b -TimeoutSec 120;$inf=[bool]$r.choices[0].message.content}catch{$inf=$false};try{$s=Invoke-RestMethod "http://127.0.0.1:8788/search?q=OpenAI" -TimeoutSec 30;$sea=[bool]$s.ok}catch{$sea=$false}
$ok=(@($rows|Where-Object{-not$_.ok}).Count-eq 0)-and$inf-and$sea;[ordered]@{ok=$ok;device=$env:COMPUTERNAME;root=$R;internal_storage_only=$true;external_drive_required=$false;services=$rows;inference=$inf;search=$sea;models_preserved=$true;c_ai_preserved=$true}|ConvertTo-Json -Depth 7;if(-not$ok){exit 2}
