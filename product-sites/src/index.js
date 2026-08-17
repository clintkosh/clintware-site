const PRODUCTS = Object.freeze({
  "quillgeist.clintware.com": {
    name: "Quillgeist",
    eyebrow: "CLINTWARE // FLAGSHIP // ACTIVE BUILD",
    headline: "Adaptive AI execution that learns how you work.",
    lede: "Quillgeist sits between you and the AI systems you use. It improves how your intent is translated, keeps eligible work on your own machine, and sends only the work that needs greater remote capability upstream.",
    status: "Flagship · Y Combinator Fall 2026 focus",
    points: [
      ["Translate intent", "Restructures requests into clearer, more efficient instructions for the model or tool doing the work."],
      ["Run local first", "Offloads eligible work to local models, tools, and compute to reduce latency, token use, cloud cost, and unnecessary data exposure."],
      ["Learn the loop", "Learns from revisions, accepted or rejected outputs, and recurring work so both the system and the user become more efficient over time."]
    ],
    footer: "What are you trying to accomplish? What is the most efficient way to ask AI to do it? What actually needs to leave your computer?"
  },
  "shouldersoldier.clintware.com": {
    name: "ShoulderSoldier",
    eyebrow: "CLINTWARE // PRODUCT TRACK // EARLY BUILD",
    headline: "Pre-exposure email security that is not tied to one provider.",
    lede: "ShoulderSoldier is a provider-independent security layer intended to inspect and protect sensitive email content before exposure to the downstream email or AI provider.",
    status: "Initial product page · Architecture in development",
    points: [
      ["Before exposure", "Move useful security decisions earlier, before sensitive content unnecessarily reaches a provider."],
      ["Provider independent", "Design around the user and policy boundary rather than depending on one mail platform's controls."],
      ["Local policy", "Use local inspection and explicit policy where appropriate, with auditable handling of what is allowed to leave the device."]
    ],
    footer: "The product thesis: protect the message before the provider becomes the first place that can inspect it."
  },
  "buyerorigin.clintware.com": {
    name: "BuyerOrigin",
    eyebrow: "CLINTWARE // PRODUCT TRACK // EARLY BUILD",
    headline: "Buyer identity and promotion eligibility infrastructure for ecommerce.",
    lede: "BuyerOrigin starts with a common Shopify problem: the same buyer repeatedly presenting as a new customer to reuse welcome offers and other limited promotions.",
    status: "Initial product page · Shopify wedge",
    points: [
      ["Eligibility, not just email", "Help merchants determine whether a buyer is genuinely eligible for a promotion instead of treating every new account or address as a new customer."],
      ["Merchant control", "Give stores explainable policy and decision signals rather than an opaque blocklist."],
      ["Commerce infrastructure", "Begin with promotion abuse, then build toward a durable buyer-origin and eligibility layer that can support broader merchant workflows."]
    ],
    footer: "The wedge is promotion abuse. The larger problem is knowing when a buyer is actually new, returning, or eligible."
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
    :root{color-scheme:dark;--bg:#070a0f;--panel:#0b1017;--line:#25303c;--text:#edf5fb;--muted:#94a7b8;--accent:#6ef2b2;--cyan:#6ed8f2}
    *{box-sizing:border-box}html{background:var(--bg)}body{margin:0;background:radial-gradient(circle at 85% 5%,rgba(110,216,242,.07),transparent 28rem),var(--bg);color:var(--text);font:15px/1.65 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}
    a{color:inherit}.wrap{width:min(1040px,calc(100% - 36px));margin:auto}.top{display:flex;justify-content:space-between;gap:18px;align-items:center;padding:22px 0;border-bottom:1px solid var(--line);font-size:12px;letter-spacing:.07em}.brand{font-weight:800;text-decoration:none}.brand b{color:var(--accent)}.back{color:var(--muted);text-decoration:none}.hero{padding:76px 0 46px}.eyebrow,.status{color:var(--accent);font-size:12px;letter-spacing:.08em;text-transform:uppercase}.hero h1{font-size:clamp(27px,5vw,46px);line-height:1.12;letter-spacing:-.035em;max-width:880px;margin:16px 0 20px}.lede{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:clamp(17px,2vw,20px);line-height:1.65;max-width:790px;color:#bdcad5;margin:0}.status{display:inline-block;margin-top:28px;padding:7px 10px;border:1px solid #285044;background:#0a1714}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:10px 0 54px}.card{background:var(--panel);border:1px solid var(--line);padding:22px;min-height:220px}.number{color:var(--cyan);font-size:11px}.card h2{font-size:16px;margin:26px 0 10px}.card p{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--muted);margin:0;line-height:1.65}.thesis{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:36px 0;margin-bottom:44px}.thesis p{font-size:16px;max-width:850px;margin:0}.foot{display:flex;justify-content:space-between;gap:18px;padding:0 0 42px;color:#718292;font-size:11px}.foot a{color:#9eb0bf;text-decoration:none}@media(max-width:760px){.hero{padding-top:54px}.grid{grid-template-columns:1fr}.card{min-height:0}.top,.foot{align-items:flex-start;flex-direction:column}}
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

    if (!product) {
      return new Response("Not found", { status: 404 });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" }
      });
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

    return new Response(request.method === "HEAD" ? null : renderPage(product, hostname), {
      status: 200,
      headers
    });
  }
};
