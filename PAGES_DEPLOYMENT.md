# Clintware production deployment

The public Clintware website is deployed through **Cloudflare Pages**. Do not attach the primary website domain to the legacy root Worker or to the repository's GitHub Pages deployment.

## Production source

- Repository: `clintkosh/clintware-site`
- Cloudflare Pages project: `clintware-site`
- Production branch: `main`
- Framework preset: `None`
- Root directory: `/`
- Build output directory: `public`
- Pages hostname: `clintware-site.pages.dev`

Cloudflare's Git integration deploys pushes from `main`. The repository may also publish a GitHub Pages copy for validation/backup, but GitHub Pages is **not** the production owner of `www.clintware.com`.

## Production domains

Manage the primary-domain attachment in the Cloudflare Pages project `clintware-site`.

Expected public hostnames:

- `www.clintware.com` -> Cloudflare Pages project `clintware-site`
- `clintware.com` -> the site's intended apex/redirect configuration in Cloudflare

Do not create or restore a root Worker route such as `clintware.com -> clintware-site`. A historical Worker route with that service name was intentionally removed so Pages could own the public site.

## Publishing check

A successful production publish should show a successful **Cloudflare Pages: clintware-site** check for the `main` commit. New product routes must exist under `public/`, then be linked from the product catalog and sitemap as appropriate.
