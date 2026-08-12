import { APP_GZ_B64 } from "./app.js";

const GA_HEAD = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-DCY144YM9P"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments)};gtag('js',new Date());gtag('config','G-DCY144YM9P',{anonymize_ip:true,demo_name:'zs_cs_business_operations',hostname:location.hostname,page_path:location.pathname});</script>`;

const DTEX_GATE_CSS = `<style id="dtex-gate-css">
:root{--zs-navy:#001744;--zs-blue:#2368f5;--zs-blue2:#3a69eb;--zs-mint:#6bffb3;--zs-cyan:#12d4ff;--zs-pink:#fe00e2;--zs-ice:#e5f1fa}
#gate,#gate *{box-sizing:border-box}#gate{min-height:100vh;background:var(--zs-navy);color:#fff;font-family:Arial,Helvetica,sans-serif;overflow:hidden}.gate-nav{height:82px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(22px,5vw,76px);background:#fff;color:var(--zs-navy);position:relative;z-index:3}.gate-brand{display:flex;align-items:center;gap:11px;font-size:25px;font-weight:800;letter-spacing:-.05em}.gate-brand-mark{width:39px;height:29px;position:relative;display:block}.gate-brand-mark:before,.gate-brand-mark:after{content:"";position:absolute;border:4px solid var(--zs-blue);border-radius:50%}.gate-brand-mark:before{width:25px;height:25px;left:0;top:0;border-right-color:transparent}.gate-brand-mark:after{width:17px;height:17px;right:0;bottom:0;border-left-color:transparent}.gate-nav-note{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#334569}.gate-hero{min-height:calc(100vh - 82px);display:grid;grid-template-columns:minmax(0,1.15fr) minmax(360px,.85fr);align-items:center;gap:clamp(38px,7vw,110px);padding:clamp(44px,7vw,92px) clamp(22px,7vw,104px);position:relative;isolation:isolate}.gate-hero:before{content:"";position:absolute;width:min(52vw,760px);aspect-ratio:1;right:-16%;top:-30%;border:1px solid rgba(107,255,179,.33);border-radius:44% 56% 51% 49%;transform:rotate(24deg);box-shadow:0 0 0 74px rgba(18,212,255,.05),0 0 0 150px rgba(254,0,226,.035);z-index:-1}.gate-hero:after{content:"";position:absolute;width:360px;height:360px;left:-170px;bottom:-210px;border-radius:50%;background:radial-gradient(circle at 62% 38%,var(--zs-cyan),var(--zs-blue) 45%,transparent 68%);filter:blur(2px);opacity:.55;z-index:-1}.gate-copy{max-width:760px}.gate-kicker{display:inline-flex;align-items:center;gap:9px;font-size:11px;letter-spacing:.13em;text-transform:uppercase;font-weight:800;color:var(--zs-mint);margin-bottom:22px}.gate-kicker:before{content:"";width:34px;height:2px;background:var(--zs-mint)}.gate-copy h1{font-size:clamp(44px,6vw,84px);line-height:.94;letter-spacing:-.065em;margin:0 0 24px;max-width:760px}.gate-copy p{font-size:clamp(17px,1.7vw,22px);line-height:1.45;color:#d0f6ff;max-width:660px;margin:0}.gate-proof{display:flex;flex-wrap:wrap;gap:9px;margin-top:31px}.gate-proof span{border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:8px 13px;font-size:11px;font-weight:700;color:#fff;background:rgba(255,255,255,.06);backdrop-filter:blur(8px)}.gate-card{width:min(470px,100%);justify-self:end;padding:clamp(26px,4vw,42px);background:#fff;color:var(--zs-navy);border-radius:28px;box-shadow:0 36px 100px rgba(0,8,30,.38);position:relative}.gate-card:before{content:"";position:absolute;left:30px;right:30px;top:0;height:5px;border-radius:0 0 99px 99px;background:linear-gradient(90deg,var(--zs-blue),var(--zs-cyan),var(--zs-mint))}.gate-card .gate-card-kicker{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--zs-blue);font-weight:900}.gate-card h2{font-size:clamp(28px,3vw,38px);line-height:1.02;letter-spacing:-.05em;margin:10px 0 13px}.gate-card>p{color:#334569;line-height:1.55;margin:0 0 27px;font-size:14px}.gate-card label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.11em;font-weight:900;color:var(--zs-navy);margin-bottom:8px}.gate-card input{width:100%;background:#f7faff;border:1px solid #ccd1da;color:var(--zs-navy);border-radius:999px;padding:15px 18px;font-size:16px;outline:none}.gate-card input:focus{border-color:var(--zs-blue);box-shadow:0 0 0 4px rgba(35,104,245,.15)}.gate-card button{width:100%;border:0;border-radius:999px;padding:15px 20px;margin-top:13px;background:var(--zs-mint);color:var(--zs-navy);font-size:15px;font-weight:900;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease}.gate-card button:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(35,104,245,.2)}.gate-card button:focus-visible{outline:3px solid var(--zs-blue);outline-offset:3px}.gate-error{min-height:19px;color:#b00037;font-size:12px;font-weight:700;margin-top:9px}.gate-fine{font-size:10px;color:#66728a;margin-top:17px;line-height:1.55;padding-top:16px;border-top:1px solid #e9f0fe}
@media(max-width:860px){.gate-nav{height:70px}.gate-nav-note{display:none}.gate-hero{min-height:calc(100vh - 70px);grid-template-columns:1fr;padding-top:42px}.gate-copy h1{font-size:clamp(42px,12vw,68px)}.gate-card{justify-self:stretch;width:100%}}@media(max-width:480px){.gate-hero{padding:34px 18px 50px}.gate-proof{display:none}.gate-card{border-radius:22px}.gate-copy p{font-size:16px}}
#app{display:none}.unlocked #gate{display:none}.unlocked #app{display:block}
</style>`;

const DTEX_GATE_HTML = `<main id="gate"><header class="gate-nav"><div class="gate-brand"><span class="gate-brand-mark" aria-hidden="true"></span><span>Zscaler</span></div><div class="gate-nav-note">Private Customer Success environment</div></header><div class="gate-hero"><section class="gate-copy"><div class="gate-kicker">Restricted preview</div><h1>Secure access.<br>Clear outcomes.</h1><p>A private Customer Success measurement and account-workspace demonstration inspired by the clarity of zero trust.</p><div class="gate-proof" aria-label="Demo features"><span>Portfolio health</span><span>Account workspaces</span><span>Meeting readiness</span></div></section><section class="gate-card"><div class="gate-card-kicker">Authorized access</div><h2>Private Customer Success Demo</h2><p>Enter the access password to continue to the synthetic demonstration.</p><form id="access-form" autocomplete="off"><label for="pw">Access password</label><input id="pw" type="password" autocomplete="current-password" autofocus><button type="submit">Unlock demo</button><div id="gate-error" class="gate-error" role="alert"></div></form><div class="gate-fine">Synthetic data only. Metrics and thresholds are explicit and deterministic.</div></section></div></main>`;

const DTEX_GATE_JS = `<script id="dtex-gate-js">
const PASS='2$C@L3RK0S$H2026',SESSION_KEY='summertime_demo_access',DEMO_ID='summertime_2026';
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
