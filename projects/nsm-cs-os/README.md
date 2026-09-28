# NSM ServiceNow Customer Outcomes OS

Production target: https://nsm.clintware.com

Candidate-built, role-specific post-implementation operating prototype for the Customer Success Advocate opening. It is not an official Norseman Services product and uses no Norseman logo.

## Deliberately narrow
The demo keeps only six surfaces: Portfolio signal, Platform health, Adoption + license utilization, Escalation, Architect handoff, and Executive brief.

## ServiceNow compatibility model
Synthetic records map to incidents, problems, changes, CMDB/CSDM context, business services, entitlements, adoption, Success Plays, platform health, release readiness, and executive outcomes. No live ServiceNow tenant is connected and no private customer data is included.

## Foundation
Reuses the mature DPL CRM Worker/Durable Object persistence and security foundation: no-login browser persistence, synthetic resettable data, audit-ready records, same-origin mutations, CSP/security headers, noindex policy, and custom-domain deployment verification.
