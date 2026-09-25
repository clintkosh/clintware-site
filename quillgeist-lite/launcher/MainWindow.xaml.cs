using System.IO.Pipes;
using System.Text;
using System.Text.Json;
using Microsoft.UI;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Windows.Graphics;

namespace Clintware.QuillgeistLite.Launcher;

public sealed partial class MainWindow : Window
{
    private readonly string _home = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Clintware", "QuillgeistLite");
    private readonly DispatcherTimer _timer = new() { Interval = TimeSpan.FromMilliseconds(750) };
    private string _lastLog = "";

    public MainWindow()
    {
        InitializeComponent();
        ExtendsContentIntoTitleBar = true;
        SetTitleBar(TitleBar);
        SystemBackdrop = new DesktopAcrylicBackdrop();

        var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(this);
        var id = Win32Interop.GetWindowIdFromWindow(hwnd);
        var appWindow = AppWindow.GetFromWindowId(id);
        appWindow.Resize(new SizeInt32(940, 680));

        Directory.CreateDirectory(_home);
        _timer.Tick += (_, _) => Refresh();
        _timer.Start();
        Refresh();
    }

    private void Refresh()
    {
        var statusPath = Path.Combine(_home, "guardian-status.json");
        try
        {
            if (File.Exists(statusPath))
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(statusPath));
                var root = doc.RootElement;
                var state = root.TryGetProperty("state", out var s) ? s.GetString() ?? "unknown" : "unknown";
                var runnerState = root.TryGetProperty("runnerState", out var r) ? r.GetString() ?? "unknown" : "unknown";
                var pid = root.TryGetProperty("runnerPid", out var p) && p.ValueKind == JsonValueKind.Number ? p.GetInt32().ToString() : "—";
                StatusText.Text = state.ToUpperInvariant();
                GuardianText.Text = $"GUARDIAN // {state.ToUpperInvariant()}";
                RunnerText.Text = $"RUNNER // {runnerState.ToUpperInvariant()}  PID {pid}";
            }
            else StatusText.Text = "WAITING FOR GUARDIAN";
        }
        catch { StatusText.Text = "STATUS DEGRADED"; }

        var lines = new List<string>();
        foreach (var file in new[] { Path.Combine(_home, "runner.log"), Path.Combine(_home, "guardian.log") })
        {
            try { if (File.Exists(file)) lines.AddRange(File.ReadLines(file).TakeLast(220)); } catch { }
        }
        var text = string.Join(Environment.NewLine, lines.TakeLast(360));
        if (text != _lastLog)
        {
            _lastLog = text;
            LogBox.Text = text;
            LogBox.SelectionStart = LogBox.Text.Length;
            LogBox.ScrollToVerticalOffset(double.MaxValue);
        }
    }

    private void Send_Click(object sender, RoutedEventArgs e) => QueueInput();

    private void InputBox_KeyDown(object sender, KeyRoutedEventArgs e)
    {
        if (e.Key == Windows.System.VirtualKey.Enter)
        {
            e.Handled = true;
            QueueInput();
        }
    }

    private void QueueInput()
    {
        var text = InputBox.Text.Trim();
        if (text.Length == 0) return;
        if (text.StartsWith("!", StringComparison.Ordinal))
        {
            LogBox.Text += Environment.NewLine + "[BLOCKED] Raw shell is unavailable from the GUI. Use a reviewed qq task.";
            InputBox.Text = "";
            return;
        }

        var payload = JsonSerializer.Serialize(new
        {
            id = Guid.NewGuid().ToString("n"),
            text,
            created_at = DateTimeOffset.UtcNow.ToString("o"),
            source = "qq-gui"
        });

        File.AppendAllText(Path.Combine(_home, "ui-input.jsonl"), payload + Environment.NewLine, new UTF8Encoding(false));
        InputBox.Text = "";
    }

    private async void RestartRunner_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            using var pipe = new NamedPipeClientStream(".", "Clintware.QQ.Guardian", PipeDirection.InOut, PipeOptions.Asynchronous);
            await pipe.ConnectAsync(1500);
            using var writer = new StreamWriter(pipe, new UTF8Encoding(false), 4096, true) { AutoFlush = true };
            using var reader = new StreamReader(pipe, Encoding.UTF8, false, 4096, true);
            await writer.WriteLineAsync("restart");
            await reader.ReadLineAsync();
        }
        catch { StatusText.Text = "GUARDIAN OFFLINE"; }
    }
}
