# Background Mirror

**Status:** local-first alpha  
**Public app:** `https://background.clintware.com/`

Background Mirror answers a narrow question: **what can someone researching me see, what changed, and what can I do about it?**

It is the standalone privacy/external-identity engine shared conceptually with LandThePlane's Offer Gate and Career Shield.

## Current alpha

- browser-local identity profile;
- browser-built self-search queries;
- launch points for free/official consumer-access checks;
- structured finding ledger;
- evidence fields for confidence, visibility, sensitivity, accuracy, career relevance, and remediation state;
- baseline snapshot;
- new-finding drift detection;
- Offer Gate view;
- Career Shield view;
- portable JSON export/import;
- no person-level reputation score.

## Privacy model

Identity fields, finding text, URLs, notes, report contents, and baseline evidence stay in browser storage by default. The Cloudflare Worker does not intentionally receive them.

The worker has a private service binding to the Clintware Control Plane only for anonymous product telemetry. Allowed telemetry events are hard-coded and contain no identity or finding values.

## Product relationship

`Background Mirror → external identity / exposure engine`

`LandThePlane Offer Gate → career-specific pre-screening view`

`LandThePlane Career Shield → post-hire drift view`

The shared conceptual model is:

`IDENTITY → SOURCE CHECK → FINDING → VERIFY → BASELINE → CHANGE → REMEDIATE → RECHECK`
