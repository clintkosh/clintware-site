const DESIGN = Object.freeze({
  font: '"Cascadia Code","Cascadia Mono","Segoe UI Mono",SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace',
  h1Desktop: "24px",
  h1Mobile: "20px",
  h2Desktop: "18px",
  h2Mobile: "16px"
});

const PRODUCT = Object.freeze({
  company: "COMPANY_NAME",
  name: "PRODUCT_NAME",
  headline: "State exactly what the product does.",
  lede: "Explain the user problem, what changes, and what is available today.",
  status: "Early build",
  points: [
    ["Capability one", "Describe one concrete capability."],
    ["Capability two", "Describe another concrete capability."],
    ["Capability three", "Describe a third capability or current limitation."]
  ],
  footer: "State the product thesis or current boundary in one sentence.",
  companyUrl: "COMPANY_URL",
  contactUrl: "CONTACT_URL"
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[ch]);
}

function renderPage(hostname) {
  const cards = PRODUCT.points.map(([title, body], index) => `
    <article class="card"><span class="num">0${index + 1}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></article>`
  ).join("");
  const canonical = `https://${hostname}/`;

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${escapeHtml(PRODUCT.lede)}"><link rel="canonical" href="${canonical}">
<meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(PRODUCT.name)}"><meta property="og:description" content="${escapeHtml(PRODUCT.headline)}"><meta property="og:url" content="${canonical}">
<meta name="theme-color" content="#070a0f"><title>${escapeHtml(PRODUCT.name)}</title>
<style>
:root{color-scheme:dark;--bg:#070a0f;--panel:#0b1017;--line:#25303c;--text:#edf5fb;--muted:#94a7b8;--accent:#6ef2b2;--font:${DESIGN.font}}
*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.62 var(--font)}a{color:inherit}.wrap{width:min(1040px,calc(100% - 36px));margin:auto}.top{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:18px 0;border-bottom:1px solid var(--line);font-size:11px}.hero{padding:46px 0 30px}.eyebrow,.status{color:var(--accent);font-size:11px;letter-spacing:.08em;text-transform:uppercase}.hero h1{font:600 ${DESIGN.h1Desktop}/1.28 var(--font);letter-spacing:-.02em;max-width:48ch;margin:14px 0}.lede{font:14.5px/1.62 var(--font);max-width:790px;color:#aebdca;margin:0}.status{display:inline-block;margin-top:20px;padding:6px 9px;border:1px solid #285044}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:8px 0 38px}.card{background:var(--panel);border:1px solid var(--line);padding:18px;min-height:170px}.num{color:var(--accent);font-size:10px}.card h2{font:600 ${DESIGN.h2Desktop}/1.34 var(--font);margin:20px 0 8px}.card p{color:var(--muted);margin:0}.thesis{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:28px 0;margin-bottom:34px}.foot{display:flex;justify-content:space-between;gap:18px;padding:0 0 34px;color:#718292;font-size:11px}@media(max-width:760px){.hero{padding-top:38px}.hero h1{font-size:${DESIGN.h1Mobile}}.card h2{font-size:${DESIGN.h2Mobile}}.grid{grid-template-columns:1fr}.card{min-height:0}.top,.foot{align-items:flex-start;flex-direction:column}}
</style></head><body>
<header class="wrap top"><a href="${escapeHtml(PRODUCT.companyUrl)}">${escapeHtml(PRODUCT.company)} / ${escapeHtml(PRODUCT.name)}</a><a href="${escapeHtml(PRODUCT.companyUrl)}">Company</a></header>
<main class="wrap"><section class="hero"><div class="eyebrow">SaaS product</div><h1>${escapeHtml(PRODUCT.headline)}</h1><p class="lede">${escapeHtml(PRODUCT.lede)}</p><div class="status">${escapeHtml(PRODUCT.status)}</div></section><section class="grid">${cards}</section><section class="thesis"><p>${escapeHtml(PRODUCT.footer)}</p></section></main>
<footer class="wrap foot"><span>${escapeHtml(PRODUCT.company)}</span><a href="${escapeHtml(PRODUCT.contactUrl)}">Contact</a></footer>
</body></html>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    if (url.pathname !== "/" && url.pathname !== "/index.html") return Response.redirect(`https://${url.hostname}/`, 302);
    const headers = new Headers({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY"
    });
    return new Response(request.method === "HEAD" ? null : renderPage(url.hostname.toLowerCase()), { status: 200, headers });
  }
};
