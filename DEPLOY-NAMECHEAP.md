# Deploy to Namecheap

## Target

Publish the folder at:

`https://clintware.com/family-media/`

## Requirements

- PHP 8.1 or newer
- HTTPS enabled
- `studio@clintware.com` working or forwarding to the monitored inbox
- PHP `fileinfo` extension enabled
- PHP mail delivery configured, or replace `mail()` with the host's authenticated mail provider

## Upload

1. Open Namecheap **Hosting List** and enter cPanel.
2. Open **File Manager**.
3. Upload the contents of `family-media` to `public_html/family-media/`.
4. Confirm `public_html/family-media/index.html` exists.
5. Confirm the parent of `public_html` is writable by PHP so `clintware_private_orders` can be created outside the public web root.
6. Open `https://clintware.com/family-media/`.
7. Submit a harmless free test order.
8. Confirm the notification email arrives and the private order folder contains `order.json` plus sanitized uploads.
9. Delete the test order.

## Live payment checks

- Submit one paid test request using an email you control.
- Use the connected PayPal invoice workflow to create and send the invoice.
- Confirm the invoice and order ID match.
- Confirm production does not begin until paid status is verified.
- Do not advertise instant automated fulfillment; this package is a manual-review beta.
