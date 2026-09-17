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
