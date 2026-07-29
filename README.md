# Clintware Family Media Studio — PayPal edition

A deployable manual-review beta for `clintware.com/family-media/`.

## Payment design

The default payment path is PayPal invoicing after order review. This works with the currently connected PayPal capability and prevents customers from paying for requests that must be declined or changed. Optional PayPal-hosted Payment Links can be inserted later in one configuration file.

## Files

- `family-media/index.html` — storefront and local preview
- `family-media/order.html` — package-aware order form
- `family-media/submit-order.php` — validated form and private upload handler
- `family-media/config.php` — server configuration
- `family-media/assets/js/paypal-config.js` — optional public PayPal link URLs
- `PAYPAL-SETUP.md` — invoice and direct-link workflow
- `DEPLOY-NAMECHEAP.md` — deployment and test steps

## Security boundaries

- No PayPal secrets are included.
- Uploads are MIME-checked, renamed, size-limited, and stored outside the public web root.
- Real-person likeness and minor consent are explicitly required.
- Manual review remains mandatory.
