# Repository code-search fallback

Use this when provider-native code search is unavailable, unindexed, stale, or obviously incomplete.

## QQ / Windows

```powershell
pwsh -File scripts/code-search.ps1 "calendar_temporarily_unavailable"
pwsh -File scripts/code-search.ps1 "OAuth|Calendar" -Regex -Path meet-worker
pwsh -File scripts/code-search.ps1 "Quillgeist" -Json
pwsh -File scripts/code-search.ps1 "GOOGLE_DELEGATED_BRIDGE_SECRET" -FilesOnly
```

The wrapper prefers the dependency-free Node implementation at `scripts/code-search.mjs`. If Node is unavailable it falls back to built-in PowerShell search.

## Agent fallback rule

For this repository, an empty provider code-search result is not proof that code is absent.

1. Use provider-native code search first when it is indexed.
2. If unindexed or clearly incomplete, prefer Clintware/QQ local execution with `scripts/code-search.ps1`.
3. If local execution is unavailable, enumerate repository contents/tree and fetch likely files directly.
4. Record which search path produced the evidence.

This keeps code discovery deterministic without depending on provider-side indexing.
