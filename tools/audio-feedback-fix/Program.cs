using Microsoft.Win32;
using System.Diagnostics;
using System.Drawing;
using System.Security.Principal;
using System.Text;
using System.Text.Json;

namespace Clintware.AudioFeedbackFix;

internal static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        if (args.Contains("--selftest", StringComparer.OrdinalIgnoreCase))
        {
            var result = AudioRepairEngine.SelfTest();
            Console.WriteLine(JsonSerializer.Serialize(result));
            Environment.Exit(result.Ok ? 0 : 1);
            return;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm());
    }
}

internal sealed class MainForm : Form
{
    private readonly TextBox _log = new()
    {
        Multiline = true,
        ReadOnly = true,
        ScrollBars = ScrollBars.Vertical,
        Dock = DockStyle.Fill,
        BackColor = Color.FromArgb(8, 11, 16),
        ForeColor = Color.WhiteSmoke,
        BorderStyle = BorderStyle.FixedSingle,
        Font = new Font("Consolas", 10F)
    };

    private readonly Label _status = new()
    {
        AutoSize = false,
        Height = 32,
        Dock = DockStyle.Top,
        TextAlign = ContentAlignment.MiddleLeft,
        ForeColor = Color.FromArgb(87, 181, 255),
        Font = new Font("Segoe UI Semibold", 11F)
    };

    private readonly Button _diagnose = MakeButton("DIAGNOSE");
    private readonly Button _fix = MakeButton("FIX NOW");
    private readonly Button _deep = MakeButton("DEEP REPAIR");
    private readonly Button _restore = MakeButton("RESTORE");
    private readonly Button _sound = MakeButton("SOUND SETTINGS");

    public MainForm()
    {
        Text = "Clintware // Audio Feedback Fix";
        Width = 920;
        Height = 650;
        MinimumSize = new Size(760, 540);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(4, 7, 12);
        ForeColor = Color.White;
        Font = new Font("Segoe UI", 10F);

        var header = new Panel { Dock = DockStyle.Top, Height = 92, Padding = new Padding(18, 12, 18, 8) };
        var brand = new Label
        {
            Text = "CLINTWARE",
            ForeColor = Color.FromArgb(80, 180, 255),
            Font = new Font("Segoe UI Black", 23F, FontStyle.Bold),
            Dock = DockStyle.Top,
            Height = 43
        };
        var subtitle = new Label
        {
            Text = "AUDIO FEEDBACK FIX  //  Windows 11 echo + mic-monitor repair",
            ForeColor = Color.Gainsboro,
            Font = new Font("Consolas", 10F, FontStyle.Bold),
            Dock = DockStyle.Top,
            Height = 28
        };
        header.Controls.Add(subtitle);
        header.Controls.Add(brand);

        var buttons = new FlowLayoutPanel
        {
            Dock = DockStyle.Top,
            Height = 54,
            Padding = new Padding(14, 8, 14, 5),
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            BackColor = Color.FromArgb(8, 12, 20)
        };
        buttons.Controls.AddRange([_diagnose, _fix, _deep, _restore, _sound]);

        var content = new Panel { Dock = DockStyle.Fill, Padding = new Padding(16, 10, 16, 16) };
        content.Controls.Add(_log);
        content.Controls.Add(_status);

        Controls.Add(content);
        Controls.Add(buttons);
        Controls.Add(header);

        _diagnose.Click += async (_, _) => await RunAsync("Diagnosing", () => AudioRepairEngine.Diagnose());
        _fix.Click += async (_, _) => await RunAsync("Applying safe repair", () => AudioRepairEngine.Repair(deep: false));
        _deep.Click += async (_, _) => await RunAsync("Applying deep repair", () => AudioRepairEngine.Repair(deep: true));
        _restore.Click += async (_, _) => await RunAsync("Restoring previous settings", () => AudioRepairEngine.Restore());
        _sound.Click += (_, _) => Process.Start(new ProcessStartInfo("ms-settings:sound") { UseShellExecute = true });

        Shown += async (_, _) => await RunAsync("Initial diagnostic", () => AudioRepairEngine.Diagnose());
    }

    private static Button MakeButton(string text) => new()
    {
        Text = text,
        AutoSize = true,
        Height = 34,
        FlatStyle = FlatStyle.Flat,
        BackColor = Color.FromArgb(13, 29, 45),
        ForeColor = Color.White,
        Font = new Font("Segoe UI Semibold", 9.5F),
        Margin = new Padding(4, 0, 4, 0),
        Padding = new Padding(10, 0, 10, 0),
        Cursor = Cursors.Hand
    };

