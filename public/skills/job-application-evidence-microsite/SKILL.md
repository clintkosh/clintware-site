---
name: job-application-evidence-microsite
description: Build a privacy-scrubbed, role-tailored, self-contained HTML job-application microsite from verified career evidence, a target role, and public work samples. Use when a candidate wants a custom application page that maps employer requirements to proof without inventing claims or exposing private search/interview data.
license: MIT
version: 1.1.0
---

# Job Application Evidence Microsite

Create a custom HTML application page that acts as an evidence layer behind a resume and cover letter.

The page is not a generic portfolio template. It is a role-specific proof surface.

## Core outcome

Transform:

```
verified career evidence
+ target job description
+ public work samples
+ optional public resume
+ optional public portrait
```

into:

```
role requirements
→ strongest verified evidence
→ attributed metrics
→ working examples
→ concise operating philosophy
→ self-contained HTML page
```

## Required workflow

### 1. Establish the evidence boundary

Treat these as evidence sources only when the candidate has supplied or verified them:

- resume or accomplishment record;
- verified career-evidence store;
- public portfolio/project links;
- public GitHub repositories;
- public certifications or education;
- approved public biography/profile;
- target job description.

The job description is evidence about the role, not about the candidate.

Never invent:
- employers;
- dates;
- metrics;
- ownership;
- technologies;
- certifications;
- reporting lines;
- customer scale;
- management scope;
- outcomes.

If a requirement has no proof, render it as a gap, adjacent example, or learning plan.

### 2. Extract the role scorecard

Create a bounded requirement set from the listing.

Prefer:
- explicit responsibilities;
- explicit requirements;
- preferred qualifications;
- recurring verbs;
- named tools/platforms;
- quality/governance expectations;
- enablement/change-management expectations;
- measurable outcome expectations.

Avoid turning generic company marketing copy into candidate requirements.

### 2.5 Analyze adjacent public signals when available

When the candidate supplies a hiring-manager post, public thread, public interview, podcast, company article, or other employer-authored discussion, treat it as an additional requirements-discovery layer.

Extract only job-relevant public signals such as:

- operating principles;
- objections or failure modes;
- metrics and definitions of success;
- examples the hiring manager repeats;
- cross-functional expectations;
- terminology the employer uses consistently;
- concerns raised in the public discussion that the job description underweights.

Classify each useful signal as:

1. **Already covered** — existing verified evidence addresses it.
2. **Transferable bridge** — candidate has adjacent evidence but not direct domain ownership.
3. **Real gap** — no verified evidence; address with a learning or operating plan rather than fabricated experience.
4. **Non-requirement** — interesting discussion that should not distort the application.

Before generating the page, run a gap question:

`What important area appears in the public discussion that neither the job description nor the candidate's current application adequately addresses?`

Do not quote private comments, inaccessible thread content, or material that has not actually been retrieved. Never infer candidate experience from employer discussion.

### 3. Map requirement → proof

For each material requirement, select up to three evidence points when available.

Each proof item should preserve:
- employer/project/source;
- candidate ownership;
- scale;
- metric or observable result;
- why it transfers to the target role.

Never move a metric from one employer or project to another.

### 4. Scrub private information before HTML generation

Default public-safe mode removes or blocks:
- private email addresses unless explicitly approved for publication;
- phone numbers;
- exact home/street addresses;
- private compensation details;
- recruiter/interviewer email addresses;
- private interview notes;
- private calendar links unless intentionally supplied as public;
- private connected-account content;
- raw mailbox snippets;
- credentials, tokens, API keys, secrets;
- employer-confidential material;
- private family/health information;
- inferred sensitive personal information.

City/state, public professional links, and a public scheduling link may be retained only when explicitly approved.

Do not use private source text merely because it was available to the model.

### 5. Match the target organization's visual language carefully

Research the target organization's current public site when allowed.

