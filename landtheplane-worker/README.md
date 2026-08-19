# LandThePlane

**Status:** local-first alpha + YC fast-track product track  
**Public app:** `https://landtheplane.clintware.com/`  
**Product detail:** `https://www.clintware.com/tools/landtheplane/`

LandThePlane is an interview-preparation system that turns a candidate's verified career evidence and a target role into a reusable preparation graph. The product is deliberately narrower than a generic career chatbot: strong answers should remain traceable to evidence the candidate actually supplied.

## Product thesis

1. Ingest resume/accomplishment evidence plus a target role.
2. Extract the role requirements without treating the job description as proof about the candidate.
3. Map requirements to verified accomplishment evidence.
4. Reuse the same evidence as one-sentence proof, a 30-second opening, a 45–75 second answer, a full STAR story, a panel talking point, and a closing bridge.
5. Record what was actually asked and what evidence was used.
6. Improve future coaching from candidate edits, interview history, outcomes, and recurring weak spots.

The product should never invent experience to close a requirement gap. A weak match is a coaching problem to surface, not a fact to fabricate.

## Working public alpha

The dedicated Cloudflare Worker serves a browser-local evidence mapper:

- paste resume/accomplishment text;
- paste a job description;
- select interview stage;
- extract a bounded set of likely role requirements;
- rank resume evidence against those requirements;
- show requirement → evidence coverage;
- create one-sentence answer shells;
- create STAR retrieval shells;
- surface evidence gaps;
- optionally save run-level statistics locally in the browser.

The current alpha does **not** upload or persist the raw resume or job text. It performs the evidence-mapping pass in browser JavaScript.

## Target product

### Intake

- Resume: PDF, DOCX, TXT, paste.
- Role: job URL, pasted listing, PDF/DOCX/TXT.
- Stage: recruiter, hiring manager, panel, final, executive, or role-specific.
- Optional candidate-supplied prior-round notes/transcripts.

### Canonical evidence object

```json
{
  "evidence_id": "ev_...",
  "source": "resume|notes|verified_edit",
  "source_span": "...",
  "claim": "...",
  "metrics": ["..."],
  "ownership": "direct|shared|supported|unknown",
  "confidence": "verified|candidate_confirmed|needs_confirmation",
  "skills": ["..."],
  "role_links": ["req_..."]
}
```

### Preparation surfaces

- requirement/evidence matrix;
- 30-second opening;
- likely questions by interview stage;
- one-sentence answers;
- 45–75 second answer cards;
- STAR story bank;
- proof gaps and safe bridges;
- interviewer questions;
- compensation/leveling preparation when requested;
- one-page interview cockpit;
- post-interview debrief and next-round delta.

Preferred compression:

`POINT → PROOF → RESULT → ROLE LINK → STOP`

## Longitudinal coaching

The compounding layer is a candidate-owned history of preparation and outcomes. Suggested entities:

- `CandidateProfile`
- `EvidenceItem`
- `TargetRole`
- `RoleRequirement`
- `EvidenceMatch`
- `PrepArtifact`
- `InterviewRound`
- `QuestionAsked`
- `AnswerAttempt`
- `CandidateEdit`
- `Outcome`
- `CoachingMetric`

Useful trends include answer length, evidence specificity, quantified results, requirement coverage, repeated evidence overuse, recurring weak requirements, questions repeatedly missed, and progression by interview stage. Do not claim causal hiring impact from small/self-selected samples.

## Storage

### Local mode

- raw resume/job text remains in the browser for the current alpha session;
- persistence is opt-in;
- a future standalone desktop build can retain the full evidence graph locally;
- export/import should use a documented portable format.

### SaaS mode

Optional cloud sync should add account-scoped projects, encrypted transport, retention/deletion controls, export, tenant isolation, clear model-processing disclosure, and the same canonical data model as local mode.

## Google authentication decision

