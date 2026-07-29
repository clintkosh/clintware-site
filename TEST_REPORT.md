# Audio Lab Regression Test Report

**Result: 5/5 regression passes succeeded.**

Each independent headless-Chromium pass validated:

- Desktop load and high-contrast layout
- Prompt chip and prompt-to-music generation
- Local audio render and playback
- WAV and project JSON export controls
- WAV upload, waveform decode, and audio adaptation
- New-project state reset
- Mobile responsive layout with no horizontal overflow
- No unexpected browser runtime errors

| Pass | Result | Duration |
|---:|:---:|---:|
| 1 | PASS | 11.02s |
| 2 | PASS | 10.39s |
| 3 | PASS | 10.73s |
| 4 | PASS | 11.00s |
| 5 | PASS | 11.22s |

A sixth packaging smoke pass also succeeded against the final self-contained production artifact in 10.59 seconds.

- Production artifact SHA-256: `f45b27a553d1a2b533868a3668688b1b480aa6a540406e3c1e5866d249f3261f`
- Test harness: `tests/regression.py`

The test environment used a short synthetic WAV fixture so browser audio generation and adaptation could be exercised repeatedly without changing production behavior.
