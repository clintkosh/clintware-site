# Clintware™ Brand Standard

Canonical professional brand treatment, updated 2026-09-23.

## Required wording

- Company: **Clintware™**
- Official displayed slogan: **GO FURTHEST.™**
- Lockup: **Clintware™ — GO FURTHEST.™**

The slogan is displayed in all capitals, with the period before the trademark symbol.  Do not substitute `Go Furthest.™`, `Go Further`, omit the period, or use another casing/wording in public brand display copy.

Use the trademark symbol on professional/public brand references where it is visually reasonable. Do not use the registered-trademark symbol (®) unless and until a relevant federal registration exists.

## Permanent visual system

Clintware is a restrained technical brand, not a generic SaaS/AI marketing template.

- Read and apply `ASTRO_WEBSITE_SKILL.md` before any public website, product-positioning, startup / YC, portfolio, homepage, navigation, or visual-copy change.
- Use compact, uniform page titles rather than oversized hero typography.
- Use the canonical **Clintware Type System** for every Clintware-owned public page and shared component. The implementation lives in `public/assets/typography-lock.css` and the public specimen/download surface lives at `/fonts/`.
- **Clintware Sans** is the default reading/body face: `"Liberation Sans", Arial, "Helvetica Neue", Helvetica, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`.
- **Clintware Display** is the heading/display face: `"Arial Narrow", "Helvetica Neue Condensed", "Liberation Sans Narrow", "Liberation Sans", Arial, sans-serif`. Keep it compact, dense, and highly readable.
- **Clintware Mono** is reserved for software/system language such as navigation labels, buttons, metadata, terminal text, code, process rails, statuses, and technical accents: `"Cascadia Code", "Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", "DejaVu Sans Mono", monospace`.
- **Clintware Hand** is annotation-only. It may be used sparingly for a small human-made note or specimen, never for paragraphs, navigation, controls, or primary headings.
- **Clintware Alien** is a subtle CSS treatment for occasional display use and the restrained Clintware `WARE` brand accent. It must never reduce legibility or become the dominant page typography.
- Keep headings legible, restrained, and consistent. No loopy, bubbly, comic, decorative, or giant display headings. Handwritten treatment is allowed only through the bounded Clintware Hand annotation rule above.
- Avoid generic startup-template hero layouts whose main visual device is an enormous headline.
- Avoid generic `hero -> three cards -> feature grid -> repeated CTA` page structure unless the actual content genuinely requires it.
- Preserve the established dark technical palette: near-black backgrounds, restrained graphite surfaces/borders, white text, muted blue-gray secondary text, and controlled cyan/green/violet accents.
- Prefer square or lightly rounded technical panels over exaggerated pill/bubble styling.
- Supporting copy must be direct, logical, technical, and specific. Avoid hype-heavy generated marketing language and stacked promotional descriptors.
- Product pages must inherit this visual system unless a product has an explicitly approved independent identity.
- Do not scatter random metrics or proof points without explaining what role, customer scope, decision, product, or operating change they demonstrate.
- One clear primary action is preferred over repeated marketing CTAs.

These are hard design constraints for future site changes. Do not replace them with framework/theme defaults during redesigns, migrations, template generation, migrations to another framework, or automated site refreshes.

### Typography persistence rule

Any site-wide refresh, redesign, migration, page generator, theme replacement, product-page rebuild, or automated visual cleanup must preserve the Clintware Type System before it is considered complete.

Required checks:

1. Shared pages must load the canonical typography layer or an exact compatible implementation of its variables and roles.
2. Body copy must resolve through **Clintware Sans**.
3. Headings must resolve through **Clintware Display**.
4. Software/system microcopy must use **Clintware Mono** where appropriate.
5. Handwritten and alien treatments remain optional accents only.
6. The Clintware wordmark must retain the subtle futuristic `WARE` treatment unless an explicitly approved brand revision replaces it.
7. A refresh that silently falls back to generic framework typography, terminal-only body copy, or unrelated web fonts fails brand QA and must be corrected before deployment.
8. If typography files are reorganized, the new implementation must preserve these roles and update `/fonts/` so the public specimen remains accurate.