Google OAuth is **not required for the MVP**. Resume and role intake should not depend on Gmail or Google Drive.

If account sync is enabled later, support Sign in with Google as optional authentication using authentication-only identity scopes (`openid`, `email`, `profile`) and backend-validated ID tokens. Do not request Gmail, Drive, Calendar, or Contacts scopes merely for sign-in.

Before public Google authentication is enabled: create separate test/production Google Cloud projects, configure the OAuth client, verify the domain, keep product-specific privacy/terms pages live, complete the required Google brand/consent path, validate ID tokens server-side, and support account deletion/consent handling as applicable.

## Demo and legal boundaries

- Public demos use synthetic, licensed, or explicitly approved resumes/listings.
- Do not expose real candidate resumes, interview transcripts, recruiter emails, compensation details, or employer-confidential material in public demos.
- Keep the MVP candidate-side: preparation, practice, reflection, and candidate-owned analytics.
- Do not position it as an employer hiring-decision or candidate-ranking system.
- Do not make concealed real-time answer generation the product wedge.
- Add deletion, export, retention, subprocessors, and data-processing terms before paid SaaS cloud storage launches.

## Name feasibility

`LandThePlane` is usable as a **working product name**, but it is not cleared as an exclusive commercial brand.

Checks on 2026-08-19 found `landtheplane.com` unavailable and an active unrelated business/marketing consultancy using `landtheplane.net`. `.app`, `.io`, and `.ai` appeared available. The alpha therefore uses `landtheplane.clintware.com`.

Do not add a trademark symbol or spend heavily on standalone branding until a proper trademark/name clearance search is completed. Keep the product rename-safe.

## YC executive review

**Recommendation: #2 product track, fast-track challenger to Quillgeist. Do not replace the flagship yet.**

| Dimension | Score | Reason |
| --- | ---: | --- |
| Problem clarity | 9/10 | Immediate candidate pain and outcome. |
| Founder-use loop | 10/10 | Built from a repeated real-world prep workflow. |
| MVP speed | 9/10 | Useful local mapper can ship before full SaaS infrastructure. |
| Competition | 4/10 | AI interview coaching is crowded. |
| Differentiation potential | 8/10 | Evidence traceability + longitudinal coaching + compression can be materially different. |
| Distribution | 6/10 | Reachable audience, but event-driven churn and paid acquisition risk. |
| Monetization | 7/10 | Role kits, active-search subscription, optional human review. |
| Defensibility | 7/10 | Candidate evidence/history graph can compound; generated questions cannot. |
| Privacy posture | 8/10 | Local-first is a real architecture option. |
| YC readiness now | 7/10 | Clear, fast, dogfoodable; needs external repeat use and a stronger name position. |

### Flagship promotion gate

Promote above Quillgeist only after real behavior proves it:

- 25+ external candidates complete a role-specific prep run;
- 10+ return for a second interview/role or debrief;
- at least 5 pay, or equivalent repeated unsolicited referrals;
- users explicitly reuse saved evidence across rounds;
- evidence-first workflow is cited as the reason they prefer it over a generic AI coach;
- name clearance is resolved.

## Pricing experiment

1. Free local evidence map.
2. $29–$49 role-specific full prep kit.
3. Active-search subscription for longitudinal coaching and multiple roles.
4. Premium human-reviewed kit/coaching add-on.

## Dogfooding while interviewing

This is useful to build during an active job search because the product loop can ride on work that already has to happen:

`prepare → interview → debrief → label what happened → improve the prep engine`

Product work should consume the exhaust of the interview process rather than replace the interview process.

## Deployment

- Worker: `clintware-landtheplane`
- Hostname: `landtheplane.clintware.com`
- Source: `landtheplane-worker/src/index.js`
- Config: `landtheplane-worker/wrangler.jsonc`
- Health: `/healthz`
- No OAuth credentials, model API keys, D1, R2, or third-party storage are required for the first alpha.
