---
name: recruiter-reachout-precheck
description: Pre-screen unsolicited LinkedIn, recruiter, staffing, and job-search outreach for legitimacy. Use when a user provides conversation text or screenshots plus any available recruiter name, title, company, LinkedIn/profile URL, job link, email/domain, or other context and wants a risk assessment, independent verification, proving questions, and a suggested reply before sharing a resume or personal information.
---

# Recruiter Reachout Precheck

Assess recruiter and job-search outreach before the user sends a resume, opens unfamiliar links, moves platforms, pays money, or provides additional personal information.

The goal is not to accuse people of fraud. The goal is to independently test the claims being made and give the user questions that a legitimate recruiter should be able to answer.

## Inputs

Accept any combination of:

- LinkedIn or other messenger conversation text
- screenshots of the conversation
- recruiter or sender name
- claimed title
- employer, staffing agency, or client name
- LinkedIn/profile URL
- company website or email domain
- job posting URL, requisition number, or job title
- email address, phone number, or contact channel
- salary, relocation, resume, interview, equipment, payment, or onboarding requests

Do not require every field. Work with what the user has and explicitly identify what remains unverified.

## Workflow

1. Extract the conversation chronologically. Separate what the user said from what the recruiter claimed.
2. Identify every externally verifiable claim: identity, employer, title, client, role, requisition, company domain, compensation model, location, and hiring process.
3. Identify the current stage of the interaction and what the recruiter is asking the user to do next.
4. Search independent public sources for the person and organization when web access is available. Prefer official company staff pages, corporate domains, official job boards, business registrations where relevant, and established professional profiles.
5. Search the exact name plus recruiting, staffing, scam, fraud, impersonation, complaint, and relevant company terms. Lack of a result is not evidence of fraud.
6. Confirm whether a claimed job exists independently of a link supplied by the recruiter whenever possible.
7. Compare the conversation pattern with documented employment-scam patterns from authoritative sources such as the FTC, FBI, state attorneys general, platform safety documentation, or equivalent local authorities.
8. Distinguish identity verification from proposition verification. A verified social-media identity does not prove that a specific job, client relationship, or recruiting offer is genuine.
9. Assign a provisional risk level using the rubric below.
10. Generate proving questions targeted only at unresolved claims and the exact next step being requested.
11. Draft a concise reply the user can send before providing additional information.

## Risk rubric

Use four levels rather than pretending to know more than the evidence supports:

- **LOW**: identity, employer, role, and contact channel can be independently corroborated; process is consistent with normal recruiting.
- **GUARDED**: outreach is unsolicited or generic but independently verifiable details exist; some important claims remain unresolved.
- **HIGH**: multiple material claims cannot be verified, the sender avoids specifics, uses inconsistent identity/contact information, requests sensitive information early, pushes an unfamiliar link/platform, or introduces candidate-paid services.
- **CRITICAL**: requests for money, gift cards, crypto, banking credentials, tax/identity documents before a verified hiring process, remote-access software, check-deposit/equipment-payment schemes, credential harvesting, or clear impersonation evidence.

Do not label a person a scammer solely because the outreach is unsolicited, the message is generic, or the person lacks a large public footprint.

## High-value proving questions

Choose the smallest useful subset based on what is missing. Examples:

- What recruiting firm or company currently employs you?
- What is your corporate website and corporate email domain?
- Are you recruiting for a specific open role you believe matches me?
- What is the hiring company, exact job title, location, and requisition number?
- Can you provide the official job posting from the employer's own careers site?
- Are you an internal recruiter, retained recruiter, contingency recruiter, or independent recruiter?
- Who compensates you for a successful placement?
- Is there any fee, paid resume service, coaching package, training requirement, background-check fee, equipment purchase, or other candidate-paid service at any point?
- Can you email me from your corporate domain so I can verify the relationship independently?
- If the client must remain confidential, what verifiable agency credentials or engagement details can you provide before I send documents?

Never treat the recruiter's own link, phone number, email signature, or supplied verification page as independent verification. Verify through independently located sources.

## Output format

Return these sections unless the user asks for a shorter answer:

### Verdict
One sentence with the provisional risk level and the most important reason.

### What checks out
List independently corroborated facts only.

### What does not yet check out
List unresolved, inconsistent, or suspicious elements without overstating them.

### Pattern match
Explain which documented recruiting-scam or normal-recruiting patterns the interaction resembles and cite authoritative sources when web research was used.

### Proving questions
Give 3 to 7 questions tailored to the unresolved claims. Prioritize questions whose answers can be independently checked.

### Suggested reply
Draft a short, calm message that asks the proving questions before the user sends additional material.

### Next verification step
Explain exactly what should be independently checked after the recruiter replies.

## Resume and information handling

A normal resume is not equivalent to a password or bank credential, but it can contain useful personal and professional information. If identity or the recruiting proposition is still materially unverified, recommend verifying first rather than automatically sending it.

Treat requests for Social Security numbers, bank information, tax forms, identity documents, account credentials, one-time codes, payments, check deposits, crypto, gift cards, or remote-access software as substantially higher risk and explain why.

## Writing rules

- Lead with the assessment.
- State what is known, what is inferred, and what remains unverified.
- Do not invent search results or pretend a profile was verified when it was not.
- Do not accuse a named individual of fraud without strong evidence.
- Prefer precise questions over generic advice.
- Make the suggested response sound normal enough that a legitimate recruiter can answer it without drama.
- Use supplied conversation context to avoid asking questions already answered.
