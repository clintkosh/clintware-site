const VENTURES = {
  "quillgeist.clintware.com": {
    name: "Quillgeist", status: "WORKING ALPHA · YC #3",
    headline: "User-owned operating context and verified local execution for AI.",
    problem: "Heavy AI users repeatedly rebuild the same permissions, preferences, context, and completion checks inside each provider.",
    current: "Packaged local execution, policy controls, verification, rollback, context compaction, and explicit user-owned preferences exist now.",
    next: "Prove repeated outside use across multiple AI providers and measurable reduction in repeated instruction/context.",
    detail: "https://www.clintware.com/tools/quillgeist/"
  },
  "promptiris.clintware.com": {
    name: "Prompt Iris", status: "BROWSER MVP · YC #5",
    headline: "Measure AI efficiency by outcome quality, not token count alone.",
    problem: "Cheaper or shorter prompts are not efficient when they create retries, correction work, weak outputs, or slow completion.",
    current: "Browser MVP scores prompt composition and combines outcome quality with retries, token use, cost, and latency.",
    next: "Connect provider telemetry and prove that outside users or teams change behavior based on the measurement.",
    detail: "https://www.clintware.com/tools/prompt-iris/"
  },
  "orgsynapse.clintware.com": {
    name: "OrgSynapse", status: "WORKING ALPHA · YC #7",
    headline: "One shared operational state, many role-specific views.",
    problem: "Departments keep separate systems of record and then spend human effort reconciling the same company reality.",
    current: "CRM-first local alpha connects accounts, people, work, signals, activity, role lenses, search, and portable state.",
    next: "Prove outside-team use and connect production systems without turning the product into another dashboard layer.",
    detail: "https://www.clintware.com/tools/orgsynapse/"
  },
  "portability.clintware.com": {
    name: "Portability Check", status: "VALIDATION TRACK · YC #9",
    headline: "Find out whether an AI-built application can actually operate independently.",
    problem: "AI-generated apps can look finished while remaining dependent on hidden hosting, auth, database, storage, email, secret, deployment, or vendor assumptions.",
    current: "The assessment method covers source ownership, hosting, auth, database, storage, email, secrets, migrations, deployment, documentation, and lock-in.",
    next: "Prove outside assessment demand and paid remediation before expanding automation.",
    detail: "https://www.clintware.com/tools/portability-check/"
  }
};
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function page(v,host){return `<!doctype html><html lang="en"><head><script async src="https://www.googletagmanager.com/gtag/js?id=G-DCY144YM9P"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-DCY144YM9P",{anonymize_ip:true});</script><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(v.headline)}"><link rel="canonical" href="https://${host}/"><title>${esc(v.name)} | Clintware</title><style>:root{color-scheme:dark;--bg:#070a0f;--line:#26323d;--text:#edf5fb;--muted:#94a7b8;--cyan:#6ed8f2;--green:#6ef2b2}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:13.5px/1.65 "Cascadia Code",Consolas,monospace}.wrap{width:min(940px,calc(100% - 36px));margin:auto}.top{display:flex;justify-content:space-between;gap:14px;padding:18px 0;border-bottom:1px solid var(--line);font-size:11px}a{color:var(--cyan)}.hero{padding:42px 0 28px;border-bottom:1px solid var(--line)}.status{color:var(--green);font-size:10px}.hero h1{font-size:23px;line-height:1.3;max-width:760px;margin:12px 0}.hero p{color:#b4c2cd;max-width:760px}.section{padding:25px 0;border-bottom:1px solid #1f2933}.row{display:grid;grid-template-columns:150px 1fr;gap:20px;padding:14px 0;border-top:1px solid var(--line)}.label{color:var(--cyan);font-size:10px;text-transform:uppercase}.copy{color:var(--muted)}.copy strong{color:var(--text)}@media(max-width:650px){.row{grid-template-columns:1fr;gap:5px}}</style></head><body><header class="wrap top"><b>CLINTWARE / ${esc(v.name).toUpperCase()}</b><a href="https://www.clintware.com/startup/">YC venture index ↗</a></header><main><section class="hero"><div class="wrap"><div class="status">${esc(v.status)}</div><h1>${esc(v.headline)}</h1><p>This dedicated subdomain is the canonical venture page. Current proof and missing proof are shown separately.</p></div></section><section class="section"><div class="wrap"><div class="row"><div class="label">Problem</div><div class="copy"><strong>${esc(v.problem)}</strong></div></div><div class="row"><div class="label">What exists now</div><div class="copy">${esc(v.current)}</div></div><div class="row"><div class="label">Next evidence gate</div><div class="copy">${esc(v.next)}</div></div><div class="row"><div class="label">Build detail</div><div class="copy"><a href="${esc(v.detail)}">Open implementation notes / product detail ↗</a></div></div></div></section></main></body></html>`}
export default {async fetch(request){const url=new URL(request.url),v=VENTURES[url.hostname.toLowerCase()];if(!v)return new Response("Not found",{status:404});if(url.pathname==="/healthz")return Response.json({ok:true,service:"clintware-venture-pages",venture:v.name,version:"2026-09-19"});if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Method not allowed",{status:405,headers:{Allow:"GET, HEAD"}});if(url.pathname!=="/"&&url.pathname!=="/index.html")return Response.redirect("https://"+url.hostname+"/",302);return new Response(request.method==="HEAD"?null:page(v,url.hostname),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=300","content-security-policy":"default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'unsafe-inline'; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com; img-src 'self' data: https://www.google-analytics.com; base-uri 'none'; frame-ancestors 'none'; form-action 'none'","x-content-type-options":"nosniff","x-frame-options":"DENY"}})}};
