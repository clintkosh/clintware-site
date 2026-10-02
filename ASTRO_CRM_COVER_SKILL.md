# ASTRO CRM+Cover Skill

## Purpose

Create one coherent, role-specific application package that combines:

1. a job-tailored CRM / operating proof-of-work when the role justifies one;
2. a distinct Why Company / Why Us response;
3. a concise cover letter;
4. verified artifact links and claims.

`CRM+Cover` is a reusable application wrapper around `ASTRO_CRM_ONE_OFF_SKILL.md`.  It is not a company-specific template.

Canonical package:

`VERIFY ROLE -> DECIDE IF CRM ADDS SIGNAL -> MODEL ROLE IN ASTRO -> BUILD / VERIFY CRM -> WRITE WHY COMPANY -> WRITE COVER LETTER -> INSERT VERIFIED ARTIFACT LINK -> REDUNDANCY / CLAIM CHECK -> SUBMIT`

## Canonical base rule

ASTRO is the conceptual base.

- Never use Anthropic, Doppel, Neuron7, CXponent, Boom, or another employer build as the reusable conceptual template.
- Prior employer builds are implementation references only.
- Company identity, language, operating loop, sample data, visual treatment, and application copy must be supplied as an overlay from the current verified role.
- Reusable lessons flow back into ASTRO, not into an employer fork.

If a CRM is built, all build, persistence, synthetic-data, deployment, and browser-verification requirements in `ASTRO_CRM_ONE_OFF_SKILL.md` remain mandatory.

## When to use CRM+Cover

Use this profile when an application includes a written motivation / cover-letter field and a role-specific operating artifact could materially strengthen the application.

It is especially useful for:

- Customer Success
- Customer Success Operations
- Implementation / Professional Services
- TAM / technical post-sales
- Support leadership / support operations
- AI adoption / workflow transformation
- customer-facing technical operations

Do not build a CRM merely because the framework exists.  Build one only when it can demonstrate how the user would operate responsibilities that are material to the target role.

## Required outputs

### 1. Role brief

Recover or verify:

- company and role
- current public job description
- role mission
- primary customer / partner type
- operating responsibilities
- explicit outcomes / KPIs
- technical systems / product surfaces
- executive and cross-functional expectations
- user's strongest relevant proof points
- application field prompts and word limits

Separate public fact, user fact, synthetic demo data, and proposed operating model.

### 2. CRM proof-of-work

If worthwhile, create a one-off CRM using `ASTRO_CRM_ONE_OFF_SKILL.md`.

The CRM should prove:

**"I understood the operating problem deeply enough to model how I would work it."**

It should not imply:

**"I know your private internal process"** or **"I built a replacement for your CRM."**

### 3. Why Company response

The Why Company answer has one job: explain the credible convergence between the user's trajectory and this company.

Default structure:

`WHY THIS COMPANY -> RELEVANT CAREER PROOF -> DELIBERATE PREPARATION / BUILDING -> FUTURE CONTRIBUTION`

Rules:

- Obey the application's requested word range first.  When the field explicitly requests 200–400 words, target roughly 280–340 unless content warrants otherwise.
- Lead with motivation and fit, not the CRM.
- Use 1–2 strong quantified proof points rather than resume recitation.
- Mention relevant learning / product work only when it supports the motivation.
- A role-specific CRM may receive one brief proof sentence, but detailed artifact explanation belongs in the cover letter.
- Do not paste the cover letter into this field.

### 4. Cover letter

The cover letter has a different job: make the case that the user's experience maps to the actual role and provide concrete evidence.

Default structure:

`ROLE FIT -> RELEVANT RESULTS -> WHY THIS OPERATING MOTION -> DELIBERATE DOMAIN / PRODUCT PREPARATION -> PROOF-OF-WORK -> CONTRIBUTION`

Rules:

- Tailor to the verified role rather than writing a generic career summary.
- Use the strongest role-relevant metrics and operating examples.
- Explain why the specific customer / partner / technical motion matters.
- Treat Clintware, QuillGeist, MCP, or another user-built system as evidence only when relevant.
- Treat the role-specific CRM as proof, not as the entire cover letter.
- Clearly label synthetic data and candidate-built status when the CRM is mentioned.
- Avoid repeating full paragraphs or long lists from Why Company.

## CRM link policy

A public CRM URL may appear in a final cover letter only when the exact route has been live-verified.

States:

- **planned**: do not include URL.
- **source built**: do not include URL.
- **CI validated**: do not include URL as though it is live.
- **deployed but not interactively verified**: do not describe it as verified or fully working.
- **live + interactive browser verified**: URL may be included with accurate scope / synthetic-data disclosure.

