# Repository Agent Instructions

## ASTRO is mandatory for Clintware public-page and product work

Before changing any public Clintware website page, product page, homepage, professional profile, startup / YC page, navigation, public product positioning, or public visual/copy system, read and apply `ASTRO_WEBSITE_SKILL.md` first.

This is a repository invariant, not an optional style preference.

Required order:

1. Read `ASTRO_WEBSITE_SKILL.md`.
2. Read `BRAND_STANDARDS.md` when branding, typography, layout, navigation, slogan, or visual hierarchy is involved.
3. Inspect the actual current repository/page state before editing.
4. Preserve the canonical Clintware Type System defined in `BRAND_STANDARDS.md` and `public/assets/typography-lock.css`: Clintware Sans for body copy, Clintware Display for headings, Clintware Mono for software/system language, with Hand/Alien restricted to bounded accents. Site-wide refreshes must preserve these roles and keep `/fonts/` consistent with production.
5. Preserve approved working functionality and accepted prior work.
6. Reject generic AI/SaaS template structure and marketing boilerplate.
7. Write from product truth and evidence, with current capability separated from roadmap.
8. For Quillgeist, preserve the adaptive-intent-compiler thesis and `TYPE -> UNDERSTAND -> IMPROVE -> EXECUTE -> LEARN` progression.
9. For LandThePlane, preserve the candidate-owned evidence / career-system thesis rather than reducing it to generic interview-question generation.
10. QA the finished page against ASTRO's rejection checklist before deployment.
11. Never call the page complete until the deployment and public behavior are actually verified.

## YC venture canonical-domain invariant

Every venture listed on the Clintware YC / startup ranking must have its own canonical Clintware subdomain. The main `/startup/` page is the portfolio/ranking index only; it must link to venture subdomains rather than treating `/tools/<venture>/` as canonical.

Canonical venture domains:
- Mind to Form: `https://mindtoform.clintware.com/`
- BuyerOrigin: `https://buyerorigin.clintware.com/`
- Quillgeist: `https://quillgeist.clintware.com/`
- LandThePlane: `https://landtheplane.clintware.com/`
- Prompt Iris: `https://promptiris.clintware.com/`
- RenewNudge: `https://renewnudge.clintware.com/`
- OrgSynapse: `https://orgsynapse.clintware.com/`
- ShoulderSoldier: `https://shouldersoldier.clintware.com/`
- Portability Check: `https://portability.clintware.com/`
- MindVergent: `https://mindvergent.clintware.com/`

Legacy `/tools/` pages may remain for product documentation, but YC/startup navigation must prefer the dedicated venture subdomain.

A Clintware public-page change made without first applying ASTRO is an incomplete task and must be revisited before delivery.

## Public/shared skill security boundary

Every skill or reusable artifact published under `public/skills/` must be safe for an unrelated operator to use without receiving access to Clintware private infrastructure.

Required rules:

1. Public skills must be infrastructure-neutral and must run against infrastructure, domains, repositories, accounts, and credentials supplied by the new operator.
2. Never publish `mcp.clintware.com`, `auth.clintware.com`, Clintware control-plane credential names, personal repository/account identifiers, private IPs, live tokens, cookies, sessions, OAuth client secrets, or non-placeholder contact data inside a shared skill.
3. Never include a hidden callback, telemetry endpoint, maintenance key, default administrator credential, or author-controlled backdoor.
4. Public examples must use neutral placeholders such as `YOUR_DOMAIN`, `YOUR_REPOSITORY`, `YOUR_PROVIDER_TOKEN`, and `example.com`.
5. A public skill may describe generic MCP/API patterns, but possession of the skill file must never imply or grant authorization to any Clintware service.
6. Internal implementations may use Clintware infrastructure only outside the published skill tree and only behind the appropriate authenticated control-plane boundary.
7. Run `node scripts/validate-public-skill-boundary.mjs` before publishing. A failure blocks publication until the artifact is sanitized.

## Global Auto-Compact Continuation Protocol

These rules apply to every repository agent and every Quillgeist task unless a more specific safety, permission, or user instruction requires a pause.

### 0. Large or over-complex prompts must self-decompose

