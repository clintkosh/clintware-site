# Clintware Local AI Efficiency Overflow

Load for owner-managed local AI, Quillgeist, QQ, N3WD@V1D, MEMORIA, or DRIZNET work.

## Routing

Default route when quality and freshness permit:

`deterministic local -> local service -> healthy local model -> Clintware MCP/provider route -> remote provider`.

Use fresh external authority when the task depends on current facts or external mutations.

## Stable-prefix and cache discipline

- Keep stable system/routing prefixes byte-stable across comparable requests so local/provider KV or prompt caches can hit.
- Put volatile task data after stable policy/context prefixes.
- Track cache-hit/miss evidence where the runtime exposes it.
- Do not change prompts, model parameters, or context ordering casually when benchmarking cache behavior.
- Pin model/artifact identifiers and record hashes for correctness-sensitive benchmarks.

## Correctness canary

Before relying on a newly changed model/runtime/cache path, run a small deterministic correctness canary with an expected answer or invariant. Treat throughput gains as invalid if correctness regresses.

## Model switching

Model choice is capability-first, then policy-weighted by quality, cost, latency, privacy, and available CPU/GPU/RAM.

Supported policy concepts include:

- Best Quality
- Lowest Cost
- Fastest
- Local First
- Private
- Balanced
- Manual
- Custom

A workflow may pin a model. Sub-search/sub-task branches may use different models from the final synthesis model.

## Local model stack

- Keep Ollama selectable when healthy.
- Keep BitNet selectable only when its runtime/client round trip is verified.
- Prefer GPU when live VRAM/capacity is safe; otherwise fall back conservatively.
- Preserve local model inventories and do not delete unique models during cleanup.
- DRIZNET must remain functional without an external Toshiba drive; external storage is optional backup/archive, not a runtime dependency.
- MEMORIA AI data remains on the maintained local AI storage path defined by current machine state; discover live paths rather than relying on stale drive assumptions.

## Benchmark work still requiring evidence

When relevant, complete and record:

- stable-prefix/cache-hit instrumentation;
- correctness canary;
- artifact/model hash pinning;
- checkpoint/cache benchmark;
- BitNet embedding-layer experiment where technically supported;
- actual client round-trip, not process existence alone.

Do not claim these benchmarks are complete without current local evidence.
