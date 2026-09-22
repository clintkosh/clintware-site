---
name: delta-state-context-compaction
description: Keep long-running AI work efficient by preserving exact anchors and active working state, ingesting only new deltas, moving older context to cold local state, and rehydrating only history relevant to the next step.
---

# Delta-State Context Compaction

Use this skill for long-running AI, agent, coding, research, support, or build sessions where the same history is repeatedly sent back to a model.

The goal is not to produce a shorter summary of the entire conversation every time. The goal is to stop treating the conversation transcript as the system of record.

## Core model

Maintain four layers:

1. **Exact anchors** — names, counts, quoted text, file paths, URLs, permissions, negative constraints, privacy rules, and definition-of-done requirements that must survive compaction without paraphrase.
2. **Working state** — unresolved tasks, current failures, decisions, dependencies, and the newest state changes.
3. **Recent unique context** — a small tail of new information that has not yet become durable state.
4. **Cold history** — older context retained outside the active prompt and retrieved only when the next step makes it relevant.

Canonical flow:

`RAW HISTORY + NEW DELTA -> EXACT ANCHORS -> ACTIVE WORKING STATE -> DEDUPE -> COLD HISTORY -> REHYDRATE NEXT STEP -> ACTIVE CONTEXT -> EXECUTE -> UPDATE STATE`

## Required behavior

### 1. Ingest deltas, not the whole story

Fingerprint normalized context units and detect information already represented in state.

When a new request mostly repeats known context:

- keep the newly introduced information;
- keep exact anchors;
- keep current failures and explicit decisions;
- keep a bounded set of relevant open work;
- do not replay repeated background merely because it appeared again.

Do not force compaction on a first encounter. The first pass should establish state unless an independent size limit already requires reduction.

### 2. Protect exact anchors from semantic drift

Do not summarize or rewrite exact anchors.

Examples include:

- exact product or person names;
- URLs and file paths;
- quoted strings;
- requested counts;
- explicit exclusions;
- security or privacy boundaries;
- approved definitions of done.

If exact anchors cannot fit safely inside the active-context budget, fail open to the original context or require a larger budget rather than silently deleting them.

### 3. Bound working state

Do not assume every unfinished item deserves permanent residence in the active prompt.

Prefer, in order:

1. newest delta;
2. active failures;
3. explicit decisions;
4. next-step-relevant open work;
5. the most recent remaining open work.

Move lower-priority open items to cold state. They remain retrievable; they are not erased.

### 4. Rehydrate just in time

Before the next step, search cold history using the next-step objective, entities, files, errors, and constraints.

Rehydrate only the strongest relevant hits. Do not reconstruct the full transcript.

Generic term overlap is not enough. Prefer multiple specific shared terms, identifiers, filenames, error strings, or other strong signals.

### 5. Make state inspectable

Maintain a deterministic revision or state hash when the implementation supports it.

The operator should be able to answer:

- what state revision produced this prompt;
- which exact anchors are active;
- which work remains open;
- what was omitted from the active budget;
- what history was rehydrated and why.

A state hash is an audit aid, not proof that the state is correct.

### 6. Compact only when it actually saves work

A state system can add more overhead than it removes on short inputs.

Before substituting compacted state for raw context, require measurable benefit such as:

- a meaningful repeated-context ratio; and
- a minimum active-context reduction.

If the rendered state is not smaller enough to matter, pass the original context through unchanged while still allowing local state to be updated.

### 7. Keep semantic summarization optional

Use deterministic extraction, deduplication, ranking, and state selection for information that can be handled safely without another model call.

Use semantic summarization only when abstraction materially improves the next step. Do not spend model tokens summarizing content that can be represented exactly or structurally.

### 8. Preserve privacy boundaries

Prefer local state for raw or sensitive project context.

Do not embed credentials, secrets, hidden callbacks, author-controlled endpoints, or unrelated personal information in a reusable implementation.

If an implementation persists context, make that persistence visible and provide a clear reset/delete path.

## Failure modes to avoid

- recursive summaries of summaries with no exact source anchors;
- replaying every open task on every model call;
- compressing the first short request just because the feature exists;
- deleting an exact constraint to hit a token target;
- retrieving cold history on weak single-word similarity;
- claiming cost savings without measuring actual before/after context;
- treating archived context as deleted context;
- hiding persistent memory from the operator.

## Suggested metrics

Track separately:

- raw input characters or tokens;
- duplicate-context ratio;
- active-context characters or tokens;
- reduction percentage;
- number of exact anchors;
- number of new delta items;
- number of cold-state items;
- number of rehydrated items;
- state revision/hash;
- downstream task success or regression rate.

Do not call a method superior to another compaction system without a controlled benchmark that measures both efficiency and task fidelity.

## Reference implementation pattern

A local implementation can store one state file per project/scope and expose commands such as:

- `ingest`: add new context and return compacted active state when worthwhile;
- `show`: render current active state for a next-step query;
- `status`: report revision, counts, and state hash;
- `reset`: explicitly clear the project state.

Quillgeist uses this pattern as a local-first delta-state layer for repeated project context. The skill itself is infrastructure-neutral and can be implemented in any agent harness, MCP service, CLI, or application.
