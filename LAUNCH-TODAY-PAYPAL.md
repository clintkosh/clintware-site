# Launch-today implementation plan

## The target

Publish the first working version at:

`https://clintware.com/family-media/`

Do not overwrite the existing Clintware homepage. Add one navigation link on the main site named **Family Media Studio**.

## Phase 1 — business setup

Complete these before accepting a paid Texas order:

1. Operate temporarily as a sole proprietor.
2. File a county assumed-name certificate for **Clintware** if required for the way the business is operated.
3. Submit the free Texas Sales and Use Tax Permit application.
4. Use a separate business checking account or, at minimum, a separate ledger and payment account.
5. Reserve collected sales tax and estimated income/self-employment tax. Do not treat those amounts as profit.
6. Form the Texas LLC after the business has enough retained profit to pay the filing cost without draining the operating reserve. A practical trigger is $500 cumulative net profit or 10 paid orders, whichever comes first.

## Phase 2 — create the PayPal products and invoice items

Create these PayPal invoice items or hosted checkout products:

| Product | Price | Tax behavior |
|---|---:|---|
| Portrait Mini | $29 | Automatic tax enabled |
| Studio Session | $79 | Automatic tax enabled |
| Brand & Creator Session | $179 | Automatic tax enabled |
| Additional Finished Image | $8 | Automatic tax enabled |

For each Payment Link:

- Collect customer name and email.
- Collect the full billing address for tax calculation.
- Enable automatic tax after the Texas registration is active and configured.
- Require acceptance of the Terms URL.
- Redirect after payment to the matching order URL, for example:
  - `https://clintware.com/family-media/order.html?package=mini`
  - `https://clintware.com/family-media/order.html?package=studio`
  - `https://clintware.com/family-media/order.html?package=creator`
- Turn on successful-payment email notifications.

Keep invoice-request mode as the default. Optionally add public PayPal-hosted Payment Link URLs in `assets/js/paypal-config.js`; keep the free package linked directly to `order.html?package=free`.

## Phase 3 — prepare Namecheap

### If Namecheap Shared Hosting is active

1. Sign in to Namecheap.
2. Open **Hosting List**.
3. Select **Go to cPanel**.
4. Open **File Manager**.
5. Open `public_html` for the primary domain.
6. Upload the provided ZIP.
7. Extract it.
8. Move the extracted `family-media` folder directly inside `public_html`.
9. Confirm this exact path exists:
   - `public_html/family-media/index.html`
10. Visit `https://clintware.com/family-media/`.

### If only the domain was purchased

A registered domain does not itself host the PHP form. Purchase or activate Namecheap Shared Hosting, or place the static page on another host and point Namecheap DNS to it. The PHP order-upload workflow in this package requires a PHP-capable host.

## Phase 4 — configure email and upload storage

1. Create or forward `studio@clintware.com` to an inbox you monitor.
2. Edit `family-media/config.php` and verify `STUDIO_EMAIL`.
3. In cPanel, confirm PHP 8.1 or newer is selected.
4. Submit a test order with one harmless test image.
5. Confirm the email notification arrives.
6. In File Manager, move one directory above `public_html` and verify the folder `clintware_private_orders` was created.
7. Confirm order images are not accessible through a public URL.
8. Delete the test order folder.

## Phase 5 — first-order fulfillment

For each order:

1. Verify the PayPal payment for paid packages.
2. Check that the purchaser used the same email on PayPal and the order form.
3. Review the consent confirmations and source images.
4. Reject or convert requests involving public figures, official university/team marks, copyrighted characters, intimate content, deception, or missing permission.
5. Create the first proof using an approved image-generation service and manual editing.
6. Add a small AI-assisted disclosure in file metadata or the delivery email.
7. Deliver the proof and collect the included revision instructions.
8. Export final JPG/PNG files and the package license.
9. Delete source and working files by the date recorded in `order.json`, normally within 30 days of delivery.
10. Record revenue, processing fee, sales tax, refund, and generation cost.

## Phase 6 — automation after proof of demand

Do not connect a secret API key to browser JavaScript. Add a server-side workflow only after the manual process has been tested.

Recommended automated flow:

1. PayPal webhook confirms successful payment.
2. Private order record is created.
3. Uploaded images and prompt are moderated.
4. Consent and prohibited-content rules are checked.
5. A server-side image API creates a low-resolution proof.
6. Customer approves or requests a permitted revision.
7. The system creates final files and emails a secure, expiring download link.
8. A scheduled deletion process removes source files and expired outputs.

Keep manual review for any request involving real-person likenesses, minors, trademarks, public figures, or ambiguous consent.

## Launch decision

The site can go public today as a **manual-review beta** after the email, PayPal links, tax registration status, and one end-to-end test are complete. Do not advertise it as instant or fully automated until the backend actually verifies payment, moderates content, generates the output, and deletes files reliably.