    private async Task RunAsync(string title, Func<RepairReport> action)
    {
        SetBusy(true);
        _status.Text = title + "...";
        try
        {
            var report = await Task.Run(action);
            _log.Text = report.ToText();
            _status.Text = report.Success ? "READY // " + report.Summary : "ATTENTION // " + report.Summary;
            _status.ForeColor = report.Success ? Color.FromArgb(87, 181, 255) : Color.OrangeRed;
        }
        catch (Exception ex)
        {
            _log.Text = ex.ToString();
            _status.Text = "ERROR // repair did not complete";
            _status.ForeColor = Color.OrangeRed;
        }
        finally
        {
            SetBusy(false);
        }
    }

    private void SetBusy(bool busy)
    {
        foreach (var b in new[] { _diagnose, _fix, _deep, _restore, _sound }) b.Enabled = !busy;
        Cursor = busy ? Cursors.WaitCursor : Cursors.Default;
    }
}

internal static class AudioRepairEngine
{
    private const string CaptureBase = @"SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Capture";
    private const string RenderBase = @"SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render";
    private const string ListenValue = "{24dbb0fc-9311-4b3d-9cf0-18ff155639d4},1";
    private const string DisableFxValue = "{1da5d803-d492-4edd-8c23-e0c0ffee7f0e},5";
    private const string FriendlyName14 = "{a45c254e-df1c-4efd-8020-67d146a850e0},14";
    private const string FriendlyName2 = "{a45c254e-df1c-4efd-8020-67d146a850e0},2";
    private static readonly string DataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Clintware", "AudioFeedbackFix");
    private static readonly string BackupPath = Path.Combine(DataDir, "last-backup.json");

    public static SelfTestResult SelfTest()
    {
        try
        {
            var windows = OperatingSystem.IsWindows();
            var admin = IsAdministrator();
            using var cap = Registry.LocalMachine.OpenSubKey(CaptureBase);
            using var ren = Registry.LocalMachine.OpenSubKey(RenderBase);
            return new SelfTestResult
            {
                Ok = windows && cap is not null && ren is not null,
                Windows = windows,
                Administrator = admin,
                CaptureRegistry = cap is not null,
                RenderRegistry = ren is not null,
                Version = "1.0.0"
            };
        }
        catch (Exception ex)
        {
            return new SelfTestResult { Ok = false, Error = ex.Message, Version = "1.0.0" };
        }
    }

    public static RepairReport Diagnose()
    {
        var report = NewReport("Diagnostic complete");
        report.Lines.Add($"Admin: {(IsAdministrator() ? "yes" : "no")}");
        report.Lines.Add($"Backup: {(File.Exists(BackupPath) ? BackupPath : "none yet")}");
        report.Lines.Add("");

        var captures = Enumerate(CaptureBase, capture: true);
        var renders = Enumerate(RenderBase, capture: false);

        report.Lines.Add($"ACTIVE INPUTS ({captures.Count})");
        foreach (var d in captures)
        {
            var flags = new List<string>();
            if (d.ListenPropertyPresent) flags.Add(d.ListenLooksEnabled ? "LISTEN/MONITORING MAY BE ON" : "listen-property present");
            if (IsLoopbackName(d.Name)) flags.Add("LOOPBACK INPUT");
            report.Lines.Add($"  • {d.Name}{FormatFlags(flags)}");
        }

        report.Lines.Add("");
        report.Lines.Add($"ACTIVE OUTPUTS ({renders.Count})");
        foreach (var d in renders)
        {
            var flags = new List<string>();
            if (d.Name.Contains("Hands-Free", StringComparison.OrdinalIgnoreCase) ||
                d.Name.Contains("Headset", StringComparison.OrdinalIgnoreCase))
                flags.Add("hands-free profile");
            report.Lines.Add($"  • {d.Name}{FormatFlags(flags)}");
        }

        report.Lines.Add("");
        var likely = captures.Where(x => x.ListenLooksEnabled).ToList();
        if (likely.Count > 0)
        {
            report.Lines.Add("LIKELY ROOT CAUSE");
            report.Lines.Add("Windows microphone monitoring ('Listen to this device') appears enabled on at least one input.");
            report.Lines.Add("That matches feedback continuing even after Discord is closed.");
            report.Summary = "monitoring/feedback condition detected";
        }
        else
        {
            report.Lines.Add("No definite monitoring flag was found. FIX NOW will still reset the common Windows-side feedback state safely.");
            report.Summary = "no single cause confirmed";
        }

        report.Lines.Add("");
        report.Lines.Add("FIX NOW");
        report.Lines.Add("Backs up settings, disables Windows mic monitoring on active inputs, resets communications ducking, and restarts the audio service.");
        report.Lines.Add("");
        report.Lines.Add("DEEP REPAIR");
        report.Lines.Add("Also disables capture-device system effects where Windows permits it. Use this only if FIX NOW does not stop the echo.");

        return report;
    }

