using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Clintware.PlaylistSurgeon;

public sealed class SpotifyClient
{
    private const string ApiBase = "https://api.spotify.com/v1";
    private const string AccountsBase = "https://accounts.spotify.com";
    private const string RedirectUri = "http://127.0.0.1:5543/callback/";
    private const string Scopes = "playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private";

    private readonly HttpClient _http = new();
    private readonly LocalStore _store;
    private TokenState? _token;
    private string _clientId = "";

    public SpotifyClient(LocalStore store)
    {
        _store = store;
        _token = store.LoadToken();
    }

    public bool HasToken => _token is not null;
    public static string RequiredRedirectUri => RedirectUri;

    public void SetClientId(string clientId) => _clientId = clientId.Trim();

    public async Task ConnectAsync(string clientId, CancellationToken cancellationToken = default)
    {
        SetClientId(clientId);
        if (string.IsNullOrWhiteSpace(_clientId))
            throw new InvalidOperationException("Enter your Spotify Client ID first.");

        var verifier = Base64Url(RandomNumberGenerator.GetBytes(64));
        var challenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        var state = Base64Url(RandomNumberGenerator.GetBytes(24));

        using var listener = new HttpListener();
        listener.Prefixes.Add(RedirectUri);
        listener.Start();

        var authUrl = $"{AccountsBase}/authorize?client_id={Uri.EscapeDataString(_clientId)}" +
                      $"&response_type=code&redirect_uri={Uri.EscapeDataString(RedirectUri)}" +
                      $"&scope={Uri.EscapeDataString(Scopes)}&code_challenge_method=S256" +
                      $"&code_challenge={Uri.EscapeDataString(challenge)}&state={Uri.EscapeDataString(state)}";

        Process.Start(new ProcessStartInfo(authUrl) { UseShellExecute = true });

        var contextTask = listener.GetContextAsync();
        var completed = await Task.WhenAny(contextTask, Task.Delay(TimeSpan.FromMinutes(3), cancellationToken));
        if (completed != contextTask)
            throw new TimeoutException("Spotify authorization timed out.");

        var context = await contextTask;
        var query = context.Request.QueryString;
        var returnedState = query["state"];
        var code = query["code"];
        var error = query["error"];

        var responseHtml = string.IsNullOrWhiteSpace(error)
            ? "<html><body style='font-family:Segoe UI;background:#080a0e;color:#f4f7fb;padding:40px'><h2>Connected.</h2><p>You can close this window and return to Playlist Surgeon.</p></body></html>"
            : $"<html><body><h2>Spotify authorization failed</h2><p>{WebUtility.HtmlEncode(error)}</p></body></html>";
        var bytes = Encoding.UTF8.GetBytes(responseHtml);
        context.Response.ContentType = "text/html; charset=utf-8";
        context.Response.ContentLength64 = bytes.Length;
        await context.Response.OutputStream.WriteAsync(bytes, cancellationToken);
        context.Response.Close();
        listener.Stop();

        if (!string.IsNullOrWhiteSpace(error))
            throw new InvalidOperationException($"Spotify authorization failed: {error}");
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(returnedState ?? ""),
                Encoding.UTF8.GetBytes(state)))
            throw new InvalidOperationException("Spotify OAuth state validation failed.");
        if (string.IsNullOrWhiteSpace(code))
            throw new InvalidOperationException("Spotify did not return an authorization code.");

        var form = new Dictionary<string, string>
        {
            ["client_id"] = _clientId,
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = RedirectUri,
            ["code_verifier"] = verifier
        };

        using var response = await _http.PostAsync($"{AccountsBase}/api/token", new FormUrlEncodedContent(form), cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Spotify token exchange failed ({(int)response.StatusCode}): {body}");

        _token = ParseToken(body, null);
        _store.SaveToken(_token);
    }

    public async Task<IReadOnlyList<PlaylistInfo>> GetPlaylistsAsync(CancellationToken cancellationToken = default)
    {
        var list = new List<PlaylistInfo>();
        var path = "/me/playlists?limit=50";
        while (!string.IsNullOrWhiteSpace(path))
        {
            using var doc = await GetJsonAsync(path, cancellationToken);
            var root = doc.RootElement;
            if (root.TryGetProperty("items", out var items))
            {
                foreach (var item in items.EnumerateArray())
                {
                    var id = GetString(item, "id");
                    var name = GetString(item, "name");
                    if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(name)) continue;
                    var collaborative = item.TryGetProperty("collaborative", out var c) && c.GetBoolean();
                    var ownerId = item.TryGetProperty("owner", out var owner) ? GetString(owner, "id") : "";
                    var url = item.TryGetProperty("external_urls", out var urls) ? GetString(urls, "spotify") : null;
                    list.Add(new PlaylistInfo(id, name, collaborative, ownerId, url));
                }
            }

            var next = GetString(root, "next");
            path = string.IsNullOrWhiteSpace(next) ? "" : next.StartsWith(ApiBase, StringComparison.OrdinalIgnoreCase) ? next[ApiBase.Length..] : next;
        }

        return list.OrderBy(p => p.Name, StringComparer.CurrentCultureIgnoreCase).ToList();
    }

    public async Task<(IReadOnlyList<TrackItem> Tracks, string? SnapshotId)> GetPlaylistItemsAsync(
        string playlistId, CancellationToken cancellationToken = default)
    {
        var tracks = new List<TrackItem>();
        var snapshot = await GetSnapshotAsync(playlistId, cancellationToken);
        var path = $"/playlists/{Uri.EscapeDataString(playlistId)}/items?limit=50&additional_types=track";

        while (!string.IsNullOrWhiteSpace(path))
        {
            using var doc = await GetJsonAsync(path, cancellationToken);
            var root = doc.RootElement;
            if (root.TryGetProperty("items", out var items))
            {
                foreach (var row in items.EnumerateArray())
                {
                    JsonElement media;
                    if (row.TryGetProperty("item", out var current)) media = current;
                    else if (row.TryGetProperty("track", out var legacy)) media = legacy;
                    else continue;
                    if (media.ValueKind != JsonValueKind.Object) continue;
                    if (GetString(media, "type") is { Length: > 0 } type && type != "track") continue;

                    var uri = GetString(media, "uri");
                    var name = GetString(media, "name");
                    if (string.IsNullOrWhiteSpace(uri) || string.IsNullOrWhiteSpace(name)) continue;

                    var artists = new List<string>();
                    if (media.TryGetProperty("artists", out var artistArray))
                    {
                        foreach (var artist in artistArray.EnumerateArray())
                        {
                            var artistName = GetString(artist, "name");
                            if (!string.IsNullOrWhiteSpace(artistName)) artists.Add(artistName);
                        }
                    }

                    var album = media.TryGetProperty("album", out var albumObj) ? GetString(albumObj, "name") : "";
                    var url = media.TryGetProperty("external_urls", out var external) ? GetString(external, "spotify") : null;
                    tracks.Add(new TrackItem
                    {
                        Uri = uri,
                        Name = name,
                        Album = album,
                        Artists = artists,
                        SpotifyUrl = url
                    });
                }
            }

            var next = GetString(root, "next");
            path = string.IsNullOrWhiteSpace(next) ? "" : next.StartsWith(ApiBase, StringComparison.OrdinalIgnoreCase) ? next[ApiBase.Length..] : next;
        }

        return (tracks, snapshot);
    }

    public async Task<string?> RemoveItemsAsync(
        string playlistId,
        IEnumerable<string> uris,
        string? snapshotId,
        IProgress<string>? progress = null,
        CancellationToken cancellationToken = default)
    {
        var unique = uris.Where(u => !string.IsNullOrWhiteSpace(u)).Distinct(StringComparer.Ordinal).ToArray();
        string? currentSnapshot = snapshotId;
        var batches = unique.Chunk(100).ToArray();

        for (var i = 0; i < batches.Length; i++)
        {
            var payload = new Dictionary<string, object?>
            {
                ["items"] = batches[i].Select(uri => new Dictionary<string, string> { ["uri"] = uri }).ToArray()
            };
            if (!string.IsNullOrWhiteSpace(currentSnapshot))
                payload["snapshot_id"] = currentSnapshot;

            using var response = await SendApiAsync(
                HttpMethod.Delete,
                $"/playlists/{Uri.EscapeDataString(playlistId)}/items",
                JsonSerializer.Serialize(payload),
                cancellationToken);

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"Spotify remove failed ({(int)response.StatusCode}): {body}");

            using var doc = JsonDocument.Parse(body);
            currentSnapshot = GetString(doc.RootElement, "snapshot_id") ?? currentSnapshot;
            progress?.Report($"Removed batch {i + 1}/{batches.Length}");
        }

        return currentSnapshot;
    }

    private async Task<string?> GetSnapshotAsync(string playlistId, CancellationToken cancellationToken)
    {
        using var doc = await GetJsonAsync(
            $"/playlists/{Uri.EscapeDataString(playlistId)}?fields=snapshot_id",
            cancellationToken);
        return GetString(doc.RootElement, "snapshot_id");
    }

    private async Task<JsonDocument> GetJsonAsync(string path, CancellationToken cancellationToken)
    {
        using var response = await SendApiAsync(HttpMethod.Get, path, null, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Spotify API failed ({(int)response.StatusCode}): {body}");
        return JsonDocument.Parse(body);
    }

    private async Task<HttpResponseMessage> SendApiAsync(
        HttpMethod method,
        string path,
        string? jsonBody,
        CancellationToken cancellationToken)
    {
        await EnsureTokenAsync(cancellationToken);

        for (var attempt = 0; attempt < 4; attempt++)
        {
            using var request = new HttpRequestMessage(method, path.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? path : ApiBase + path);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token!.AccessToken);
            if (jsonBody is not null)
                request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

            var response = await _http.SendAsync(request, cancellationToken);
            if (response.StatusCode == HttpStatusCode.Unauthorized && attempt == 0)
            {
                response.Dispose();
                await RefreshAsync(cancellationToken);
                continue;
            }

            if ((int)response.StatusCode == 429 && attempt < 3)
            {
                var delay = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(Math.Pow(2, attempt + 1));
                response.Dispose();
                await Task.Delay(delay, cancellationToken);
                continue;
            }

            return response;
        }

        throw new InvalidOperationException("Spotify API retry limit reached.");
    }

    private async Task EnsureTokenAsync(CancellationToken cancellationToken)
    {
        _token ??= _store.LoadToken();
        if (_token is null) throw new InvalidOperationException("Connect Spotify first.");
        if (_token.ExpiresAt <= DateTimeOffset.UtcNow.AddMinutes(1))
            await RefreshAsync(cancellationToken);
    }

    private async Task RefreshAsync(CancellationToken cancellationToken)
    {
        if (_token is null || string.IsNullOrWhiteSpace(_token.RefreshToken))
            throw new InvalidOperationException("Spotify session expired. Connect again.");
        if (string.IsNullOrWhiteSpace(_clientId))
            throw new InvalidOperationException("Spotify Client ID is required to refresh the session.");

        var form = new Dictionary<string, string>
        {
            ["client_id"] = _clientId,
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = _token.RefreshToken
        };
        using var response = await _http.PostAsync($"{AccountsBase}/api/token", new FormUrlEncodedContent(form), cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Spotify token refresh failed ({(int)response.StatusCode}): {body}");

        _token = ParseToken(body, _token.RefreshToken);
        _store.SaveToken(_token);
    }

    private static TokenState ParseToken(string json, string? existingRefresh)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var access = GetString(root, "access_token") ?? throw new InvalidOperationException("Spotify token response had no access token.");
        var refresh = GetString(root, "refresh_token") ?? existingRefresh ?? "";
        var seconds = root.TryGetProperty("expires_in", out var expires) ? expires.GetInt32() : 3600;
        return new TokenState
        {
            AccessToken = access,
            RefreshToken = refresh,
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(Math.Max(60, seconds - 30))
        };
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string? GetString(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}
