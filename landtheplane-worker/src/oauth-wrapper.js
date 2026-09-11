import base from './index.js';
import { gmailClientJs } from './gmail-client.js';
import { gmailDraftJs } from './gmail-draft.js';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose'
];

const gmailSection = `
<section class="wrap section" id="gmail">
  <div class="label">Gmail evidence · OAuth MVP</div>
  <h2>Connect your Gmail. Keep the mailbox in your browser.</h2>
  <p class="lede">LandThePlane can now connect directly to a user's own Google account, scan job-search evidence in Gmail, import a reconciled evidence summary into the existing Brief Builder, and create a Gmail draft. Raw Gmail messages are not proxied through or stored by the Clintware Worker.</p>
  <div class="grid" style="margin-top:14px">
    <div class="panel">
      <h3>1. Connect Gmail</h3>
      <div id="ltpGmailMode" class="note">Checking Google OAuth configuration…</div>
      <div id="ltpClientField" class="field hidden">
        <label for="ltpGoogleClientId">Google OAuth client ID · tester fallback</label>
        <input id="ltpGoogleClientId" autocomplete="off" placeholder="1234…apps.googleusercontent.com">
        <small>This public client ID stays in this browser. Production uses the Clintware-configured OAuth client after Google verification.</small>
      </div>
      <div class="actions">
        <button class="btn primary" id="ltpConnectGmail" type="button">Connect Gmail</button>
        <button class="btn ghost" id="ltpDisconnectGmail" type="button" disabled>Disconnect</button>
      </div>
      <div id="ltpGmailStatus" class="subtle" style="margin-top:10px">Not connected.</div>
    </div>
    <div class="panel">
      <h3>2. Scan job-search evidence</h3>
      <div class="row2">
        <div class="field"><label for="ltpScanDays">Search window</label><select id="ltpScanDays"><option value="30">30 days</option><option value="90" selected>90 days</option><option value="180">180 days</option><option value="365">365 days</option></select></div>
        <div class="field"><label for="ltpMaxMessages">Maximum messages</label><select id="ltpMaxMessages"><option value="40">40</option><option value="80" selected>80</option><option value="120">120</option></select></div>
      </div>
      <div class="actions"><button class="btn" id="ltpScanGmail" type="button" disabled>Scan Gmail evidence</button><button class="btn good" id="ltpImportEvidence" type="button" disabled>Import into Brief Builder</button></div>
      <div id="ltpEvidenceSummary" class="subtle" style="margin-top:10px">Connect Gmail to scan.</div>
    </div>
  </div>
  <div class="panel" style="margin-top:12px">
    <h3>Evidence ledger</h3>
    <div class="metricrow" style="margin-top:10px">
      <div class="metric"><b id="ltpAppliedCount">0</b><span>application receipts</span></div>
      <div class="metric"><b id="ltpInterviewCount">0</b><span>interview / next-step signals</span></div>
      <div class="metric"><b id="ltpClosedCount">0</b><span>closed / rejection signals</span></div>
    </div>
    <div id="ltpEvidenceList" class="history"><div>No Gmail evidence scanned yet.</div></div>
  </div>
  <div class="grid" style="margin-top:12px">
    <div class="panel">
      <h3>3. Create a Gmail draft</h3>
      <div class="field"><label for="ltpDraftTo">Recipient</label><input id="ltpDraftTo" type="email" placeholder="you@example.com"></div>
      <div class="field"><label for="ltpDraftSubject">Subject</label><input id="ltpDraftSubject" value="LandThePlane ASTRO field report"></div>
      <div class="actions"><button class="btn primary" id="ltpCreateDraft" type="button" disabled>Create + verify Gmail draft</button></div>
      <div id="ltpDraftStatus" class="subtle" style="margin-top:10px">Uses the current Brief Builder fields. Final sending remains user-controlled.</div>
    </div>
    <div class="panel">
      <h3>Privacy boundary</h3>
      <ul class="muted">
        <li>OAuth access token stays in JavaScript memory for the active page session.</li>
        <li>Gmail API calls go from the browser directly to Google.</li>
        <li>LandThePlane does not mirror raw Gmail messages into a Clintware database.</li>
        <li>Draft creation is enabled; autonomous sending is not part of this MVP.</li>
        <li>Restricted Gmail scopes still require Google's production verification before Clintware can offer one shared OAuth client broadly.</li>
      </ul>
    </div>
  </div>
</section>`;

function expandedCsp() {
  return "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: blob: https://www.google-analytics.com https://lh3.googleusercontent.com; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://accounts.google.com https://oauth2.googleapis.com https://gmail.googleapis.com https://www.googleapis.com; frame-src https://accounts.google.com; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' https://accounts.google.com";
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/google-config') {
      return json({
        clientId: (env && env.GOOGLE_OAUTH_CLIENT_ID) || '',
        configured: Boolean(env && env.GOOGLE_OAUTH_CLIENT_ID),
        mode: env && env.GOOGLE_OAUTH_CLIENT_ID ? 'production-client' : 'tester-byo-client',
        gmailScopes: GMAIL_SCOPES
      });
    }

    const response = await base.fetch(request, env, ctx);
    if (url.pathname !== '/' || request.method === 'HEAD' || !String(response.headers.get('content-type') || '').includes('text/html')) return response;

    let html = await response.text();
    if (!html.includes('href="#gmail"')) html = html.replace('<a href="#product">Lifecycle</a>', '<a href="#gmail">Gmail</a><a href="#product">Lifecycle</a>');
    if (!html.includes('id="gmail"')) html = html.replace('</main>', gmailSection + '</main>');
    if (!html.includes('ltp_gmail_mvp_view')) {
      html = html.replace('</body>', '<script src="https://accounts.google.com/gsi/client" async defer></script><script>' + gmailClientJs + '</script><script>' + gmailDraftJs + '</script></body>');
    }

    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', expandedCsp());
    headers.set('Cache-Control', 'no-store');
    headers.set('X-LandThePlane-Gmail-MVP', 'browser-direct-oauth-v1');
    return new Response(html, { status: response.status, headers });
  }
};
