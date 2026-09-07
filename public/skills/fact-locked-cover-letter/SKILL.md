---
name: fact-locked-cover-letter
description: Generate tailored cover letters from a resume and job description while locking facts to their sources, preserving exact terminology, preventing invented causation or employer attribution, and keeping relevant user-provided project and portfolio links intact.
---

# Fact-Locked Cover Letter

Use this skill when a cover letter must be persuasive **without allowing the model to improve the story by changing the facts**.

## Outcome

Produce a concise, role-specific cover letter that:

- targets the 3–5 most important needs in the job description;
- uses only facts explicitly supported by the resume or user-provided fact bank;
- preserves exact metrics and materially important terminology;
- does not move achievements, tools, responsibilities, or outcomes between employers;
- does not invent causal relationships between separate facts;
- presents transferable experience positively without pretending the candidate has direct experience they do not have;
- preserves relevant user-provided project and portfolio URLs;
- reads naturally rather than like a chronological resume summary.

## Required inputs

1. **Job description**
2. **Resume or verified career source**
3. Optional **locked fact bank** for facts that must be preserved exactly
4. Optional **projects / portfolio** with exact names, descriptions, and URLs
5. Optional style constraints such as word count, tone, spacing, or punctuation rules

If a locked fact bank conflicts with a looser paraphrase elsewhere, use the more precise verified wording.

## Source-of-truth rule

The resume, verified source material, and locked fact bank are the only factual sources.

Do not invent, infer, combine, reinterpret, strengthen, or reassign facts.

If a fact is uncertain, omit it.

Accuracy takes priority over making the candidate sound stronger.

## Fact combination rule

Related supported facts may appear in the same sentence, but connect them neutrally.

Prefer **and** when two independent facts are both relevant.

Correct:

> I improved portfolio visibility from X to Y and built repeatable operating workflows.

Incorrect unless explicitly sourced:

> I improved portfolio visibility from X to Y by building repeatable operating workflows.

Do not use causal connectors such as **by, through, resulting in, supported, contributed to, drove, led to, enabled, produced,** or **caused** unless the source explicitly establishes that relationship.

Treat every metric and achievement as an independent fact unless the source says otherwise.

## Fact preservation rule

Preserve materially important source terminology.

Examples:

- Do not change **named accounts** into **enterprise accounts** or **strategic accounts**.
- Do not change **ARR** into **account value**, **portfolio value**, or **revenue**.
- Do not upgrade **standardized** into **created**, **launched**, or **led**.
- Do not upgrade **worked with** into **managed**, **owned**, or **directed**.
- Do not upgrade **helped build** into **built** or **created**.

Do not add qualifiers such as **enterprise, strategic, global, complex, high-value,** or **mission-critical** unless explicitly supported.

## Employer attribution rule

Never attach a fact to a specific employer unless the source explicitly places that fact there.

This applies to:

- metrics;
- tools;
- account counts;
- ARR or revenue;
- customer segments;
- titles;
- responsibilities;
- products;
- technical environments;
- leadership scope;
- team sizes;
- renewal, satisfaction, or support outcomes;
- workflows and processes;
- achievements.

Do not move a true achievement from one employer to another.

If the employer association is unclear, state the fact generically or omit it.

## Tool attribution rule

Do not connect a tool to an employer, metric, or achievement merely because both appear somewhere in the source material.

Knowing that a candidate used a CRM and separately improved portfolio visibility does not authorize a claim that the CRM caused or enabled the improvement.

Only make that connection when the source explicitly establishes it.

## Locked fact bank format

Use a simple structure like this when exact preservation matters:

```markdown
LOCKED FACT BANK

EMPLOYER / ROLE A
- [Exact supported fact]
- [Exact supported metric]
- [Exact supported responsibility]

EMPLOYER / ROLE B
- [Exact supported fact]
- [Exact supported metric]

GENERAL EXPERIENCE
- [Cross-role capability that is explicitly supported]
- [Education/certification if relevant]
- [Availability if relevant]
```

