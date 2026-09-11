# LandThePlane Brief Builder

The Brief Builder is the communication layer for the LandThePlane lifecycle and the product-level home for recurring career-status briefs.

It is also the LandThePlane integration point for the standalone **Job Search Field Report ASTRO** workflow published at `/skills/job-search-field-report/`. The public skill is the portable specification; LandThePlane reuses the same evidence, reconciliation, accuracy, and rendering rules inside the broader candidate-owned career evidence system.

## Current alpha

The public Worker now supports browser-local:

- profile setup;
- optional profile image upload;
- optional local profile persistence;
- theme selection;
- intermediary job-search updates;
- interview-progress updates;
- offer / landing announcements;
- first-week and onboarding updates;
- 30/60/90-day progress briefs;
- weekly / monthly career briefs;
- structured opportunity/work tables;
- issue numbering;
- HTML preview;
- HTML copy/export;
- local brief metadata history.

The alpha does **not** upload profile images, send email, schedule email, or ingest connected accounts. Gmail delivery/readback rules below are a future connected-delivery acceptance gate, not a claim about current alpha functionality.

## Astro-style rendering contract

The renderer should transform structured career state into a concise, high-contrast, readable brief rather than a raw data dump.

Every brief can use:

- a themed hero/header;
- profile identity and optional image;
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

The adventure theme is the generalized path for the Jurassic / Neverland-style updates used during product dogfooding. Production themes should remain user-selectable and should not hardcode a specific person's branding.

## Job Search Field Report ASTRO integration

Search-mode Brief Builder output should follow the standalone ASTRO workflow rather than maintaining a weaker parallel reporting system.

### Exact comparison baseline

For recurring search reports:

`difference_window = (latest_sent_report_at, current_at]`

Rules:

- only a confirmed **sent** report advances the baseline;
- local previews, exports, saved drafts, and unsent revisions do not advance it;
- keep difference-window events separate from cumulative search totals;
- keep application actions separate from deduplicated company-role processes;
- keep referrals, search-firm intros, networking conversations, and other channel signals separate from employer interview totals until tied to a specific company-role process;
- do not let a stale prior summary override fresher direct evidence.

### Evidence-state ledger

Every material claim that can change over time should be representable with enough state to audit later:

- `source` — where the claim came from;
- `observed_at` — when that source/state was observed;
- `confidence` — low / medium / high or an equivalent bounded scale;
- `verification_state` — verified / inferred / unverified / conflicting;
- `status` — active / paused / waiting / stale-risk / closed / unverified when applicable.

Fresh, direct, authoritative evidence should override stale narrative. When two credible sources conflict, retain the conflict and explain it instead of silently choosing the preferred story or averaging incompatible facts.

Compensation must remain labeled **verified**, **estimated**, or **unknown / not yet verified**.

### Accuracy gate

Use this sequence for any substantive brief rebuild:

`SOURCE AUDIT → STATE RECONCILIATION → CALCULATIONS → RENDER → STATIC OUTPUT QA → STORED/DELIVERY READBACK WHEN AVAILABLE`

Rules:

- reconcile live, paused, waiting, stale-risk, unverified, and closed states before rendering;
- never subtract unlike metrics or mix cumulative totals with interval-only events;
- preserve conservative floors when exact normalization is incomplete;
- a locally generated artifact is not proof that a later saved/delivered representation retained the same state;
- after any mutation of a stored/delivered artifact, invalidate prior acceptance and re-read/re-verify the new stored form;
- fixes are additive unless a prior element is stale, factually superseded, or explicitly removed; do not fix one defect by silently dropping previously approved sections, charts, evidence, or rendering safeguards.

## Email/mobile dark-output contract

When Brief Builder HTML is intended for email, critical structure must remain dark and readable even when a client partially ignores stylesheets or media queries.

For the body/wrapper, outer container, section cells, cards/panels, table headers, metric blocks, and footer where applicable:

