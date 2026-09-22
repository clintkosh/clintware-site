# Lovable → Clintware migration map

Updated: 2026-09-22

This file is the source-of-truth migration register for projects being removed from Lovable dependency. The rule is: preserve useful code/specification first, verify the Clintware/GitHub copy, then retire the Lovable project. Lovable is never the production runtime.

| Current Lovable project | Target Clintware/GitHub location | Dependencies | Status | Next action |
| --- | --- | --- | --- | --- |
| Customer Value Navigator / N7 Customer Value OS | `projects/n7-customer-value-os/` in `clintkosh/clintware-site`; target hostname `N7crm.clintware.com` | React/TanStack/Tailwind; deterministic local demo provider; future Clintware control plane | **Migration in progress. Lovable build completed and production build passed.** | Copy portable source into this repo, validate independent build, then deploy through Cloudflare. |
| Cloud Portfolio Move | Existing Clintware public site in `clintkosh/clintware-site` | None | **Superseded / no unique application code.** Lovable project contains only the migration discussion/template shell. | Preserve this record, then retire the Lovable copy after final audit. |
| JobMail Tracker | Consolidated target: `projects/mailtrail/` | Gmail OAuth, local SQLite/FastAPI design from project brief | **Specification-only in Lovable.** No unique built application was present. | Preserve combined product brief and implement on Clintware/GitHub side; do not spend Lovable credits rebuilding it. |
| Job Mail Manager | Consolidated target: `projects/mailtrail/` | Same job-mail/Gmail concept | **Duplicate precursor.** No unique built application was present. | Merge useful requirements into MailTrail; retire duplicate Lovable project after preservation. |
| Offloadr | Existing repo `clintkosh/offloadr`; Clintware product listing | Tauri v2, React/TanStack, Windows WPD bridge | **Already outside Lovable and actively in GitHub.** Desktop build now uses bundled local `dist-desktop`, not a remote Lovable/Vercel page. | Add portability docs/Clintware registration; keep GitHub as source of truth. |
| Unbound AI Assistant | Target `projects/unbound-ai/` plus independent Supabase/AI-provider migration | Supabase schema/auth, vector memory, chat functions; currently has Lovable/Supabase-era integrations | **High-risk migration; do not delete yet.** | Export source + migrations, replace Lovable-specific AI/runtime coupling, provision owner-controlled backend, validate data/auth migration before retirement. |

## Operating rules

- GitHub is the permanent source of truth.
- Cloudflare is the default Clintware web runtime where appropriate.
- Secrets and OAuth credentials stay outside Lovable and client code.
- Use Clintware MCP/control-plane adapters for credentialed external actions.
- Prefer deterministic/local behavior in prototypes until server-side adapters are connected.
- Do not delete/retire a Lovable project until its useful code/spec/data is preserved and the target build is verified.
- Avoid additional Lovable build calls unless the project-specific agent has unique implementation leverage that cannot be reproduced from source inspection.
