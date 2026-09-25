using System.Diagnostics;
using System.IO.Pipes;
using System.Text;
using System.Text.Json;

namespace Clintware.QuillgeistLite.Guardian;

internal sealed record RunnerHeartbeat(string? version, string? runner_id, int pid, string? state, string? job_id, string? task_id, DateTimeOffset timestamp);
internal sealed record GuardianStatus(string state, int? runnerPid, string runnerState, DateTimeOffset updatedAt, int restartCount, string detail);

internal static class Program
{
    const string MutexName = @"Local\Clintware.QuillgeistLite.Guardian";
    const string PipeName = "Clintware.QQ.Guardian";
    static readonly string Home = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Clintware", "QuillgeistLite");
    static readonly string RunnerPath = Path.Combine(Home, "runner.ps1");
    static readonly string PidPath = Path.Combine(Home, "runner.pid");
    static readonly string HeartbeatPath = Path.Combine(Home, "runner-heartbeat.json");
    static readonly string StatusPath = Path.Combine(Home, "guardian-status.json");
    static readonly string LogPath = Path.Combine(Home, "guardian.log");
    static readonly Queue<DateTimeOffset> Restarts = new();
    static Process? Runner;
    static readonly CancellationTokenSource Stop = new();

    public static async Task<int> Main(string[] args)
    {
        Directory.CreateDirectory(Home);
        if (args.Any(x => x.Equals("--self-test", StringComparison.OrdinalIgnoreCase))) return SelfTest();

        using var mutex = new Mutex(false, MutexName);
        bool owns;
        try { owns = mutex.WaitOne(0); } catch (AbandonedMutexException) { owns = true; }
        if (!owns) return 0;

        Console.CancelKeyPress += (_, e) => { e.Cancel = true; Stop.Cancel(); };
        Log("guardian_start");
        Runner = TryAdoptExistingRunner();
        var pipeTask = PipeLoop(Stop.Token);

        try
        {
            while (!Stop.IsCancellationRequested)
            {
                await EvaluateAsync(Stop.Token);
                await Task.Delay(TimeSpan.FromSeconds(5), Stop.Token);
            }
        }
        catch (OperationCanceledException) { }
        finally
        {
            await WriteStatusAsync(new("stopping", Runner?.HasExited == false ? Runner.Id : null, "stopping", DateTimeOffset.UtcNow, Restarts.Count, "guardian stopping"));
            Log("guardian_stop");
        }

        try { await pipeTask; } catch { }
        return 0;
    }

    static int SelfTest()
    {
        var now = DateTimeOffset.UtcNow;
        var hb = new RunnerHeartbeat("1", "TEST", 1234, "connected", "", "", now);
        if (!HeartbeatHealthy(hb, now, out _)) return 10;
        if (HeartbeatHealthy(hb with { timestamp = now.AddMinutes(-10) }, now, out _)) return 11;
        if (!HeartbeatHealthy(hb with { state = "busy", timestamp = now.AddMinutes(-10) }, now, out _)) return 12;
        Console.WriteLine("GUARDIAN_SELF_TEST_PASS");
        return 0;
    }

    static async Task EvaluateAsync(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;

        if (Runner is null || Runner.HasExited)
        {
            Runner = TryAdoptExistingRunner();
            if (Runner is null || Runner.HasExited)
            {
                if (!RestartBudgetAvailable(now))
                {
                    await WriteStatusAsync(new("quarantined", null, "dead", now, Restarts.Count, "restart budget exceeded"));
                    return;
                }

                Runner = StartRunner();
                RecordRestart(now);
                await WriteStatusAsync(new("starting", Runner?.Id, "starting", now, Restarts.Count, "runner started"));
                return;
            }
        }

        var heartbeat = ReadHeartbeat();
        if (heartbeat is null)
        {
            var age = now - SafeStartTime(Runner);
            if (age < TimeSpan.FromMinutes(3))
            {
                await WriteStatusAsync(new("starting", Runner.Id, "starting", now, Restarts.Count, "heartbeat startup grace"));
                return;
            }
            await RecoverHungAsync("heartbeat_missing", ct);
            return;
        }

        if (heartbeat.pid != Runner.Id)
        {
            var adopted = TryGetProcess(heartbeat.pid);
            if (adopted is not null && IsPowerShell(adopted)) Runner = adopted;
        }

        if (HeartbeatHealthy(heartbeat, now, out var reason))
        {
            var lifecycle = string.Equals(heartbeat.state, "connected", StringComparison.OrdinalIgnoreCase) ? "healthy" : "degraded";
            await WriteStatusAsync(new(lifecycle, Runner.Id, heartbeat.state ?? "unknown", now, Restarts.Count, reason));
            return;
        }

        await RecoverHungAsync(reason, ct);
    }

    static bool HeartbeatHealthy(RunnerHeartbeat hb, DateTimeOffset now, out string reason)
    {
        var age = now - hb.timestamp;
        if (string.Equals(hb.state, "busy", StringComparison.OrdinalIgnoreCase))
        {
            if (age <= TimeSpan.FromMinutes(45)) { reason = "busy_within_limit"; return true; }
            reason = "busy_heartbeat_stale"; return false;
        }

        if (age <= TimeSpan.FromSeconds(100))
        {
            reason = string.Equals(hb.state, "connected", StringComparison.OrdinalIgnoreCase) ? "connected" : "network_degraded_process_healthy";
            return true;
        }

        reason = "heartbeat_stale";
        return false;
    }

