import { APP_GZ_B64 } from "./app.js";

const GA_HEAD = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-DCY144YM9P"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments)};gtag('js',new Date());gtag('config','G-DCY144YM9P',{anonymize_ip:true,demo_name:'zs_cs_business_operations',hostname:location.hostname,page_path:location.pathname});</script>`;

const DTEX_GATE_CSS = `<style id="dtex-gate-css">
:root{--lime:#c8ff3d;--mint:#49e5b3}
#gate{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 80% 8%,rgba(74,199,255,.18),transparent 28%),radial-gradient(circle at 12% 84%,rgba(200,255,61,.12),transparent 30%),#080a0e;color:#fff}.gate-card{width:min(440px,100%);padding:34px;border:1px solid #273038;background:rgba(13,17,22,.96);border-radius:22px;box-shadow:0 36px 100px rgba(0,0,0,.42)}.gate-mark{width:58px;height:7px;border-radius:99px;background:linear-gradient(90deg,var(--lime),var(--mint));margin-bottom:26px}.gate-kicker{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#84939a;font-weight:900}.gate-card h1{font-size:29px;letter-spacing:-.045em;margin:8px 0}.gate-card p{color:#aab6bb;line-height:1.6;margin:0 0 24px}.gate-card label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:900;color:#cad1d4;margin-bottom:7px}.gate-card input{width:100%;background:#090c10;border:1px solid #35414a;color:#fff;border-radius:11px;padding:13px 14px;outline:none}.gate-card input:focus{border-color:var(--lime);box-shadow:0 0 0 3px rgba(200,255,61,.12)}.gate-card button{width:100%;border:0;border-radius:11px;padding:13px;margin-top:12px;background:var(--lime);color:#0a0d0d;font-weight:950}.gate-error{min-height:18px;color:#ff9297;font-size:12px;margin-top:9px}.gate-fine{font-size:10px;color:#6f7e84;margin-top:17px;line-height:1.5}
#app{display:none}.unlocked #gate{display:none}.unlocked #app{display:block}
</style>`;

const DTEX_GATE_HTML = `<main id="gate"><section class="gate-card"><div class="gate-mark"></div><div class="gate-kicker">Restricted preview</div><h1>Private Customer Success Demo</h1><p>Enter the access password to continue to this synthetic Customer Success measurement and account-workspace demonstration.</p><form id="access-form" autocomplete="off"><label for="pw">Access password</label><input id="pw" type="password" autocomplete="current-password" autofocus><button type="submit">Unlock demo</button><div id="gate-error" class="gate-error" role="alert"></div></form><div class="gate-fine">Synthetic data only. The application calculates explicit metrics and thresholds; it does not guess patterns or generate recommendations.</div></section></main>`;

const DTEX_GATE_JS = `<script id="dtex-gate-js">
const PASS='DT3XK0$H2026',SESSION_KEY='summertime_demo_access',DEMO_ID='summertime_2026';
function sendEvent(n,p={}){if(typeof gtag==='function')gtag('event',n,Object.assign({demo_id:DEMO_ID,host:location.hostname},p))}
function unlock(){sessionStorage.setItem(SESSION_KEY,'1');document.body.classList.add('unlocked');document.title='DTEX Customer Success Measurement System'}
function lock(){sessionStorage.removeItem(SESSION_KEY);document.body.classList.remove('unlocked');document.title='Private Customer Success Demo';document.getElementById('pw').value=''}
function bind(){const form=document.getElementById('access-form'),pw=document.getElementById('pw'),err=document.getElementById('gate-error');form.onsubmit=e=>{e.preventDefault();if(pw.value===PASS){err.textContent='';unlock();sendEvent('crm_unlock_success')}else{err.textContent='Incorrect password.';pw.select();sendEvent('crm_unlock_failed')}};if(sessionStorage.getItem(SESSION_KEY)==='1')unlock();sendEvent('crm_gate_view')}
document.addEventListener('DOMContentLoaded',bind);
</script>`;

function responseHeaders(type = "text/html; charset=utf-8") {
  return {
    "Content-Type": type,
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://*.google-analytics.com; img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
  };
}

async function gunzipBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

function applyDtexGate(html) {
  let out = html.replace("</title>", `</title>${GA_HEAD}`);
  out = out.replace("</head>", `${DTEX_GATE_CSS}</head>`);
  out = out.replace(/<body([^>]*)>/i, `<body$1>${DTEX_GATE_HTML}`);
  out = out.replace(/<\/body>/i, `${DTEX_GATE_JS}</body>`);
  return out;
}

async function loadApp() {
  return applyDtexGate(await gunzipBase64(APP_GZ_B64));
}

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ ok: true, service: "abc-cs-business-operations" }), {
          headers: responseHeaders("application/json; charset=utf-8")
        });
      }

      if (url.pathname === "/health/auth") {
        const html = await loadApp();
        const appOk = html.includes("Command Center") && html.includes("Seed Demo Accounts") && html.length > 10000;
        const gateOk = html.includes("Restricted preview") && html.includes("Unlock demo") && html.includes("SESSION_KEY='summertime_demo_access'") && html.includes("pw.value===PASS");
        return new Response(JSON.stringify({ ok: appOk && gateOk, app: appOk, gate: gateOk, mode: "dtex-client-gate" }), {
          headers: responseHeaders("application/json; charset=utf-8")
        });
      }

      if (url.pathname === "/robots.txt") {
        return new Response("User-agent: *\nDisallow: /\n", { headers: responseHeaders("text/plain; charset=utf-8") });
      }

      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405, headers: responseHeaders("text/plain; charset=utf-8") });
      }

      return new Response(await loadApp(), { status: 200, headers: responseHeaders() });
    } catch (error) {
      console.error(JSON.stringify({ event: "worker_error", message: String(error) }));
      return new Response("Service temporarily unavailable.", { status: 500, headers: responseHeaders("text/plain; charset=utf-8") });
    }
  }
};
