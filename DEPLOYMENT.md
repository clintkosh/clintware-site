# Audio Lab Deployment

## Automated deployment

Every push to `main` runs `.github/workflows/deploy-pages.yml`.

The workflow:

1. Reassembles the validated production `index.html` from eight payload parts.
2. Verifies SHA-256 `f45b27a553d1a2b533868a3668688b1b480aa6a540406e3c1e5866d249f3261f`.
3. Uploads the static artifact to GitHub Pages.
4. Deploys the Pages site.

The default Pages URL is expected to be:

`https://clintkosh.github.io/clintware-site/`

## Custom domain target

Target: `https://audiolab.clintware.com`

GitHub Pages custom domains created from a custom Actions workflow are configured in repository Pages settings or through GitHub's Pages API. A repository `CNAME` file is not used by this workflow.

### GitHub setting

In `clintkosh/clintware-site`:

1. Open **Settings**.
2. Open **Pages**.
3. Set **Custom domain** to `audiolab.clintware.com`.
4. Save.
5. Enable **Enforce HTTPS** after GitHub provisions the certificate.

### Namecheap DNS

Create this record for `clintware.com`:

| Type | Host | Value | TTL |
|---|---|---|---|
| CNAME | `audiolab` | `clintkosh.github.io` | Automatic |

Do not include `/clintware-site` in the CNAME value.

## Provider backend

The Pages deployment includes the complete browser studio and local demo renderer. A paid hosted music provider still requires server-side `/api/health` and `/api/music` endpoints. Never place a provider secret in the static site.
