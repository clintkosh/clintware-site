# Doppel Technical Customer Engineering CRM

Clintware-native, role-tailored CRM built around Doppel's public Technical Customer Engineer responsibilities.

- Runtime: Cloudflare Worker + Durable Objects SQLite.
- Production target: https://dpl.clintware.com
- Public guest mode works without login; Clintware Identity adds durable account retention.
- Doppel-domain sign-in is isolated to this application context.
- Exa-backed research is available only through the server-side Clintware control plane and uses de-identified public queries.
- Provider credentials remain behind the control plane; the browser receives no long-lived third-party secrets.
- Jira and Confluence remain optional external systems of record.
- Synthetic sample customers are clearly marked and resettable.
- Customer ingestion supports text-native PDF, CSV, and ZIP review-before-commit.

The operating model is deliberately aligned to the Technical Customer Engineer role:

1. Advanced technical investigations across configuration, integrations, alert behavior, workflows, and reporting.
2. Technical services for APIs, authentication, SSO, data flows, reporting, and complex configuration.
3. Evidence-complete Engineering handoffs that distinguish configuration, expected behavior, integration problems, and reproducible defects.
4. Support scale through troubleshooting guides, diagnostics, automation, enablement, and self-service.
5. Customer-facing technical communication and stakeholder alignment.

This is a demonstration system and not an official Doppel product. All built-in customers and scenarios are synthetic.
