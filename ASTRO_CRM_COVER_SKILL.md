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

## STOP rule

The CRM+Cover package is done when:

- the written fields each answer their own prompt;
- the strongest evidence is included without unnecessary duplication;
- any CRM used is scope-fit and truthfully described;
- URLs and functionality claims match observed verification state; and
- additional material would add length rather than signal.

Do not add another artifact merely to make the application look more elaborate.
