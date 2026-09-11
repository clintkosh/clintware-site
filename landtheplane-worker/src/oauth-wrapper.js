import base from './index.js';

const gmailSection = `
<section class="wrap section" id="gmail">
  <div class="label">Gmail evidence · OAuth MVP</div>
  <h2>Connect your Gmail. Keep the mailbox in your browser.</h2>
  <p class="lede">LandThePlane can connect directly to a user's own Google account, reconcile job-search evidence, and prepare a user-reviewed Gmail draft without mirroring the mailbox into a Clintware database.</p>
  <div class="panel" style="margin-top:14px">
    <div class="status">GMAIL OAUTH MVP · BROWSER-DIRECT</div>
    <p class="muted">OAuth connection controls are loading.</p>
    <div id="ltpGmailMount"></div>
  </div>
</section>`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/google-config') {
      return json({clientId:(env && env.GOOGLE_OAUTH_CLIENT_ID)||'',configured:Boolean(env && env.GOOGLE_OAUTH_CLIENT_ID)});
    }
    const response = await base.fetch(request, env, ctx);
    if (url.pathname !== '/' || request.method === 'HEAD' || !String(response.headers.get('content-type')||'').includes('text/html')) return response;
    let html = await response.text();
    if (!html.includes('id="gmail"')) html = html.replace('</main>', gmailSection + '</main>');
    const headers = new Headers(response.headers);
    headers.set('Cache-Control','no-store');
    headers.set('X-LandThePlane-Gmail-MVP','browser-direct-oauth-v1');
    return new Response(html,{status:response.status,headers});
  }
};
