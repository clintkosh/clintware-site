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

The repository workflow `.github/workflows/deploy-consulting-pages.yml` publishes the `consulting/` directory to GitHub Pages and declares `consulting.clintware.com` through `CNAME`.

Required DNS record:

- Type: `CNAME`
- Host: `consulting`
- Value: the GitHub Pages hostname shown after Pages deployment is enabled for this repository

GitHub Pages must be configured to use **GitHub Actions** as the source. The workflow can then deploy the site artifact.

## Validation

Run:

```bash
python tests/regression.py
```

The committed test report records five passing regression checks covering structure and SEO, navigation integrity, static routes, JavaScript logic, and responsive CSS contracts.
