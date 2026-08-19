# LandThePlane Brief Builder

The Brief Builder is the communication layer for the LandThePlane lifecycle.

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

The alpha does not upload profile images, send email, schedule email, or ingest connected accounts.

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

## Lifecycle

`SEARCH → LAND → RAMP → PROVE`

### Search

Generate intermediary status emails that keep the user and their chosen support network aligned on:

- live applications;
- interview stages;
- human signals;
- probability estimates;
- compensation notes;
- changes since the last brief;
- follow-up dates;
- next actions.

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

Future SaaS email delivery should use a mail-safe hosted asset or CID attachment instead of depending on data-URI rendering across email clients.

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

The same canonical career/work graph should drive interview prep, briefs, post-hire ramping, performance summaries, and future-search evidence reuse.

## Connected data boundary

Authentication and connected data must remain separate permissions.

Future Gmail, Calendar, Drive, Contacts, or meeting-source integrations should be:

- opt-in by source;
- tied to an explicit feature;
- revocable;
- minimally scoped;
- converted into structured career/work objects rather than treated as unlimited permanent raw-data storage.
