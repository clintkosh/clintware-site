const PRODUCT = Object.freeze({
  name: "BuyerOrigin",
  eyebrow: "CLINTWARE // PRODUCT TRACK // EARLY BUILD",
  headline: "Determine whether a buyer is actually eligible for a promotion.",
  lede: "BuyerOrigin starts with a common Shopify problem: the same buyer repeatedly presenting as a new customer to reuse welcome offers and other limited promotions.",
  status: "Shopify wedge · Architecture in development",
  points: [
    ["Eligibility, not just email", "Help merchants determine whether a buyer is genuinely eligible for a promotion instead of treating every new account or address as a new customer."],
    ["Merchant control", "Give stores explainable policy and decision signals rather than an opaque blocklist."],
    ["Commerce infrastructure", "Begin with promotion abuse, then build toward a durable buyer-origin and eligibility layer that can support broader merchant workflows."]
  ],
  footer: "The wedge is promotion abuse. The larger problem is knowing when a buyer is actually new, returning, or eligible."
});

const GA_ID = "G-DCY144YM9P";

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function renderPage(hostname) {
  const cards = PRODUCT.points.map(([title, body], index) => `
    <article class="card"><span class="number">0${index + 1}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></article>`).join("");
  const canonical = `https://${hostname}/`;
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${escapeHtml(PRODUCT.lede)}"><link rel="canonical" href="${canonical}">
<meta property="og:type" content="website"><meta property="og:title" content="BuyerOrigin | Clintware"><meta property="og:description" content="${escapeHtml(PRODUCT.headline)}"><meta property="og:url" content="${canonical}">
<meta name="theme-color" content="#070a0f"><title>BuyerOrigin | Clintware</title>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:true});</script>
<style>
:root{color-scheme:dark;--bg:#070a0f;--panel:#0b1017;--line:#25303c;--text:#edf5fb;--muted:#94a7b8;--accent:#6ef2b2;--cyan:#6ed8f2;--font:"Cascadia Code","Cascadia Mono","Segoe UI Mono",SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}
*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;background:radial-gradient(circle at 85% 5%,rgba(110,216,242,.055),transparent 28rem),var(--bg);color:var(--text);font:13.5px/1.62 var(--font)}a{color:inherit}.wrap{width:min(1040px,calc(100% - 36px));margin:auto}.top{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:18px 0;border-bottom:1px solid var(--line);font-size:11px;letter-spacing:.065em}.brand{font-weight:700;text-decoration:none}.brand b{color:var(--accent)}.back{color:var(--muted);text-decoration:none}.hero{padding:48px 0 30px}.eyebrow,.status{color:var(--accent);font-size:10px;letter-spacing:.075em;text-transform:uppercase}.hero h1{font-family:var(--font);font-size:24px;line-height:1.28;font-weight:600;letter-spacing:-.02em;max-width:48ch;margin:14px 0 16px}.lede{font-family:var(--font);font-size:14.5px;line-height:1.62;max-width:790px;color:#aebdcc;margin:0}.status{display:inline-block;margin-top:20px;padding:6px 8px;border:1px solid #285044;background:#0a1714}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:8px 0 38px}.card{background:var(--panel);border:1px solid var(--line);padding:18px;min-height:170px}.number{color:var(--cyan);font-size:10px}.card h2{font-family:var(--font);font-size:15px;line-height:1.38;font-weight:600;letter-spacing:-.01em;margin:20px 0 8px}.card p{font-family:var(--font);font-size:12.5px;color:var(--muted);margin:0;line-height:1.62}.thesis{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:26px 0;margin-bottom:32px}.thesis p{font-size:13px;max-width:850px;margin:0}.foot{display:flex;justify-content:space-between;gap:18px;padding:0 0 32px;color:#718292;font-size:10.5px}.foot a{color:#9eb0bf;text-decoration:none}@media(max-width:760px){.hero{padding-top:38px}.hero h1{font-size:20px;line-height:1.3}.grid{grid-template-columns:1fr}.card{min-height:0}.top,.foot{align-items:flex-start;flex-direction:column}}
</style></head><body>
<header class="wrap top"><a class="brand" href="https://www.clintware.com/">CLINT<b>WARE</b> / BUYERORIGIN</a><a class="back" href="https://www.clintware.com/">clintware.com ↗</a></header>
<main class="wrap"><section class="hero"><div class="eyebrow">${escapeHtml(PRODUCT.eyebrow)}</div><h1>${escapeHtml(PRODUCT.headline)}</h1><p class="lede">${escapeHtml(PRODUCT.lede)}</p><div class="status">${escapeHtml(PRODUCT.status)}</div></section><section class="grid">${cards}</section><section class="thesis"><p>${escapeHtml(PRODUCT.footer)}</p></section></main>
<footer class="wrap foot"><span>A Clintware product.</span><a href="https://www.clintware.com/contact/">Contact Clintware ↗</a></footer></body></html>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", {status:405,headers:{Allow:"GET, HEAD"}});
    if (url.pathname !== "/" && url.pathname !== "/index.html") return Response.redirect(`https://${url.hostname}/`,302);
    const headers = new Headers({
      "Content-Type":"text/html; charset=utf-8",
      "Cache-Control":"public, max-age=300",
      "Content-Security-Policy":"default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'unsafe-inline'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      "Referrer-Policy":"strict-origin-when-cross-origin","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY"
    });
    return new Response(request.method === "HEAD" ? null : renderPage(url.hostname.toLowerCase()), {status:200,headers});
  }
};
