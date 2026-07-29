# Clintware PayPal setup

## What is already implemented

- Paid package buttons default to **Request PayPal invoice**.
- The order form records the customer email to use for the PayPal invoice.
- Paid order records start with `payment_status: invoice_not_sent`.
- Production instructions require payment verification before work begins.
- No PayPal password, Client Secret, access token, or API credential is stored in the website.
- Optional PayPal-hosted Payment Links can be enabled without changing the HTML.

## Default connected-account workflow

1. Customer submits a paid order.
2. Clintware reviews consent, safety, scope, and package selection.
3. Create a PayPal invoice using:
   - Business: **Clintware**
   - Customer email: the email in `order.json`
   - Product: package name
   - Amount: package price plus applicable tax
   - Note: include the Clintware order ID
4. Send the invoice.
5. Update the private order record to `invoice_sent`.
6. Verify the PayPal invoice is paid before production.
7. Update the order record to `paid` and record the PayPal invoice/transaction ID.

The connected ChatGPT PayPal tool can create and send invoices when a real customer name, email, package, amount, and due date are available.

## Optional direct PayPal links

Create PayPal-hosted Payment Links for:

| Key | Product | Price |
|---|---|---:|
| `mini` | Portrait Mini | $29 |
| `studio` | Studio Session | $79 |
| `creator` | Brand & Creator Session | $179 |

Paste only the public URLs into:

`family-media/assets/js/paypal-config.js`

When a URL exists, the matching button automatically changes from invoice request to **Pay securely with PayPal**. Never paste a password, Client Secret, API secret, or private credential into that file.

## Important limitation

The currently connected PayPal capability exposes invoice creation and sending. It does not expose account settings, merchant identity, Payment Link creation, subscription creation, webhooks, or API credentials. Those dashboard-only actions remain manual until a connector with those permissions is available.
