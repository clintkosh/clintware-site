const PRODUCT = Object.freeze({
  name: "ShoulderSoldier",
  headline: "A user-interaction firewall for social engineering.",
  lede: "Evaluate risky email, browser, message, or AI-agent interactions before the user takes the dangerous action. The current build is an explainable deterministic evaluator, not a claimed production detection model."
});
const GA_ID = "G-DCY144YM9P";
const URL_RE = /https?:\/\/[^\s<>'\"]+/gi;

function text(value) { return String(value || "").trim(); }
function addSignal(signals, id, weight, detail) { signals.push({ id, weight, detail }); }
function hostFrom(value) { try { return new URL(value).hostname.toLowerCase(); } catch { return ""; } }
function inspectUrl(value, signals) {
  const url = text(value); if (!url) return;
  const host = hostFrom(url); if (!host) { addSignal(signals, "MALFORMED_URL", 12, "A supplied link could not be parsed cleanly."); return; }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) addSignal(signals, "IP_LITERAL_LINK", 24, "The link uses a raw IP address instead of a normal hostname.");
  if (host.includes("xn--")) addSignal(signals, "PUNYCODE_HOST", 20, "The hostname uses punycode and deserves independent verification.");
  if (/(^|\.)(bit\.ly|tinyurl\.com|t\.co|ow\.ly|is\.gd|buff\.ly|cutt\.ly)$/.test(host)) addSignal(signals, "SHORTENED_LINK", 10, "The destination is hidden behind a URL shortener.");
  if ((url.match(/@/g) || []).length) addSignal(signals, "URL_USERINFO", 18, "The link contains user-info syntax that can obscure the real destination.");
}