If the application must be submitted before live verification, omit the CRM URL and keep the cover letter complete without it.

Never convert an expected route into a factual claim.

## Redundancy rule

The three surfaces should reinforce each other without becoming duplicates:

| Surface | Primary question |
| --- | --- |
| Why Company | Why this company, and why now? |
| Cover Letter | Why this role, and why this candidate? |
| CRM | How would this candidate actually operate the work? |

Some repeated facts are acceptable when they are the strongest evidence, but each surface must add new information.

## Default manifest extension

When useful, add an application bundle to the role manifest:

```json
{
  "application_bundle": {
    "profile": "crm+cover",
    "why_company": {
      "enabled": true,
      "word_min": 200,
      "word_max": 400
    },
    "cover_letter": {
      "enabled": true
    },
    "crm_link_policy": "live-verified-only"
  }
}
```

Field-specific application instructions override these defaults.

## Validation gates

### Copy gate

Verify:

- requested word count / format
- company and role names
- all career claims against known user facts
- no invented employer processes
- no unnecessary resume repetition
- Why Company and cover letter have distinct functions
- all URLs reflect current verified state

### CRM gate

Use every applicable gate from `ASTRO_CRM_ONE_OFF_SKILL.md`, including source, deployment, live data, and interactive browser verification.

### Submission gate

Before final submission:

1. re-read the actual application prompts;
2. ensure the Why Company answer directly answers its prompt;
3. ensure the cover letter directly maps experience to the role;
4. include the CRM only when it adds signal;
5. include a CRM URL only when its live state is verified;
6. make synthetic / candidate-built boundaries clear;
7. remove stale company names, source-template semantics, and unsupported claims;
8. confirm the application still makes sense if the reviewer never clicks the CRM.


## Local multi-application factory

For repeated job-application builds, CRM+Cover has a local-first factory mode.  The purpose is to support several isolated application builds concurrently without requiring one ChatGPT thread or one QQ dispatch per company.

Canonical execution:

`VERIFIED JD -> ROLE MANIFEST -> DPLR IMPLEMENTATION REFERENCE -> ROLE-SPECIFIC SYNTHETIC SEEDS -> CRM+COPY MATERIALIZATION -> LOCAL CHECKS -> OPTIONAL LOCAL-MODEL COPY PASS -> EXTERNAL DEPLOYMENT HANDOFF -> LIVE/BROWSER VERIFICATION -> APPLICATION / LANDTHEPLANE STATE`

### Conceptual base vs implementation reference

ASTRO remains the conceptual source of truth.  For the current local factory, `dplr-crm` is the default implementation reference because it contains the mature browser-local persistence, CRM interaction shell, preparation workflow, and verification-compatible runtime.

This does **not** make Doppel the reusable product model.  The factory must:

- materialize the DPLR implementation foundation once;
- clone that generated foundation into isolated role build directories;
- replace company identity, role language, tracks, operating loop, samples, application copy, and domain from the current role manifest;
- keep source-company semantics out of the generated application;
- feed reusable lessons back into ASTRO and the factory, not into an employer-specific fork.

### Three-letter domain rule

Factory-generated application CRMs should default to a unique three-character Clintware subdomain when the user asks for the compact pattern.

Examples of the format:

`abc.clintware.com`

The three-character code should be relevant to the company or role without simply repeating the full company name.  The manifest is the source of truth for the assignment.  Never describe the route as live until deployment and browser verification pass.

### Parallel-local rule

The same build must work in both of these modes:

1. direct local invocation without QQ;
2. QQ invocation of the same reviewed local runner.

QQ is an orchestration option, not a dependency of CRM+Cover.

The batch runner may execute independent role builds concurrently after one shared DPLR reference materialization.  Never allow parallel workers to mutate the shared reference build while other workers are cloning it.

Each worker must have:

- its own project manifest;
- its own `.build/<project>` output;
- isolated logs / run evidence;
- bounded CPU/RAM concurrency;
- independent validation status;
- no automatic production deployment from the local batch runner unless explicitly requested.

### Synthetic portfolio variation

Generated sample portfolios must not look copied from one account to the next.

- Use materially different lifecycle stages across accounts.
- Use stable project/account-derived progress so rebuilds remain reproducible.
- Do not vary verified role facts, candidate evidence, or sourced metrics.
- Repeated generated progress values across the whole portfolio, including the former repeated 33% pattern, must fail acceptance unless the repetition is intentional and documented.
- Default generated work should provide enough milestones to show distinct progress states such as 20%, 40%, 60%, and 80%.
- Progress, stage, risks, actions, and next milestone must tell the same story.
- Generated numerical examples remain explicitly synthetic.

