# Quillgeist Lite Execution Selection Policy

## Priority order

Quillgeist Lite and any model operating through it choose the implementation method in this order:

1. **Best fit for the task and highest-quality result.**
   - Choose the runtime/tool that most directly produces the intended outcome.
   - Preserve correctness, fidelity, robustness, and maintainability.
   - Do not choose a cheaper runtime when doing so would materially reduce output quality or make the result less faithful to the requested goal.

2. **Reliability and operational fit.**
   - Prefer the method that is most likely to work correctly in the target environment with clear failure evidence and recoverability.
   - Reuse an already-working runtime or dependency when it does not compromise quality.

3. **Efficiency after the quality bar is met.**
   - Among methods that can meet the requested quality, prefer less setup, fewer round trips, lower token/log volume, lower compute cost, lower latency, and simpler maintenance.
   - Avoid unnecessary language/runtime switching when an existing method is equally capable.

## Runtime guidance

- **PowerShell**: Prefer for Windows configuration, registry/services/tasks, file/system administration, CLI orchestration, environment setup, and short glue workflows.
- **Python**: Prefer for structured data, APIs, parsing, transformation, automation with meaningful logic, prototyping, cross-platform work, and tasks where Python libraries materially improve quality.
- **C**: Prefer when native execution, very low overhead, compiled utilities, OS-level behavior, deterministic performance, or a self-contained executable materially improves the result.

These are defaults, not rankings. The task outcome decides the runtime.

## Model behavior

Unless the user explicitly names a language/runtime:

1. infer the Definition of Done;
2. identify the strongest implementation approach;
3. choose the runtime/tool that best meets it;
4. only then optimize cost/tokens/runtime overhead;
5. if an attempted method proves inadequate, use returned evidence to choose a better registered method rather than forcing the original runtime.

Efficiency is a tiebreaker after quality, not a substitute for quality.


## Governed live-web policy

Quillgeist Web extends qq with live search, page reading, and bounded browser automation while preserving the local execution boundary.

- Remote web navigation is public HTTP/HTTPS by default. Loopback, RFC1918/private, link-local, multicast, and reserved network destinations are blocked to reduce SSRF and local-network exposure.
- Browser authentication is local-first. A user signs in through the visible persistent qq browser with `web login <url>`; remote callers do not receive cookies, passwords, MFA codes, API keys, tokens, or other credentials.
- Remote fill/type operations refuse password, OTP, payment-card, token/key, and other credential-like fields.
- Consequential browser actions such as purchases, payments, destructive changes, publishing, authorization, or user-management actions require explicit approval for that run.
- Downloads are disabled in the governed browser agent. File upload/download or other higher-risk capabilities require a separately reviewed task.
- Search and read are preferred over automation when they satisfy the task. Automation is bounded to the registered step vocabulary; arbitrary JavaScript and remote shell text are not accepted.
- The public-web policy is enforced again on redirects and browser subrequests. Private-network access is never enabled by the remote Quillgeist Web MCP tools.
