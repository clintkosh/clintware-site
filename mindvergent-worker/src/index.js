const BRAND = Object.freeze({
  name: "MindVergent™",
  owner: "Clintware™",
  oneLine: "MindVergent is building a professional network where reputation comes from work other people can test, improve, and verify.",
  stage: "Founding MVP"
});

const GA_ID = "G-DCY144YM9P";

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
}

function headers(type) {
  return {
    "Content-Type": type,
    "Cache-Control": "public, max-age=300",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'unsafe-inline'; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; base-uri 'none'; frame-ancestors 'none'; form-action 'self' mailto:",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  };
}

function renderPage(hostname) {
  const canonical = `https://${hostname}/`;
  const joinHref = "mailto:clint.kosh@gmail.com?subject=MindVergent%E2%84%A2%20Founding%20Member&body=Name%3A%0AWhat%20I%20build%20or%20work%20on%3A%0AWhat%20I%20can%20contribute%3A%0AWhat%20I%20want%20to%20learn%20or%20find%3A%0A";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${escapeHtml(BRAND.oneLine)}">
  <link rel="canonical" href="${canonical}">
  <meta name="theme-color" content="#070a0f">
  <title>MindVergent™ | Reputation from useful work</title>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});</script>
  <style>
    :root{color-scheme:dark;--bg:#070a0f;--panel:#0c1219;--line:#27323d;--text:#edf5fb;--muted:#9aabb9;--cyan:#6ed8f2;--green:#6ef2b2;--violet:#b49bff;--mono:"Cascadia Code","Segoe UI Mono",ui-monospace,monospace}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}.wrap{width:min(960px,calc(100% - 32px));margin:auto}a{color:var(--cyan);text-decoration:none}a:hover{text-decoration:underline}.top{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:18px 0;border-bottom:1px solid var(--line);font:700 11px var(--mono);letter-spacing:.04em}.top strong{color:var(--green)}.hero{padding:50px 0 34px;border-bottom:1px solid var(--line)}.eyebrow{font:700 11px var(--mono);color:var(--green);letter-spacing:.08em;text-transform:uppercase}.hero h1{font:650 clamp(30px,5vw,48px)/1.08 var(--mono);letter-spacing:-.035em;max-width:760px;margin:12px 0}.hero p{max-width:760px;color:#becbd6;font-size:18px}.button{display:inline-block;margin-top:18px;background:#0d3a32;border:1px solid #2c7764;color:#effff9;padding:10px 13px;font:700 12px var(--mono)}.section{padding:28px 0;border-bottom:1px solid var(--line)}.label{font:700 10px var(--mono);color:var(--cyan);letter-spacing:.08em;text-transform:uppercase}.section h2{font:650 23px/1.2 var(--mono);margin:7px 0 14px}.section>p{max-width:800px;color:#b8c6d2;margin:0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:15px}.card{border:1px solid var(--line);background:var(--panel);padding:16px}.card b{display:block;font:700 12px var(--mono);color:var(--green);margin-bottom:7px}.card p{margin:0;color:#aebdca}.truth{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px}.truth .card:first-child{border-color:#3a6657}.truth .card:last-child{border-color:#4a405f}.labs{border-left:3px solid var(--violet);padding-left:16px;color:#c7d4de;max-width:800px}.signal{font:650 18px/1.45 var(--mono);max-width:800px;color:#dce7ef}.footer{padding:24px 0 34px;color:var(--muted);font-size:12px;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap}.footer strong{font-family:var(--mono);color:var(--text)}
    @media(max-width:720px){.grid,.truth{grid-template-columns:1fr}.top{align-items:flex-start;flex-direction:column}.hero{padding-top:34px}}
  </style>
</head>
<body>
  <header class="wrap top">
    <a href="/"><strong>MINDVERGENT™</strong> / BY CLINTWARE™</a>
    <a href="${joinHref}">FOUNDING ACCESS</a>
  </header>

  <main>
    <section class="wrap hero">
      <div class="eyebrow">${escapeHtml(BRAND.stage)} · first cohort forming</div>
      <h1>Build reputation from work, not claims.</h1>
      <p>${escapeHtml(BRAND.oneLine)}</p>
      <a class="button" href="${joinHref}">Join the founding group</a>
    </section>

    <section class="wrap section">
      <div class="label">Problem</div>
      <h2>Professional reputation is mostly self-reported.</h2>
      <p>Profiles show titles and claims. Communities contain useful knowledge but rarely turn it into durable professional proof. Marketplaces usually create ratings only after someone has already taken the risk of hiring. MindVergent starts with the work itself.</p>
    </section>

    <section class="wrap section">
      <div class="label">Product loop</div>
      <h2>Contribution becomes evidence.</h2>
      <div class="grid">
        <div class="card"><b>CONTRIBUTE</b><p>Share research, workflows, answers, templates, experiments, or other useful work.</p></div>
        <div class="card"><b>VALIDATE</b><p>Peers test it, challenge it, improve it, or confirm where it worked.</p></div>
        <div class="card"><b>REPUTATION</b><p>Those attributed interactions become evidence of who is useful for what.</p></div>
      </div>
    </section>

    <section class="wrap section">
      <div class="label">Built now</div>
      <h2>Start useful before trying to look large.</h2>
      <div class="truth">
        <div class="card"><b>LIVE</b><p>Public product page, founding-member intake, three seed research briefs, and the operating model for the first manually recruited cohort.</p></div>
        <div class="card"><b>NOT BUILT YET</b><p>Formal contribution profiles, peer-validation scoring, matching, and commerce. Those only get built if founding-member behavior validates the thesis.</p></div>
      </div>
    </section>

    <section class="wrap section">
      <div class="label">MindVergent™ Labs</div>
      <h2>The first research surface.</h2>
      <p class="labs">Labs seeds practical work that is useful before the network is large. The first briefs cover AI action safeguards, Customer Success health signals that change decisions, and when repeated prompts should become workflows or products.</p>
    </section>

    <section class="wrap section">
      <div class="label">Why now</div>
      <h2>AI makes useful work cheaper to produce. It also makes convincing-looking expertise cheaper to produce.</h2>
      <p class="signal">As creation gets easier, trusted evidence of what worked, who tested it, and who repeatedly helped becomes more valuable.</p>
    </section>

    <section class="wrap section">
      <div class="label">What we need to prove</div>
      <h2>Does contribution history change who people choose to work with?</h2>
      <div class="grid">
        <div class="card"><b>01 · REPEAT</b><p>Do members come back and make another substantive contribution?</p></div>
        <div class="card"><b>02 · TRUST</b><p>Does specific contribution history change who another member asks for help?</p></div>
        <div class="card"><b>03 · COLLABORATE</b><p>Does that trust create better referrals, hires, pilots, projects, or paid work?</p></div>
      </div>
      <p style="margin-top:15px">If those behaviors appear, the long-term product is a trust graph connecting people, work, peer validation, and outcomes. If they do not, we do not force a marketplace onto it.</p>
    </section>
  </main>

  <footer class="wrap footer">
    <div><strong>MindVergent™</strong><br>Incubated by Clintware™ — GO FURTHEST.™</div>
    <div><a href="https://www.clintware.com/">Clintware™</a> · <a href="${joinHref}">Founding access</a></div>
  </footer>
</body>
</html>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") {
      return new Response(JSON.stringify({
        service: BRAND.name,
        status: "ok",
        version: "0.3.0",
        stage: "founding-mvp",
        current: ["public-product-page", "seed-research", "founding-intake", "founding-cohort-operating-model"],
        roadmap: ["contribution-profiles", "peer-validation", "matching", "commerce"]
      }), { headers: headers("application/json; charset=utf-8") });
    }
    if (url.pathname === "/manifest.json") {
      return new Response(JSON.stringify({
        name: BRAND.name,
        owner: BRAND.owner,
        one_line: BRAND.oneLine,
        stage: BRAND.stage,
        labs: "research-and-testing-surface",
        network_loop: ["contribute", "validate", "reputation", "collaborate"],
        boundary: "Formal contribution profiles, peer-validation scoring, matching, and commerce remain roadmap until founding-user behavior validates the thesis."
      }), { headers: headers("application/json; charset=utf-8") });
    }
    if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    if (url.pathname !== "/" && url.pathname !== "/index.html") return new Response("Not found", { status: 404, headers: headers("text/plain; charset=utf-8") });
    return new Response(request.method === "HEAD" ? null : renderPage(url.hostname.toLowerCase()), { headers: headers("text/html; charset=utf-8") });
  }
};