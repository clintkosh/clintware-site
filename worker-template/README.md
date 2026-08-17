# Clintware Product Worker Template

Use this directory as the starting point for every new Clintware product Worker.

## Design contract

The following rules are defaults and should not be replaced by framework or generated styling unless the product explicitly requires a redesign:

- Terminal-style monospace typography throughout.
- H1: 24px desktop, 20px mobile.
- H2: 18px desktop, 16px mobile.
- Uniform title size and weight. No mixed-size words inside headings.
- No billboard hero text, script/display faces, gradient headline tricks, animated title emphasis, or ad-style copy.
- Direct product language: state the problem, what the product does, what works now, and current limits.
- Compact spacing, square/low-radius surfaces, restrained dark palette, high readability.
- Each production product gets its own Worker service, its own custom domain, observability, and independent deployment path.
- Do not add another product hostname to an existing product Worker.

## Worker contract

- Copy `worker-template/` to a product-specific directory.
- Rename the Worker in `wrangler.jsonc` to `clintware-<product>`.
- Set a current compatibility date when creating the product.
- Keep `nodejs_compat` and observability enabled unless there is a documented reason not to.
- Bind only that product's custom domain to its Worker.
- Validate syntax and run a Wrangler dry-run before deployment.
- Add a live verification step that checks the product name or other stable marker after deploy.

## Product copy

Edit only the `PRODUCT` object first. Keep the shared layout and typography contract intact unless a deliberate redesign is requested.
