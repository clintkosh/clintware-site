$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$NetworkShare = "\\BATMan\DH\HIREME\new"

function Log([string]$Message) { Write-Host ("BITNET // " + $Message) }
function FreeGB([string]$Drive) { $p=Get-PSDrive $Drive -ErrorAction SilentlyContinue; if($p){[math]::Round($p.Free/1GB,2)}else{0} }
function Find-VsDevCmd {
  @(
    "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat",
    "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat",
    "C:\Program Files\Microsoft Visual Studio\2022\Professional\Common7\Tools\VsDevCmd.bat",
    "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\Common7\Tools\VsDevCmd.bat"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
}
function Offload-Pressure {
  if ((FreeGB "C") -ge 20) { return @() }
  if (-not (Test-Path $NetworkShare)) { throw "C: has under 20 GB free and network share is unavailable: $NetworkShare" }
  $destRoot=Join-Path $NetworkShare ("quillgeist-offload\"+$env:COMPUTERNAME+"\bitnet")
  New-Item -ItemType Directory -Force -Path $destRoot | Out-Null
  $roots=@("$env:USERPROFILE\Downloads","C:\AI\LOCAL-CHATGPT\downloads","C:\AI\LOCAL-CHATGPT\artifacts","F:\AI-Data\Exports","F:\AI-Data\Generated") | Where-Object { Test-Path $_ }
  $allowed=@(".zip",".7z",".iso",".mp4",".mkv",".mov",".bak",".old")
  $files=@()
  foreach($root in $roots){$files += Get-ChildItem $root -File -Recurse -ErrorAction SilentlyContinue | Where-Object {$_.Length -ge 500MB -and $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and $allowed -contains $_.Extension.ToLowerInvariant()}}
  $moved=@()
  foreach($file in ($files | Sort-Object Length -Descending | Select-Object -First 25)){
    $safe=($file.FullName -replace "[:\\/]+","_").Trim("_")
    $dest=Join-Path $destRoot $safe
    Copy-Item -LiteralPath $file.FullName -Destination $dest -Force
    if((Get-Item $dest).Length -ne $file.Length){throw "Size verification failed for $($file.FullName)"}
    $a=(Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash
    $b=(Get-FileHash -Algorithm SHA256 -LiteralPath $dest).Hash
    if($a -ne $b){throw "Hash verification failed for $($file.FullName)"}
    Remove-Item -LiteralPath $file.FullName -Force
    $moved += [ordered]@{source=$file.FullName;destination=$dest;bytes=$file.Length;sha256=$a}
  }
  return $moved
}

Log "Checking storage and prerequisites"
$moved=@(Offload-Pressure)
if((FreeGB "C") -lt 12){throw "C: remains below 12 GB free after safe offload attempt."}
$git=(Get-Command git -ErrorAction SilentlyContinue).Source
$python=(Get-Command py -ErrorAction SilentlyContinue).Source
if(-not $python){$python=(Get-Command python -ErrorAction SilentlyContinue).Source}
if(-not $git -or -not $python){throw "Git and Python are required."}
$vs=Find-VsDevCmd
if(-not $vs){
  $winget=(Get-Command winget -ErrorAction SilentlyContinue).Source
  if(-not $winget){throw "VS2022 C++/Clang prerequisites missing and winget unavailable."}
  Log "Installing VS2022 Build Tools C++/Clang prerequisites"
  & $winget install --id Microsoft.VisualStudio.2022.BuildTools --exact --source winget --silent --accept-package-agreements --accept-source-agreements --override "--wait --passive --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --add Microsoft.VisualStudio.Component.VC.Llvm.Clang"
  if($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1978335189){throw "VS2022 Build Tools install failed: $LASTEXITCODE"}
  $vs=Find-VsDevCmd
}
if(-not $vs){throw "VS2022 Developer environment unavailable."}

$f=Get-PSDrive F -ErrorAction SilentlyContinue
$Root=if($f -and $f.Free -gt 12GB){"F:\AI-Data\BitNet"}else{"C:\AI\BitNet"}
New-Item -ItemType Directory -Force -Path (Split-Path $Root -Parent) | Out-Null
if(-not (Test-Path (Join-Path $Root ".git"))){
  Log "Cloning official microsoft/BitNet"
  & $git clone --recursive https://github.com/microsoft/BitNet.git $Root
  if($LASTEXITCODE -ne 0){throw "BitNet clone failed."}
}else{
  Log "Refreshing official BitNet checkout"
  & $git -C $Root pull --ff-only
  if($LASTEXITCODE -ne 0){throw "BitNet pull failed."}
  & $git -C $Root submodule update --init --recursive
  if($LASTEXITCODE -ne 0){throw "BitNet submodule update failed."}
}
$Venv=Join-Path $Root ".venv"
$VenvPy=Join-Path $Venv "Scripts\python.exe"
if(-not (Test-Path $VenvPy)){
  if((Split-Path $python -Leaf) -like "py*"){& $python -3.10 -m venv $Venv}else{& $python -m venv $Venv}
  if($LASTEXITCODE -ne 0){throw "BitNet Python environment creation failed."}
}
& $VenvPy -m pip install --disable-pip-version-check -r (Join-Path $Root "requirements.txt")
if($LASTEXITCODE -ne 0){throw "BitNet requirements install failed."}
& $VenvPy -m pip install --disable-pip-version-check huggingface_hub
if($LASTEXITCODE -ne 0){throw "Hugging Face client install failed."}
$ModelDir=Join-Path $Root "models\BitNet-b1.58-2B-4T"
$Model=Join-Path $ModelDir "ggml-model-i2_s.gguf"
if(-not (Test-Path $Model)){
  New-Item -ItemType Directory -Force -Path $ModelDir | Out-Null
  $hf=@((Join-Path $Venv "Scripts\hf.exe"),(Join-Path $Venv "Scripts\huggingface-cli.exe")) | Where-Object {Test-Path $_} | Select-Object -First 1
  if(-not $hf){throw "Hugging Face CLI unavailable."}
  Log "Downloading official BitNet 2.4B GGUF"
  & $hf download microsoft/BitNet-b1.58-2B-4T-gguf --local-dir $ModelDir
  if($LASTEXITCODE -ne 0){throw "BitNet model download failed."}
}
Log "Building official BitNet Windows runtime"
$cmd='call "'+$vs+'" -startdir=none -arch=x64 -host_arch=x64 && cd /d "'+$Root+'" && "'+$VenvPy+'" setup_env.py -md "'+$ModelDir+'" -q i2_s'
& cmd.exe /d /s /c $cmd
if($LASTEXITCODE -ne 0){throw "BitNet build failed: $LASTEXITCODE"}
[Environment]::SetEnvironmentVariable("QUILLGEIST_BITNET_HOME",$Root,"User")
$cli=@((Join-Path $Root "build\bin\Release\llama-cli.exe"),(Join-Path $Root "build\bin\llama-cli.exe")) | Where-Object {Test-Path $_} | Select-Object -First 1
$server=@((Join-Path $Root "build\bin\Release\llama-server.exe"),(Join-Path $Root "build\bin\llama-server.exe")) | Where-Object {Test-Path $_} | Select-Object -First 1
if(-not $cli){throw "BitNet build completed without llama-cli."}
Log "Running BitNet validation generation"
$out=& $cli -m $Model -p "Reply with exactly BITNET_READY." -n 32 -c 2048 -t ([math]::Max(2,[math]::Min(8,[Environment]::ProcessorCount))) --no-display-prompt 2>&1 | Out-String
if($LASTEXITCODE -ne 0){throw "BitNet validation failed."}
[ordered]@{ok=$true;root=$Root;model=$Model;cli=$cli;server=$server;validation_tail=$out.Substring([math]::Max(0,$out.Length-2000));offloaded=$moved;network_share=$NetworkShare} | ConvertTo-Json -Depth 6
