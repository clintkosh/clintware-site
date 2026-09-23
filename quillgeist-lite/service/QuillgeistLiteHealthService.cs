using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.ServiceProcess;
using System.Text;
using System.Threading;

namespace Clintware.QuillgeistLite
{
    [DataContract]
    public sealed class HealthConfig
    {
        [DataMember] public string Endpoint;
        [DataMember] public string DeviceId;
        [DataMember] public string Token;
        [DataMember] public string TaskName;
        [DataMember] public string RunnerPidPath;
        [DataMember] public string RunnerLogPath;
        [DataMember] public string CrashLogPath;
        [DataMember] public string LocalServiceLogPath;
    }

    public sealed class QuillgeistLiteHealthService : ServiceBase
    {
        private readonly object gate = new object();
        private readonly Queue<DateTime> restarts = new Queue<DateTime>();
        private readonly Dictionary<string, long> offsets = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
        private Timer timer;
        private HealthConfig config;
        private bool? previousRunnerAlive;
        private DateTime lastHeartbeat = DateTime.MinValue;
        private DateTime lastSuppressedNotice = DateTime.MinValue;
        private DateTime serviceStartedUtc = DateTime.MinValue;
        private DateTime lastRestartAttemptUtc = DateTime.MinValue;

        public QuillgeistLiteHealthService()
        {
            ServiceName = "ClintwareQuillgeistLiteHealth";
            CanStop = true;
            CanShutdown = true;
            AutoLog = true;
        }

        protected override void OnStart(string[] args)
        {
            config = LoadConfig();
            serviceStartedUtc = DateTime.UtcNow;
            LocalLog("service_started");
            TryPost("INFO", "service", "health_service_started", null);
            timer = new Timer(Tick, null, 1000, 5000);
        }

        protected override void OnStop()
        {
            if (timer != null) timer.Dispose();
            TryPost("INFO", "service", "health_service_stopped", previousRunnerAlive);
            LocalLog("service_stopped");
        }

        protected override void OnShutdown()
        {
            OnStop();
            base.OnShutdown();
        }

        private HealthConfig LoadConfig()
        {
            string path = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                "Clintware", "QuillgeistLite", "service.json");