When a request is too long, too multi-stage, or too tool/batch-heavy to complete reliably in one pass, do not bounce the decomposition work back to the user and do not require repeated `OK`, `continue`, or equivalent confirmations between ordinary non-sensitive steps.

Instead:

1. Preserve the original objective, exact names, counts, quoted text, file paths, URLs, constraints, negative constraints, dependencies, privacy requirements, and definition of done.
2. Conservatively compact repetition and low-signal wording without deleting unique requirements.
3. Split the work into the smallest dependency-aware steps that fit the active model/tool/file/image/batch limits.
4. Produce or internally use one compact master continuation plan that states the global invariants once and gives the ordered steps.
5. Execute step 1, verify it, repair only failed or defective parts, then proceed automatically to the next step.
6. If a provider/tool/batch limit is reached, continue with the next legal-sized batch rather than restarting accepted work.
7. Reuse successful prior outputs. Never regenerate or redo accepted work merely because a later step needs another batch.
8. QA every step against its local success criteria and perform a final end-to-end QA against the original definition of done.
9. Pause only when a required value is genuinely unavailable or when policy, permissions, destructive/irreversible actions, financial actions, security boundaries, or another explicit confirmation requirement demands user approval.
10. Never claim a step, test, build, deployment, render, upload, or verification occurred when it did not.

Canonical sequence:

`RAW REQUEST -> CONSERVATIVE COMPACTION -> COMPLEXITY/LIMIT CHECK -> DEPENDENCY-AWARE PLAN -> STEP -> QA/REPAIR -> AUTO-CONTINUE -> FINAL END-TO-END QA -> DELIVERY`

### Delta-state default for repeated project context

For repeated project-scoped work, prefer delta-state context over repeatedly summarizing the full history.

1. Preserve exact anchors verbatim: exact names, counts, quotes, paths, URLs, permissions, negative constraints, privacy rules, and definition-of-done requirements.
2. Fingerprint and ingest only newly introduced context when prior state already contains the rest.
3. Keep failures, explicit decisions, the newest delta, and a bounded relevance-ranked set of open work in active context.
4. Move lower-priority older material to local cold state instead of resending it on every step.
5. Before each next step, rehydrate only cold-state items strongly relevant to that step.
6. Prefer deterministic local extraction/deduplication before spending model tokens on semantic summarization.
7. Use a state revision/hash when supported so active context can be inspected and traced.
8. Substitute delta-state context only when measured duplicate ratio and context reduction make it materially smaller; otherwise pass the original context through.
9. If exact anchors cannot fit safely, fail open to the original context rather than silently dropping them.
10. Persistent project state must have an explicit inspection and reset path.

Canonical delta-state sequence:

`KNOWN STATE + NEW DELTA -> EXACT ANCHORS -> BOUNDED WORKING SET -> COLD HISTORY -> JIT REHYDRATION -> NEXT STEP -> STATE UPDATE`

For generated visual/story work, identity or style continuity does not mean copy-pasting the same pose. Preserve recognizable subjects while deliberately varying pose, body angle, camera distance, framing, expression, interaction, environment, and composition when the task calls for multiple distinct scenes.

## Interview-prep runtime invariants

These rules apply whenever an agent in this repository is evaluating, generating, refreshing, packaging, or delivering interview-preparation material. They are intentionally scoped to interview-prep work and do not alter unrelated product behavior.

### 1. Calendar plus Gmail is the mandatory trigger system

Never treat Google Calendar as the only source of truth for interview detection.

On every interview-prep scan:

1. Check Google Calendar for newly added or materially changed recruiting/interview meetings.
2. Also scan relevant Gmail recruiting threads even when Calendar already returned events.
3. Calendar presence alone is sufficient to trigger prep when the event reasonably identifies a recruiter screen, hiring-manager discussion, technical interview, case/assignment review, panel, executive/final round, follow-up, or other hiring-stage meeting. Acceptance is not required. Tentative, needsAction, pending, unconfirmed, or not-yet-accepted events still qualify.
4. Gmail is a required backstop. A recruiting email can independently trigger or refresh prep even when no calendar event exists.
5. An email-only interview counts as scheduled when a recruiter/interviewer proposes or confirms a specific time and the candidate accepts, blocks the time, supplies a phone number, or otherwise clearly agrees to the call. Do not wait for an .ics invite or calendar entry.
6. Also track unscheduled next-step signals such as “move forward,” “next step,” “let’s set up time,” “send availability,” “schedule a call,” “panel,” “hiring manager,” “technical interview,” or equivalent recruiting language. Keep those tracks under review until they are scheduled, explicitly closed, or clearly inactive.
7. Generic application receipts, automated “under review” notices, newsletters, and job alerts do not by themselves trigger a full kit. They may remain watch-state evidence.

