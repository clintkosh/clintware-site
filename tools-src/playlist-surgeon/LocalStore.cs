using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Clintware.PlaylistSurgeon;

public sealed class LocalStore
{
    private readonly string _root = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Clintware", "PlaylistSurgeon");

    private string SettingsPath => Path.Combine(_root, "settings.json");
    private string TokenPath => Path.Combine(_root, "token.dat");
    private string RulesPath => Path.Combine(_root, "rules.json");
    public string BackupDirectory => Path.Combine(_root, "backups");

    public LocalStore()
    {
        Directory.CreateDirectory(_root);
        Directory.CreateDirectory(BackupDirectory);
    }

    public SettingsData LoadSettings()
    {
        if (!File.Exists(SettingsPath)) return new SettingsData();
        return JsonSerializer.Deserialize<SettingsData>(File.ReadAllText(SettingsPath)) ?? new SettingsData();
    }

    public void SaveSettings(SettingsData settings) =>
        File.WriteAllText(SettingsPath, JsonSerializer.Serialize(settings, JsonOptions));

    public void SaveToken(TokenState state)
    {
        var raw = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(state, JsonOptions));
        var protectedBytes = ProtectedData.Protect(raw, null, DataProtectionScope.CurrentUser);
        File.WriteAllBytes(TokenPath, protectedBytes);
    }

    public TokenState? LoadToken()
    {
        if (!File.Exists(TokenPath)) return null;
        try
        {
            var bytes = ProtectedData.Unprotect(File.ReadAllBytes(TokenPath), null, DataProtectionScope.CurrentUser);
            return JsonSerializer.Deserialize<TokenState>(Encoding.UTF8.GetString(bytes));
        }
        catch
        {
            return null;
        }
    }

    public HashSet<string> LoadBlockedArtists()
    {
        if (!File.Exists(RulesPath)) return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var artists = JsonSerializer.Deserialize<List<string>>(File.ReadAllText(RulesPath)) ?? [];
        return new HashSet<string>(artists, StringComparer.OrdinalIgnoreCase);
    }

    public void SaveBlockedArtists(IEnumerable<string> artists) =>
        File.WriteAllText(RulesPath, JsonSerializer.Serialize(
            artists.OrderBy(x => x, StringComparer.OrdinalIgnoreCase), JsonOptions));

    public async Task<string> SaveBackupAsync(PlaylistInfo playlist, IEnumerable<TrackItem> tracks, string? snapshotId)
    {
        var safe = string.Concat(playlist.Name.Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c));
        var dir = Path.Combine(BackupDirectory, safe);
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, $"{DateTime.Now:yyyy-MM-dd_HHmmss}.json");
        var payload = new
        {
            created_at = DateTimeOffset.Now,
            playlist = new { playlist.Id, playlist.Name, snapshot_id = snapshotId },
            items = tracks.Select((t, index) => new
            {
                position = index,
                uri = t.Uri,
                name = t.Name,
                artists = t.Artists,
                album = t.Album,
                spotify_url = t.SpotifyUrl
            })
        };
        await File.WriteAllTextAsync(path, JsonSerializer.Serialize(payload, JsonOptions));
        return path;
    }

    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
}

public sealed class SettingsData
{
    public string ClientId { get; set; } = "";
}

public sealed class TokenState
{
    public string AccessToken { get; set; } = "";
    public string RefreshToken { get; set; } = "";
    public DateTimeOffset ExpiresAt { get; set; }
}
