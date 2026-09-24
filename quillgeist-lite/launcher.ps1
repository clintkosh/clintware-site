param(
  [switch]$TerminalHost
)

$ErrorActionPreference = "Stop"

$HomeDir = Join-Path $env:LOCALAPPDATA "Clintware\QuillgeistLite"
$RunnerPath = Join-Path $HomeDir "runner.ps1"
$CrashLog = Join-Path $HomeDir "runner-crash.log"
$PidPath = Join-Path $HomeDir "runner.pid"
$RunnerUrl = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/runner.ps1"
$GlassProfileName = "Quillgeist Lite"
$GlassProfileGuid = "{4a4b4fda-d945-42f1-a682-46c7534c2c5a}"
$GlassFragmentPath = Join-Path $env:LOCALAPPDATA "Microsoft\Windows Terminal\Fragments\Clintware\quillgeist-lite-v2.json"
$TerminalRepairMarker = Join-Path $HomeDir "terminal-repair.ok"

New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null

function Set-ClintwareBaseTheme {
  try {
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    [Console]::BackgroundColor = [ConsoleColor]::Black
    [Console]::ForegroundColor = [ConsoleColor]::White
  } catch {}

  try {
    $Host.UI.RawUI.BackgroundColor = "Black"
    $Host.UI.RawUI.ForegroundColor = "White"
    $Host.UI.RawUI.WindowTitle = "Clintware Quillgeist Lite"
  } catch {}

  try { Clear-Host } catch {}
}

function Update-LocalRunner {
  $temp = Join-Path $HomeDir "runner.next.ps1"

  try {
    Invoke-WebRequest -Uri $RunnerUrl -OutFile $temp -UseBasicParsing

    $tokens = $null
    $errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile($temp,[ref]$tokens,[ref]$errors) | Out-Null
    if ($errors.Count -gt 0) {
      throw "Downloaded runner failed PowerShell parse validation."
    }

    Move-Item -Path $temp -Destination $RunnerPath -Force
    return $true
  }
  catch {
    Remove-Item $temp -Force -ErrorAction SilentlyContinue
    if (-not (Test-Path $RunnerPath)) { throw }
    return $false
  }
}

Set-ClintwareBaseTheme

try {
  $updated = Update-LocalRunner

  # Reliability circuit breaker:
  # - The scheduled task always starts this plain PowerShell launcher first.
  # - Only a locally verified terminal profile may receive the handoff.
  # - If the Windows Terminal child fails to produce a live runner PID, qq stays
  #   alive in this PowerShell window instead of exiting into a restart loop.
  if (-not $TerminalHost -and (Test-Path $GlassFragmentPath) -and (Test-Path $TerminalRepairMarker)) {
    $wt = Get-Command wt.exe -ErrorAction SilentlyContinue
    if (-not $wt) {
      $wtCandidate = Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps\wt.exe"
      if (Test-Path $wtCandidate) { $wt = Get-Item $wtCandidate }
    }

    if ($wt) {
      $wtPath = [string]$wt.Source
      if (-not $wtPath) { $wtPath = [string]$wt.FullName }

      $oldPid = 0
      try {
        if (Test-Path $PidPath) { [int]::TryParse((Get-Content $PidPath -Raw).Trim(),[ref]$oldPid) | Out-Null }
      } catch {}

      try {
        Start-Process -FilePath $wtPath -ArgumentList @("-w","new","-p",$GlassProfileGuid)

        $handoffOk = $false
        for ($i = 0; $i -lt 30; $i++) {
          Start-Sleep -Milliseconds 200
          try {
            if (Test-Path $PidPath) {
              $candidate = 0
              if ([int]::TryParse((Get-Content $PidPath -Raw).Trim(),[ref]$candidate) -and $candidate -gt 0 -and $candidate -ne $PID -and $candidate -ne $oldPid) {
                $p = Get-Process -Id $candidate -ErrorAction Stop
                if (-not $p.HasExited) {
                  $handoffOk = $true
                  break
                }
              }
            }
          } catch {}
        }

        if ($handoffOk) {
          exit 0
        }

        Remove-Item $TerminalRepairMarker -Force -ErrorAction SilentlyContinue
        Add-Content -Path $CrashLog -Value ("{0} TERMINAL_HANDOFF_CIRCUIT_OPEN profile={1}; falling back to PowerShell host" -f (Get-Date).ToUniversalTime().ToString("o"),$GlassProfileGuid)
        Write-Host "WARN // Windows Terminal handoff failed; qq is staying alive in the fallback PowerShell host." -ForegroundColor DarkYellow
      } catch {
        Remove-Item $TerminalRepairMarker -Force -ErrorAction SilentlyContinue
        Add-Content -Path $CrashLog -Value ("{0} GLASS_HANDOFF_FAILED {1}" -f (Get-Date).ToUniversalTime().ToString("o"),$_.Exception.Message)
        Write-Host "WARN // Windows Terminal handoff failed; qq is staying alive in the fallback PowerShell host." -ForegroundColor DarkYellow
      }
    }
  }

  Set-Content -Path $PidPath -Value $PID -Encoding ASCII

  if ($updated) {
    Write-Host "SYNC" -ForegroundColor White -NoNewline
    Write-Host " // latest Quillgeist Lite runner loaded" -ForegroundColor Cyan
    Start-Sleep -Milliseconds 250
  }

  & $RunnerPath
}
catch {
  $stamp = (Get-Date).ToUniversalTime().ToString("o")
  $detail = $_.Exception.ToString()
  Add-Content -Path $CrashLog -Value "$stamp RUNNER_FATAL $detail"

  Write-Host ""
  Write-Host "QUILLGEIST LITE // FATAL" -ForegroundColor Red
  Write-Host $detail -ForegroundColor Red
  Write-Host ""
  Write-Host "Recovery will be attempted by the Clintware health service." -ForegroundColor DarkYellow
  Start-Sleep -Seconds 8
  exit 1
}
finally {
  Remove-Item $PidPath -Force -ErrorAction SilentlyContinue
}