            using (FileStream fs = File.OpenRead(path))
            {
                DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(HealthConfig));
                HealthConfig loaded = (HealthConfig)serializer.ReadObject(fs);
                if (loaded == null || String.IsNullOrWhiteSpace(loaded.Endpoint) ||
                    String.IsNullOrWhiteSpace(loaded.DeviceId) || String.IsNullOrWhiteSpace(loaded.Token))
                {
                    throw new InvalidOperationException("Quillgeist Lite health service configuration is incomplete.");
                }
                return loaded;
            }
        }

        private void Tick(object state)
        {
            if (!Monitor.TryEnter(gate)) return;
            try
            {
                bool alive = RunnerAlive();

                if (!previousRunnerAlive.HasValue || previousRunnerAlive.Value != alive)
                {
                    string message = alive ? "runner_state=alive" : "runner_state=down";
                    TryPost(alive ? "INFO" : "WARN", "health", message, alive);
                    LocalLog(message);
                    previousRunnerAlive = alive;
                }

                TailFile(config.CrashLogPath, "runner-crash", false);
                TailFile(config.RunnerLogPath, "runner-log", true);

                if (!alive && (DateTime.UtcNow - serviceStartedUtc).TotalSeconds >= 8)
                {
                    EnsureRunner();
                }

                if ((DateTime.UtcNow - lastHeartbeat).TotalMinutes >= 5)
                {
                    TryPost("INFO", "heartbeat", alive ? "runner_alive" : "runner_down", alive);
                    lastHeartbeat = DateTime.UtcNow;
                }
            }
            catch (Exception ex)
            {
                LocalLog("tick_error " + ex);
                TryPost("ERROR", "service", "watchdog_exception: " + Redact(ex.ToString()), previousRunnerAlive);
            }
            finally
            {
                Monitor.Exit(gate);
            }
        }

        private bool RunnerAlive()
        {
            try
            {
                if (String.IsNullOrWhiteSpace(config.RunnerPidPath) || !File.Exists(config.RunnerPidPath)) return false;
                string raw = File.ReadAllText(config.RunnerPidPath).Trim();
                int pid;
                if (!Int32.TryParse(raw, out pid) || pid <= 0) return false;
                Process p = Process.GetProcessById(pid);
                return !p.HasExited;
            }
            catch
            {
                return false;
            }
        }

        private void EnsureRunner()
        {
            DateTime now = DateTime.UtcNow;
            if ((now - lastRestartAttemptUtc).TotalSeconds < 15) return;

            DateTime cutoff = now.AddMinutes(-10);
            while (restarts.Count > 0 && restarts.Peek() < cutoff) restarts.Dequeue();

            if (restarts.Count >= 5)
            {
                if ((now - lastSuppressedNotice).TotalMinutes >= 5)
                {
                    string msg = "restart_suppressed_after_5_attempts_in_10_minutes";
                    LocalLog(msg);
                    TryPost("ERROR", "health", msg, false);
                    lastSuppressedNotice = now;
                }
                return;
            }

            try
            {
                // A Task Scheduler instance can remain marked Running after the real
                // runner process has died. With IgnoreNew, /Run then reports success
                // while doing nothing. End the stale wrapper first; a non-running task
                // simply returns a harmless non-zero code.
                ProcessStartInfo endPsi = new ProcessStartInfo("schtasks.exe",
                    "/End /TN \"" + config.TaskName.Replace("\"", "\\\"") + "\"");
                endPsi.CreateNoWindow = true;
                endPsi.UseShellExecute = false;
                endPsi.RedirectStandardOutput = true;
                endPsi.RedirectStandardError = true;

                using (Process end = Process.Start(endPsi))
                {
                    end.WaitForExit(10000);
                    string endOut = end.StandardOutput.ReadToEnd();
                    if (end.ExitCode == 0)
                    {
                        string ended = "stale_runner_task_ended";
                        if (!String.IsNullOrWhiteSpace(endOut)) ended += " output=" + Redact(endOut);
                        LocalLog(ended);
                        TryPost("WARN", "health", ended, false);
                        Thread.Sleep(750);
                    }
                }

                ProcessStartInfo psi = new ProcessStartInfo("schtasks.exe",
                    "/Run /TN \"" + config.TaskName.Replace("\"", "\\\"") + "\"");
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;

                using (Process p = Process.Start(psi))
                {
                    p.WaitForExit(15000);
                    string stdout = p.StandardOutput.ReadToEnd();
                    string stderr = p.StandardError.ReadToEnd();
                    lastRestartAttemptUtc = DateTime.UtcNow;
                    restarts.Enqueue(lastRestartAttemptUtc);

                    string msg = "runner_restart_requested exit=" + p.ExitCode;
                    if (!String.IsNullOrWhiteSpace(stderr)) msg += " stderr=" + Redact(stderr);
                    else if (!String.IsNullOrWhiteSpace(stdout)) msg += " output=" + Redact(stdout);

                    LocalLog(msg);
                    TryPost(p.ExitCode == 0 ? "WARN" : "ERROR", "health", msg, false);
                }
            }
            catch (Exception ex)
            {
                lastRestartAttemptUtc = DateTime.UtcNow;
                restarts.Enqueue(lastRestartAttemptUtc);
                string msg = "runner_restart_exception: " + Redact(ex.ToString());
                LocalLog(msg);
                TryPost("ERROR", "health", msg, false);
            }
        }

        private void TailFile(string path, string phase, bool errorsOnly)
        {
            if (String.IsNullOrWhiteSpace(path) || !File.Exists(path)) return;

            long offset;
            if (!offsets.TryGetValue(path, out offset)) offset = 0;

            FileInfo info = new FileInfo(path);
            if (info.Length < offset) offset = 0;
            if (info.Length == offset) return;

            List<string> selected = new List<string>();

            using (FileStream fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
            {
                fs.Seek(offset, SeekOrigin.Begin);
                using (StreamReader sr = new StreamReader(fs, Encoding.UTF8, true, 4096, true))
                {
                    string line;
                    while ((line = sr.ReadLine()) != null)
                    {
                        if (!errorsOnly || IsImportantRunnerLine(line))
                        {
                            selected.Add(Redact(line));
                            if (selected.Count >= 20) break;
                        }
                    }
                }
                offsets[path] = fs.Position;
            }

            if (selected.Count == 0) return;

            string message = String.Join("\n", selected.ToArray());
            string level = phase == "runner-crash" ? "ERROR" : InferLevel(message);
            TryPost(level, phase, message, previousRunnerAlive);
        }

        private bool IsImportantRunnerLine(string line)
        {
            if (String.IsNullOrEmpty(line)) return false;
            string s = line.ToUpperInvariant();
            return s.Contains("[ERROR]") || s.Contains("[WARN]") ||
                   s.Contains("FULL_EXCEPTION") || s.Contains("EXCEPTION") ||
                   s.Contains("CONNECTION ERROR") || s.Contains("FAILED");
        }

        private string InferLevel(string message)
        {
            string s = (message ?? "").ToUpperInvariant();
            if (s.Contains("[ERROR]") || s.Contains("EXCEPTION") || s.Contains("FAILED")) return "ERROR";
            if (s.Contains("[WARN]") || s.Contains("WARNING")) return "WARN";
            return "INFO";
        }

        private void TryPost(string level, string phase, string message, bool? runnerAlive)
        {
            try
            {
                string endpoint = config.Endpoint.TrimEnd('/') + "/api/v1/quillgeist-lite/diagnostics";
                string payload =
                    "{\"device_id\":\"" + Json(config.DeviceId) +
                    "\",\"level\":\"" + Json(level) +
                    "\",\"phase\":\"" + Json(phase) +
                    "\",\"message\":\"" + Json(Redact(message)) +
                    "\",\"runner_alive\":" + (runnerAlive.HasValue ? (runnerAlive.Value ? "true" : "false") : "null") +
                    ",\"service_version\":\"1.0.0\",\"timestamp\":\"" + DateTime.UtcNow.ToString("o") + "\"}";

                using (WebClient wc = new WebClient())
                {
                    wc.Headers[HttpRequestHeader.Authorization] = "Bearer " + config.Token;
                    wc.Headers[HttpRequestHeader.ContentType] = "application/json";
                    wc.UploadString(endpoint, "POST", payload);
                }
            }
            catch (Exception ex)
            {
                LocalLog("uplink_error " + ex.Message);
            }
        }

        private string Redact(string input)
        {
            string s = input ?? "";
            if (!String.IsNullOrWhiteSpace(config.Token))
            {
                s = s.Replace(config.Token, "[REDACTED]");
            }
            if (s.Length > 8000) s = s.Substring(0, 8000) + " ...[truncated]";
            return s;
        }

        private string Json(string input)
        {
            return (input ?? "")
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\r", "\\r")
                .Replace("\n", "\\n")
                .Replace("\t", "\\t");
        }

        private void LocalLog(string message)
        {
            try
            {
                string path = config != null && !String.IsNullOrWhiteSpace(config.LocalServiceLogPath)
                    ? config.LocalServiceLogPath
                    : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                        "Clintware", "QuillgeistLite", "service-local.log");
                Directory.CreateDirectory(Path.GetDirectoryName(path));
                File.AppendAllText(path, DateTime.UtcNow.ToString("o") + " " + Redact(message) + Environment.NewLine);
            }
            catch { }
        }

        public static void Main()
        {
            ServiceBase.Run(new QuillgeistLiteHealthService());
        }
    }
}
