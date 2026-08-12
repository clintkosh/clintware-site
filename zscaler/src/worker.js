import { APP_GZ_B64 } from "./app.js";

const PASSWORD_SHA256 = "0758948c6837fc67872c56f1c95668556f9d755e654a65e6ff8de8973a045dc6";
const GA_HEAD = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-DCY144YM9P"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','G-DCY144YM9P',{anonymize_ip:true,demo_name:'zs_cs_business_operations',hostname:location.hostname,page_path:location.pathname});</script>`;

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
    "X-Robots-Tag": "noindex, nofollow,noarchive",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://*.google-analytics.com; img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
  };
}

function escapeHtml(value) {
  return String(value).replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function loginPage(error = "") {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="color-scheme" content="dark"><title>Private Business Operations Review</title>${GA_HEAD}<style>
:root{color-scheme:dark;--bg:#04070d;--panel:#09111f;--line:#17304f;--blue:#1689ff;--cyan:#36d8ff;--text:#f6fbff;--muted:#8ca4ba}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:22px;background:radial-gradient(900px 560px at 50% -10%,rgba(25,132,255,.30),transparent 58%),radial-gradient(640px 440px at 92% 18%,rgba(54,216,255,.14),transparent 58%),linear-gradient(180deg,#06101d 0%,#03060b 62%,#020407 100%);color:var(--text);font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.gate{width:min(510px,100%);padding:30px;border:1px solid rgba(89,169,255,.22);border-radius:24px;background:linear-gradient(180deg,rgba(10,24,42,.94),rgba(4,10,18,.96));box-shadow:0 30px 120px rgba(0,0,0,.65),0 0 70px rgba(18,130,255,.10);position:relative;overflow:hidden}.gate:before{content:"";position:absolute;inset:0 0 auto;height:2px;background:linear-gradient(90deg,transparent,#1689ff,#36d8ff,#1689ff,transparent)}.gate:after{content:"";position:absolute;width:260px;height:260px;border-radius:50%;right:-120px;top:-120px;background:radial-gradient(circle,rgba(54,216,255,.16),transparent 66%);pointer-events:none}.eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.19em;color:#91a9be}.mark{font-size:27px;font-weight:850;letter-spacing:-.045em;margin:8px 0;background:linear-gradient(90deg,#ffffff 0%,#a8ddff 40%,#36d8ff 100%);-webkit-background-clip:text;color:transparent}.signal{display:flex;gap:7px;margin:17px 0 0}.signal span{height:4px;border-radius:999px}.signal span:nth-child(1){width:48px;background:#1689ff}.signal span:nth-child(2){width:25px;background:#36d8ff}.signal span:nth-child(3){width:12px;background:#7dbfff}.gate h1{font-size:25px;line-height:1.14;letter-spacing:-.04em;margin:22px 0 8px}.gate p{color:var(--muted);margin:0 0 20px}.field{width:100%;padding:13px 14px;border-radius:12px;background:#030812;border:1px solid #1c3d61;color:#fff;outline:none}.field:focus{border-color:#2aa6ff;box-shadow:0 0 0 3px rgba(22,137,255,.12)}button{width:100%;margin-top:10px;border:0;border-radius:12px;padding:13px;background:linear-gradient(90deg,#147bea,#159cf5 54%,#28c8ed);font-weight:800;color:#fff;cursor:pointer;box-shadow:0 12px 28px rgba(20,123,234,.22)}button:hover{filter:brightness(1.07)}.error{color:#ff9ba8;font-size:11px;min-height:17px;margin-top:8px}.foot{border-top:1px solid #122a44;margin-top:22px;padding-top:14px;color:#668099;font-size:10px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}</style></head><body><main class="gate"><div class="eyebrow">Clintware private review</div><div class="mark">CUSTOMER SUCCESS // BUSINESS OPS</div><div class="signal" aria-hidden="true"><span></span><span></span><span></span></div><h1>Private Business Operations Command Center</h1><p>A role-mapped operating platform for post-sales leadership. Enter the review password to continue.</p><form method="post" action="/login"><input class="field" type="password" name="password" autocomplete="current-password" aria-label="Access password" autofocus required><button type="submit">Unlock operating platform</button><div class="error">${escapeHtml(error)}</div></form><div class="foot"><span>Private review</span><span>Synthetic data only</span><span>Clintware prototype</span></div></main></body></html>`;
  return new Response(html, { status: error ? 401 : 200, headers: responseHeaders() });
}

async function gunzipBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

async function appResponse() {
  const html = await gunzipBase64(APP_GZ_B64);
  return new Response(html.replace("</title>", `</title>${GA_HEAD}`), { headers: responseHeaders() });
}

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ ok: true, service: "zscaler-cs-business-operations" }), {
          headers: responseHeaders("application/json; charset=utf-8")
        });
      }

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
          return loginPage("Access denied. Check the password and try again.");
        }
        return await appResponse();
      }

      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405, headers: responseHeaders("text/plain; charset=utf-8") });
      }

      return loginPage();
    } catch (error) {
      console.error(JSON.stringify({ event: "worker_error", message: String(error) }));
      return new Response("Service temporarily unavailable.", { status: 500, headers: responseHeaders("text/plain; charset=utf-8") });
    }
  }
};
