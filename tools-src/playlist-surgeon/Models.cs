using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace Clintware.PlaylistSurgeon;

public sealed record PlaylistInfo(string Id, string Name, bool Collaborative, string OwnerId, string? SpotifyUrl);

public sealed class TrackItem : INotifyPropertyChanged
{
    private bool _selected;

    public required string Uri { get; init; }
    public required string Name { get; init; }
    public required string Album { get; init; }
    public required IReadOnlyList<string> Artists { get; init; }
    public string ArtistDisplay => string.Join(", ", Artists);
    public string? SpotifyUrl { get; init; }

    public bool Selected
    {
        get => _selected;
        set
        {
            if (_selected == value) return;
            _selected = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Selected)));
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;
}

public sealed record ArtistGroup(string Name, int Count);
