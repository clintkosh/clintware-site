using System;
using System.IO;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace Clintware.QQ.PortableInstaller;

internal static class Program
{
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int MessageBoxW(IntPtr hWnd, string text, string caption, uint type);

    private const string BootstrapScript = """
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = "clintkosh/clintware-site"
$Raw = "https://raw.githubusercontent.com/clintkosh/clintware-site/main"
$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$LogPath = Join-Path $HomeDir "portable-installer.log"
$ResultPath = Join-Path $HomeDir "portable-install-result.json"
$TaskName = "Clintware Quillgeist Lite Runner"
$ServiceName = "ClintwareQuillgeistLiteHealth"

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

function Write-Step([string]$Message) {
  $line = ((Get-Date).ToUniversalTime().ToString("o") + " " + $Message)
  Add-Content -Path $LogPath -Value $line -Encoding UTF8
  Write-Host $Message -ForegroundColor Cyan
}

function Test-PowerShellFile([string]$Path) {
  $tokens = $null
  $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile(
    (Resolve-Path $Path),
    [ref]$tokens,
    [ref]$errors
  ) | Out-Null
  if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Step ("PARSE ERROR // " + $_.Message) }
    throw "Downloaded PowerShell file failed parse validation: $Path"
  }
}

function Get-Gh {
  $cmd = Get-Command gh.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $known = Join-Path $env:ProgramFiles "GitHub CLI\gh.exe"
  if (Test-Path $known) { return $known }
  return $null
}

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path","Machine")
  $user = [Environment]::GetEnvironmentVariable("Path","User")
  $env:Path = ($machine + ";" + $user)
}

function Ensure-GitHubCli {
  $gh = Get-Gh
  if ($gh) { return $gh }

  Write-Step "GITHUB // CLI missing; installing official GitHub CLI"
  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if ($winget) {
    & $winget.Source install --id GitHub.cli --exact --silent --disable-interactivity --accept-source-agreements --accept-package-agreements
    Refresh-Path
    $gh = Get-Gh
    if ($gh) { return $gh }
  }

  Write-Step "GITHUB // winget path unavailable; using official GitHub release MSI"
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/cli/cli/releases/latest" -Headers @{
    "User-Agent" = "Clintware-QQ-Portable-Installer"
    "Accept" = "application/vnd.github+json"
  }
  $asset = $release.assets | Where-Object { $_.name -match "_windows_amd64\.msi$" } | Select-Object -First 1
  if (-not $asset) { throw "Could not locate the official GitHub CLI Windows AMD64 MSI." }

  $msi = Join-Path $env:TEMP $asset.name
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $msi -UseBasicParsing
  $p = Start-Process msiexec.exe -ArgumentList @("/i",$msi,"/qn","/norestart") -Wait -PassThru
  Remove-Item $msi -Force -ErrorAction SilentlyContinue
  if ($p.ExitCode -notin @(0,3010)) { throw "GitHub CLI MSI install failed with exit code $($p.ExitCode)." }

  Refresh-Path
  $gh = Get-Gh
  if (-not $gh) { throw "GitHub CLI installed but gh.exe could not be resolved." }
  return $gh
}

function Ensure-GitHubAuth([string]$Gh) {
  & $Gh auth status --hostname github.com 1>$null 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Step "GITHUB // existing authorized identity found"
    return
  }

  Write-Step "GITHUB // one-time browser authorization required"
  & $Gh auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { throw "GitHub authorization was not completed." }

  & $Gh auth status --hostname github.com 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) { throw "GitHub authorization could not be verified." }
}

function Download-PS([string]$RepoPath,[string]$Destination) {
  $url = $Raw + "/" + $RepoPath + "?cb=" + [Guid]::NewGuid().ToString("n")
  Invoke-WebRequest -Uri $url -OutFile $Destination -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
  Test-PowerShellFile $Destination
}

function Test-RunnerAlive {
  $pidPath = Join-Path $HomeDir "runner.pid"
  try {
    if (-not (Test-Path $pidPath)) { return $false }
    $rawPid = (Get-Content $pidPath -Raw).Trim()
    $runnerPid = 0
    if (-not [int]::TryParse($rawPid,[ref]$runnerPid) -or $runnerPid -le 0) { return $false }
    return -not (Get-Process -Id $runnerPid -ErrorAction Stop).HasExited
  } catch { return $false }
}

try {
  Write-Step "QQ PORTABLE // starting one-click install/repair"

  $gh = Ensure-GitHubCli
  Ensure-GitHubAuth $gh

  $bundleRoot = Join-Path $env:TEMP ("Clintware-QQ-Source-" + [Guid]::NewGuid().ToString("n"))
  $archive = Join-Path $bundleRoot "clintware-site-main.zip"
  $extract = Join-Path $bundleRoot "src"
  New-Item -ItemType Directory -Force -Path $bundleRoot,$extract | Out-Null

  Write-Step "SOURCE // downloading one canonical repository snapshot"
  Invoke-WebRequest -Uri "https://codeload.github.com/clintkosh/clintware-site/zip/refs/heads/main" -OutFile $archive -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
  if (-not (Test-Path $archive) -or (Get-Item $archive).Length -lt 1024) {
    throw "Canonical repository snapshot download failed."
  }

  Expand-Archive -Path $archive -DestinationPath $extract -Force
  $repoRoot = Get-ChildItem -Path $extract -Directory | Where-Object { $_.Name -like "clintware-site-*" } | Select-Object -First 1
  if (-not $repoRoot) { throw "Canonical repository snapshot did not contain the expected root directory." }

  $qqSource = Join-Path $repoRoot.FullName "quillgeist-lite"
  $install = Join-Path $qqSource "install.ps1"
  $dedupeSource = Join-Path $qqSource "tasks\dedupe-qq-windows.ps1"
  $repairSource = Join-Path $qqSource "tasks\auto-repair-runtime.ps1"

  foreach ($required in @($install,$dedupeSource,$repairSource)) {
    if (-not (Test-Path $required)) { throw "Canonical repository snapshot is missing required file: $required" }
    Test-PowerShellFile $required
  }

  Write-Step "QQ // installing canonical maintained runtime from local snapshot"
  & $install -SourceRoot $qqSource

  $dedupe = Join-Path $HomeDir "dedupe-qq-windows.ps1"
  Copy-Item -LiteralPath $dedupeSource -Destination $dedupe -Force
  Write-Step "QQ // closing only stale duplicate qq launcher windows"
  & $dedupe -HomeDir $HomeDir

  $repair = Join-Path $HomeDir "auto-repair-runtime.ps1"
  Copy-Item -LiteralPath $repairSource -Destination $repair -Force
  Write-Step "QQ // reconciling service, runner, singleton gate, and canonical files"
  & $repair -HomeDir $HomeDir

  Write-Step "QQ // final duplicate-window verification"
  & $dedupe -HomeDir $HomeDir

  $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
  if (-not $service) { throw "qq health service is not installed." }
  if ($service.Status -ne "Running") {
    Start-Service -Name $ServiceName
    $service = Get-Service -Name $ServiceName
  }

  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $task) { throw "qq supervised runner task is not installed." }
  Enable-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Out-Null

  if (-not (Test-RunnerAlive)) {
    Write-Step "QQ // runner not live; starting the supervised singleton task"
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 4
  }

  $runnerAlive = Test-RunnerAlive
  if (-not $runnerAlive) { throw "qq runner did not become live after installation." }

  $checkInRequested = $false
  try {
    Write-Step "CHECK-IN // requesting Clintware qq status workflow"
    & $gh workflow run qq-local-status.yml --repo $Repo --ref main
    if ($LASTEXITCODE -eq 0) {
      $checkInRequested = $true
      Write-Step "CHECK-IN // GitHub status workflow requested"
    } else {
      Write-Step "CHECK-IN WARN // workflow dispatch was unavailable; local control-plane registration remains active"
    }
  } catch {
    Write-Step ("CHECK-IN WARN // " + $_.Exception.Message)
  }

  $result = [ordered]@{
    status = "ready"
    installed_at = (Get-Date).ToUniversalTime().ToString("o")
    control_plane = "https://mcp.clintware.com"
    service = (Get-Service -Name $ServiceName).Status.ToString()
    runner_alive = $runnerAlive
    duplicate_window_guard = "enabled"
    check_in_requested = $checkInRequested
    log_path = $LogPath
  }

  [IO.File]::WriteAllText(
    $ResultPath,
    ($result | ConvertTo-Json -Depth 6),
    (New-Object Text.UTF8Encoding($false))
  )

  Write-Step "READY // qq is installed, connected, supervised, and duplicate-window protected"
  try { if ($bundleRoot -and (Test-Path $bundleRoot)) { Remove-Item $bundleRoot -Recurse -Force -ErrorAction SilentlyContinue } } catch {}
  exit 0
}
catch {
  try { if ($bundleRoot -and (Test-Path $bundleRoot)) { Remove-Item $bundleRoot -Recurse -Force -ErrorAction SilentlyContinue } } catch {}
  $message = $_.Exception.ToString()
  try { Add-Content -Path $LogPath -Value ((Get-Date).ToUniversalTime().ToString("o") + " FATAL " + $message) -Encoding UTF8 } catch {}
  Write-Host ""
  Write-Host "QQ PORTABLE // FAILED" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host ("Log: " + $LogPath) -ForegroundColor DarkYellow
  exit 1
}
""";

