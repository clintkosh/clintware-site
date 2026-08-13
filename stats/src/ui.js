import { GA_MEASUREMENT_ID } from "./config.js";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function serializedPayload(payload) {
  return JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function dashboardHtml(nonce, options = {}) {
  const payload = options.payload || null;
  const loginError = escapeHtml(options.loginError || "");
  const pagePath = payload ? "/stats/dashboard" : "/stats/login";
  const initialData = payload
    ? `<script nonce="${nonce}">window.__CLINTWARE_STATS_DATA__=${serializedPayload(payload)};</script>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="theme-color" content="#07090d">
  <meta name="description" content="Private Clintware CRM analytics and availability dashboard.">
  <title>Clintware Analytics Command Center</title>
  <link rel="preconnect" href="https://www.googletagmanager.com">
  <link rel="stylesheet" href="/styles.css">
  <script nonce="${nonce}" async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script nonce="${nonce}">window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{anonymize_ip:true,page_path:'${pagePath}',demo_name:'clintware_analytics_command_center'});</script>
  ${initialData}
  <script src="/app.js" defer></script>
</head>
<body>
  <header class="shell topbar">
    <div class="brand" aria-label="Clintware">
      <div class="brand-mark" aria-hidden="true">CW</div>
      <div class="brand-word">CLINT<span>WARE</span></div>
    </div>
    <div class="private-pill">Private analytics</div>
  </header>

  <main id="login-view" class="shell login-wrap${payload ? " hidden" : ""}">
    <section class="login-grid" aria-labelledby="login-title">
      <div class="login-story">
        <div class="eyebrow">Portfolio intelligence</div>
        <h1>Every CRM.<br>One signal.</h1>
        <p>Live availability, verified GA4 path coverage, and traffic performance across the professional Clintware CRM portfolio.</p>
        <div class="signal-list" aria-label="Dashboard capabilities">
          <div class="signal"><b>✓</b> Shared GA4 measurement</div>
          <div class="signal"><b>✓</b> Route-level page views</div>
          <div class="signal"><b>✓</b> Live hostname checks</div>
          <div class="signal"><b>✓</b> 30-day reporting view</div>
        </div>
      </div>
      <div class="login-panel">
        <div class="private-pill">Clint Ware access</div>
        <h2 id="login-title">Open the command center</h2>
        <p>The analytics data and portfolio details remain behind server-validated password access.</p>
        <form id="login-form" action="/login" method="post" autocomplete="on">
          <label for="stats-password">Dashboard password</label>
          <div class="password-row">
            <input id="stats-password" name="password" type="password" autocomplete="current-password" maxlength="128" required>
            <button id="reveal-password" class="reveal" type="button" aria-label="Show or hide password">Show</button>
          </div>
          <button id="login-button" class="primary" type="submit">Open analytics dashboard</button>
          <div id="login-error" class="form-error" role="alert" aria-live="polite">${loginError}</div>
        </form>
        <div class="fine-print">Password verification happens on the Cloudflare edge. The plaintext password is not embedded in this page or in the source repository.</div>
      </div>
    </section>
  </main>

  <main id="dashboard-view" class="shell dashboard${payload ? "" : " hidden"}">
    <section class="dash-head">
      <div>
        <div class="eyebrow">Clintware portfolio intelligence</div>
        <h1>Analytics command center</h1>
        <p id="last-refresh">Preparing the latest portfolio status…</p>
      </div>
      <div class="actions">
        <a id="export-button" class="secondary" href="/export.csv"><span aria-hidden="true">↓</span><span>Export CSV</span></a>
        <a id="refresh-button" class="secondary" href="/"><span class="refresh-icon" aria-hidden="true">↻</span><span>Refresh</span></a>
        <form class="logout-form" action="/logout" method="post"><button id="logout-button" class="ghost" type="submit">Lock</button></form>
      </div>
    </section>

    <aside id="reporting-notice" class="notice hidden">
      <span class="dot" aria-hidden="true"></span>
      <div><strong>GA4 collection is matched. Reporting access is separate.</strong><span id="reporting-message"></span></div>
    </aside>

    <section class="metrics" aria-label="Portfolio summary">
      <article class="metric metric-cyan">
        <div class="metric-label">Active CRMs</div>
        <div id="metric-crms" class="metric-value skeleton">00</div>
        <div class="metric-note">Professional portfolio</div>
      </article>
      <article class="metric metric-green">
        <div class="metric-label">Tracking coverage</div>
        <div id="metric-coverage" class="metric-value skeleton">000%</div>
        <div class="metric-note">Shared ${GA_MEASUREMENT_ID}</div>
      </article>
      <article class="metric metric-violet">
        <div class="metric-label">Live now</div>
        <div id="metric-live" class="metric-value skeleton">0/0</div>
        <div class="metric-note">Current hostname checks</div>
      </article>
      <article class="metric metric-amber">
        <div class="metric-label">Page views</div>
        <div id="metric-views" class="metric-value skeleton">Ready</div>
        <div id="metric-views-note" class="metric-note">Last 30 days</div>
      </article>
    </section>

    <section class="grid">
      <article class="panel">
        <div class="panel-head">
          <div><h2>Traffic trend</h2><div class="panel-sub">Daily GA4 page views · rolling 30 days</div></div>
          <div id="metric-users" class="tag">Loading</div>
        </div>
        <div id="chart" class="chart"><div class="chart-empty">Loading the portfolio signal…</div></div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <div><h2>Top tracked pages</h2><div class="panel-sub">Normalized virtual page paths</div></div>
        </div>
        <div id="top-pages" class="top-pages"><div class="chart-empty">Loading…</div></div>
      </article>
    </section>

    <section class="panel portfolio">
      <div class="panel-head">
        <div><h2>CRM tracking coverage</h2><div class="panel-sub">One measurement ID, distinct namespaces, live availability</div></div>
        <div class="status-pill">Source verified</div>
      </div>
      <div class="table-head" aria-hidden="true"><span>CRM property</span><span>GA4 namespace</span><span>Audited surface</span><span>Live status</span><span class="align-right">Traffic</span></div>
      <div id="portfolio-rows" aria-live="polite"></div>
    </section>
  </main>

  <footer class="shell footer">
    <span>Private Clintware operations view · no customer production data</span>
    <span>GA4 ${GA_MEASUREMENT_ID} · health refreshes every 5 minutes while open</span>
  </footer>
</body>
</html>`;
}
