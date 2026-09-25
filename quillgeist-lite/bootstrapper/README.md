# Clintware QQ Portable Installer

One-run Windows bootstrapper for the maintained Quillgeist Lite runtime.

Behavior:
- requests administrator elevation through the embedded application manifest;
- installs the official GitHub CLI only if missing;
- uses the machine user's GitHub browser authorization instead of embedding credentials;
- downloads the maintained Quillgeist Lite installer from the Clintware repository;
- installs or repairs the Windows health service and supervised runner;
- installs the singleton startup gate and duplicate-window cleanup logic;
- closes only stale qq-owned PowerShell launcher windows, not arbitrary browsers or unrelated applications;
- reconnects the event-driven runner to the Clintware control plane;
- requests the qq Local Status GitHub workflow as a non-secret check-in when the current GitHub token can dispatch it;
- writes local status to %LOCALAPPDATA%\Clintware\QuillgeistLite\portable-install-result.json.

No provider token, GitHub token, MCP credential, or other secret is embedded in the executable.

The executable is Windows x64 and self-contained. It may still trigger Windows SmartScreen because the build is not Authenticode-signed unless a signing certificate is configured separately.
