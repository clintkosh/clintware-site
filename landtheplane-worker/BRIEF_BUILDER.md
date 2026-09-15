# LandThePlane Brief Builder

The Brief Builder is the communication layer for the LandThePlane lifecycle and the product-level home for recurring career-status briefs.

It is also the LandThePlane integration point for the standalone **Job Search Field Report ASTRO** workflow published at `/skills/job-search-field-report/`. The public skill is the portable specification; LandThePlane reuses the same evidence, reconciliation, accuracy, and rendering rules inside the broader candidate-owned career evidence system.

## Current alpha

The public Worker now supports:

- browser-local profile setup;
- optional profile image upload and local persistence;
- theme selection;
- intermediary job-search updates;
- interview-progress updates;
- offer / landing announcements;
- first-week and onboarding updates;
- 30/60/90-day progress briefs;
- weekly / monthly career briefs;
- structured opportunity/work tables;
- issue numbering;
- HTML preview, copy, and export;
- local brief metadata history;
- **browser-direct Google OAuth for Gmail**;
- Gmail evidence scanning using message metadata/snippets needed for search-state classification;
- evidence import into the existing Brief Builder;
- Gmail draft creation;
- post-create Gmail draft readback and static ASTRO verification.

The alpha does **not** autonomously send email, schedule email, proxy/store raw Gmail messages on the Clintware Worker, or persist Gmail access tokens. The OAuth token is kept in browser memory for the active page session.

The production-wide shared Google OAuth client is not configured yet. The live MVP therefore exposes a **tester BYO Google OAuth client ID** fallback. Broad public use through one Clintware OAuth client remains gated by Google's restricted-scope production verification.

## Astro-style rendering contract

The renderer transforms structured career state into a concise, high-contrast, readable brief rather than a raw data dump.

Every brief can use:

- a themed hero/header;
- profile identity and optional image in local preview/export;
- brief type and issue number;
- headline;
- top changes / accomplishments;
- structured status table;
- next actions / commitments;
- closing note;
- review reminder before sending.

Themes in the alpha:

- Executive dark;
- Modern SaaS;
- Newsroom;
- Adventure / expedition.

The adventure theme is the generalized path for the Jurassic / Neverland-style updates used during product dogfooding. Production themes remain user-selectable and must not hardcode a specific person's branding.

## Job Search Field Report ASTRO integration

Search-mode Brief Builder output follows the standalone ASTRO workflow rather than maintaining a weaker parallel reporting system.

### Exact comparison baseline

For recurring search reports:

`difference_window = (latest_sent_report_at, current_at]`

Rules:

- only a confirmed **sent** report advances the baseline;
- local previews, exports, saved drafts, and unsent revisions do not advance it;
- keep difference-window events separate from cumulative search totals;
- keep application actions separate from deduplicated company-role processes;
- keep referrals, search-firm intros, networking conversations, and other channel signals separate from employer interview totals until tied to a specific company-role process;
- fresher direct evidence overrides stale prior narrative.

### Evidence-state ledger

Material claims that can change over time should retain enough state to audit later:

- `source`;
- `observed_at`;
- `confidence`;
- `verification_state` — verified / inferred / unverified / conflicting;
- `status` — active / paused / waiting / stale-risk / closed / unverified when applicable.

When credible sources conflict, retain the conflict rather than silently choosing the preferred story or averaging incompatible facts.

Compensation remains labeled **verified**, **estimated**, or **unknown / not yet verified**.

### Accuracy gate

Use this sequence for any substantive brief rebuild:

`SOURCE AUDIT → STATE RECONCILIATION → CALCULATIONS → RENDER → STATIC OUTPUT QA → STORED/DELIVERY READBACK WHEN AVAILABLE`

Rules:

- reconcile live, paused, waiting, stale-risk, unverified, and closed states before rendering;
- never subtract unlike metrics or mix cumulative totals with interval-only events;
- preserve conservative floors when exact normalization is incomplete;
- a locally generated artifact is not proof that a later saved/delivered representation retained the same state;
- after any mutation of a stored/delivered artifact, invalidate prior acceptance and re-read/re-verify the new stored form;
- fixes are additive unless prior content is stale, factually superseded, or explicitly removed.

## Live Gmail OAuth MVP

### Architecture

Current flow:

`USER BROWSER → GOOGLE OAUTH → GMAIL API → LANDTHEPLANE BROWSER STATE`

The Cloudflare Worker serves the application and exposes only public OAuth configuration. It does not receive the user's Gmail access token or raw Gmail messages in the intended browser-direct flow.

### Scopes

