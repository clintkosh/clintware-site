# Clintware Analytics Command Center

Private portfolio dashboard for the professional Clintware CRM properties at
`https://stats.clintware.com`.

## What is live without Google read credentials

- Server-validated password gate
- Shared GA4 measurement ID and virtual-path coverage inventory
- Live hostname availability and response latency for every CRM
- CSV export of the current portfolio state
- Five-minute refresh while the dashboard remains open

## GA4 reporting connection

The public measurement ID can collect events but cannot read reports. To show
active users, sessions, page views, the 30-day trend, and top pages, configure
these Worker secrets:

- `GA_PROPERTY_ID`: the numeric GA4 property ID, without `properties/`
- `GA_CLIENT_EMAIL`: a Google service-account email with Viewer access to the property
- `GA_PRIVATE_KEY`: the service account PKCS#8 private key

The Worker exchanges a short-lived signed JWT for the read-only
`analytics.readonly` scope and calls the official GA4 Data API. No credentials
are sent to the browser.

## Security model

The requested password is represented only by a salted PBKDF2-SHA256 verifier
with 240,000 iterations. A successful native HTTPS form login creates a random,
12-hour edge session identified by an HttpOnly, Secure, SameSite=Strict cookie.
The plaintext password is never embedded in page source, browser storage, or a
URL. Dashboard responses are never cached, the page is marked noindex, and
framing is blocked.

## Local checks

```sh
npm install
npm run validate
```
