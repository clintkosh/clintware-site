# Clintware Cloudflare Pages deployment

Use a **Pages** project, not a Worker.

- Repository: `clintkosh/clintware-site`
- Production branch: `main`
- Framework preset: `None`
- Root directory: `/`
- Build command: leave blank
- Build output directory: `public`

Expected production hostname: `clintware-pages.pages.dev`

With Namecheap BasicDNS:

- Add the Pages custom domain `www.clintware.com` inside Cloudflare Pages first.
- At Namecheap, create `CNAME www -> clintware-pages.pages.dev` using the exact hostname Cloudflare assigns.
- At Namecheap, redirect `@` permanently to `https://www.clintware.com`.
- Keep email forwarding and existing unrelated subdomain records.