    public static RepairReport Repair(bool deep)
    {
        Directory.CreateDirectory(DataDir);
        var report = NewReport(deep ? "Deep repair completed" : "Safe repair completed");
        var backup = CreateBackup();
        File.WriteAllText(BackupPath, JsonSerializer.Serialize(backup, new JsonSerializerOptions { WriteIndented = true }));
        report.Lines.Add($"Backup written: {BackupPath}");

        int changed = 0, denied = 0;
        foreach (var item in backup.Items.Where(x => x.IsCapture && x.Active))
        {
            try
            {
                using var key = Registry.LocalMachine.OpenSubKey(item.RegistryPath, writable: true);
                if (key is null) continue;
                if (key.GetValueNames().Contains(ListenValue, StringComparer.OrdinalIgnoreCase))
                {
                    key.DeleteValue(ListenValue, false);
                    changed++;
                    report.Lines.Add($"Disabled mic monitoring: {item.Name}");
                }
            }
            catch (UnauthorizedAccessException)
            {
                denied++;
                report.Lines.Add($"Permission blocked mic-monitor reset: {item.Name}");
            }
            catch (Exception ex)
            {
                report.Lines.Add($"Mic-monitor reset warning ({item.Name}): {ex.Message}");
            }

            if (deep)
            {
                try
                {
                    using var fx = Registry.LocalMachine.CreateSubKey(item.RegistryPath + @"\FxProperties", writable: true);
                    if (fx is not null)
                    {
                        fx.SetValue(DisableFxValue, 1, RegistryValueKind.DWord);
                        changed++;
                        report.Lines.Add($"Disabled capture system effects: {item.Name}");
                    }
                }
                catch (UnauthorizedAccessException)
                {
                    denied++;
                    report.Lines.Add($"Permission blocked system-effect reset: {item.Name}");
                }
                catch (Exception ex)
                {
                    report.Lines.Add($"System-effect reset warning ({item.Name}): {ex.Message}");
                }
            }
        }

        try
        {
            using var comm = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Multimedia\Audio");
            comm?.SetValue("UserDuckingPreference", 3, RegistryValueKind.DWord);
            changed++;
            report.Lines.Add("Set Windows communications behavior to 'Do nothing'.");
        }
        catch (Exception ex)
        {
            report.Lines.Add("Communications reset warning: " + ex.Message);
        }

        var service = RestartAudioService();
        report.Lines.Add(service);

        report.Lines.Add("");
        report.Lines.Add($"Changes applied: {changed}; permission-limited items: {denied}");
        report.Lines.Add("Test the external speaker with Discord still closed first. If the echo is gone there, Discord is not the root cause.");
        report.Lines.Add("If FIX NOW did not work, run DEEP REPAIR once.");

        report.Success = changed > 0;
        report.Summary = report.Success ? "repair applied" : "no writable repair target found";
        return report;
    }

    public static RepairReport Restore()
    {
        var report = NewReport("Restore completed");
        if (!File.Exists(BackupPath))
        {
            report.Success = false;
            report.Summary = "no backup exists";
            report.Lines.Add("No Clintware backup exists yet.");
            return report;
        }

        var backup = JsonSerializer.Deserialize<BackupSnapshot>(File.ReadAllText(BackupPath));
        if (backup is null)
        {
            report.Success = false;
            report.Summary = "backup could not be read";
            return report;
        }

        int restored = 0;
        foreach (var item in backup.Items)
        {
            try
            {
                using var key = Registry.LocalMachine.OpenSubKey(item.RegistryPath, writable: true);
                if (key is not null)
                {
                    RestoreValue(key, ListenValue, item.Listen);
                    restored++;
                }

                using var fx = Registry.LocalMachine.CreateSubKey(item.RegistryPath + @"\FxProperties", writable: true);
                if (fx is not null) RestoreValue(fx, DisableFxValue, item.DisableFx);
            }
            catch (Exception ex)
            {
                report.Lines.Add($"Restore warning ({item.Name}): {ex.Message}");
            }
        }

        try
        {
            using var comm = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Multimedia\Audio");
            if (backup.UserDuckingPreference is null) comm?.DeleteValue("UserDuckingPreference", false);
            else comm?.SetValue("UserDuckingPreference", backup.UserDuckingPreference.Value, RegistryValueKind.DWord);
        }
        catch { }

        report.Lines.Add(RestartAudioService());
        report.Lines.Add($"Restored endpoint snapshots: {restored}");
        report.Success = restored > 0;
        report.Summary = report.Success ? "previous settings restored" : "restore did not change anything";
        return report;
    }

