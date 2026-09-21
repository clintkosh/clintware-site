# Background Mirror

**Status:** local-first alpha  
**Public app:** `https://background.clintware.com/`

Background Mirror answers a narrow question: **what can someone researching me see, what changed, and what can I do about it?**

It is the standalone privacy/external-identity engine shared conceptually with LandThePlane's Offer Gate and Career Shield.

## Current alpha

- browser-local identity profile;
- browser-built self-search queries;
- Pwned Passwords k-anonymity connector: SHA-1 happens locally, only the first five hash characters are sent directly to the free HIBP range API, and padded responses are requested;
- professional/public-profile drift using local SHA-256 fingerprints rather than stored profile text;
- data-broker discovery query packs for common people-search domains;
- local consumer/background-report intake for TXT/CSV/JSON text with deterministic review candidates and obvious identifier redaction before a finding is stored;
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

Identity fields remain page-memory-only unless the user explicitly enables local identity saving. Findings, check state, notes, URLs, and baseline evidence stay browser-local. The Cloudflare Worker does not intentionally receive those values.

The worker has a private service binding to the Clintware Control Plane only for anonymous product telemetry. Allowed telemetry events are hard-coded and contain no identity or finding values.

Pwned Passwords is the only current automated third-party data lookup. The browser hashes the tested password locally, sends only the first five SHA-1 characters directly to `api.pwnedpasswords.com`, requests padded results, compares the returned suffixes locally, clears the password input, and never persists the password or full hash.

Google Results About You remains an official guided workflow because there is no public Results About You sync API. HIBP email-address breach lookup also remains guided because account lookup requires an authenticated subscription API. Background Mirror does not silently proxy identity values through Clintware to work around those boundaries.

## Product relationship

`Background Mirror → external identity / exposure engine`

`LandThePlane Offer Gate → career-specific pre-screening view`

`LandThePlane Career Shield → post-hire drift view`

The shared conceptual model is:

`IDENTITY → SOURCE CHECK → FINDING → VERIFY → BASELINE → CHANGE → REMEDIATE → RECHECK`
