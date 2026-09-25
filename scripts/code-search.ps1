[CmdletBinding()]
param(
  [Parameter(Mandatory=$true,Position=0)][string]$Query,
  [string[]]$Path,
  [switch]$Regex,
  [switch]$CaseSensitive,
  [ValidateRange(1,5000)][int]$Max=100,
  [switch]$Json,
  [switch]$FilesOnly,
  [string]$Root
)

$ErrorActionPreference = "Stop"
$RepoRoot = if ($Root) { (Resolve-Path $Root).Path } else { (Resolve-Path (Join-Path $PSScriptRoot "..")).Path }
$NodeScript = Join-Path $PSScriptRoot "code-search.mjs"
$Node = Get-Command node -ErrorAction SilentlyContinue

if ($Node) {
  $ArgsList = @($NodeScript,$Query,"--root",$RepoRoot,"--max","$Max")
  foreach ($p in @($Path)) { if ($p) { $ArgsList += @("--path",$p) } }
  if ($Regex) { $ArgsList += "--regex" }
  if ($CaseSensitive) { $ArgsList += "--case-sensitive" }
  if ($Json) { $ArgsList += "--json" }
  if ($FilesOnly) { $ArgsList += "--files-only" }
  & $Node.Source @ArgsList
  exit $LASTEXITCODE
}

$Skip = '\\(node_modules|\.git|dist|build|coverage|\.wrangler|\.cache|\.venv|venv|__pycache__)\\'
$Binary = @(".7z",".avi",".bin",".bmp",".class",".dll",".doc",".docx",".eot",".exe",".gif",".gz",".ico",".jar",".jpeg",".jpg",".mov",".mp3",".mp4",".otf",".pdf",".png",".ppt",".pptx",".pyc",".so",".tar",".tif",".tiff",".ttf",".wav",".webm",".webp",".woff",".woff2",".xls",".xlsx",".zip")
$Files = Get-ChildItem -LiteralPath $RepoRoot -File -Recurse -Force | Where-Object { $_.FullName -notmatch $Skip -and $Binary -notcontains $_.Extension.ToLowerInvariant() }
if ($Path) {
  $Files = $Files | Where-Object {
    $rel = $_.FullName.Substring($RepoRoot.Length).TrimStart('\','/')
    @($Path | Where-Object { $rel.IndexOf($_,[StringComparison]::OrdinalIgnoreCase) -ge 0 }).Count -gt 0
  }
}
$Pattern = if ($Regex) { $Query } else { [regex]::Escape($Query) }
$Matches = Select-String -Path $Files.FullName -Pattern $Pattern -CaseSensitive:$CaseSensitive -ErrorAction SilentlyContinue | Select-Object -First $Max
if ($FilesOnly) {
  $Out = $Matches | ForEach-Object { $_.Path.Substring($RepoRoot.Length).TrimStart('\','/') } | Sort-Object -Unique
  if ($Json) { $Out | ConvertTo-Json -Depth 3 } else { $Out }
} elseif ($Json) {
  $Matches | ForEach-Object { [pscustomobject]@{path=$_.Path.Substring($RepoRoot.Length).TrimStart('\','/');line=$_.LineNumber;text=$_.Line} } | ConvertTo-Json -Depth 4
} else {
  $Matches | ForEach-Object { "{0}:{1}: {2}" -f $_.Path.Substring($RepoRoot.Length).TrimStart('\','/'),$_.LineNumber,$_.Line }
}
if (-not $Matches) { exit 1 }