    private static BackupSnapshot CreateBackup()
    {
        var snap = new BackupSnapshot { CreatedUtc = DateTime.UtcNow };
        try
        {
            using var comm = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Multimedia\Audio");
            var duck = comm?.GetValue("UserDuckingPreference");
            if (duck is int d) snap.UserDuckingPreference = d;
        }
        catch { }

        foreach (var tuple in new[] { (CaptureBase, true), (RenderBase, false) })
        {
            using var root = Registry.LocalMachine.OpenSubKey(tuple.Item1);
            if (root is null) continue;
            foreach (var id in root.GetSubKeyNames())
            {
                using var key = root.OpenSubKey(id);
                if (key is null) continue;
                var path = tuple.Item1 + "\\" + id;
                var item = new EndpointBackup
                {
                    Id = id,
                    Name = GetFriendlyName(key, id),
                    RegistryPath = path,
                    IsCapture = tuple.Item2,
                    Active = IsActive(key),
                    Listen = ReadValue(key, ListenValue)
                };
                using var fx = key.OpenSubKey("FxProperties");
                item.DisableFx = fx is null ? new RegistryValueSnapshot() : ReadValue(fx, DisableFxValue);
                snap.Items.Add(item);
            }
        }
        return snap;
    }

    private static List<AudioEndpointInfo> Enumerate(string basePath, bool capture)
    {
        var list = new List<AudioEndpointInfo>();
        using var root = Registry.LocalMachine.OpenSubKey(basePath);
        if (root is null) return list;
        foreach (var id in root.GetSubKeyNames())
        {
            using var key = root.OpenSubKey(id);
            if (key is null || !IsActive(key)) continue;
            var listen = ReadValue(key, ListenValue);
            list.Add(new AudioEndpointInfo
            {
                Id = id,
                Name = GetFriendlyName(key, id),
                Capture = capture,
                ListenPropertyPresent = listen.Exists,
                ListenLooksEnabled = ListenLooksEnabled(listen)
            });
        }
        return list.OrderBy(x => x.Name).ToList();
    }

    private static string GetFriendlyName(RegistryKey endpoint, string fallback)
    {
        using var props = endpoint.OpenSubKey("Properties");
        if (props is not null)
        {
            foreach (var n in new[] { FriendlyName14, FriendlyName2 })
            {
                if (props.GetValue(n) is string s && !string.IsNullOrWhiteSpace(s)) return s;
            }
            foreach (var n in props.GetValueNames())
            {
                if (props.GetValue(n) is string s && s.Length > 2 && s.Length < 200 &&
                    (s.Contains("Microphone", StringComparison.OrdinalIgnoreCase) ||
                     s.Contains("Speaker", StringComparison.OrdinalIgnoreCase) ||
                     s.Contains("TCL", StringComparison.OrdinalIgnoreCase) ||
                     s.Contains("HP", StringComparison.OrdinalIgnoreCase)))
                    return s;
            }
        }
        return fallback;
    }

    private static bool IsActive(RegistryKey key)
    {
        var v = key.GetValue("DeviceState");
        return v is int i ? i == 1 : true;
    }

    private static bool ListenLooksEnabled(RegistryValueSnapshot snap)
    {
        if (!snap.Exists || snap.Kind != RegistryValueKind.Binary.ToString() || string.IsNullOrEmpty(snap.DataBase64)) return false;
        try
        {
            var b = Convert.FromBase64String(snap.DataBase64);
            return b.Count(x => x == 0xFF) >= 2;
        }
        catch { return false; }
    }

    private static RegistryValueSnapshot ReadValue(RegistryKey key, string name)
    {
        if (!key.GetValueNames().Contains(name, StringComparer.OrdinalIgnoreCase)) return new RegistryValueSnapshot();
        try
        {
            var kind = key.GetValueKind(name);
            var value = key.GetValue(name);
            return RegistryValueSnapshot.From(kind, value);
        }
        catch { return new RegistryValueSnapshot(); }
    }

