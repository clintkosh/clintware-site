using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;

namespace Clintware.PlaylistSurgeon;

public partial class MainWindow : Window
{
    private readonly LocalStore _store = new();
    private readonly SpotifyClient _spotify;
    private readonly ObservableCollection<PlaylistInfo> _playlists = [];
    private readonly ObservableCollection<TrackItem> _tracks = [];
    private readonly ObservableCollection<ArtistGroup> _artists = [];
    private IReadOnlyList<TrackItem> _allTracks = [];
    private PlaylistInfo? _currentPlaylist;
    private string? _snapshotId;
    private HashSet<string> _blockedArtists;
    private bool _loadingPlaylist;

    public MainWindow()
    {
        InitializeComponent();
        _spotify = new SpotifyClient(_store);
        _blockedArtists = _store.LoadBlockedArtists();

        var settings = _store.LoadSettings();
        ClientIdBox.Text = settings.ClientId;
        if (!string.IsNullOrWhiteSpace(settings.ClientId))
            _spotify.SetClientId(settings.ClientId);

        PlaylistCombo.ItemsSource = _playlists;
        TrackGrid.ItemsSource = _tracks;
        ArtistList.ItemsSource = _artists;

        if (_spotify.HasToken && !string.IsNullOrWhiteSpace(settings.ClientId))
        {
            StatusText.Text = "Saved Spotify session found. Click Refresh to load playlists.";
            RefreshButton.IsEnabled = true;
            PlaylistCombo.IsEnabled = true;
        }
    }

    private async void ConnectButton_Click(object sender, RoutedEventArgs e)
    {
        await RunAsync(async () =>
        {
            SaveClientId();
            StatusText.Text = "Opening Spotify authorization in your browser…";
            await _spotify.ConnectAsync(ClientIdBox.Text);
            StatusText.Text = "Connected. Loading playlists…";
            RefreshButton.IsEnabled = true;
            PlaylistCombo.IsEnabled = true;
            await LoadPlaylistsAsync();
        });
    }

    private async void RefreshButton_Click(object sender, RoutedEventArgs e) =>
        await RunAsync(LoadPlaylistsAsync);

    private async Task LoadPlaylistsAsync()
    {
        SaveClientId();
        _spotify.SetClientId(ClientIdBox.Text);
        StatusText.Text = "Loading your Spotify playlists…";
        var playlists = await _spotify.GetPlaylistsAsync();
        _playlists.Clear();
        foreach (var playlist in playlists) _playlists.Add(playlist);
        StatusText.Text = $"Loaded {_playlists.Count:N0} playlists. Choose one to inspect.";
    }

