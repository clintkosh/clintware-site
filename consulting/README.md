# Clintware Consulting

Production-ready static subsite for `https://consulting.clintware.com/`.

## Positioning

Clintware Consulting helps growing SaaS and cybersecurity companies protect the value of each sale by reducing support burden, onboarding friction, Customer Success overload, and uncontrolled post-sale operating cost.

## Included

- Premium dark Clintware visual system with cyan, electric blue, violet, and restrained magenta accents
- Responsive desktop, tablet, and mobile layout
- Support-burden cost calculator
- Services for Support Operations, Customer Success, onboarding, cybersecurity customer experience, AI-assisted automation, and fractional capacity
- Fixed-scope and monthly engagement options
- Accessible consultation-request form that creates a structured email to `hello@clintware.com`
- SEO metadata, canonical URL, structured data, manifest, sitemap, robots file, and SVG favicon
- Reduced-motion and coarse-pointer handling

## Deployment

The repository workflow `.github/workflows/deploy-consulting-pages.yml` validates and publishes the `consulting/` directory through GitHub Pages.

Required GitHub Pages settings:

1. Open **Settings → Pages** for `clintkosh/clintware-site`.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Set **Custom domain** to `consulting.clintware.com`.
4. Enable HTTPS after GitHub makes the option available.

Required DNS record at the domain provider:

- Type: `CNAME`
- Host: `consulting`
- Value: `clintkosh.github.io`

The included `CNAME` file documents the intended hostname, but custom GitHub Actions deployments use the domain configured in the repository's Pages settings.

## Validation

Run:

```bash
python tests/regression.py
```

The committed test report records five passing regression checks covering structure and SEO, navigation integrity, static routes, JavaScript logic, and responsive CSS contracts.