Current Gmail MVP requests:

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.compose`

These are restricted Gmail scopes. Production use through one shared Clintware OAuth client requires the applicable Google verification process.

### Gmail evidence scan

The current deterministic scanner:

- searches a user-selected recent window;
- fetches message metadata and snippets needed for classification;
- classifies evidence into application receipt, interview/next-step, pause, closure/rejection, network signal, or other;
- marks Gmail-derived evidence as source-verified;
- does **not** treat every matching message as a unique company-role process;
- imports a summary and selected evidence rows into the existing Brief Builder for later ASTRO reconciliation.

A message classification is evidence, not automatically the final canonical pipeline state.

### Gmail draft creation and readback

Current Gmail draft creation uses the active Brief Builder fields and creates a dark, table-based HTML draft through the Gmail API.

The draft is not considered verified merely because the create call succeeds. LandThePlane then reads the saved draft back from Gmail and verifies:

- a LandThePlane ASTRO verification marker survives storage;
- the stored message is HTML;
- the dark `bgcolor` layer survives;
- the same-color gradient dark-mode lock survives.

Only after those readback checks pass does the UI label the draft verified.

The current Gmail draft path does **not** include a profile/hero image. Therefore CID/MIME inline-image verification is not applicable to this specific current draft path. When images are added later, they must be verified as true inline MIME parts with matching `Content-ID` / stored `cid:` references after every mutation.

Final sending remains user-controlled in Gmail.

## Email/mobile dark-output contract

Critical structure must remain dark and readable even when a client partially ignores stylesheets or media queries.

For the body/wrapper, outer container, section cells, cards/panels, table headers, metric blocks, and footer where applicable:

1. use email-safe table structure;
2. set HTML `bgcolor` for intended dark surfaces;
3. set inline `background-color:#HEX!important`;
4. add same-color inline gradient locks;
5. set primary text colors explicitly;
6. avoid transparent structural backgrounds for critical panels;
7. use dark color-scheme metadata as an additive safeguard only;
8. keep widths/images responsive;
9. critical readability must survive even if media queries are ignored.

If a real target-client/mobile preview is available, inspect it. If not, report only that static stored-HTML safeguards passed. Do not claim physical Gmail-mobile rendering verification without an actual client preview.

## Lifecycle

`SEARCH → LAND → RAMP → PROVE`

### Search

Generate intermediary status emails that keep the user and their chosen support network aligned on exact changes, cumulative search state, live applications, interview stages, human signals, compensation, follow-up dates, next actions, active/paused/waiting/closed reconciliation, search-channel traction, and market-relative context when sourced data is available.

### Land

When an offer is accepted, convert the final search state into a landing announcement, role/company/start-date summary, search recap, gratitude/support acknowledgement, transition checklist, and pre-start preparation.

### Ramp

After hire, the same format becomes a new-job operating brief covering first-week learning, stakeholders, projects, commitments, blockers, 30/60/90 progress, manager feedback, and measurable wins.

### Prove

Ongoing briefs create structured evidence for manager 1:1s, performance reviews, promotion cases, resume refreshes, and future interview preparation.

## Profile image handling

During setup, the user may provide a profile image and choose whether it appears in generated browser-local briefs.

Current local behavior:

- read with `FileReader` in the browser;
- preview locally;
- embed in generated local HTML preview/export;
- save to browser storage only when the user explicitly enables local profile persistence;
- do not upload the profile image to LandThePlane.

The current Gmail-draft path intentionally omits the profile image until the provider-specific inline-image path is implemented and verifiable.

## Planned SaaS data model

Suggested entities:

- `CandidateProfile`
- `ProfileAsset`
- `TemplateTheme`
- `Brief`
- `BriefSection`
- `BriefIssueSequence`
- `RecipientList`
- `Opportunity`
- `InterviewRound`
- `Commitment`
- `Project`
- `EvidenceItem`
- `SuccessSignal`
- `EvidenceObservation`
- `SourceReference`
- `VerificationState`

The same canonical career/work graph should drive interview prep, briefs, post-hire ramping, performance summaries, and future-search evidence reuse.

## Connected data boundary

Authentication and connected-data permissions remain separate.

Current Gmail access is:

- opt-in;
- browser-direct;
- minimally scoped to the current Gmail evidence/draft features;
- revocable;
- non-autonomous for sending;
- designed to convert provider evidence into structured career/search objects rather than permanent raw-mail storage.

Future Calendar, Drive, Contacts, meeting-source, and broader work-evidence connections should follow the same source-specific, revocable, minimally scoped, provenance-aware model.