    private static void RestoreValue(RegistryKey key, string name, RegistryValueSnapshot snap)
    {
        if (!snap.Exists)
        {
            key.DeleteValue(name, false);
            return;
        }

        var kind = Enum.TryParse<RegistryValueKind>(snap.Kind, out var k) ? k : RegistryValueKind.String;
        object value = kind switch
        {
            RegistryValueKind.Binary => Convert.FromBase64String(snap.DataBase64 ?? ""),
            RegistryValueKind.DWord => snap.IntValue ?? 0,
            RegistryValueKind.QWord => snap.LongValue ?? 0L,
            RegistryValueKind.MultiString => snap.StringArray ?? Array.Empty<string>(),
            _ => snap.StringValue ?? ""
        };
        key.SetValue(name, value, kind);
    }

    private static bool IsLoopbackName(string name) =>
        name.Contains("Stereo Mix", StringComparison.OrdinalIgnoreCase) ||
        name.Contains("What U Hear", StringComparison.OrdinalIgnoreCase) ||
        name.Contains("Wave Out", StringComparison.OrdinalIgnoreCase) ||
        name.Contains("Loopback", StringComparison.OrdinalIgnoreCase);

    private static string RestartAudioService()
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command \"Restart-Service -Name AudioSrv -Force -ErrorAction Stop\"",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardError = true,
                RedirectStandardOutput = true
            };
            using var p = Process.Start(psi);
            if (p is null) return "Audio service restart: could not start PowerShell.";
            p.WaitForExit(15000);
            if (p.ExitCode == 0) return "Restarted Windows Audio service.";
            return "Audio service restart warning: " + p.StandardError.ReadToEnd().Trim();
        }
        catch (Exception ex)
        {
            return "Audio service restart warning: " + ex.Message;
        }
    }

    private static bool IsAdministrator()
    {
        try
        {
            using var id = WindowsIdentity.GetCurrent();
            return new WindowsPrincipal(id).IsInRole(WindowsBuiltInRole.Administrator);
        }
        catch { return false; }
    }

    private static RepairReport NewReport(string summary) => new()
    {
        Success = true,
        Summary = summary,
        Lines =
        {
            "CLINTWARE // AUDIO FEEDBACK FIX",
            $"UTC {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}",
            new string('=', 70)
        }
    };

    private static string FormatFlags(List<string> flags) => flags.Count == 0 ? "" : "  [" + string.Join(" | ", flags) + "]";
}

internal sealed class RepairReport
{
    public bool Success { get; set; }
    public string Summary { get; set; } = "";
    public List<string> Lines { get; } = new();
    public string ToText() => string.Join(Environment.NewLine, Lines);
}

internal sealed class AudioEndpointInfo
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public bool Capture { get; set; }
    public bool ListenPropertyPresent { get; set; }
    public bool ListenLooksEnabled { get; set; }
}

internal sealed class BackupSnapshot
{
    public DateTime CreatedUtc { get; set; }
    public int? UserDuckingPreference { get; set; }
    public List<EndpointBackup> Items { get; set; } = new();
}

internal sealed class EndpointBackup
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string RegistryPath { get; set; } = "";
    public bool IsCapture { get; set; }
    public bool Active { get; set; }
    public RegistryValueSnapshot Listen { get; set; } = new();
    public RegistryValueSnapshot DisableFx { get; set; } = new();
}

internal sealed class RegistryValueSnapshot
{
    public bool Exists { get; set; }
    public string Kind { get; set; } = "";
    public string? DataBase64 { get; set; }
    public int? IntValue { get; set; }
    public long? LongValue { get; set; }
    public string? StringValue { get; set; }
    public string[]? StringArray { get; set; }

    public static RegistryValueSnapshot From(RegistryValueKind kind, object? value)
    {
        var s = new RegistryValueSnapshot { Exists = true, Kind = kind.ToString() };
        switch (kind)
        {
            case RegistryValueKind.Binary:
                s.DataBase64 = Convert.ToBase64String(value as byte[] ?? Array.Empty<byte>());
                break;
            case RegistryValueKind.DWord:
                s.IntValue = Convert.ToInt32(value ?? 0);
                break;
            case RegistryValueKind.QWord:
                s.LongValue = Convert.ToInt64(value ?? 0L);
                break;
            case RegistryValueKind.MultiString:
                s.StringArray = value as string[] ?? Array.Empty<string>();
                break;
            default:
                s.StringValue = Convert.ToString(value) ?? "";
                break;
        }
        return s;
    }
}

internal sealed class SelfTestResult
{
    public bool Ok { get; set; }
    public bool Windows { get; set; }
    public bool Administrator { get; set; }
    public bool CaptureRegistry { get; set; }
    public bool RenderRegistry { get; set; }
    public string Version { get; set; } = "";
    public string? Error { get; set; }
}