    static async Task RecoverHungAsync(string reason, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        if (!RestartBudgetAvailable(now))
        {
            await WriteStatusAsync(new("quarantined", Runner?.Id, "hung", now, Restarts.Count, reason + "; restart budget exceeded"));
            return;
        }

        Log("recover_runner reason=" + reason);
        if (Runner is not null && !Runner.HasExited && IsPowerShell(Runner))
        {
            try { Runner.Kill(entireProcessTree: true); } catch (Exception ex) { Log("kill_warn " + ex.Message); }
            try { await Runner.WaitForExitAsync(ct).WaitAsync(TimeSpan.FromSeconds(10), ct); } catch { }
        }

        Runner = StartRunner();
        RecordRestart(now);
        await WriteStatusAsync(new("recovering", Runner?.Id, "starting", now, Restarts.Count, reason));
    }

    static Process? StartRunner()
    {
        if (!File.Exists(RunnerPath)) { Log("runner_missing " + RunnerPath); return null; }

        var psi = new ProcessStartInfo
        {
            FileName = ResolvePowerShell(),
            Arguments = $"-NoLogo -NoProfile -ExecutionPolicy Bypass -File \"{RunnerPath}\"",
            WorkingDirectory = Home,
            UseShellExecute = false,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        psi.Environment["QQ_HEADLESS"] = "1";

        var p = new Process { StartInfo = psi, EnableRaisingEvents = true };
        p.OutputDataReceived += (_, e) => { if (!string.IsNullOrWhiteSpace(e.Data)) Log("runner " + e.Data); };
        p.ErrorDataReceived += (_, e) => { if (!string.IsNullOrWhiteSpace(e.Data)) Log("runner_err " + e.Data); };
        if (!p.Start()) return null;
        p.BeginOutputReadLine();
        p.BeginErrorReadLine();
        File.WriteAllText(PidPath, p.Id.ToString());
        Log("runner_started pid=" + p.Id);
        return p;
    }

    static Process? TryAdoptExistingRunner()
    {
        try
        {
            var hb = ReadHeartbeat();
            if (hb is not null)
            {
                var p = TryGetProcess(hb.pid);
                if (p is not null && IsPowerShell(p) && !p.HasExited) { Log("runner_adopted pid=" + p.Id); return p; }
            }
            if (File.Exists(PidPath) && int.TryParse(File.ReadAllText(PidPath).Trim(), out var pid))
            {
                var p = TryGetProcess(pid);
                if (p is not null && IsPowerShell(p) && !p.HasExited) return p;
            }
        }
        catch { }
        return null;
    }

    static Process? TryGetProcess(int pid) { try { return Process.GetProcessById(pid); } catch { return null; } }
    static bool IsPowerShell(Process p) { try { var n = p.ProcessName.ToLowerInvariant(); return n.Contains("pwsh") || n.Contains("powershell"); } catch { return false; } }

    static string ResolvePowerShell()
    {
        var pwsh = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "PowerShell", "7", "pwsh.exe");
        if (File.Exists(pwsh)) return pwsh;
        return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell", "v1.0", "powershell.exe");
    }

    static DateTimeOffset SafeStartTime(Process? p) { try { return p is null ? DateTimeOffset.MinValue : p.StartTime.ToUniversalTime(); } catch { return DateTimeOffset.MinValue; } }

    static RunnerHeartbeat? ReadHeartbeat()
    {
        try
        {
            if (!File.Exists(HeartbeatPath)) return null;
            return JsonSerializer.Deserialize<RunnerHeartbeat>(File.ReadAllText(HeartbeatPath), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch { return null; }
    }

    static bool RestartBudgetAvailable(DateTimeOffset now)
    {
        while (Restarts.Count > 0 && now - Restarts.Peek() > TimeSpan.FromMinutes(10)) Restarts.Dequeue();
        return Restarts.Count < 3;
    }

    static void RecordRestart(DateTimeOffset now)
    {
        Restarts.Enqueue(now);
        while (Restarts.Count > 0 && now - Restarts.Peek() > TimeSpan.FromMinutes(10)) Restarts.Dequeue();
    }

    static async Task WriteStatusAsync(GuardianStatus status)
    {
        try
        {
            var tmp = StatusPath + ".new";
            await File.WriteAllTextAsync(tmp, JsonSerializer.Serialize(status, new JsonSerializerOptions { WriteIndented = true }));
            File.Move(tmp, StatusPath, true);
        }
        catch { }
    }

    static async Task PipeLoop(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await using var pipe = new NamedPipeServerStream(PipeName, PipeDirection.InOut, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);
                await pipe.WaitForConnectionAsync(ct);
                using var reader = new StreamReader(pipe, Encoding.UTF8, false, 4096, true);
                using var writer = new StreamWriter(pipe, new UTF8Encoding(false), 4096, true) { AutoFlush = true };
                var command = ((await reader.ReadLineAsync(ct)) ?? "").Trim().ToLowerInvariant();

                if (command == "ping") await writer.WriteLineAsync("pong");
                else if (command == "status") await writer.WriteLineAsync(File.Exists(StatusPath) ? await File.ReadAllTextAsync(StatusPath, ct) : "{}");
                else if (command == "restart")
                {
                    if (Runner is not null && !Runner.HasExited && IsPowerShell(Runner)) try { Runner.Kill(true); } catch { }
                    await writer.WriteLineAsync("accepted");
                }
                else if (command == "shutdown") { Stop.Cancel(); await writer.WriteLineAsync("accepted"); }
                else await writer.WriteLineAsync("unknown");
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex) { Log("pipe_error " + ex.Message); try { await Task.Delay(1000, ct); } catch { } }
        }
    }

    static void Log(string message)
    {
        try
        {
            File.AppendAllText(LogPath, $"{DateTimeOffset.UtcNow:o} {message}{Environment.NewLine}");
            var info = new FileInfo(LogPath);
            if (info.Length > 2_000_000) File.WriteAllLines(LogPath, File.ReadLines(LogPath).TakeLast(1000));
        }
        catch { }
    }
}
