# Quillgeist Health Contract v2

This contract is mandatory for the maintained Windows runner, native health service, fallback recovery watcher, Guardian, installer/self-update path, and public Quillgeist runtime equivalents.

## Invariants

1. **Local pulse is independent of cloud connectivity.** The runner writes an atomic local heartbeat at least every 15 seconds while alive.
2. **Liveness is not progress.** A busy heartbeat must include `progress_at` and `progress_sequence`. Output/activity advances progress; a timer-only heartbeat does not.
3. **Stale is evidence-based.** Recovery requires either a missing/dead runner, a stale heartbeat, or a busy runner whose progress age exceeds the bounded task/no-progress budget. Elapsed wall time alone is not enough while progress remains fresh.
4. **One restart owner.** The native watchdog/Guardian owns runner restart decisions. The minute fallback repairs the watchdog itself and only supervises the runner when the native owner is unavailable.
5. **Graceful first.** Updates/reconciliation never kill a healthy busy job. They wait for completion within the task timeout plus bounded grace. Only stale/no-progress QQ-owned processes may be terminated.
6. **Delivery state is terminally explicit.** A request that fails before device delivery becomes `delivery_failed`/`closed`; it must never remain indistinguishable from active execution.
7. **Execution truth is explicit.** State progresses through planned → dispatched → delivered → executing → passed/failed → verified. A repository request file is not proof of delivery or execution.
8. **Event-driven reporting.** Local state changes are pushed when transport is available. Cloud status snapshots are summaries, not the authority for local liveness.
9. **No-focus recovery.** Watchdog, fallback recovery, self-update, and queued work execute hidden/no-activate unless the user explicitly opens the interactive UI.
10. **Version convergence.** Install, self-update, repair, Guardian, AgentBridge/public builds, and CI must carry equivalent local-pulse and stale-detection semantics.

## Heartbeat v2

`runner-heartbeat.json` is written atomically and includes:

- `version: "2"`
- `runner_id`, `pid`, `session_id`
- `state`, `job_id`, `task_id`, `phase`
- `sequence` — increments on every heartbeat write
- `progress_sequence` — increments only when meaningful task progress occurs
- `progress_at` — timestamp of the last meaningful progress
- `timestamp` — timestamp of the current liveness pulse

A fresh `timestamp` proves the runner loop is alive. A fresh `progress_at` proves the current job is moving.

## Check-in

A health check should return, when available:

- runner alive/state and current job/task
- heartbeat age
- progress age
- health classification/reason
- service/guardian version
- whether a restart is deferred because active work is healthy

The check-in path must remain responsive while the interactive runner is busy, reconnecting, updating, or restarting.

## Recovery

The canonical administrator entry point is:

`quillgeist-lite/tools/driznet-reconcile-and-resume.ps1`

It is idempotent and must:

1. inspect local execution ownership;
2. allow healthy work to finish;
3. recover stale/no-progress ownership only;
4. refresh reviewed canonical runtime files;
5. repair watchdog/fallback supervision;
6. verify a fresh local pulse;
7. avoid duplicate Noma deployment when authoritative verification already passed;
8. validate the current big-prompt planner;
9. return non-zero on unreconciled health failures.
