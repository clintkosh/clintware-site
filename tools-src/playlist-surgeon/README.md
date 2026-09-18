# Playlist Surgeon

A local-first Windows playlist cleanup utility from Clintware.

Playlist Surgeon is designed for one awkward job: take a large Spotify playlist you own or collaborate on, select one or many artists at once, select arbitrary tracks, preview the destructive action, and remove the selected material in bulk.

**License:** MIT  
**Platform:** Windows 10/11 x64  
**Runtime:** self-contained .NET 8 WPF build  
**Network use:** Spotify Accounts + Spotify Web API only  
**Storage:** local settings/rules/backups; OAuth tokens protected with Windows DPAPI

## Why this exists

There are already many Spotify tools, playlist managers, browser extensions, scripts, and plugins. Playlist Surgeon is not presented as a new category.

The intent is narrower: keep a small, auditable, local Windows utility working as Spotify changes its API, so the bulk artist/track cleanup workflow remains available. The project should track Spotify Web API changes and migrate promptly when playlist endpoints, fields, authentication requirements, or quota rules change.

If Spotify eventually builds this workflow directly into its own clients, that is a good outcome. Until then, this project exists to keep the gap covered.

## Current features

- Spotify OAuth Authorization Code + PKCE; no client secret is embedded or requested.
- Reads the current user's playlists.
- Opens playlist items for playlists Spotify allows the authenticated user to edit.
- Groups playlist contents by artist.
- Ctrl/Shift multi-select for artists.
- Select every track containing any selected artist.
- Arbitrary per-track removal checkboxes.
- Persistent local artist blocklist.
- Apply blocklist to future playlist scans, then review before removal.
- Search/filter by track, artist, or album.
- JSON backup before destructive changes.
- Spotify snapshot-aware removals.
- Current 2026 `/playlists/{id}/items` endpoints.
- Up to 100 item-removal objects per API request.
- 429 `Retry-After` handling.
- Encrypted refresh-token storage using Windows DPAPI.

## Spotify requirements

As of September 2026, Spotify's Web API documentation requires a Spotify Premium account for Web API use. Spotify's February 2026 API changes also restrict playlist-item access to playlists owned by the current user or playlists where the user is a collaborator.

That means Spotify-generated mixes are not directly editable through this API. Copy the mix into a playlist you own, then use Playlist Surgeon on that copy.

### One-time Spotify developer setup

1. Sign in at the Spotify Developer Dashboard.
2. Create an app.
3. Select **Web API** when asked which API you plan to use.
4. Add this exact redirect URI:

   ```
   http://127.0.0.1:5543/callback/
   ```

5. Save the app settings.
6. Copy the **Client ID**.
7. Run Playlist Surgeon and paste that Client ID into the app.
8. Click **Connect Spotify** and approve the requested playlist permissions.

Do **not** copy a Spotify Client Secret into Playlist Surgeon. Desktop applications cannot keep a client secret confidential; this project uses PKCE instead.

Requested scopes:

```
playlist-read-private
playlist-read-collaborative
playlist-modify-public
playlist-modify-private
```

## Build the EXE

### Easiest

Run:

```powershell
.\build.ps1
```

The self-contained build is written to:

```
.\dist\PlaylistSurgeon.exe
```

### Manual

Requirements for building from source:

- Windows 10/11
- .NET 8 SDK

Then:

```powershell
dotnet publish .\PlaylistSurgeon.csproj `
  -c Release `
  -r win-x64 `
  --self-contained true `
  -p:PublishSingleFile=true `
  -o .\dist
```

The resulting EXE does not require a separate .NET runtime installation.

## Local data

Playlist Surgeon writes application data under:

```
%LOCALAPPDATA%\Clintware\PlaylistSurgeon
```

Contents include:

- `settings.json` — Spotify Client ID.
- `token.dat` — OAuth token state encrypted for the current Windows user with DPAPI.
- `rules.json` — persistent artist blocklist.
- `backups\` — timestamped playlist JSON backups written before removal.

No Clintware server account is required.

## Removal behavior

The Spotify playlist-removal API operates on item URIs. Playlist Surgeon deduplicates selected URIs before submitting removal batches. If the identical Spotify track URI occurs multiple times in the same playlist, Spotify may remove every matching occurrence. The confirmation dialog calls this out before applying changes.

## API compatibility policy

The code intentionally centralizes Spotify transport behavior in `SpotifyClient.cs`.

When Spotify changes the Web API:

1. Review the official Spotify Web API changelog and migration guide.
2. Update endpoint names and response-field parsing.
3. Keep compatibility parsing only when it is still useful and documented.
4. Verify OAuth/PKCE and redirect URI rules.
5. Verify scopes and Premium/development-mode requirements.
6. Verify playlist read/write access restrictions.
7. Verify request batch limits and rate-limit behavior.
8. Build the Windows artifact in GitHub Actions.
9. Update this README and the Clintware product page with any changed setup requirements.

Current code already accepts the 2026 `item` field while tolerating the older `track` playlist-row shape when encountered.

## GitHub Actions

`.github/workflows/build-playlist-surgeon.yml` builds the Windows x64 self-contained EXE on changes to this project and exposes it as a workflow artifact.

## Spotify attribution and policy

This project uses Spotify metadata only to let an authenticated user manage their playlists. It does not download audio or enable stream ripping. Spotify metadata links may point back to the applicable Spotify content.

Spotify is a trademark of Spotify AB. Playlist Surgeon and Clintware are independent and are not endorsed by or affiliated with Spotify.

## Contributing

Issues and pull requests that keep the project aligned with Spotify API changes are welcome. Compatibility fixes should reference the applicable Spotify changelog or reference documentation.

## License

MIT. See [LICENSE](./LICENSE).