The model may select from these facts. It may not strengthen or reconstruct them.

## Projects and portfolio rule

For each optional project or portfolio item, provide:

```markdown
PROJECT NAME
Description: [Verified description]
URL: https://example.com/
Include when relevant to: [topics / role types]
```

When relevant:

- describe the project only using the supplied description;
- include the exact URL;
- do not replace the URL with vague wording such as “more work”;
- do not silently remove a requested portfolio link;
- avoid introducing a project and then redundantly defining it again in the next sentence.

## Job analysis

Before writing, silently identify:

1. the 3–5 most important responsibilities;
2. the outcomes the hire is expected to own;
3. repeated themes in the job description;
4. the strongest required qualifications;
5. the business problems the employer appears to need this hire to solve;
6. the strongest directly supported evidence from the candidate.

Build the letter around those needs. Do not summarize the resume chronologically and do not mention every available fact.

## Transferable experience rule

For a move between industries, do not frame the candidate's prior industry as a weakness, apology, or concession.

Avoid constructions such as:

- “even though my experience is in…”
- “although my background is primarily…”
- “despite coming from…”
- “I have not worked directly in this industry, but…”

Instead, state the transferable work positively and directly using supported capabilities such as customer objectives, onboarding, adoption, value realization, stakeholder management, risk detection, escalation management, reporting, retention, expansion, operational improvement, or executive communication.

Acknowledge an industry gap only when the application specifically requires it or omitting it would be misleading. Never invent direct industry experience.

## Company-specific rule

Use the company name naturally and connect the candidate to the role, customers, product, or business problem.

Avoid generic praise and filler such as:

- “I am thrilled to apply”;
- “I am excited to apply”;
- “perfect fit”;
- “results-driven professional”;
- “dynamic leader”;
- “seasoned professional”;
- unsupported claims that company values “resonate.”

## Default writing style

Unless the user specifies otherwise:

- target 300–375 words;
- prefer four concise paragraphs;
- open with direct relevance to the role;
- use 2–4 strong proof points;
- prioritize evidence over enthusiasm;
- use a confident, natural, senior-professional tone;
- avoid corporate jargon and stacked adjectives;
- avoid generic AI phrasing;
- keep paragraphs easy to scan;
- do not repeat the resume.

Suggested structure:

1. **Fit:** map the strongest transferable background to the role's most important needs.
2. **Evidence:** use the strongest relevant customer, operating, technical, or business evidence.
3. **Execution:** show cross-functional, process, risk, escalation, or data-oriented strength.
4. **Differentiator:** use relevant projects/portfolio when supplied, then close with concrete value and availability if provided.

## Sentence-level audit

Before returning the letter, audit every factual sentence.

For each sentence ask:

1. Can every factual element be traced directly to the resume, verified source, or locked fact bank?
2. Did the sentence create a new relationship between two facts that the source did not establish?
3. Did any verb, metric, customer segment, title, tool, or qualifier become stronger than the source?
4. Did transferable experience get framed unnecessarily as a weakness?

If any answer indicates a problem, split the sentence, remove the unsupported portion, revert to exact source wording, or omit it.

## Final QA checklist

Do not release the letter until all are true:

- every factual claim is directly supported;
- every metric is directly supported;
- every employer attribution is supported;
- every tool attribution is supported;
- every customer-segment attribution is supported;
- every title and leadership claim is supported;
- no achievement moved between employers;
- no unsupported causal relationship was created;
- no two independently true facts became a new unsupported claim;
- exact material terms were preserved;
- no verb was upgraded beyond the source;
- no unsupported qualifier was added;
- no direct industry experience was invented;
- transferable experience was not framed as a deficit;
- the 3–5 most important job needs are addressed;
- relevant supplied project and portfolio URLs remain present;
- the letter is specific, concise, grammatical, and easy to scan.

If factual accuracy conflicts with persuasive writing, choose factual accuracy.

## Definition of done

The cover letter is tailored and persuasive, but every factual clause can be traced back to explicit source material without invented causation, attribution, terminology drift, or experience inflation.