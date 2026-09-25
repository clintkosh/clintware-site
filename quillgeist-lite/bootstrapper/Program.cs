using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;

namespace Clintware.QQ.PortableInstaller;

internal static class Program
{
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int MessageBoxW(IntPtr hWnd, string text, string caption, uint type);

    private const string ResourcePrefix = "qqruntime/";

    private static string ExtractRuntime(string tempDir)
    {
        string runtimeRoot = Path.Combine(tempDir, "runtime");
        Directory.CreateDirectory(runtimeRoot);

        Assembly assembly = Assembly.GetExecutingAssembly();
        string[] names = assembly.GetManifestResourceNames()
            .Where(n => n.StartsWith(ResourcePrefix, StringComparison.Ordinal))
            .ToArray();

        if (names.Length < 10)
            throw new InvalidOperationException("Embedded QQ runtime payload is missing.");

        string rootFull = Path.GetFullPath(runtimeRoot) + Path.DirectorySeparatorChar;

        foreach (string name in names)
        {
            string relative = name.Substring(ResourcePrefix.Length)
                .Replace('/', Path.DirectorySeparatorChar);

            string target = Path.GetFullPath(Path.Combine(runtimeRoot, relative));
            if (!target.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Embedded QQ resource escaped the runtime root.");

            string? parent = Path.GetDirectoryName(target);
            if (!string.IsNullOrWhiteSpace(parent))
                Directory.CreateDirectory(parent);

            using Stream? input = assembly.GetManifestResourceStream(name);
            if (input is null)
                throw new InvalidOperationException("Could not read embedded QQ resource: " + name);

            using FileStream output = File.Create(target);
            input.CopyTo(output);
        }

        return runtimeRoot;
    }

    private static int RunPowerShell(string scriptPath, params string[] arguments)
    {
        var psi = new ProcessStartInfo
        {
            FileName = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.System),
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

        foreach (string arg in arguments)
            psi.ArgumentList.Add(arg);

        using Process? process = Process.Start(psi);
        if (process is null)
            throw new InvalidOperationException("PowerShell could not be started.");

        process.WaitForExit();
        return process.ExitCode;
    }

    public static int Main()
    {
        Console.Title = "Clintware QQ Installer";
        Console.OutputEncoding = Encoding.UTF8;

        if (!OperatingSystem.IsWindows())
        {
            Console.Error.WriteLine("This installer supports Windows only.");
            return 2;
        }

        string tempDir = Path.Combine(
            Path.GetTempPath(),
            "Clintware-QQ-" + Guid.NewGuid().ToString("N"));

        Directory.CreateDirectory(tempDir);

        try
        {
            Console.WriteLine("QQ // unpacking embedded runtime");
            string runtimeRoot = ExtractRuntime(tempDir);

            string qqSource = Path.Combine(runtimeRoot, "quillgeist-lite");
            string install = Path.Combine(qqSource, "install.ps1");

            if (!File.Exists(install))
                throw new FileNotFoundException("Embedded QQ installer is missing.", install);

            Console.WriteLine("QQ // installing from embedded runtime");
            Console.WriteLine("QQ // GitHub is not used by the local install path");

            int exitCode = RunPowerShell(
                install,
                "-SourceRoot",
                qqSource);

            if (exitCode != 0)
            {
                MessageBoxW(
                    IntPtr.Zero,
                    $"QQ installation did not complete.\n\nExit code: {exitCode}",
                    "Clintware QQ Installer",
                    0x10);
                return exitCode;
            }

            string dedupe = Path.Combine(qqSource, "tasks", "dedupe-qq-windows.ps1");
            if (File.Exists(dedupe))
            {
                string homeDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "Clintware", "QuillgeistLite");

                _ = RunPowerShell(dedupe, "-HomeDir", homeDir);
            }

            MessageBoxW(
                IntPtr.Zero,
                "QQ is installed and connected through the Clintware Control Plane.\n\n" +
                "The local installer and runner do not require GitHub or GitHub CLI.",
                "Clintware QQ Ready",
                0x40);

            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex);
            MessageBoxW(
                IntPtr.Zero,
                ex.Message,
                "Clintware QQ Installer",
                0x10);
            return 4;
        }
        finally
        {
            try { Directory.Delete(tempDir, true); } catch { }
        }
    }
}