Canonical typography QA:

`SANS BODY -> DISPLAY HEADINGS -> MONO SYSTEM LANGUAGE -> OPTIONAL HUMAN/ALIEN ACCENTS -> MOBILE LEGIBILITY -> /FONTS/ MATCHES PRODUCTION`

## Usage

Use **GO FURTHEST.™** as Clintware’s canonical displayed slogan on the website, LinkedIn copy, professional templates, product pages, branded follow-ups, presentations, social profiles, and future brand assets.

The slogan is not a substitute for a product description. Product copy must remain specific about what the product actually does and clearly distinguish working functionality from prototypes, experiments, roadmap items, and future concepts.

## Product hierarchy

The current founder-priority / Winter 2027 validation order, updated September 19, 2026:

1. **Mind to Form**: primary new venture thesis. Intent-to-physical-product compiler with a mandatory Definition-of-Done approval gate.
2. **BuyerOrigin**: working merchant-controlled acquisition-offer eligibility MVP and strongest commercial-validation challenger.
3. **Quillgeist**: working adaptive-intent/local-execution alpha and strongest technical alternate.
4. **LandThePlane**: working candidate-owned evidence / career-system alpha.
5. **Prompt Iris**: working browser MVP for quality-adjusted AI efficiency.
6. **RenewNudge**: live Customer Success renewal-risk and action workflow.
7. **OrgSynapse**: working shared company-operating-state alpha.
8. **ShoulderSoldier**: working deterministic user-interaction risk evaluator.
9. **Portability Check**: defined portability assessment/remediation track.
10. **MindVergent™**: supporting verified-work network thesis.

Idea priority and evidence maturity are separate. Never imply that the #1 idea has more external proof than a lower-ranked working product unless verified evidence supports that claim.

### Canonical YC venture domains

Every venture in the YC/startup ranking gets its own dedicated Clintware subdomain. `/startup/` is the ranking/index only.

- `mindtoform.clintware.com`
- `buyerorigin.clintware.com`
- `quillgeist.clintware.com`
- `landtheplane.clintware.com`
- `promptiris.clintware.com`
- `renewnudge.clintware.com`
- `orgsynapse.clintware.com`
- `shouldersoldier.clintware.com`
- `portability.clintware.com`
- `mindvergent.clintware.com`

Legacy `/tools/` pages may remain, but public YC/startup links must prefer these canonical subdomains.

## MindVergent™ brand rule

Always display the master brand as **MindVergent™**. The trademark symbol follows `MindVergent`, not `Labs`.

- Company / network: **MindVergent™**
- Research and experimentation surface: **MindVergent™ Labs**
- Community / Discord: **MindVergent™** or **MindVergent Community** when a descriptor is needed
- Technical/domain identifiers may remain lowercase, such as `mindvergent.com`, `mindvergent.clintware.com`, and `mindvergent-worker`.

Do not present **MindVergent™ Labs** as the permanent company name. Labs is one surface inside the broader MindVergent product architecture.

## Winter 2027 YC language

BuyerOrigin may be described as the **primary Winter 2027 Y Combinator application candidate** or **being prepared for a Winter 2027 YC application** while that remains the actual plan. Quillgeist is the close technical alternate, followed by RenewNudge, ShoulderSoldier, and Portability Check in the current evidence-ranked validation order.

Do not call a planned application an `Applicant` before it has actually been submitted.  Do not imply acceptance, YC interview selection, endorsement, affiliation, funding, or participation unless it actually occurs.

## Copy rule

For Clintware-owned public materials, prefer precise functional descriptions over inflated claims. Keep roadmap functionality labeled as roadmap/in development. Keep existing products, experiments, client demos, and job-specific proof-of-concept work clearly separated.

A public page that could be renamed for an unrelated AI startup without materially changing its copy fails the Clintware standard and must be rewritten before deployment.