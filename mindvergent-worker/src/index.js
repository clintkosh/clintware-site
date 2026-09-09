const BRAND = Object.freeze({
  name: "MindVergent™ Labs",
  owner: "Clintware™",
  thesis: "A peer-vetted knowledge and collaboration network for people who think across disciplines, share what works, improve it together, and earn trust through useful contribution.",
  stage: "Founding community MVP"
});

const GA_ID = "G-DCY144YM9P";

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[c]);
}

function headers(type) {
  return {
    "Content-Type": type,
    "Cache-Control": "public, max-age=300",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; base-uri 'none'; frame-ancestors 'none'; form-action 'self' mailto:",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  };
}

function renderPage(hostname) {
  const canonical = `https://${hostname}/`;
  const joinHref = "mailto:clint.kosh@gmail.com?subject=MindVergent%E2%84%A2%20Labs%20-%20Founding%20Member&body=Name%3A%0AWhat%20I%20build%20or%20work%20on%3A%0AWhat%20I%20can%20contribute%3A%0AWhat%20I%20want%20to%20learn%20or%20find%3A%0A";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${escapeHtml(BRAND.thesis)}">
  <link rel="canonical" href="${canonical}">
  <meta name="theme-color" content="#070a0f">
  <title>MindVergent™ Labs | by Clintware™</title>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});</script>
  <style>
    :root{color-scheme:dark;--bg:#070a0f;--panel:#0b1017;--panel2:#0e151d;--line:#25303c;--text:#edf5fb;--muted:#93a6b7;--cyan:#6ed8f2;--green:#6ef2b2;--violet:#b49bff;--amber:#f4c56a;--mono:"Cascadia Code","Segoe UI Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 86% 4%,rgba(110,216,242,.07),transparent 26rem),radial-gradient(circle at 12% 36%,rgba(180,155,255,.045),transparent 23rem),var(--bg);color:var(--text);font:14px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}.wrap{width:min(1080px,calc(100% - 32px));margin:auto}a{color:var(--cyan);text-decoration:none}a:hover{text-decoration:underline}.top{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:18px 0;border-bottom:1px solid var(--line);font:700 11px/1.4 var(--mono);letter-spacing:.04em}.nav{display:flex;gap:18px;flex-wrap:wrap}.brand{color:var(--text)}.brand span{color:var(--green)}.hero{padding:46px 0 30px;border-bottom:1px solid var(--line)}.eyebrow{font:700 11px var(--mono);color:var(--green);letter-spacing:.08em;text-transform:uppercase}.hero h1{font:650 clamp(27px,4.8vw,48px)/1.06 var(--mono);letter-spacing:-.035em;max-width:900px;margin:12px 0 14px}.hero p{max-width:820px;color:#b8c6d2;font-size:16px;margin:0}.principle{margin-top:22px;border-left:3px solid var(--violet);padding:10px 0 10px 15px;color:#dce7ef;max-width:820px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}.button{display:inline-block;border:1px solid #2c7764;background:#0d3a32;color:#edfff8;padding:10px 13px;font:700 12px var(--mono)}.button.secondary{background:#0b1219;border-color:#354655;color:#dbe8f1}.section{padding:30px 0;border-bottom:1px solid var(--line)}.section-head{display:grid;grid-template-columns:190px 1fr;gap:24px;margin-bottom:20px}.section-label{font:700 11px var(--mono);color:var(--cyan);letter-spacing:.08em;text-transform:uppercase}.section h2{font:650 clamp(20px,3vw,30px)/1.16 var(--mono);margin:0 0 7px}.section-intro{margin:0;color:var(--muted);max-width:740px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.panel{background:linear-gradient(180deg,var(--panel),#091018);border:1px solid var(--line);padding:17px}.panel .meta{font:700 10px var(--mono);color:var(--green);letter-spacing:.06em;text-transform:uppercase}.panel h3{font:650 15px/1.35 var(--mono);margin:8px 0}.panel p{margin:0;color:#aebdca}.flow{display:grid;grid-template-columns:repeat(6,1fr);gap:7px}.step{min-height:105px;background:var(--panel2);border:1px solid var(--line);padding:12px}.step b{display:block;font:700 11px var(--mono);color:var(--cyan);margin-bottom:7px}.step span{color:#a9bac7;font-size:12px}.split{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}.list{margin:0;padding-left:18px;color:#b8c6d2}.list li{margin:7px 0}.truth{border:1px solid #475363;background:#0b1118;padding:18px}.truth b{font:700 11px var(--mono);color:var(--amber);text-transform:uppercase}.truth p{margin:8px 0 0;color:#bac8d4}.discussion{display:grid;gap:9px}.topic{display:grid;grid-template-columns:150px 1fr;gap:14px;padding:13px;border:1px solid var(--line);background:#091018}.topic .tag{font:700 10px var(--mono);color:var(--violet);text-transform:uppercase}.topic strong{font:650 13px var(--mono)}.topic p{margin:4px 0 0;color:var(--muted)}.footer{padding:24px 0 34px;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;color:var(--muted);font-size:12px}.footer strong{font-family:var(--mono);color:var(--text)}
    @media(max-width:820px){.section-head{grid-template-columns:1fr;gap:5px}.grid{grid-template-columns:1fr}.flow{grid-template-columns:repeat(2,1fr)}.split{grid-template-columns:1fr}.topic{grid-template-columns:1fr}.top{align-items:flex-start;flex-direction:column}.nav{gap:12px}}
    @media(max-width:520px){.flow{grid-template-columns:1fr}.hero{padding-top:32px}.actions{flex-direction:column}.button{text-align:center}}
  </style>
</head>
<body>
  <header class="wrap top">
    <a class="brand" href="/"><span>MindVergent™ Labs</span> / BY CLINTWARE™</a>
    <nav class="nav" aria-label="Primary">
      <a href="#model">Model</a><a href="#research">Research</a><a href="#community">Community</a><a href="#roadmap">Roadmap</a>
    </nav>
  </header>

  <main>
    <section class="wrap hero">
      <div class="eyebrow">${escapeHtml(BRAND.stage)} · Community + knowledge network</div>
      <h1>Different ways of thinking become more useful when the work can be shared, tested, and improved.</h1>
      <p>${escapeHtml(BRAND.thesis)}</p>
      <div class="principle"><strong>Initial thesis:</strong> professional trust should come from useful work and peer evidence, not only self-description. The first version starts with living research, practical discussions, reusable artifacts, and a deliberately small founding cohort.</div>
      <div class="actions">
        <a class="button" href="${joinHref}">Request founding access</a>
        <a class="button secondary" href="#research">See the seed topics</a>
      </div>
    </section>

    <section class="wrap section" id="model">
      <div class="section-head"><div class="section-label">01 / Network model</div><div><h2>Knowledge first. Trust follows contribution.</h2><p class="section-intro">The long-term product is not a Discord server. It is a contribution and reputation network with community discussion as the starting surface.</p></div></div>
      <div class="flow">
        <div class="step"><b>RESEARCH</b><span>Useful, searchable practical work brings people in before the network is large.</span></div>
        <div class="step"><b>DISCUSS</b><span>Members question assumptions, add context, and compare real outcomes.</span></div>
        <div class="step"><b>CONTRIBUTE</b><span>People add workflows, prompts, templates, code, methods, and field notes.</span></div>
        <div class="step"><b>VALIDATE</b><span>Peers test, improve, challenge, and attribute what actually helped.</span></div>
        <div class="step"><b>TRUST</b><span>Reputation forms around visible contribution and specific domains of expertise.</span></div>
        <div class="step"><b>COLLABORATE</b><span>Trusted members find collaborators, pilots, projects, services, and eventually commerce.</span></div>
      </div>
    </section>

    <section class="wrap section" id="research">
      <div class="section-head"><div class="section-label">02 / Seed research</div><div><h2>Start useful before trying to look large.</h2><p class="section-intro">The founding version is intentionally seeded with practical research and working questions. These are discussion starters, not claims of community consensus.</p></div></div>
      <div class="grid">
        <article class="panel"><div class="meta">AI systems</div><h3>When a valid agent action is still the wrong action</h3><p>Explore intent boundaries, deterministic approval gates, and why tool correctness is different from decision correctness.</p></article>
        <article class="panel"><div class="meta">Customer Success</div><h3>Which customer-health signals deserve action?</h3><p>Separate useful intervention signals from dashboards that create activity without changing retention outcomes.</p></article>
        <article class="panel"><div class="meta">Workflow design</div><h3>From prompt to reusable operating workflow</h3><p>Identify when a prompt should remain personal, become a shared artifact, or graduate into a repeatable system.</p></article>
      </div>
    </section>

    <section class="wrap section" id="community">
      <div class="section-head"><div class="section-label">03 / Founding community</div><div><h2>A small room with a reason to exist.</h2><p class="section-intro">The first members should be people who can both learn and contribute. Membership is broader than founders: builders, operators, Customer Success practitioners, technical people, researchers, product thinkers, and specialists all belong if they make the room more useful.</p></div></div>
      <div class="split">
        <div class="panel">
          <div class="meta">Founding principles</div>
          <ul class="list">
            <li>Useful contribution beats performative expertise.</li>
            <li>Specific evidence beats generic authority.</li>
            <li>Challenge ideas without making the room hostile.</li>
            <li>Give attribution when someone improves your work.</li>
            <li>Commercial interests are allowed; undisclosed promotion is not.</li>
            <li>Different working styles and ways of thinking are part of the design, not an exception.</li>
          </ul>
        </div>
        <div class="truth"><b>What exists today</b><p>This is the founding community MVP. The public site and initial research surface are live first. Founding membership and discussion are being assembled manually. Peer reputation, searchable member profiles, artifact versioning, formal validation states, matching, and commerce are roadmap items until they are actually built and tested.</p></div>
      </div>
    </section>

    <section class="wrap section">
      <div class="section-head"><div class="section-label">04 / Founding discussions</div><div><h2>Questions worth comparing notes on.</h2><p class="section-intro">The first discussion set is intentionally practical and cross-disciplinary.</p></div></div>
      <div class="discussion">
        <div class="topic"><div class="tag">Agentic AI</div><div><strong>Where should probabilistic reasoning end and deterministic control begin?</strong><p>Share patterns for approvals, permissions, reversible actions, and external side effects.</p></div></div>
        <div class="topic"><div class="tag">Building</div><div><strong>What did you build recently that taught you something the documentation did not?</strong><p>Short field notes are welcome. The lesson matters more than polish.</p></div></div>
        <div class="topic"><div class="tag">Operations</div><div><strong>Which workflow are you still doing manually because existing software misses the real problem?</strong><p>Potential source material for experiments, collaborators, and new products.</p></div></div>
        <div class="topic"><div class="tag">Peer review</div><div><strong>What would make an online professional recommendation actually trustworthy?</strong><p>Help define the evidence model before reputation features are built.</p></div></div>
      </div>
    </section>

    <section class="wrap section" id="roadmap">
      <div class="section-head"><div class="section-label">05 / What must be proven</div><div><h2>The network thesis is only valuable if contribution changes behavior.</h2><p class="section-intro">The next milestones are learning milestones, not vanity metrics.</p></div></div>
      <div class="grid">
        <div class="panel"><div class="meta">Signal 01</div><h3>Repeat contribution</h3><p>Do founding members come back to answer, improve, test, or share something useful without being chased?</p></div>
        <div class="panel"><div class="meta">Signal 02</div><h3>Trust transfer</h3><p>Does contribution history help someone decide who to ask, hire, test with, refer, or collaborate with?</p></div>
        <div class="panel"><div class="meta">Signal 03</div><h3>Natural transactions</h3><p>Do projects, referrals, pilots, services, or paid artifacts emerge from existing trust before a marketplace is forced onto the community?</p></div>
      </div>
    </section>
  </main>

  <footer class="wrap footer">
    <div><strong>MindVergent™ Labs</strong><br>Incubated by Clintware™ — GO FURTHEST.™</div>
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
        version: "0.1.0",
        stage: "founding-community-mvp",
        current: ["public-thesis", "seed-research", "founding-intake"],
        roadmap: ["discussion-layer", "artifact-library", "peer-validation", "reputation-profiles", "matching", "commerce"]
      }), { headers: headers("application/json; charset=utf-8") });
    }
    if (url.pathname === "/manifest.json") {
      return new Response(JSON.stringify({
        name: BRAND.name,
        owner: BRAND.owner,
        thesis: BRAND.thesis,
        stage: BRAND.stage,
        network_loop: ["research", "discuss", "contribute", "validate", "trust", "collaborate"],
        boundary: "Only the public thesis, seed research surface, and founding-member intake are current. Reputation, matching, and commerce remain roadmap until validated."
      }), { headers: headers("application/json; charset=utf-8") });
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    if (url.pathname !== "/" && url.pathname !== "/index.html") {
      return new Response("Not found", { status: 404, headers: headers("text/plain; charset=utf-8") });
    }
    return new Response(request.method === "HEAD" ? null : renderPage(url.hostname.toLowerCase()), {
      headers: headers("text/html; charset=utf-8")
    });
  }
};