    public static int Main()
    {
        Console.Title = "Clintware Quillgeist Lite Portable Installer";
        Console.OutputEncoding = Encoding.UTF8;

        if (!OperatingSystem.IsWindows())
        {
            Console.Error.WriteLine("This installer supports Windows only.");
            return 2;
        }

        string tempDir = Path.Combine(Path.GetTempPath(), "Clintware-QQ-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);
        string scriptPath = Path.Combine(tempDir, "bootstrap.ps1");

        try
        {
            File.WriteAllText(scriptPath, BootstrapScript, new UTF8Encoding(false));

            var psi = new ProcessStartInfo
            {
                FileName = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),
                    "WindowsPowerShell", "v1.0", "powershell.exe"),
                UseShellExecute = false,
                RedirectStandardOutput = false,
                RedirectStandardError = false,
                CreateNoWindow = false
            };
            psi.ArgumentList.Add("-NoLogo");
            psi.ArgumentList.Add("-NoProfile");
            psi.ArgumentList.Add("-ExecutionPolicy");
            psi.ArgumentList.Add("Bypass");
            psi.ArgumentList.Add("-File");
            psi.ArgumentList.Add(scriptPath);

            using var process = Process.Start(psi);
            if (process is null)
            {
                MessageBoxW(IntPtr.Zero, "PowerShell could not be started.", "Clintware QQ Installer", 0x10);
                return 3;
            }

            process.WaitForExit();
            int exitCode = process.ExitCode;

            string logPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Clintware", "QuillgeistLite", "portable-installer.log");

            if (exitCode == 0)
            {
                MessageBoxW(IntPtr.Zero,
                    "Quillgeist Lite is installed and connected.\n\n" +
                    "Duplicate-window protection is enabled and the supervised runner will continue through the Clintware control plane.\n\n" +
                    "A status check-in was requested when GitHub workflow access was available.",
                    "Clintware QQ Ready", 0x40);
            }
            else
            {
                MessageBoxW(IntPtr.Zero,
                    $"Installation did not complete.\n\nExit code: {exitCode}\nLog: {logPath}",
                    "Clintware QQ Installer", 0x10);
            }

            return exitCode;
        }
        catch (Exception ex)
        {
            MessageBoxW(IntPtr.Zero, ex.Message, "Clintware QQ Installer", 0x10);
            return 4;
        }
        finally
        {
            try { Directory.Delete(tempDir, true); } catch { }
        }
    }
}
