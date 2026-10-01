# Jobs

Local-first job-application copilot for Clintware.

## Purpose

Build a user-owned alternative to browser-based job application assistants such as Simplify, using Clintware/Quillgeist/qq as the execution and orchestration layer.

Jobs should make applying faster without making opaque decisions or sending applications without explicit user authorization.

## Product principles

- Local-first by default.
- User-owned profile, resume history, answer library, application history, and preferences.
- Browser automation is assistive and governed.
- No automatic final submission unless the user explicitly enables/approves that action.
- Reuse existing Clintware identity, Quillgeist, MCP, browser automation, job-search, CRM/cover-letter, and local-model capabilities where practical.
- Keep professional/job-search data inside Clintware. Do not mix CodeFEDDY.
- Prefer deterministic local execution, then local models, then remote providers only when freshness/quality requires them.
- Build for Windows first on DRIZNET; preserve portability to MEMORIA later without moving MEMORIA's existing workload.

## Competitive baseline

Use current public capabilities of job-application assistants as product inspiration only. Do not copy proprietary code, branding, assets, prompts, or private workflows.

Target baseline features:
- Browser-assisted form autofill across common ATS/application pages.
- Reusable answer library for recurring application questions.
- Resume tailoring against a job description.
- Cover-letter generation when useful.
- Application tracking and status history.
- Job capture from URLs/pages.
- Job-fit and missing-requirement analysis.
- Optional user-approved guided application workflow.
- Duplicate detection so the same role is not accidentally applied to twice.

## Jobs v1

### 1. Local profile vault

Store locally:
- canonical professional profile;
- contact fields;
- work history;
- education/certifications;
- skills;
- compensation constraints;
- location/remote preferences;
- reusable application answers;
- multiple resume variants;
- approved writing snippets;
- job-search rules.

Use browser-local/local machine storage by default. Do not require a remote database for single-user operation.

### 2. Job capture

Accept:
- URL;
- pasted description;
- browser capture;
- structured job object from Clintware search sources.

Normalize:
- company;
- role;
- location;
- compensation;
- work arrangement;
- requirements;
- preferred qualifications;
- source URL;
- date captured;
- application status.

### 3. Fit workspace

For each role:
- summarize the role;
- map requirements to evidence;
- identify gaps;
- select the strongest resume base;
- generate tailored bullets only when grounded in real experience;
- generate application answers from the approved profile/answer library;
- flag questions requiring user input.

Never invent experience, credentials, dates, compensation, or employment history.

### 4. Browser application assistant

Use governed QQ browser automation for:
- field detection;
- autofill;
- resume upload selection;
- recurring answer insertion;
- checkbox/radio/dropdown assistance;
- page-step navigation where safe.

Require explicit approval before:
- submitting an application;
- answering sensitive demographic/self-identification questions;
- agreeing to legal attestations;
- salary commitments outside configured bounds;
- any action that creates an external commitment.

### 5. Application ledger

Track:
- captured;
- preparing;
- ready for review;
- submitted;
- interview;
- rejected;
- withdrawn;
- offer;
- archived.

Record:
- applied date;
- resume version;
- cover letter version;
- answers used;
- source;
- contacts;
- next action;
- notes;
- verification evidence.

### 6. Resume + cover-letter integration

Reuse the Clintware CRM+cover-letter / ASTRO patterns where appropriate, but keep Jobs as a distinct product surface.

Generate:
- targeted resume variants;
- optional cover letters;
- concise application answers;
- recruiter outreach drafts;
- interview-prep handoff.

### 7. Quillgeist integration

A user prompt such as:
- "Jobs, apply to this"
- "Jobs, capture this role"
- "Jobs, tailor my resume for this"
- "Jobs, show what is ready to apply"
- "Jobs, continue the applications I started"

should recover durable Jobs state, decompose work, run deterministic/local tasks first, and preserve a prompt-ticket until verified_done, blocked, or carried_forward.

## Architecture

### Local-first
- DRIZNET is the initial execution target.
- Local filesystem / SQLite / browser-local storage are preferred.
- Use a local API only where the UI and browser extension need shared local state.
- No Durable Object or remote DB dependency for normal single-user operation.

### Control plane
Use mcp.clintware.com for:
- scoped external research;
- GitHub/deployment operations;
- external connectors;
- cross-model handoffs;
- job-search sources when freshness is required.

### Browser
Use the existing governed QQ browser runtime. Do not automate provider/login pages in ways that bypass supported authentication.

## First implementation milestone

Deliver a working local Jobs prototype on DRIZNET with:
1. local profile vault;
2. job URL/description capture;
3. local job/application ledger;
4. fit analysis;
5. resume/answer selection;
6. browser-assisted autofill prototype;
7. explicit final-submit approval gate;
8. duplicate-job detection;
9. local UI;
10. verification evidence and restart/resume behavior.

## Definition of Done

Do not report Jobs v1 complete until:
- it launches locally on DRIZNET;
- the local profile persists across restart;
- at least one captured test role can move through the ledger;
- form fields can be detected and filled in a controlled test page;
- submission remains blocked without explicit approval;
- duplicate detection works;
- no professional data is sent remotely during the local-only happy path;
- the implementation is recoverable/resumable through Quillgeist;
- evidence is recorded for each verification step.
