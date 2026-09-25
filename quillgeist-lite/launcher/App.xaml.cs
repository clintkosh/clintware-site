using Microsoft.UI.Xaml;

namespace Clintware.QuillgeistLite.Launcher;

public partial class App : Application
{
    private static Mutex? _mutex;
    public static Window? MainWindow { get; private set; }

    public App() => InitializeComponent();

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        _mutex = new Mutex(true, @"Local\Clintware.QuillgeistLite.Launcher", out var created);
        if (!created)
        {
            Environment.Exit(0);
            return;
        }

        MainWindow = new MainWindow();
        MainWindow.Activate();
    }
}
