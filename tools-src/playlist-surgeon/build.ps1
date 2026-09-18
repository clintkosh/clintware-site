$ErrorActionPreference = "Stop"
$project = Join-Path $PSScriptRoot "PlaylistSurgeon.csproj"
$dist = Join-Path $PSScriptRoot "dist"

if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }

dotnet publish $project `
  -c Release `
  -r win-x64 `
  --self-contained true `
  -p:PublishSingleFile=true `
  -o $dist

$exe = Join-Path $dist "PlaylistSurgeon.exe"
if (-not (Test-Path $exe)) { throw "Build completed without PlaylistSurgeon.exe" }

Write-Host "Built: $exe"