### Global account selector

Choosing an account from the top customer selector must activate that customer and navigate to its Command Center even when the current view is Portfolio.  Browser acceptance must exercise this path from the default landing view.

### Role and company-principles alignment

Each local CRM+Cover factory manifest must include the current public job source, the date it was checked, and an official company source for current values, operating principles, or careers culture.  Record at least three current principles with a concise explanation of how each relates to the role.

Keep company statements, job requirements, and candidate evidence separate.  Use the employer's current terminology and do not infer internal practices that are not public.

### Local cover-letter generation

Every factory manifest must contain a complete deterministic Why Company and cover-letter draft so the package remains usable without a local model.

A local model may create a second candidate draft or revision, but it may not silently overwrite the source-controlled version.  Local-model copy must obey the same evidence and quality gates as cloud-generated copy.

### Permanent interview/application gates

The following controls apply to every CRM+Cover package:

- **Source gate:** Every consequential metric, percentage, financial figure, timeline, or factual claim must resolve to candidate evidence, the verified role, a named source, or an explicit synthetic/hypothetical label.
- **Answer compression:** For interview-prep surfaces, default to `answer -> proof -> role link -> stop`.
- **Core before extras:** Perfect the requested application material before adding bonus demos, art, side tools, or other optional artifacts.
- **Personal connection:** Genuine reciprocal rapport is allowed.  Do not manufacture additional intimacy in follow-up with gifts, custom art, Easter eggs, biography, or elaborate callbacks unless explicitly invited.
- **Follow-up restraint:** Default to 100–175 words with one substantive takeaway and one role-relevant proof point, then stop.
- **Human validation:** AI may prepare, synthesize, and automate repeatable work.  Human judgment owns consequential claims, customer commitments, interpretation, and external communication.
- **Outbound QA:** Verify names, addresses, company, role, dates, metrics, links, attachments, versions, and whether the outbound is necessary.
- **Signal-to-noise:** Optimize for decision-relevant evidence rather than effort displayed.

### Future application-platform boundary

The factory is intended to become a reusable application-workflow layer that can later feed LandThePlane.

Keep the interfaces separable:

`JOB DISCOVERY -> VERIFIED JD -> APPLICATION RECORD -> CRM+Cover MANIFEST -> LOCAL BUILD/COPY WORKERS -> HUMAN REVIEW -> SUBMISSION -> INTERVIEW PREP -> FOLLOW-UP -> OUTCOME -> LANDTHEPLANE LEDGER`

Do not tightly couple CRM generation to one job-source provider or one browser extension.  The application record and manifest should be portable so a later browser-assisted application product can invoke the same local factory.

## STOP rule

The CRM+Cover package is done when:

- the written fields each answer their own prompt;
- the strongest evidence is included without unnecessary duplication;
- any CRM used is scope-fit and truthfully described;
- URLs and functionality claims match observed verification state; and
- additional material would add length rather than signal.

Do not add another artifact merely to make the application look more elaborate.

## Provenance-first CRM+Cover release gate

Every CRM+Cover package inherits `docs/EVIDENCE_PROVENANCE_STANDARD.md`.

Before finalizing Why Company, cover letter, CRM copy, downloadable PDF, or follow-up:
- reconcile every consequential number to the claim ledger;
- distinguish candidate evidence, public facts, targets, derived values, estimates, and synthetic demo values;
- re-check final rendered/exported artifacts, not just source text;
- verify recipients, names, role/company, dates, links, and attachments before external messaging;
- fail closed on orphan metrics.

The package should also carry an internal one-line ROLE PROBLEM HYPOTHESIS and an operational org map. These are used to shape the work even when they are not displayed as application marketing.

When a CRM is public as proof-of-work, default to an operator-product presentation rather than an employer-targeting page. If requested, reflect the target company's public design relationships without explicitly naming the target company or role in the primary interface.

## Multi-owner CRM+Cover proof pattern

When the role's distinctive challenge is coordination across multiple ownership motions, the CRM+Cover package should prove that operating judgment directly.

Prefer:
- a Coverage / Assignment view;
- a source-system projection map;
- routing rules for ownership boundaries;
- an operational org map;
- synthetic examples across materially different stages;
- evidence-backed technical refreshers for the most likely technical seams.

The cover letter should explain the underlying operating problem, not describe every CRM feature.

If the public proof-of-work is intentionally neutral (no target company or role name in the primary UI), keep the application mapping in the private/package layer and only add the public CRM URL to application copy after live browser verification confirms the neutral presentation and functional workflows.
