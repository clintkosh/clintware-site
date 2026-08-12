import { APP_GZ_B64 } from "./app.js";

const PASSWORD_SHA256 = "f6acf1768cd83f94d0a8b4c84e11c087612d11084e3dd829a6106617593102b2";
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
  const html = `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="color-scheme" content="light dark"><title>Private Business Operations Review</title>${GA_HEAD}<style>
:root{--bg:#f3f7fb;--panel:#fff;--panel2:#e5f0fb;--ink:#061a52;--muted:#647c9f;--line:#c7d9eb;--blue:#5a5cf5;--pink:#ff00d4;--shadow:0 24px 70px rgba(19,55,110,.14)}html[data-theme=dark]{--bg:#07101f;--panel:#0d1a2e;--panel2:#13243d;--ink:#f7f9ff;--muted:#9cb0ca;--line:#2a4262;--blue:#8585ff;--pink:#ff31da;--shadow:0 28px 80px rgba(0,0,0,.42)}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--bg);color:var(--ink);font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.bar{height:10px;background:#242424}.top{height:74px;background:var(--panel);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 22px}.brand{display:flex;align-items:center;gap:11px;font-weight:850}.mark{width:39px;height:28px;border-radius:52% 48% 46% 54%;background:linear-gradient(135deg,var(--blue),#277df5);position:relative;transform:skewX(-14deg)}.mark:after{content:"";position:absolute;width:24px;height:10px;border-radius:50%;background:var(--panel);left:8px;top:8px;transform:rotate(-16deg)}.theme{width:38px;height:38px;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:8px;cursor:pointer}.wrap{min-height:calc(100vh - 84px);display:grid;grid-template-columns:minmax(0,1.1fr) minmax(380px,.9fr)}.story{padding:72px max(28px,7vw);display:flex;align-items:center;background:linear-gradient(135deg,var(--panel) 0%,var(--panel) 54%,var(--panel2) 100%)}.storyinner{max-width:660px}.eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:850;color:var(--pink);display:flex;gap:9px;align-items:center}.eyebrow:before{content:"";width:6px;height:6px;background:var(--pink)}h1{font-size:50px;line-height:.98;letter-spacing:-.045em;margin:22px 0 18px}.pink{font-size:22px;line-height:1.1;color:var(--pink);font-weight:800;max-width:560px}.copy{color:var(--muted);max-width:570px;font-size:16px}.bullets{display:grid;gap:10px;margin-top:24px}.bullet{display:flex;gap:10px;align-items:flex-start}.sq{width:6px;height:6px;background:var(--pink);margin-top:7px;flex:none}.gatewrap{background:var(--panel2);display:grid;place-items:center;padding:36px}.gate{width:min(460px,100%);background:var(--panel);border:1px solid var(--line);padding:28px;border-radius:12px;box-shadow:var(--shadow)}.gate h2{font-size:28px;line-height:1.08;letter-spacing:-.035em;margin:0 0 8px}.gate p{color:var(--muted);margin:0 0 18px}.field{width:100%;padding:13px 14px;border:1px solid var(--line);background:var(--panel);color:var(--ink);outline:none}.field:focus{border-color:var(--blue);box-shadow:0 0 0 3px color-mix(in srgb,var(--blue) 14%,transparent)}button.submit{border:0;background:var(--pink);color:#fff;padding:12px 21px;font-weight:850;margin-top:12px;min-width:150px;cursor:pointer}.error{color:#d32f52;font-size:11px;min-height:18px;margin-top:8px}.foot{border-top:1px solid var(--line);margin-top:22px;padding-top:13px;color:var(--muted);font-size:10px}.tiny{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:var(--muted)}@media(max-width:850px){.wrap{grid-template-columns:1fr}.story{padding:42px 24px}.gatewrap{padding:28px 20px}h1{font-size:38px}}
</style></head><body><div class="bar"></div><header class="top"><div class="brand"><span class="mark"></span><span>Post-Sales Business Operations</span></div><button class="theme" id="theme" aria-label="Toggle light or dark mode">◐</button></header><main class="wrap"><section class="story"><div class="storyinner"><div class="eyebrow">Private role-mapped prototype</div><h1>Operate Customer Success with clarity.</h1><div class="pink">Structured like the DTex operating build. Styled for an AI-forward Zero Trust environment.</div><p class="copy">Portfolio health, account context, customer outcomes, resource planning, finance, prioritization, business rhythms, and executive review readiness in one working system.</p><div class="bullets"><div class="bullet"><span class="sq"></span><span>Impact over activity</span></div><div class="bullet"><span class="sq"></span><span>Customer obsession with measurable follow-through</span></div><div class="bullet"><span class="sq"></span><span>Ownership, accountability, and visible operating trade-offs</span></div></div></div></section><section class="gatewrap"><div class="gate"><div class="tiny">Private review access</div><h2>Open the operating platform</h2><p>Enter the review password to continue to the Customer Success Business Operations workspace.</p><form method="post" action="/login"><input class="field" type="password" name="password" autocomplete="current-password" aria-label="Access password" autofocus required><button class="submit" type="submit">Get started</button><div class="error">${escapeHtml(error)}</div></form><div class="foot">Synthetic data only · Independent Clintware prototype</div></div></section></main><script>(function(){var k='zs_ops_theme_v2',t=localStorage.getItem(k)||'light';document.documentElement.dataset.theme=t;var b=document.getElementById('theme');function icon(){b.textContent=document.documentElement.dataset.theme==='dark'?'☀':'◐'}icon();b.onclick=function(){var n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;localStorage.setItem(k,n);icon()}})();</script></body></html>`;
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
