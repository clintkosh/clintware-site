const BRAND = Object.freeze({
  name: "MindVergent™",
  owner: "Clintware™",
  oneLine: "A professional network where people build reputation from useful work that peers can test, improve, and verify.",
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
  <title>MindVergent™ | Professional trust from useful work</title>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});</script>
  <style>
    :root{color-scheme:dark;--bg:#070a0f;--panel:#0c1219;--line:#27323d;--text:#edf5fb;--muted:#9aabb9;--cyan:#6ed8f2;--green:#6ef2b2;--violet:#b49bff;--mono:"Cascadia Code","Segoe UI Mono",ui-monospace,monospace}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}.wrap{width:min(980px,calc(100% - 32px));margin:auto}a{color:var(--cyan);text-decoration:none}a:hover{text-decoration:underline}.top{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:18px 0;border-bottom:1px solid var(--line);font:700 11px var(--mono);letter-spacing:.04em}.top strong{color:var(--green)}.hero{padding:52px 0 36px;border-bottom:1px solid var(--line)}.eyebrow{font:700 11px var(--mono);color:var(--green);letter-spacing:.08em;text-transform:uppercase}.hero h1{font:650 clamp(29px,5vw,48px)/1.08 var(--mono);letter-spacing:-.035em;max-width:780px;margin:12px 0}.hero p{max-width:760px;color:#becbd6;font-size:18px}.button{display:inline-block;margin-top:18px;background:#0d3a32;border:1px solid #2c7764;color:#effff9;padding:10px 13px;font:700 12px var(--mono)}.section{padding:30px 0;border-bottom:1px solid var(--line)}.label{font:700 10px var(--mono);color:var(--cyan);letter-spacing:.08em;text-transform:uppercase}.section h2{font:650 23px/1.2 var(--mono);margin:7px 0 15px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.card{border:1px solid var(--line);background:var(--panel);padding:16px}.card b{display:block;font:700 12px var(--mono);color:var(--green);margin-bottom:7px}.card p{margin:0;color:#aebdca}.truth{display:grid;grid-template-columns:1fr 1fr;gap:10px}.truth .card:first-child{border-color:#3a6657}.truth .card:last-child{border-color:#4a405f}.labs{border-left:3px solid var(--violet);padding-left:16px;color:#c7d4de;max-width:800px}.footer{padding:24px 0 34px;color:var(--muted);font-size:12px;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap}.footer strong{font-family:var(--mono);color:var(--text)}
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
      <div class="eyebrow">${escapeHtml(BRAND.stage)}</div>
      <h1>Build professional trust from useful work.</h1>
      <p>${escapeHtml(BRAND.oneLine)}</p>
      <a class="button" href="${joinHref}">Join the founding group</a>
    </section>

    <section class="wrap section">
      <div class="label">What it is</div>
      <h2>Profiles say what you know. MindVergent shows why people should believe it.</h2>
      <div class="grid">
        <div class="card"><b>CONTRIBUTE</b><p>Share useful research, workflows, answers, templates, or field notes.</p></div>
        <div class="card"><b>VERIFY</b><p>Peers test, challenge, improve, and attribute specific work.</p></div>
        <div class="card"><b>TRUST</b><p>Contribution history becomes evidence of who is useful in a specific domain.</p></div>
      </div>
    </section>

    <section class="wrap section">
      <div class="label">What exists now</div>
      <h2>Start with useful knowledge and a small founding group.</h2>
      <div class="truth">
        <div class="card"><b>LIVE NOW</b><p>Public thesis, seed research, founding-member intake, and a defined contribution model.</p></div>
        <div class="card"><b>NOT BUILT YET</b><p>Formal reputation profiles, matching, marketplace features, and paid transactions. Those only get built if the trust behavior appears first.</p></div>
      </div>
    </section>

    <section class="wrap section">
      <div class="label">Labs</div>
      <h2>Labs is the research surface, not the company name.</h2>
      <p class="labs"><strong>MindVergent™ Labs</strong> is where the community publishes and tests practical work. Initial topics include AI action safeguards, Customer Success health signals that change decisions, and when repeated prompts should become workflows or products.</p>
    </section>

    <section class="wrap section">
      <div class="label">What we need to prove</div>
      <h2>Does contribution history change who people trust and work with?</h2>
      <div class="grid">
        <div class="card"><b>01</b><p>Do people return and contribute again?</p></div>
        <div class="card"><b>02</b><p>Does peer review materially improve useful work?</p></div>
        <div class="card"><b>03</b><p>Does that history lead to better collaborators, referrals, hires, pilots, or paid work?</p></div>
      </div>
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
        version: "0.2.0",
        stage: "founding-mvp",
        current: ["public-thesis", "seed-research", "founding-intake"],
        roadmap: ["discussion-layer", "contribution-profiles", "peer-validation", "matching", "commerce"]
      }), { headers: headers("application/json; charset=utf-8") });
    }
    if (url.pathname === "/manifest.json") {
      return new Response(JSON.stringify({
        name: BRAND.name,
        owner: BRAND.owner,
        one_line: BRAND.oneLine,
        stage: BRAND.stage,
        labs: "research-and-testing-surface",
        network_loop: ["contribute", "verify", "trust", "collaborate"],
        boundary: "Formal reputation, matching, and commerce remain roadmap until founding-user behavior validates the thesis."
      }), { headers: headers("application/json; charset=utf-8") });
    }
    if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    if (url.pathname !== "/" && url.pathname !== "/index.html") return new Response("Not found", { status: 404, headers: headers("text/plain; charset=utf-8") });
    return new Response(request.method === "HEAD" ? null : renderPage(url.hostname.toLowerCase()), { headers: headers("text/html; charset=utf-8") });
  }
};