The ServiceNow/Kelly Murdock failure mode is the regression case: a specific phone time confirmed by email with no calendar event must still trigger a full prep kit immediately.

### 2. Exact-instance deduplication only

Deduplicate only the exact same interview instance. A new event ID is a new trigger unless it is clearly an accidental duplicate.

A new interviewer, stage, date, start time, duration, meeting link/platform, agenda, evaluation format, panel composition, role scope, or hiring-manager assignment makes the meeting a new qualifying interview instance. Recruiter screen -> hiring manager -> technical -> assignment/case -> panel -> leadership/executive/final -> follow-up are separate rounds.

If the same event is only rescheduled and the interviewer, stage, and purpose remain unchanged, refresh the existing stage-specific kit instead of suppressing it.

### 3. Dark mode is mandatory for live interview artifacts

Every generated interview-prep PDF, editable DOCX, one-page cockpit/master view, and branded emergency-master email must use the established high-contrast dark Clintware/AuDHD-friendly presentation by default.

Required characteristics:

- genuinely dark page/card backgrounds, not merely dark headings on white pages;
- high-contrast readable body text;
- large clear headings;
- short visual blocks and generous spacing;
- visible POINT -> PROOF -> RESULT -> RELEVANCE -> STOP rails;
- explicit STOP lines and recovery language;
- live-use readability at normal zoom without tiny text;
- no silent light-mode fallback unless the user explicitly requests it.

A kit is not complete until every PDF and DOCX page has been rendered and visually checked for clipping, overlap, broken tables, unreadable glyphs, weak contrast, tiny fonts, and accidental white/light pages. If any page fails, regenerate before delivery.

### 4. Every next interview must be incorporated into the prep system

For every newly qualifying interview or materially changed round:

1. Read the complete Calendar event when present.
2. Read the relevant Gmail thread whether or not Calendar contains the meeting.
3. Recover the latest company-specific kit, resume, job description, prior transcripts, Read AI reports, recruiter/hiring-manager feedback, manager-review evidence, post-interview notes, and user corrections when available.
4. Build a fresh stage-specific kit and a one-page live cockpit.
5. Produce a separate private ASTRO/reflection packet or private delivery lens when that workflow is enabled. Keep it separate from evidence-based hiring claims.
6. Explicitly include “What Changed Since the Last Round.”
7. Preserve evidence attribution and ownership boundaries. Never invent events, metrics, quotes, objections, motives, internal decisions, or technical experience.
8. Render and visually QA all artifacts before calling them complete.
9. After the kit is complete, extract newly anticipated interviewer questions and update the canonical local standalone interview-prep EXE’s Q&A/STAR bank when that source/build is available. Do not substitute the official LandThePlane web product for this local-EXE update target unless the user explicitly changes the target.
10. Rebuild and verify the local EXE only when the actual source/build system is accessible. Never claim a rebuild or verification that did not occur.

Canonical sequence:

`CALENDAR SCAN + GMAIL BACKSTOP -> QUALIFY / EXACT-INSTANCE DEDUPE -> STAGE KIT + DARK COCKPIT + PRIVATE ASTRO LENS -> EVIDENCE / TRANSCRIPT DELTA -> RENDER + VISUAL QA -> DELIVERY -> LOCAL EXE Q&A / STAR UPDATE -> REBUILD + VERIFY WHEN ACCESSIBLE`

### 5. Do not miss email-only or pending interviews

Before reporting “no new interview,” explicitly verify both of these are true:

- no qualifying or materially changed interview exists in Calendar; and
- no Gmail recruiting thread contains a newly scheduled, time-proposed-and-accepted, or next-stage signal that requires prep or active watch.

A Calendar-only scan is a failed scan. A light-mode kit is a failed kit. A next-round kit that ignores newer recruiting email, transcript, interviewer, stage, or timing information is a failed refresh.
