const PASSWORD_SHA256 = "04df7e1d9915c05c8b9af3f7ebedddccdd48361b04c382706c38d9bb072b7abb";
const SOURCE_URL = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/abnormal/src/index.js";
let appCache;

function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function constantEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function responseHeaders(type = "text/html; charset=utf-8") {
  return {
    "Content-Type": type,
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://*.google-analytics.com; img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
  };
}

function loginPage(error = "") {
  const safe = String(error).replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="color-scheme" content="dark"><title>Private Customer Success Concept</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 50% -15%,rgba(255,59,136,.16),transparent 34%),#07070b;color:#f7f6f8;font:14px/1.5 Inter,system-ui,sans-serif}.gate{width:min(470px,100%);padding:28px;border:1px solid #2b2833;border-radius:22px;background:linear-gradient(180deg,#111019,#0b0a10);box-shadow:0 26px 100px #000}.eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:#c9c4d0}.mark{font-size:25px;font-weight:800;letter-spacing:-.04em;margin:8px 0;background:linear-gradient(90deg,#ff3b88,#ff6957,#a565ff);-webkit-background-clip:text;color:transparent}.gate h1{font-size:23px;line-height:1.15;letter-spacing:-.04em;margin:25px 0 8px}.gate p{color:#aaa6b4;margin:0 0 20px}.field{width:100%;padding:12px 13px;border-radius:11px;background:#09090e;border:1px solid #34303d;color:#fff;outline:none}.field:focus{border-color:#8b6388;box-shadow:0 0 0 3px rgba(255,59,136,.08)}button{width:100%;margin-top:9px;border:0;border-radius:11px;padding:12px;background:linear-gradient(90deg,#f23b7e,#e65468);font-weight:750;color:#fff;cursor:pointer}.error{color:#ff9aa4;font-size:11px;min-height:17px;margin-top:8px}.foot{border-top:1px solid #27242d;margin-top:22px;padding-top:14px;color:#77717e;font-size:10px}</style></head><body><main class="gate"><div class="eyebrow">Clintware private review</div><div class="mark">CUSTOMER SUCCESS // COMMAND CENTER</div><h1>Private Customer Success concept</h1><p>Shared directly for interview review. Enter the access password to open the Customer Success Command Center.</p><form method="post" action="/login"><input class="field" type="password" name="password" autocomplete="current-password" aria-label="Access password" autofocus required><button type="submit">Unlock concept</button><div class="error">${safe}</div></form><div class="foot">Built as a private Customer Success workflow concept. Synthetic data only.</div></main></body></html>`;
  return new Response(html, { status: error ? 401 : 200, headers: responseHeaders() });
}

async function gunzipBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

async function loadApp() {
  if (appCache) return appCache;
  const sourceResponse = await fetch(SOURCE_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!sourceResponse.ok) throw new Error(`CRM bundle fetch failed: ${sourceResponse.status}`);
  const source = await sourceResponse.text();
  const match = source.match(/const APP_GZ_B64="([A-Za-z0-9+/=]+)"/);
  if (!match) throw new Error("CRM bundle not found");
  appCache = await gunzipBase64(match[1]);
  return appCache;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", { headers: responseHeaders("text/plain; charset=utf-8") });
    }

    if (url.pathname === "/logout") {
      return new Response(null, { status: 302, headers: { ...responseHeaders(), Location: "/" } });
    }

    if (url.pathname === "/login" && request.method === "POST") {
      const form = await request.formData();
      const digest = await sha256(String(form.get("password") || ""));
      if (!constantEqual(digest, PASSWORD_SHA256)) {
        return loginPage("Access denied. Please check the password and try again.");
      }
      try {
        return new Response(await loadApp(), { headers: responseHeaders() });
      } catch (error) {
        console.error(JSON.stringify({ event: "crm_bundle_error", message: String(error) }));
        return new Response("The private CRM bundle is temporarily unavailable.", { status: 503, headers: responseHeaders("text/plain; charset=utf-8") });
      }
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: responseHeaders("text/plain; charset=utf-8") });
    }

    return loginPage();
  }
};