Use:
- typography character;
- spacing density;
- editorial rhythm;
- motion restraint;
- color relationships;
- border/radius character;
- information hierarchy.

Do not:
- copy proprietary font files;
- copy logos without permission;
- present the microsite as an official employer page;
- clone protected illustrations or photography;
- reuse copyrighted site text beyond short necessary references.

The result should feel context-aware, not counterfeit.

If web research is unavailable, use a neutral editorial system rather than generic gradient SaaS boilerplate.

### 6. Anti-slop design gate

Reject or simplify:
- excessive rounded cards;
- repeated marketing boxes;
- meaningless glowing gradients;
- decorative charts with no evidence meaning;
- generic "AI" iconography;
- overlong slogans;
- unnecessary animation;
- duplicate proof;
- generated-looking filler;
- unsupported superlatives.

Prefer:
- editorial rows;
- clear evidence attribution;
- restrained motion;
- real metrics;
- direct links;
- deliberate whitespace;
- accessible contrast;
- mobile behavior;
- reduced-motion support.

### 7. Recommended page architecture

Use only sections supported by the candidate evidence.

A strong default sequence is:

1. Short personal opening / welcome note.
2. Candidate identity + concise role-fit thesis.
3. Attributed evidence stats.
4. Requirement-to-proof map.
5. Build/output inventory if relevant.
6. Resume or resume link.
7. "How I work / how I think."
8. Career or build timeline.
9. Public applications/projects/work samples.
10. Optional venture/research directions.
11. Direct call to action.

Do not force every section into every page.

### 8. Metrics must show provenance

Bad:

```
+20% renewals
```

Better:

```
Dedrone · +20% renewals
```

If the metric came from a project rather than an employer, name the project.

### 9. Privacy-safe output contract

Before final output, produce a privacy check containing:

- removed phone count;
- removed email count;
- removed street-address count;
- removed secret/token count;
- private-source sections excluded;
- public links retained;
- unresolved items requiring candidate review.

Do not publish automatically unless the user explicitly requested publication and the deployment path is authorized.

### 10. Output package

Minimum output:

```
application-microsite/
  index.html
  evidence-map.json
  privacy-check.json
  README.md
```

For browser-local workflows, a single self-contained `index.html` plus downloadable JSON evidence/privacy manifests is acceptable.

## HTML requirements

The HTML must be:

- self-contained where practical;
- responsive;
- accessible;
- printable;
- readable without JavaScript;
- free of trackers unless explicitly requested;
- free of private data by default;
- explicit about external links;
- compatible with reduced-motion settings.

Use semantic HTML and normal links. Avoid framework dependencies unless the target deployment already requires them.

## LandThePlane integration

This skill fits late in the application flow, after core evidence and role-fit work.

Recommended sequencing:

```
QUALIFY
→ EVIDENCE MAP
→ RESUME / COVER LETTER
→ INTERVIEW PREP
→ TURBO SPRINT: APPLICATION MICROSITE
→ REVIEW / PRIVACY GATE
→ PUBLISH OR DOWNLOAD
```

The microsite step should reuse verified evidence already collected by LandThePlane instead of asking the user to re-enter accomplishments.

It should remain optional. Not every application deserves a custom site.

Use it when:
- the role is unusually high-fit;
- the employer values builders, proof, design, technical execution, or initiative;
- the candidate has meaningful public proof;
- the application warrants extra effort.

## Quality gate

Before declaring the page complete, verify:

1. Every metric is attributed to the correct source.
2. Every major target requirement has proof, a safe bridge, or an explicit gap.
3. No private interview/recruiter material leaked.
4. No private contact information leaked unintentionally.
5. No employer-confidential content leaked.
6. Links resolve syntactically and are intentionally public.
7. The page works at mobile width.
8. The page works with reduced motion.
9. The page does not impersonate the target company.
10. The design does not look like generic AI-generated marketing boilerplate.
11. The final HTML is reviewable before publication.
12. Publication remains user-controlled unless explicitly requested.
