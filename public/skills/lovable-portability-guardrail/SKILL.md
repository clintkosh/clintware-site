---
name: lovable-portability-guardrail
description: Use Lovable as an optional development and code-generation layer while keeping GitHub as the source of truth, Cloudflare-ready independent deployment, and authentication, data, email, storage, secrets, and external services under accounts you control.
---

# Lovable Portability Guardrail

Use this skill **before starting or materially extending a Lovable project** when the goal is to keep the resulting application fully operable without Lovable.

## Outcome

Lovable may design, generate, refactor, and edit the project.  It must not become a required production dependency.

Default architecture:

```text
Lovable (optional development interface)
        ↓
GitHub (source of truth)
        ↓
Cloudflare Pages / Workers (deployment)
        ↓
Independent services you control
  ├─ Supabase / PostgreSQL
  ├─ Google or other OAuth providers
  ├─ Resend / Postmark / SES
  ├─ Supabase Storage / Cloudflare R2
  └─ direct third-party APIs
```

The portability test is simple:

> If Lovable disappeared tomorrow, could a developer clone the repository, configure documented environment variables, deploy it independently, and keep the application working?

If the answer is no, the implementation is not complete.

## Required rules

### 1. GitHub owns the source

- GitHub is the permanent source of truth.
- Commit application code, configuration templates, database migrations, server/serverless functions, tests, and operational documentation.
- Do not leave critical implementation details only in Lovable project history or settings.

### 2. Production hosting stays independent

- Do not require Lovable hosting or Lovable Cloud for production.
- Make the frontend deployable through Cloudflare Pages and/or Cloudflare Workers.
- Keep the deployment reproducible from GitHub.
- Prefer free-tier-capable architecture for small projects when practical, without assuming a provider will remain free forever.

### 3. Backend services belong to the operator

- Prefer an independently owned Supabase/PostgreSQL project when database, realtime, auth, storage, or Edge Functions are needed.
- Cloudflare Workers may own server-side application logic when appropriate.
- Do not hide core backend behavior behind a Lovable-only runtime or proprietary wrapper when a direct implementation is available.

### 4. Authentication must survive Lovable

- Use OAuth credentials owned by the operator's Google Cloud or other provider account.
- Supabase Auth or another independent auth provider may manage sessions and identities.
- Support protected routes, sign-in, sign-out, session persistence, authorization checks, and errors without Lovable.
- Never expose OAuth client secrets in browser code.

### 5. Email must be independently operable

For transactional or application email, use a directly controlled provider such as Resend, Postmark, or Amazon SES.

- Keep email logic in portable backend/serverless code.
- Store provider keys as deployment secrets.
- Do not require Lovable to send, receive, queue, or process production mail.
- Human business mailboxes should remain with a dedicated mail provider unless there is a deliberate reason to operate mail infrastructure directly.

### 6. Storage stays portable

- Use storage controlled independently, such as Supabase Storage or Cloudflare R2.
- Document buckets, policies, public/private access, and migration requirements.
- Do not let user files exist only inside Lovable-managed storage.

### 7. Secrets never belong in source code

- Never hard-code API keys, OAuth secrets, service-role keys, signing secrets, or production credentials.
- Keep production secrets in Cloudflare, Supabase, or the relevant provider's secret store.
- Maintain a complete `.env.example` with names and descriptions but no secret values.

### 8. Database state must be reproducible

- Commit schema and migration files.
- Keep Row Level Security policies, indexes, functions, triggers, and seed requirements under source control where applicable.
- A fresh environment should be reconstructable from the repository and documented setup steps.

### 9. Integrate external services directly

Stripe, Google OAuth, OpenAI, Anthropic, Resend, analytics, and other services should use accounts and credentials controlled by the operator.

Prefer direct provider integrations over Lovable-specific wrappers when the direct integration preserves equivalent functionality.

If a Lovable-only feature appears necessary, identify the dependency before using it and provide a portable alternative.

### 10. Maintain an exit path from day one

Every project should maintain:

- `README.md`
- `.env.example`
- `EXIT.md`
- deployment instructions
- database migrations
- backend/serverless source
- external-service dependency list
- local-development instructions
- production build and verification instructions

`EXIT.md` should state where hosting, database, authentication, storage, email, secrets, and external integrations live, plus how to rebuild and redeploy without Lovable.

## Starter prompt for Lovable

Paste the following before the first substantive build request, then keep it as a project-level requirement:

```text
PORTABILITY REQUIREMENT FOR THIS ENTIRE PROJECT

Lovable is an optional development and code-generation interface only.  The finished application must remain fully functional if I stop using Lovable permanently.

Use GitHub as the permanent source of truth for all application code, configuration templates, database migrations, backend/serverless functions, tests, and documentation.

Do not make production depend on Lovable hosting, Lovable Cloud, Lovable-managed authentication, Lovable-managed storage, Lovable-only email delivery, or another proprietary Lovable runtime dependency when an independently deployable implementation is available.

Production must be deployable independently through Cloudflare Pages and/or Cloudflare Workers from the GitHub repository.

When backend services are needed, prefer infrastructure under accounts I control.  Use my own Supabase/PostgreSQL project for database, authentication, storage, realtime, and Edge Functions where appropriate, or Cloudflare Workers for server-side logic.

For Google or other OAuth login, use OAuth credentials owned by my provider account and an independent authentication implementation such as Supabase Auth.  Never expose OAuth client secrets in frontend code.

For transactional email, use a directly controlled provider such as Resend, Postmark, or Amazon SES through portable backend/serverless code.  Do not make Lovable responsible for production email delivery.

For file storage, use independently controlled storage such as Supabase Storage or Cloudflare R2.

Never hard-code secrets.  Keep production secrets in the deployment/provider environment and maintain a complete `.env.example` without secret values.

Commit all database schema and migration files required to recreate a fresh environment.

Integrate external services such as Stripe, Google, OpenAI, Anthropic, Resend, and analytics directly through accounts and credentials I control whenever possible.  If you believe a Lovable-specific feature is necessary, identify that dependency before implementing it and provide a portable alternative.

Maintain README.md and EXIT.md.  EXIT.md must explain where hosting, database, authentication, storage, email, secrets, and external integrations live and provide the steps required to run and deploy the project without Lovable.

Before completing any major feature, apply this test:

Could I clone this GitHub repository on a new machine, configure the documented environment variables and external services, deploy through Cloudflare, and have the complete application work without opening Lovable?

If no, redesign the implementation before continuing.

Lovable may help design interfaces, generate components, write application logic, create migrations, implement integrations, refactor, test, and document the project.  Lovable must remain replaceable.
```

## QA checklist

Before calling a project portable, verify:

- fresh Git clone succeeds
- dependency installation succeeds
- local development starts without Lovable
- production build succeeds
- Cloudflare deployment does not require Lovable
- database migrations can recreate required schema
- OAuth credentials are independently owned
- authentication works independently
- email provider is independently controlled
- storage is independently controlled
- secrets are not committed
- `.env.example` is complete
- external integrations use operator-controlled accounts
- `README.md` and `EXIT.md` are current
- no required production request passes through Lovable solely because Lovable generated the project

## Definition of done

Lovable can be removed from the toolchain without removing the product.