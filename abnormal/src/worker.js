import { enhanceApp } from "./enhancer.js";

const PASSWORD_SHA256 = "04df7e1d9915c05c8b9af3f7ebedddccdd48361b04c382706c38d9bb072b7abb";
const SOURCE_URL = "https://raw.githubusercontent.com/clintkosh/clintware-site/main/abnormal/src/index.js";
const DEMO_VISIT_SCRIPT = `<script id="cw-demo-visit-signal">(function(){window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};window.gtag('event','private_demo_visited',{demo_name:'customer_success_command_center',demo_access:'authenticated',demo_signal:'visit'});})();</script>`;
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
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="color-scheme" content="dark"><title>Private Customer Success Command Center</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 48% -18%,rgba(255,59,136,.18),transparent 35%),radial-gradient(circle at 88% 18%,rgba(165,101,255,.08),transparent 26%),#07070b;color:#f7f6f8;font:14px/1.5 Inter,system-ui,sans-serif}.gate{width:min(470px,100%);padding:28px;border:1px solid #2b2833;border-radius:22px;background:linear-gradient(180deg,#111019,#0b0a10);box-shadow:0 26px 100px #000;position:relative;overflow:hidden}.gate:before{content:"";position:absolute;inset:0 0 auto;height:2px;background:linear-gradient(90deg,#ff3b88,#ff6957,#a565ff)}.eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:#c9c4d0}.mark{font-size:25px;font-weight:800;letter-spacing:-.04em;margin:8px 0;background:linear-gradient(90deg,#ff3b88,#ff6957,#a565ff);-webkit-background-clip:text;color:transparent}.signal{display:flex;gap:6px;margin:18px 0 0}.signal span{height:4px;border-radius:999px;background:#322d39}.signal span:nth-child(1){width:38px;background:#ff3b88}.signal span:nth-child(2){width:19px;background:#ff6957}.signal span:nth-child(3){width:10px;background:#a565ff}.gate h1{font-size:23px;line-height:1.15;letter-spacing:-.04em;margin:22px 0 8px}.gate p{color:#aaa6b4;margin:0 0 20px}.field{width:100%;padding:12px 13px;border-radius:11px;background:#09090e;border:1px solid #34303d;color:#fff;outline:none}.field:focus{border-color:#8b6388;box-shadow:0 0 0 3px rgba(255,59,136,.08)}button{width:100%;margin-top:9px;border:0;border-radius:11px;padding:12px;background:linear-gradient(90deg,#f23b7e,#e65468);font-weight:750;color:#fff;cursor:pointer}.error{color:#ff9aa4;font-size:11px;min-height:17px;margin-top:8px}.foot{border-top:1px solid #27242d;margin-top:22px;padding-top:14px;color:#77717e;font-size:10px}</style></head><body><main class="gate"><div class="eyebrow">Clintware private review</div><div class="mark">BEHAVIORAL SECURITY // CS</div><div class="signal" aria-hidden="true"><span></span><span></span><span></span></div><h1>Private Customer Success Command Center</h1><p>A security-focused Customer Success operating concept prepared for interview review. Enter the access password to continue.</p><form method="post" action="/login"><input class="field" type="password" name="password" autocomplete="current-password" aria-label="Access password" autofocus required><button type="submit">Unlock concept</button><div class="error">${safe}</div></form><div class="foot">Private review • Synthetic data only • Human-reviewed workflow concept</div></main><script>(function(){try{var p=new URLSearchParams(location.search),k=['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','gbraid','wbraid'],v={};try{v=JSON.parse(localStorage.getItem('an_demo_attribution_v1')||'{}')}catch(e){}k.forEach(function(x){if(p.get(x))v[x]=p.get(x)});if(Object.keys(v).length)localStorage.setItem('an_demo_attribution_v1',JSON.stringify(v))}catch(e){}})();</script></body></html>`;
  return new Response(html, { status: error ? 401 : 200, headers: responseHeaders() });
}

async function gunzipBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

function addVisitSignal(html) {
  if (!html || html.includes('id="cw-demo-visit-signal"')) return html;
  return html.includes("</body>") ? html.replace("</body>", DEMO_VISIT_SCRIPT + "</body>") : html + DEMO_VISIT_SCRIPT;
}

async function loadApp() {
  if (appCache) return appCache;
  const sourceResponse = await fetch(SOURCE_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!sourceResponse.ok) throw new Error(`CRM bundle fetch failed: ${sourceResponse.status}`);
  const source = await sourceResponse.text();
  const match = source.match(/const APP_GZ_B64="([A-Za-z0-9+/=]+)"/);
  if (!match) throw new Error("CRM bundle not found");
  appCache = addVisitSignal(enhanceApp(await gunzipBase64(match[1])));
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