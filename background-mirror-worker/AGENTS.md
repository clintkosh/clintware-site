# Background Mirror guardrails

Background Mirror is a user-side, local-first external-identity and privacy product.

- Do not turn the product into an employer hiring, retention, or employee-ranking system.
- Do not assign a person-level reputation score.
- Classify evidence, confidence, visibility, sensitivity, accuracy, decision relevance, remediation state, and change state instead.
- Identity fields, finding text, report contents, URLs, and baseline evidence remain browser-local by default.
- Control Plane telemetry may contain only anonymous product events and coarse safe metadata. Never send PII, report contents, search terms, or finding text through analytics.
- External consumer-report and public-record checks should use user-authorized official access paths. Do not request or store credentials for those sites.
- Preserve explicit distinction between an observed external change and any inference about employer action.
- Public copy must follow repository ASTRO and Clintware brand rules.

- Pwned Passwords checks must hash in the browser, send only the documented k-anonymity prefix directly to HIBP, request response padding, and never persist the password, full hash, or prefix.
- Profile drift stores fingerprints and coarse metadata only. Do not persist pasted profile text by default.
- Consumer/background-report intake must keep raw report text browser-local and transient. Redact obvious sensitive identifiers before a surfaced candidate can become a stored finding.
- Do not proxy Google Results About You, HIBP account/email lookups, or data-broker searches through Clintware merely to call them "automated." Provider authentication, explicit user consent, and a privacy review are required before any identity-bearing server connector is added.