1. Use email-safe table structure.
2. Set an HTML `bgcolor` attribute for the intended dark surface.
3. Set inline `background-color:#HEX!important`.
4. Add a same-color inline gradient lock, e.g. `background-image:linear-gradient(#07100a,#07100a)!important`.
5. Set primary text colors explicitly on the relevant element or immediate child.
6. Avoid transparent structural backgrounds for critical panels.
7. Use dark `color-scheme` / `supported-color-schemes` metadata where supported, but never rely on metadata alone.
8. Keep width responsive with `width:100%`, sensible `max-width`, and `height:auto` for images.
9. Critical readability must survive even if media queries are ignored.
10. Put the hero/banner as the first meaningful visual inside the dark wrapper.

If a real target-client/mobile preview is available, inspect it. If not, report only that static HTML safeguards passed; do not claim verified Gmail-mobile rendering without an actual client preview.

## Future connected Gmail delivery gate

When LandThePlane eventually offers connected Gmail draft creation, a brief is not complete merely because local HTML looks correct.

For inline hero/banner images:

1. Build the complete email-safe HTML first.
2. Embed the hero image as a valid `data:image/...;base64,...` source.
3. Create the Gmail draft without separately attaching that same hero image.
4. Re-read the saved Gmail draft.
5. Verify that Gmail created a real inline image part and rewrote the HTML to a generated CID.
6. Require `inline_images` to contain the image, raw MIME to contain `Content-Disposition: inline` and `Content-ID`, and stored HTML to reference the matching `cid:` value.
7. Treat a normal attachment with an empty inline-image set as a failed draft.
8. After **every** draft update or replacement, repeat both the CID/MIME checks and the mobile-dark static checks because Gmail may regenerate the CID or alter stored HTML.

Never report “banner fixed,” “mobile-safe,” or “delivery verified” solely from local source when the stored/delivered representation can be read back and has not been checked.

## Lifecycle

`SEARCH → LAND → RAMP → PROVE`

### Search

Generate intermediary status emails that keep the user and their chosen support network aligned on:

- exact changes since the last actually sent brief;
- cumulative application/search state;
- live applications;
- interview stages;
- human signals;
- probability estimates when explicitly labeled as estimates;
- compensation notes with verification labels;
- follow-up dates;
- next actions;
- active/paused/waiting/closed reconciliation;
- search-channel traction without interview inflation;
- market-relative context when sourced data is available.

### Land

When an offer is accepted, convert the final search state into:

- landing announcement;
- role/company/start-date summary;
- search recap;
- gratitude / support acknowledgement;
- transition checklist;
- pre-start preparation.

### Ramp

After hire, the same format becomes a new-job operating brief covering:

- first-week learning;
- stakeholders;
- projects;
- commitments;
- blockers;
- 30/60/90 progress;
- manager feedback;
- measurable wins.

### Prove

Ongoing briefs create structured evidence for:

- manager 1:1s;
- performance reviews;
- promotion cases;
- resume refreshes;
- future interview preparation.

## Profile image handling

During setup, the user may provide a profile image and choose whether it appears in generated briefs.

Current alpha behavior:

- read with `FileReader` in the browser;
- preview locally;
- embed in the generated local HTML preview/export;
- save to browser storage only when the user explicitly enables local profile persistence;
- do not upload to LandThePlane.

Future connected email delivery should use the verified provider-specific inline-asset path described above rather than assuming browser-local data-URI behavior will survive every mail client unchanged.

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
- `VerificationState`.

The same canonical career/work graph should drive interview prep, briefs, post-hire ramping, performance summaries, and future-search evidence reuse.

## Connected data boundary

Authentication and connected data must remain separate permissions.

Future Gmail, Calendar, Drive, Contacts, or meeting-source integrations should be:

- opt-in by source;
- tied to an explicit feature;
- revocable;
- minimally scoped;
- converted into structured career/work objects rather than treated as unlimited permanent raw-data storage;
- provenance-aware so derived claims keep source, timestamp, confidence, and verification state;
- read back after consequential writes when the provider exposes a stored representation.
