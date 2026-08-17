---
name: standard-saas-website-template
description: Build a clean, production-oriented SaaS product website and Cloudflare Worker using a compact technical design contract, direct copy, accessible responsive layout, secure defaults, and independent deployment boundaries.
---

# Standard SaaS Website Template

Use this skill when creating a new SaaS product website, product landing page, or dedicated Cloudflare Worker site.

## Goals

Create a site that is readable, restrained, responsive, easy to maintain, and ready to evolve into a real application without starting from a disposable marketing template.

## Design contract

- Use a technical monospace stack such as Cascadia Code, Segoe UI Mono, SFMono-Regular, Menlo, Consolas, Liberation Mono, or another local monospace fallback.
- Keep primary headings compact: 24px desktop and 20px mobile by default.
- Keep secondary headings compact: 18px desktop and 16px mobile by default.
- Do not use billboard typography, script fonts, mixed-size words inside one heading, giant gradients, looping headline animation, or decorative copy treatments.
- Prefer square or lightly rounded panels, restrained borders, high contrast, clear spacing, and direct hierarchy.
- Use responsive layouts that collapse cleanly to one column on narrow screens.
- Write literal product copy. State what the product does, who it helps, what works today, and what remains in development.
- Do not invent customer logos, metrics, testimonials, integrations, certifications, security claims, or production readiness.

## Privacy and portability contract

Public templates must not contain personal names, private email addresses, private domains, analytics IDs, account IDs, API keys, tokens, repository secrets, customer names, internal product codenames, or organization-specific identifiers.

Use placeholders instead:

- `COMPANY_NAME`
- `PRODUCT_NAME`
- `PRODUCT_DOMAIN`
- `COMPANY_URL`
- `CONTACT_URL`
- `ANALYTICS_ID` only when the user explicitly enables analytics

Do not add analytics by default.

## Cloudflare Worker contract

For each independent SaaS product:

1. Give the product its own Worker service.
2. Give the Worker its own `wrangler.jsonc`.
3. Bind only the intended product domain to that Worker.
4. Enable observability.
5. Use a recent compatibility date and `nodejs_compat` when needed.
6. Never let a generic shared Worker claim another product's production hostname.
7. Validate syntax and Wrangler configuration before deployment.
8. Verify the live hostname after deployment.

## Security defaults

Return at minimum:

- `Content-Type`
- `Content-Security-Policy`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

Keep CSP narrow. Add third-party origins only when the product actually needs them.

## Standard page structure

Use this baseline unless the product requires something different:

1. Compact header with product and company identity.
2. Direct hero statement.
3. One concise explanation paragraph.
4. Status or availability label.
5. Three concrete capability cards.
6. One thesis, limitation, or current-boundary statement.
7. Compact footer with company and contact links.

## Required output when building a Worker site

Produce:

- `src/index.js` or equivalent Worker entrypoint
- `wrangler.jsonc`
- deployment notes
- verification steps
- explicit list of placeholders that must be replaced before launch

## Validation checklist

Before calling the site complete, confirm:

- no personal or organization-specific data remains unless the user explicitly requested it
- no secrets or analytics identifiers are hardcoded
- H1 is not oversized
- headings use one consistent technical type system
- mobile layout is readable
- product claims match current reality
- CSP and security headers are present
- the Worker owns only its intended hostname
- deployment can be validated independently of other product Workers
