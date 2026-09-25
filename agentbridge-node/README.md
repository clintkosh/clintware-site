# Quillgeist local node alpha · self-hosted by default

Quillgeist is a user-owned local runtime for AI agents.  The local node performs approved filesystem, shell, Python, PowerShell, Node.js, Git, validation, scheduling, rollback, logging, evidence collection, and account-scoped operational telemetry on the user's own machine.

`AI planner → Quillgeist intent + user preferences → local policy/runtime → verified result → compact evidence`

The model can change.  The user's local execution policy, explicit preferences, and result evidence remain with Quillgeist.

**Public-distribution boundary:** Quillgeist starts local-only, has telemetry disabled, contains no Clintware server credential, and does not connect to Clintware infrastructure. Cloud features require an explicit URL for a cloud instance the user owns or controls.

## Windows alpha

Download `Quillgeist-Windows-x64.exe` from the current Quillgeist GitHub prerelease.

First run:

```powershell
.\Quillgeist-Windows-x64.exe init
.\Quillgeist-Windows-x64.exe doctor
.\Quillgeist-Windows-x64.exe pair --cloud https://quillgeist.example.com
.\Quillgeist-Windows-x64.exe daemon
```

The pair command is optional and requires the URL of your own self-hosted Quillgeist Cloud. Without that explicit configuration, the node stays local-only and sends no Quillgeist telemetry.

## macOS and Linux alpha

Use the matching single-file build from the Quillgeist prerelease, then run the same commands with that executable name.

## Install from source

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -e .
quillgeist init
quillgeist doctor
quillgeist pair --cloud https://quillgeist.example.com
quillgeist daemon
```

The legacy `agentbridge` command remains only as a temporary compatibility alias for existing alpha installs.

## User-owned persistent preferences

Quillgeist can now retain explicit preferences locally and inject them into future compiled instructions independently of the AI provider.

From Quillgeist Desktop, enter an explicit preference command:

```text
remember: Keep the original file and create a copy
```

A later command is compiled with that saved preference before it is handed to the connected AI/planner.  Task-specific instructions always override saved preferences.

The same store can be managed from the CLI:

```bash
quillgeist preferences add "Keep the original file and create a copy"
quillgeist preferences list
quillgeist preferences remove p-1234abcd
```

Preferences are stored under the Quillgeist home directory rather than in a model provider's chat history.  Writes use the existing local DLP settings before persistence; high-risk values are sanitized under the default policy.  Preferences are only saved through explicit user actions such as `remember:` or the preference CLI.

This provides the MVP cross-model loop:

`user correction → local Quillgeist preference → new task → preference injected → any connected model`


## Local inference manager

Quillgeist Full now includes a Windows-first local inference manager for installed runtimes and models. It inventories available RAM, detected GPU metadata, Ollama, llama.cpp binaries, ONNX Runtime GenAI when installed, Ollama models, and GGUF files from configured model directories. It applies a conservative memory-fit guard before recommending or planning local execution.

```bash
quillgeist local-ai status
quillgeist local-ai fit MODEL --context-tokens 8192
quillgeist local-ai route --task coding --context-tokens 8192
quillgeist local-ai fallback --task coding --context-tokens 8192
quillgeist local-ai plan MODEL --context-tokens 8192
quillgeist local-ai benchmark MODEL --context-tokens 4096
quillgeist local-ai curve MODEL --contexts 2048,4096,8192
quillgeist local-ai workload
```

Full also has an explicit measurement-and-verification loop:

```bash
quillgeist local-ai autofit --contexts 2048,4096,8192
quillgeist local-ai apply PROPOSAL_ID
quillgeist local-ai verify
quillgeist local-ai rollback-profile
```

Auto-fit measures only installed candidates. Applying a proposal changes only Quillgeist's local selection profile; it does not modify firmware, clocks, voltages, or model files. Verification compares the active profile against measured baseline performance and restores the previous profile when a configured regression threshold is crossed.

For clients that already speak the OpenAI chat-completions shape, Full can expose a local endpoint:

```bash
quillgeist local-ai gateway --host 127.0.0.1 --port 11435
```

The gateway serves `GET /health`, `GET /v1/models`, and non-streaming `POST /v1/chat/completions`. It refuses non-loopback binds, routes only to installed local models, applies the same RAM guard, records bounded workload measurements locally, and does not implicitly download a model.

Public Quillgeist builds retain the existing isolation boundary: they start local-only, do not contain a Clintware credential, and cannot silently pair to Clintware infrastructure. Internal owner routing is maintained separately from this public runtime.

## Local authority

Quillgeist does not expose an unrestricted administrator shell to the internet.

- By default the local node opens **no Quillgeist cloud connection**.
- If the user explicitly configures a self-hosted cloud URL, the node opens an outbound authenticated connection only to that configured instance.
- Every execution pack declares requested capabilities.
- Local policy decides `always`, `ask`, or `never`.
- Workspaces can be allow-listed.
- Mutated files are snapshotted before writes.
- Cloud approval can satisfy `ask`; it cannot override a local `never`.
- Markdown and JSON clipboard detection never silently executes by default.
- Sensitive-data detection runs locally before execution and before eligible external-model routing.

## First local run

```bash
quillgeist make-pack examples/hello-manifest.json hello.abpack
quillgeist inspect hello.abpack
quillgeist run hello.abpack --workspace ./sandbox
```

## Help Center

```bash
quillgeist help start
quillgeist help faq
quillgeist help glossary --search Contextor
quillgeist help fixes
```

The Help Center is stored under the Quillgeist home directory (`~/.quillgeist` by default for new installs).

## Operational telemetry

Telemetry is **off by default** in public builds. If a user explicitly configures their own self-hosted cloud and chooses to enable telemetry, Quillgeist can send account-scoped operational metadata to that instance.  Events can include connection/send/receive counts, run status and duration, Contextor token estimates, patch/file counts, node version, and redacted errors.

Prompt text and file contents are not included in telemetry events.  Telemetry can be inspected or disabled locally:

```bash
quillgeist telemetry status
quillgeist telemetry off
quillgeist telemetry on
quillgeist telemetry flush
```

## File associations

```bash
quillgeist install-associations
```

This registers `.abpack` and `.abresult` as Quillgeist documents.  The extensions are retained for alpha compatibility; the OS-visible application and descriptions are Quillgeist.

## Scheduling

```bash
quillgeist schedule add hello.abpack --at 2026-08-18T09:00:00-05:00
quillgeist schedule add hello.abpack --every 3600
quillgeist schedule list
```

Cloud-owned and device-owned schedules use the same schedule shape.  Device-owned schedules can continue locally if Cloud is unavailable.

## Result evidence

Each completed run writes an `.abresult` containing execution status, Definition-of-Done checks, changed-file evidence, Contextor metrics, planner feedback, and rollback metadata.  Contextor compacts large execution output before it is returned to an upstream planner.
