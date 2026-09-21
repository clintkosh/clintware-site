import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');

const required = [
  "https://api.pwnedpasswords.com",
  "'Add-Padding':'true'",
  "digestHex('SHA-1',password)",
  "hash.slice(0,5)",
  "digestHex('SHA-256',text)",
  "profileSnapshots",
  "report_intake_reviewed",
  "broker_query_pack_built",
  "pwned-passwords-k-anonymity",
  "connect-src 'self' https://api.pwnedpasswords.com",
];

for (const marker of required) {
  if (!src.includes(marker)) {
    throw new Error('Missing Background Mirror connector contract marker: ' + marker);
  }
}

const forbidden = [
  "hibp-api-key",
  "/api/v3/breachedaccount/",
  "EXA_API_KEY",
  "research.invoke",
];

for (const marker of forbidden) {
  if (src.includes(marker)) {
    throw new Error('Forbidden identity-bearing/server connector marker present: ' + marker);
  }
}

if (!src.includes("body:JSON.stringify({action:action})")) {
  throw new Error('Telemetry event payload must remain action-only at the browser boundary.');
}

console.log(JSON.stringify({
  status: 'PASS',
  contracts: [
    'pwned-passwords-k-anonymity',
    'profile-fingerprint-only',
    'local-report-intake',
    'action-only-telemetry',
    'no-authenticated-email-breach-proxy'
  ]
}, null, 2));
