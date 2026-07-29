# Clintware Audio Lab

High-contrast AI music studio for generating tracks from creative direction and adapting uploaded audio.

## Production target

- URL: `https://audiolab.clintware.com`
- Repository: `clintkosh/clintware-site`
- Static deployment: GitHub Pages through `.github/workflows/deploy-pages.yml`
- Custom domain declaration: `CNAME`

## Included functionality

- Prompt-to-music workflow
- Local browser demo renderer when no hosted provider is connected
- Audio upload, decode, waveform preview, and playback
- Restyle, extend, instrumental, master, and alternate-version workflows
- Render queue with WAV and project JSON exports
- Responsive high-contrast desktop and mobile interface
- Optional provider adapter can be added behind `/api/health` and `/api/music`

## Validation

Five independent headless-Chromium regression passes completed successfully. See `TEST_REPORT.md`, `TEST_REPORT.json`, and `tests/regression.py`.

## Local use

Open `index.html` directly or serve the repository as a static site.

## Hosted provider connection

GitHub Pages serves the browser application and its built-in local renderer. To use an external paid music model, deploy a server-side adapter and route `/api/health` and `/api/music` to it. Provider credentials must remain server-side.
