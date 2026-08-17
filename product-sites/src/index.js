const PRODUCTS = Object.freeze({
  "shouldersoldier.clintware.com": {
    name: "ShoulderSoldier",
    eyebrow: "CLINTWARE // PRODUCT TRACK // EARLY BUILD",
    headline: "Protect sensitive email before it reaches the provider.",
    lede: "ShoulderSoldier is a provider-independent pre-exposure security layer for email. It applies local policy and inspection before sensitive content is handed to the downstream mail or AI provider.",
    status: "Architecture in development",
    points: [
      ["Inspect before exposure", "Apply useful security checks before sensitive content unnecessarily reaches a provider."],
      ["Stay provider independent", "Keep the protection boundary centered on the user and policy instead of one mail platform."],
      ["Keep policy local", "Use explicit local rules and auditable decisions for what is allowed to leave the device."]
    ],
    footer: "Product thesis: move the security decision earlier, before the provider becomes the first place that can inspect the message."
  },
  "buyerorigin.clintware.com": {
    name: "BuyerOrigin",
    eyebrow: "CLINTWARE // PRODUCT TRACK // EARLY BUILD",
    headline: "Determine whether a buyer is actually eligible for a promotion.",
    lede: "BuyerOrigin starts with repeated new-customer discount abuse in Shopify. It is designed to help merchants distinguish genuinely new buyers from returning buyers who present through new accounts, emails, or other identifiers.",
    status: "Shopify wedge in development",
    points: [
      ["Check eligibility", "Evaluate promotion eligibility without assuming every new email address represents a new customer."],
      ["Keep decisions explainable", "Give merchants understandable policy and decision signals instead of an opaque blocklist."],
      ["Build buyer identity context", "Start with promotion abuse and expand toward durable buyer-origin and eligibility infrastructure for commerce workflows."]
    ],
    footer: "Initial wedge: promotion abuse. Larger problem: knowing whether a buyer is new, returning, or eligible."
  }
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderPage(product, hostname) {
  const cards = product.points.map(([title, body], index) => `
    <article class="card">
      <span class="number">0${index + 1}</span>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
    </article>`).join("");

  const canonical = `https://${hostname}/`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${escapeHtml(product.lede)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(product.name)} | Clintware">
  <meta property="og:description" content="${escapeHtml(product.headline)}">
  <meta property="og:url" content="${canonical}">
  <meta name="theme-color" content="#070a0f">
  <title>${escapeHtml(product.name)} | Clintware</title>
  <style>
    :root{color-scheme:dark;--bg:#070a0f;--panel:#0b1017;--line:#25303c;--text:#edf5fb;--muted:#94a7b8;--accent:#6ef2b2;--cyan:#6ed8f2;--mono:"Cascadia Code","Cascadia Mono","Segoe UI Mono",SFMono-Regular,Menlo,Consolas,"Liberation Mono","DejaVu Sans Mono",monospace}
    *{box-sizing:border-box}html{background:var(--bg)}body{margin:0;background:radial-gradient(circle at 85% 5%,rgba(110,216,242,.045),transparent 26rem),var(--bg);color:var(--text);font:13.5px/1.62 var(--mono)}
    a{color:inherit}.wrap{width:min(980px,calc(100% - 36px));margin:auto}.top{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:18px 0;border-bottom:1px solid var(--line);font-size:11px;letter-spacing:.06em}.brand{font-weight:700;text-decoration:none}.brand b{color:var(--accent)}.back{color:var(--muted);text-decoration:none}.hero{padding:46px 0 32px}.eyebrow,.status{color:var(--accent);font-size:10.5px;letter-spacing:.07em;text-transform:uppercase}.hero h1{font-family:var(--mono);font-size:24px;line-height:1.28;font-weight:600;letter-spacing:-.02em;max-width:48ch;margin:14px 0 16px;text-shadow:none}.lede{font-family:var(--mono);font-size:14.5px;line-height:1.62;max-width:72ch;color:#b8c6d2;margin:0}.status{display:inline-block;margin-top:20px;padding:6px 9px;border:1px solid #285044;background:#0a1714}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:6px 0 36px}.card{background:var(--panel);border:1px solid var(--line);border-radius:3px;padding:18px;min-height:190px}.number{color:var(--cyan);font-size:10px}.card h2{font-family:var(--mono);font-size:15px;line-height:1.38;font-weight:600;letter-spacing:-.01em;margin:20px 0 9px}.card p{font-family:var(--mono);font-size:13px;color:var(--muted);margin:0;line-height:1.58}.thesis{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:24px 0;margin-bottom:32px}.thesis p{font-size:13.5px;line-height:1.6;max-width:78ch;margin:0}.foot{display:flex;justify-content:space-between;gap:18px;padding:0 0 32px;color:#718292;font-size:10.5px}.foot a{color:#9eb0bf;text-decoration:none}
    @media(max-width:760px){.hero{padding:38px 0 28px}.hero h1{font-size:20px;line-height:1.3}.lede{font-size:14px}.grid{grid-template-columns:1fr}.card{min-height:0}.top,.foot{align-items:flex-start;flex-direction:column}}
  </style>
</head>
<body>
  <header class="wrap top"><a class="brand" href="https://www.clintware.com/">CLINT<b>WARE</b> / ${escapeHtml(product.name).toUpperCase()}</a><a class="back" href="https://www.clintware.com/">clintware.com ↗</a></header>
  <main class="wrap">
    <section class="hero">
      <div class="eyebrow">${escapeHtml(product.eyebrow)}</div>
      <h1>${escapeHtml(product.headline)}</h1>
      <p class="lede">${escapeHtml(product.lede)}</p>
      <div class="status">${escapeHtml(product.status)}</div>
    </section>
    <section class="grid">${cards}</section>
    <section class="thesis"><p>${escapeHtml(product.footer)}</p></section>
  </main>
  <footer class="wrap foot"><span>A Clintware product.</span><a href="https://www.clintware.com/contact/">Contact Clintware ↗</a></footer>
</body>
</html>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const product = PRODUCTS[hostname];

    if (!product) return new Response("Not found", { status: 404 });

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    if (url.pathname !== "/" && url.pathname !== "/index.html") {
      return Response.redirect(`https://${hostname}/`, 302);
    }

    const headers = new Headers({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY"
    });

    return new Response(request.method === "HEAD" ? null : renderPage(product, hostname), { status: 200, headers });
  }
};
