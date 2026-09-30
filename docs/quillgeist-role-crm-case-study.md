# Quillgeist Case Study — Role-Specific CRM Build

Status: Anonymized proof point based on a completed internal build.  Company identity is intentionally omitted.

## Executive summary

A cloud model was asked to create a functional, role-specific operating workspace for a **Senior Infrastructure Pre-Sales Architect** opportunity at a confidential technology advisory company.

Instead of using the cloud model to repeatedly read the repository, rewrite common CRM scaffolding, supervise package installation, interpret build logs, deploy, and manually verify every browser interaction, Quillgeist handled the deterministic execution locally through the reviewed `crm-astro-build` and `browser-work` tasks.

The cloud model concentrated on the part that required judgment: role analysis, information architecture, the operating model, sample data, acceptance criteria, and the deltas from the mature CRM base.  Quillgeist materialized, checked, deployed, and verified the result.

**Result:** A working eight-track role-specific CRM was built, deployed, and functionally tested with bounded execution evidence.

## What was built

The anonymized workspace included eight operating tracks:

1. Discovery & Outcome Map
2. Current-State Architecture
3. TCO & FinOps
4. Vendor Evaluation
5. Solution / HLD
6. SOW / BOM / Proposal
7. Executive Business Case
8. Delivery Handoff

It also included:

- A pre-populated synthetic engagement
- Six additional synthetic sample accounts
- An interactive multi-year TCO model
- A persisted vendor / architecture comparison matrix
- Architecture and commercial risk tracking
- HLD / SOW / BOM workflow surfaces
- Executive business-case preparation
- Delivery-handoff workflow
- Decision-brief PDF generation
- HLD / SOW Markdown export
- Light / dark UI
- Local no-login persistence
- A `noindex,nofollow,noarchive` candidate-demo boundary

## Execution path

```text
Cloud model
  decide the role-specific delta
  define acceptance criteria
        |
        v
Quillgeist / qq
  reviewed ASTRO manifest
  local repo refresh
  local materialization
  source checks
  npm build preparation
  deployment
  browser verification
        |
        v
bounded evidence returned to model
```

The model did not need to supervise every deterministic step or consume the full execution transcript.

## Measured execution evidence

The successful Quillgeist build returned local-agent evidence for:

| Step | Measured result |
| --- | --- |
| Repository refresh | Passed in 2.996 seconds |
| Validate + materialize + checks + deploy | Passed in 22.220 seconds |
| Live browser functional verification | Passed in 13.560 seconds |
| Operating tracks | 8 |
| Production assets uploaded | 14 |
| Deployment | Custom-domain deployment succeeded |
| Verification | TCO recalculation and vendor-score recalculation both exercised successfully |

The live verification changed the TCO horizon and confirmed recalculated totals, then changed a vendor-fit score and confirmed the aggregate score updated.  These were synthetic demo values; the proof point is the execution and verification workflow, not the business numbers.

## Token-efficiency estimate

The exact provider-token counter for a hypothetical remote-only rebuild does not exist, so the savings below are a **modeled estimate, not billing telemetry**.

For a build of this size:

| Execution approach | Estimated model-token load |
| --- | ---: |
| Quillgeist + reusable ASTRO CRM base | ~12k–25k |
| Normal cloud chat supervising the full build | ~35k–65k |
| Full cloud-agent / Work-style repository + browser loop | ~45k–80k |
| Rebuilding the CRM largely from scratch | ~70k–120k+ |

That implies a directional savings of approximately **30k–60k model tokens** for this case, or roughly **60–80% of the implementation-token load** compared with supervising the same deterministic work through a cloud model.

The important architectural point is not the exact percentage.  It is the division of labor:

> **The model decides and designs the delta.  Quillgeist executes, verifies, and returns compact evidence.**

As more workflows become reviewed local tasks, the marginal model-token requirement should fall because the model does not have to repeatedly rediscover or supervise deterministic execution.

## Why this matters

Most agent systems make a powerful model spend expensive context on work that is already deterministic:

- rereading known repository structure;
- recreating boilerplate;
- watching package installation;
- parsing long command output;
- issuing repetitive build commands;
- waiting on deployment;
- manually rechecking browser state;
- carrying large execution transcripts forward.

Quillgeist moves those operations into a user-owned runtime with reviewed task contracts and bounded evidence.

This changes the economics and the reliability model at the same time:

- **Lower context consumption:** Deterministic work does not require repeated model supervision.
- **Smaller result payloads:** The model receives evidence instead of the entire local transcript.
- **Repeatability:** The same reviewed task can be reused across models and sessions.
- **Provider portability:** The operating workflow is not tied to the model that designed it.
- **Local control:** Execution stays inside the user's machine and permission boundary where appropriate.
- **Verification:** "Done" is backed by checks and observed results rather than a model's narrative assertion.

## Product pitch

### One sentence

**Quillgeist is the user-owned execution layer that lets AI spend tokens on judgment instead of supervising deterministic work.**

### Short pitch

AI agents are becoming smarter, but they still waste expensive context rereading the same environment, supervising build steps, parsing logs, and checking whether their own work actually finished.

Quillgeist moves that deterministic work into a user-owned local runtime.  The model decides what should change; Quillgeist executes reviewed tasks, verifies the result, and returns compact evidence.

In one anonymized role-specific CRM build, Quillgeist locally refreshed the source, materialized the application, ran checks, deployed it, and functionally verified the live interface.  The modeled reduction was approximately **30k–60k cloud-model tokens**, while preserving a full verification trail.

The model can change.  The user's runtime, permissions, workflows, and execution evidence remain theirs.

### Founder-demo version

> I used an AI model to design a custom operating system for a real professional use case.  But I did not make the model burn context supervising npm, deployment, browser checks, and all the repetitive steps it already knew how to ask for.  Quillgeist handled those locally through reviewed tasks and returned the evidence.  The build and live verification passed, and the modeled savings were tens of thousands of cloud-model tokens.  That is the product: let the model spend intelligence on the delta, and let the user's own runtime handle execution.

## Evidence boundary

This case study intentionally omits the target company's identity and uses synthetic demo data.

The measured execution durations, task outcomes, track count, asset count, and successful functional checks came from Quillgeist local-agent results.  The **token-savings figures are directional estimates** based on the expected cloud-model supervision required for the same workflow; they should not be represented as measured provider billing data until Quillgeist captures comparable token telemetry across controlled A/B runs.
