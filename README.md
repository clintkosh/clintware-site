# Clintware

Production source for the public Clintware company site.

## Public launch target

- Primary URL: `https://clintware.com`
- Canonical web URL: `https://www.clintware.com`
- Repository: `clintkosh/clintware-site`
- Branch: `main`
- Production artifact: `public/`

## Separation from Audio Lab

The company homepage and Audio Lab are separate deployments. The `audio-lab` branch is retained only as the historical static Audio Lab source. The full-stack Audio Lab now has its own Site and server-side music route, so publishing the homepage cannot replace the music product.

The legacy `clintware-audiolab` Cloudflare Pages project uses `audio-lab` as its production branch and has preview deployments disabled. Pushes to `main` must not trigger Audio Lab builds.

## Included public routes

- `/` — company overview
- `/tools/` — Clintware apps and labs
- `/blog/` — field notes
- `/privacy/`
- `/contact/`

## Deployment control

The GitHub Pages workflow is manual until the official domain move. It validates and uploads `public/`. Do not enable push deployment or change the apex domain until Audio Lab's independent hostname is active and the official cutover is approved.

## Domain boundaries

- Keep RenewNudge on its existing Lovable deployment until that project is changed there.
- Keep separate codeFEDDY properties outside the Clintware product map.
- Never deploy the retired Aggieland Media Lab address as the public Family Media Lab.

## CRM analytics requirement

Every interview CRM must load and initialize the shared Clintware GA4 property
`G-DCY144YM9P`. Worker-based CRMs must also allow Google Tag Manager and Google
Analytics collection in their Content Security Policy. The repository-wide
`tests/validate_crm_analytics.py` check discovers CRM Workers and static CRM
pages automatically and blocks validation when analytics coverage is missing.

New CRM Worker names or source must include a durable CRM marker such as
`customer success`, `command center`, `crm`, or `-cs-` so the shared audit
discovers them without a manually maintained site list.