export function analyzeInteraction(input = {}) {
  const channel = ["email", "browser", "message", "agent_action"].includes(input.channel) ? input.channel : "message";
  const body = [input.content, input.requestedAction, input.attachment].map(text).filter(Boolean).join("\n");
  const lower = body.toLowerCase(); const signals = [];
  if (/\b(urgent|immediately|right now|final warning|act now|within \d+ (?:minutes|hours)|account (?:will be )?(?:closed|suspended|locked))\b/.test(lower)) addSignal(signals, "URGENCY_PRESSURE", 10, "The interaction uses time pressure or account-threat language.");
  if (/\b(password|passcode|one[- ]?time code|otp|mfa code|verification code|seed phrase|private key|recovery phrase)\b/.test(lower)) addSignal(signals, "CREDENTIAL_REQUEST", 25, "The interaction asks for authentication or recovery secrets.");
  if (/\b(wire|bank transfer|gift card|crypto|bitcoin|usdt|payment change|new bank|routing number|invoice payment)\b/.test(lower)) addSignal(signals, "PAYMENT_CHANGE", 22, "The interaction involves a high-risk payment or payout change.");
  if (/\b(anydesk|teamviewer|remote desktop|screen share|install this|run this file|enable macros?|disable (?:antivirus|security|mfa))\b/.test(lower)) addSignal(signals, "REMOTE_OR_EXECUTION_REQUEST", 24, "The interaction asks for remote access, code execution, or weakened security controls.");
  if (/\b(secret|confidential|customer data|social security|ssn|api key|token)\b/.test(lower) && /\b(send|share|upload|paste|forward|provide)\b/.test(lower)) addSignal(signals, "SENSITIVE_DATA_EXFIL", 22, "Sensitive information appears to be requested for transmission.");
  if (/\b(ceo|cfo|president|executive|boss|it support|help desk|security team)\b/.test(lower) && /\b(secret|don't tell|do not tell|bypass|exception|personally asked|off the record)\b/.test(lower)) addSignal(signals, "AUTHORITY_BYPASS", 18, "Authority language is paired with secrecy or a request to bypass normal process.");
  const attachment = text(input.attachment).toLowerCase();
  if (/\.(exe|scr|js|jse|vbs|vbe|bat|cmd|ps1|msi|iso|img|lnk|hta)$/.test(attachment)) addSignal(signals, "HIGH_RISK_ATTACHMENT", 24, "The attachment type can execute code or launch a script.");
  const urls = [...new Set([text(input.url), ...(body.match(URL_RE) || [])].filter(Boolean))]; urls.forEach((url) => inspectUrl(url, signals));
  if (channel === "agent_action" && /\b(send|post|purchase|pay|transfer|delete|install|execute|run|disable|grant|invite|publish)\b/.test(lower)) addSignal(signals, "AGENT_EXTERNAL_ACTION", 12, "An AI agent is requesting an external, financial, destructive, or privilege-changing action that should be confirmed against user intent.");

  const unique = []; const seen = new Set();
  for (const signal of signals) if (!seen.has(signal.id)) { seen.add(signal.id); unique.push(signal); }
  const score = Math.min(100, unique.reduce((sum, signal) => sum + signal.weight, 0));
  let tier = "low", recommendation = "Allow with normal caution";
  if (score >= 60) { tier = "high"; recommendation = "Stop and independently verify before acting"; }
  else if (score >= 30) { tier = "elevated"; recommendation = "Require explicit confirmation and verify the destination/request"; }
  else if (score >= 12) { tier = "caution"; recommendation = "Pause for a quick source and destination check"; }
  return { channel, score, tier, recommendation, signals: unique, urls_checked: urls.length, boundary: "Heuristic decision support only; no message or action is automatically blocked by this build." };
}

function escapeHtml(value) { return String(value || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]); }
function renderPage(hostname) {
  const canonical = `https://${hostname}/`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(PRODUCT.lede)}"><link rel="canonical" href="${canonical}"><meta name="theme-color" content="#070a0f"><title>ShoulderSoldier interaction risk evaluator | Clintware™</title><script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});</script><style>
:root{color-scheme:dark;--bg:#070a0f;--panel:#0b1017;--line:#25303c;--text:#edf5fb;--muted:#94a7b8;--green:#6ef2b2;--cyan:#6ed8f2;--amber:#ffc86a;--red:#ff858d;--mono:"Cascadia Code","Segoe UI Mono",monospace}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 5%,rgba(110,216,242,.06),transparent 28rem),var(--bg);color:var(--text);font:14px/1.6 system-ui,sans-serif}.wrap{width:min(1060px,calc(100% - 32px));margin:auto}.top{display:flex;justify-content:space-between;padding:18px 0;border-bottom:1px solid var(--line);font:700 11px var(--mono)}a{color:var(--cyan)}.hero{padding:40px 0 24px}.hero small{color:var(--green);font:700 11px var(--mono)}h1{font:650 clamp(25px,4vw,42px)/1.08 var(--mono);max-width:850px}.hero p{max-width:850px;color:#b2c0cc}.grid{display:grid;grid-template-columns:1fr 360px;gap:14px;padding-bottom:32px}.panel{border:1px solid var(--line);background:var(--panel);padding:18px}.field{display:grid;gap:6px;margin-bottom:12px}.field label{font:700 11px var(--mono);color:#c8d6df;text-transform:uppercase}.field select,.field input,.field textarea{background:#060b10;border:1px solid #354655;color:var(--text);padding:10px;width:100%}.field textarea{min-height:210px;resize:vertical}.button{background:#0d3b35;border:1px solid #28765f;color:#eafff6;padding:10px 13px;font:700 12px var(--mono);cursor:pointer}.score{font:700 44px var(--mono);margin:4px 0}.tier{font:700 12px var(--mono);text-transform:uppercase}.signals{display:grid;gap:8px;margin-top:14px}.signal{border-left:3px solid var(--amber);background:#0c141b;padding:10px}.signal b{display:block;font:700 11px var(--mono);color:var(--amber)}.muted{color:var(--muted)}.boundary{margin-top:16px;border-top:1px solid var(--line);padding-top:12px;color:var(--muted);font-size:12px}@media(max-width:780px){.grid{grid-template-columns:1fr}.top{gap:12px;flex-direction:column}}</style></head><body><header class="wrap top"><a href="https://www.clintware.com/">CLINTWARE™ / SHOULDERSOLDIER</a><a href="https://www.clintware.com/tools/shouldersoldier/">Product track</a></header><main class="wrap"><section class="hero"><small>WORKING HEURISTIC MVP · USER-INTERACTION FIREWALL</small><h1>${escapeHtml(PRODUCT.headline)}</h1><p>${escapeHtml(PRODUCT.lede)}</p></section><section class="grid"><div class="panel"><div class="field"><label for="channel">Interaction channel</label><select id="channel"><option value="email">Email</option><option value="browser">Browser / web</option><option value="message">Message / chat</option><option value="agent_action">AI agent requested action</option></select></div><div class="field"><label for="content">Message or interaction text</label><textarea id="content" placeholder="Paste the suspicious request or action here"></textarea></div><div class="field"><label for="url">Link (optional)</label><input id="url" placeholder="https://..."></div><div class="field"><label for="attachment">Attachment name (optional)</label><input id="attachment" placeholder="invoice.pdf or update.ps1"></div><div class="field"><label for="requestedAction">Requested action (optional)</label><input id="requestedAction" placeholder="Send code, pay invoice, install tool, grant access..."></div><button class="button" id="analyze">Evaluate interaction</button><p class="boundary">The browser sends only this form to ShoulderSoldier's own evaluator endpoint. This MVP uses deterministic rules and returns explainable signals. It does not claim ML phishing detection or automatic blocking.</p></div><aside class="panel"><div class="muted">Risk score</div><div class="score" id="score">—</div><div class="tier" id="tier">Not evaluated</div><p id="recommendation" class="muted">Run the evaluator to see the recommended intervention.</p><div id="signals" class="signals"></div></aside></section></main><script>
const $=id=>document.getElementById(id); $('analyze').addEventListener('click',async()=>{const payload={channel:$('channel').value,content:$('content').value,url:$('url').value,attachment:$('attachment').value,requestedAction:$('requestedAction').value};$('recommendation').textContent='Evaluating…';try{const r=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Evaluation failed');$('score').textContent=d.score;$('tier').textContent=d.tier;$('recommendation').textContent=d.recommendation;$('signals').replaceChildren(...d.signals.map(s=>{const x=document.createElement('div');x.className='signal';const b=document.createElement('b');b.textContent=s.id+' +'+s.weight;const p=document.createElement('span');p.textContent=s.detail;x.append(b,p);return x;}));if(!d.signals.length){const p=document.createElement('p');p.className='muted';p.textContent='No configured high-signal heuristic matched. This is not proof that the interaction is safe.';$('signals').replaceChildren(p);}}catch(e){$('recommendation').textContent=e.message;}});
</script></body></html>`;
}
function headers(type) { return {"Content-Type":type,"Cache-Control":"no-store","Content-Security-Policy":"default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'unsafe-inline'; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; base-uri 'none'; frame-ancestors 'none'","Referrer-Policy":"strict-origin-when-cross-origin","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY"}; }
export default { async fetch(request) {
  const url = new URL(request.url);
  if (url.pathname === "/api/analyze") {
    if (request.method !== "POST") return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:headers("application/json; charset=utf-8")});
    let input; try { input = await request.json(); } catch { return new Response(JSON.stringify({error:"Invalid JSON"}),{status:400,headers:headers("application/json; charset=utf-8")}); }
    return new Response(JSON.stringify(analyzeInteraction(input)),{headers:headers("application/json; charset=utf-8")});
  }
  if (url.pathname === "/healthz") return new Response(JSON.stringify({service:"ShoulderSoldier",version:"0.2.0",status:"ok",capability:"interaction-risk-evaluator"}),{headers:headers("application/json; charset=utf-8")});
  if (!["GET","HEAD"].includes(request.method)) return new Response("Method not allowed",{status:405,headers:{Allow:"GET, HEAD"}});
  if (url.pathname !== "/" && url.pathname !== "/index.html") return new Response("Not found",{status:404,headers:headers("text/plain; charset=utf-8")});
  return new Response(request.method === "HEAD" ? null : renderPage(url.hostname.toLowerCase()),{headers:headers("text/html; charset=utf-8")});
} };