    private async void PlaylistCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_loadingPlaylist || PlaylistCombo.SelectedItem is not PlaylistInfo playlist) return;
        _currentPlaylist = playlist;
        await RunAsync(() => LoadPlaylistAsync(playlist));
    }

    private async Task LoadPlaylistAsync(PlaylistInfo playlist)
    {
        _loadingPlaylist = true;
        try
        {
            StatusText.Text = $"Loading {playlist.Name}…";
            var result = await _spotify.GetPlaylistItemsAsync(playlist.Id);
            _allTracks = result.Tracks;
            _snapshotId = result.SnapshotId;
            RebuildViews();
            RemoveButton.IsEnabled = _allTracks.Count > 0;
            StatusText.Text = $"Loaded {_allTracks.Count:N0} tracks from {playlist.Name}.";
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("403"))
        {
            _allTracks = [];
            RebuildViews();
            StatusText.Text = "Spotify only exposes item-level editing for playlists you own or collaborate on.";
            MessageBox.Show(
                "Spotify currently restricts playlist-item access to playlists you own or collaborate on. " +
                "For a Spotify-generated mix, first copy it into your own playlist, then edit that copy.",
                "Playlist is not editable",
                MessageBoxButton.OK,
                MessageBoxImage.Information);
        }
        finally
        {
            _loadingPlaylist = false;
        }
    }

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) => RebuildViews();

    private void RebuildViews()
    {
        var q = SearchBox.Text.Trim();
        var filtered = string.IsNullOrWhiteSpace(q)
            ? _allTracks
            : _allTracks.Where(t =>
                t.Name.Contains(q, StringComparison.CurrentCultureIgnoreCase) ||
                t.Album.Contains(q, StringComparison.CurrentCultureIgnoreCase) ||
                t.Artists.Any(a => a.Contains(q, StringComparison.CurrentCultureIgnoreCase))).ToList();

        _tracks.Clear();
        foreach (var track in filtered) _tracks.Add(track);

        var groups = filtered
            .SelectMany(t => t.Artists.Select(a => new { Artist = a, Track = t.Uri }))
            .GroupBy(x => x.Artist, StringComparer.CurrentCultureIgnoreCase)
            .Select(g => new ArtistGroup(g.Key, g.Select(x => x.Track).Distinct(StringComparer.Ordinal).Count()))
            .OrderByDescending(x => x.Count)
            .ThenBy(x => x.Name, StringComparer.CurrentCultureIgnoreCase);

        _artists.Clear();
        foreach (var group in groups) _artists.Add(group);
        UpdateSummary();
    }

    private void SelectArtistTracks_Click(object sender, RoutedEventArgs e)
    {
        var selected = ArtistList.SelectedItems.Cast<ArtistGroup>()
            .Select(a => a.Name)
            .ToHashSet(StringComparer.CurrentCultureIgnoreCase);
        if (selected.Count == 0) return;

        foreach (var track in _allTracks)
            if (track.Artists.Any(selected.Contains))
                track.Selected = true;

        TrackGrid.Items.Refresh();
        UpdateSummary();
    }

    private void BlockArtists_Click(object sender, RoutedEventArgs e)
    {
        var selected = ArtistList.SelectedItems.Cast<ArtistGroup>().Select(a => a.Name).ToArray();
        if (selected.Length == 0) return;
        foreach (var artist in selected) _blockedArtists.Add(artist);
        _store.SaveBlockedArtists(_blockedArtists);
        StatusText.Text = $"Added {selected.Length} artist(s) to the local blocklist.";
        ApplyRules();
    }

    private void ApplyRules_Click(object sender, RoutedEventArgs e) => ApplyRules();

    private void ApplyRules()
    {
        var count = 0;
        foreach (var track in _allTracks)
        {
            if (!track.Artists.Any(_blockedArtists.Contains)) continue;
            track.Selected = true;
            count++;
        }
        TrackGrid.Items.Refresh();
        UpdateSummary();
        StatusText.Text = $"Blocklist matched {count:N0} track(s). Review before removing.";
    }

    private void ClearSelection_Click(object sender, RoutedEventArgs e)
    {
        foreach (var track in _allTracks) track.Selected = false;
        TrackGrid.Items.Refresh();
        UpdateSummary();
    }

    private async void RemoveSelected_Click(object sender, RoutedEventArgs e)
    {
        if (_currentPlaylist is null) return;
        var selected = _allTracks.Where(t => t.Selected).ToArray();
        if (selected.Length == 0)
        {
            MessageBox.Show("Select tracks or artists first.", "Nothing selected", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        var uniqueUris = selected.Select(t => t.Uri).Distinct(StringComparer.Ordinal).ToArray();
        var result = MessageBox.Show(
            $"Remove {selected.Length:N0} selected row(s) ({uniqueUris.Length:N0} unique Spotify item URIs) from “{_currentPlaylist.Name}”?\n\n" +
            "Spotify's remove endpoint works by item URI; if the exact same track URI appears multiple times, all matching occurrences may be removed. " +
            "A local JSON backup will be written before the change.",
            "Confirm playlist cleanup",
            MessageBoxButton.OKCancel,
            MessageBoxImage.Warning);
        if (result != MessageBoxResult.OK) return;

        await RunAsync(async () =>
        {
            var backup = await _store.SaveBackupAsync(_currentPlaylist, _allTracks, _snapshotId);
            StatusText.Text = $"Backup created. Removing {uniqueUris.Length:N0} unique item(s)…";

            var progress = new Progress<string>(text => StatusText.Text = text);
            _snapshotId = await _spotify.RemoveItemsAsync(_currentPlaylist.Id, uniqueUris, _snapshotId, progress);
            StatusText.Text = $"Removal complete. Backup: {backup}";
            await LoadPlaylistAsync(_currentPlaylist);
        });
    }

    private void UpdateSummary()
    {
        var selected = _allTracks.Count(t => t.Selected);
        TrackSummary.Text = $"{_tracks.Count:N0} visible / {_allTracks.Count:N0} total · {selected:N0} selected · {_blockedArtists.Count:N0} blocked artists";
    }

    private void SaveClientId()
    {
        var clientId = ClientIdBox.Text.Trim();
        _store.SaveSettings(new SettingsData { ClientId = clientId });
    }

    private async Task RunAsync(Func<Task> action)
    {
        try
        {
            IsEnabled = false;
            await action();
        }
        catch (Exception ex)
        {
            StatusText.Text = "Operation failed.";
            MessageBox.Show(ex.Message, "Playlist Surgeon", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        finally
        {
            IsEnabled = true;
        }
    }
}
