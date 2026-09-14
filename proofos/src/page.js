// ProofOS landing page — Clintware-branded, self-contained HTML.
// Palette and typography follow the Clintware brand system (dark, cyan/violet accents, Inter + mono).

export function renderPage({ version } = {}) {
  const v = version || "1.0.0";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ProofOS | Clintware live implementation intelligence</title>
<meta name="description" content="ProofOS is a live research system built by Clint Kosh: enter any company and get an implementation-focused brief with cited sources, served by a production Cloudflare Worker pipeline.">
<link rel="canonical" href="https://proof.clintware.com/">
<style>
:root{color-scheme:dark;--bg:#080a0e;--surface:#0f1319;--surface-2:#141a22;--surface-3:#1a212b;--text:#f4f7fb;--muted:#9da8b8;--subtle:#758194;--line:#252d38;--line-strong:#394554;--cyan:#68e4f6;--cyan-strong:#bdf7ff;--violet:#a894ff;--green:#82e7b4;--gold:#f0bd72;--danger:#ff9c92;--max:1160px;--radius:16px;--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
*{box-sizing:border-box}html{scroll-behavior:smooth}body,h1,h2,h3,p,ul{margin:0}button,input{font:inherit}button{color:inherit}
body{min-height:100vh;background:radial-gradient(circle at 16% -8%,rgb(104 228 246/.08),transparent 30rem),radial-gradient(circle at 92% 0%,rgb(168 148 255/.07),transparent 28rem),var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:15.5px;line-height:1.58;letter-spacing:-.005em}
.wrap{max-width:var(--max);margin:auto;padding:0 22px}
a{color:var(--cyan);text-decoration:none}a:hover{text-decoration:underline}
header.top{border-bottom:1px solid var(--line)}.top-in{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 0}
.brand{display:flex;align-items:baseline;gap:10px}.brand .mark{font:700 15px/1 var(--mono);color:var(--text);letter-spacing:.02em}.brand .mark b{color:var(--cyan)}
.brand .tag{font:400 11px/1.4 var(--mono);color:var(--subtle);text-transform:uppercase;letter-spacing:.14em}
nav.top-links{display:flex;gap:16px;flex-wrap:wrap}nav.top-links a{font:600 11px/1.5 var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:.1em}
.status-chip{display:inline-flex;align-items:center;gap:7px;font:600 10.5px/1 var(--mono);color:var(--green);border:1px solid var(--line-strong);border-radius:999px;padding:7px 12px;text-transform:uppercase;letter-spacing:.08em}
.status-chip .dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)}
.hero{padding:52px 0 34px;border-bottom:1px solid var(--line)}
.hero .kicker{font:700 10.5px/1 var(--mono);color:var(--violet);text-transform:uppercase;letter-spacing:.22em}
.hero h1{font-size:clamp(28px,4.6vw,44px);line-height:1.12;letter-spacing:-.02em;margin:14px 0 12px;max-width:22ch}
.hero h1 em{font-style:normal;color:var(--cyan)}
.hero p.lede{color:var(--muted);max-width:60ch;font-size:16.5px}
.section{padding:38px 0;border-bottom:1px solid var(--line)}
h2.sec{font-size:13px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.18em;color:var(--cyan);margin-bottom:20px}
.brief-form{display:flex;gap:10px;flex-wrap:wrap}
.brief-form input{flex:1;min-width:240px;background:var(--surface-2);border:1px solid var(--line-strong);border-radius:12px;color:var(--text);padding:13px 16px;outline:none}
.brief-form input:focus{border-color:var(--cyan)}
.brief-form button{background:var(--cyan);color:#06222a;font:700 12.5px/1 var(--mono);text-transform:uppercase;letter-spacing:.08em;border:0;border-radius:12px;padding:14px 22px;cursor:pointer}
.brief-form button:disabled{opacity:.55;cursor:wait}
.form-note{color:var(--subtle);font-size:12.5px;margin-top:10px}
.result{margin-top:26px;display:none}
.result .meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.badge{font:600 10.5px/1 var(--mono);text-transform:uppercase;letter-spacing:.06em;border:1px solid var(--line-strong);border-radius:8px;padding:6px 10px;color:var(--muted)}
.badge.ok{color:var(--green);border-color:rgb(130 231 180/.35)}
.badge.warn{color:var(--gold);border-color:rgb(240 189 114/.35)}
.badge.err{color:var(--danger);border-color:rgb(255 156 146/.35)}
.brief-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:24px 26px}
.brief-card h3{font:700 11px/1.4 var(--mono);color:var(--violet);text-transform:uppercase;letter-spacing:.14em;margin:22px 0 8px}
.brief-card h3:first-child{margin-top:0}
.brief-card p,.brief-card li{color:var(--text);font-size:14.5px}
.brief-card ul{padding-left:20px;margin:6px 0}
.error-box{background:rgb(255 156 146/.06);border:1px solid rgb(255 156 146/.3);border-radius:var(--radius);padding:18px 20px;color:var(--danger)}
.sources{margin-top:18px}
.sources h4{font:700 11px/1.4 var(--mono);color:var(--cyan);text-transform:uppercase;letter-spacing:.14em;margin-bottom:10px}
.source{display:flex;gap:10px;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px}
.source .n{font:700 11px/1 var(--mono);color:var(--subtle);min-width:26px}
.source .d{color:var(--subtle);font:500 10.5px/1.5 var(--mono)}
.source .fp{color:var(--green);font:600 9.5px/1 var(--mono);text-transform:uppercase;letter-spacing:.08em}
.pipeline{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.pipe-step{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.pipe-step .n{font:700 10px/1 var(--mono);color:var(--subtle);letter-spacing:.14em}
.pipe-step .t{font:700 13px/1.4 var(--mono);color:var(--text);margin-top:6px}
.pipe-step .d{color:var(--subtle);font-size:12px;margin-top:4px}
.cta-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
.cta{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:22px;display:flex;flex-direction:column;gap:8px}
.cta .t{font:700 14px/1.4 var(--mono)}
.cta .d{color:var(--muted);font-size:13px;flex:1}
.cta button{background:var(--surface-3);border:1px solid var(--line-strong);border-radius:10px;color:var(--cyan);font:700 11px/1 var(--mono);text-transform:uppercase;letter-spacing:.1em;padding:12px;cursor:pointer}
.cta button:hover{border-color:var(--cyan)}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.stat .v{font:700 22px/1.2 var(--mono);color:var(--cyan)}
.stat .l{font:600 10px/1.5 var(--mono);color:var(--subtle);text-transform:uppercase;letter-spacing:.12em;margin-top:4px}
footer.bottom{padding:26px 0 40px;color:var(--subtle);font-size:12.5px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
footer.bottom .mono{font-family:var(--mono)}
@media (max-width:640px){.top-in{flex-direction:column;align-items:flex-start}}
</style>
</head>
<body>
<header class="top"><div class="wrap top-in">
  <div class="brand"><span class="mark">Proof<b>OS</b></span><span class="tag">Clintware™</span></div>
  <nav class="top-links">
    <a href="#brief">Live brief</a><a href="#pipeline">How it works</a><a href="#connect">Connect</a><a href="https://www.clintware.com/">Clintware.com</a>
  </nav>
  <span class="status-chip" id="status-chip"><span class="dot"></span><span id="status-text">checking</span></span>
</div></header>

<div class="hero"><div class="wrap">
  <div class="kicker">Live system · Built and operated by Clint Kosh</div>
  <h1>Implementation intelligence, <em>proven live</em>.</h1>
  <p class="lede">Type any company. ProofOS researches it in real time and returns an implementation-focused brief with cited sources — through the same delivery pipeline used in production: routing, caching, provider fallback, evidence merge, and privacy-safe telemetry. Research runs through the Clintware Control Plane; no third-party API is called from the browser or the ProofOS runtime.</p>
</div></div>

<section class="section" id="brief"><div class="wrap">
  <h2 class="sec">Live company brief</h2>
  <form class="brief-form" id="brief-form">
    <input id="company" name="company" placeholder="Company to research, e.g. Gainsight" autocomplete="off" maxlength="80" required>
    <button type="submit" id="brief-btn">Research</button>
  </form>
  <p class="form-note">Runs a live research call server-side. Results are cached 12h; citations come straight from the sources.</p>
  <div class="result" id="result"></div>
</div></section>

<section class="section" id="pipeline"><div class="wrap">
  <h2 class="sec">How this works</h2>
  <div class="pipeline">
    <div class="pipe-step"><div class="n">01</div><div class="t">Visitor action</div><div class="d">Company query, validated and rate-limited at the edge.</div></div>
    <div class="pipe-step"><div class="n">02</div><div class="t">Router decision</div><div class="d">Fresh cache, stale fallback, or live research — chosen per request.</div></div>
    <div class="pipe-step"><div class="n">03</div><div class="t">Live research</div><div class="d">Routed through the Clintware Control Plane server-side; providers and credentials stay behind Clintware infrastructure.</div></div>
    <div class="pipe-step"><div class="n">04</div><div class="t">Evidence merge</div><div class="d">Answer sections merged with cited sources and first-party detection.</div></div>
    <div class="pipe-step"><div class="n">05</div><div class="t">Provenance</div><div class="d">One request_id tracks the whole analysis end to end.</div></div>
    <div class="pipe-step"><div class="n">06</div><div class="t">Telemetry</div><div class="d">Privacy-safe events to the Clintware Control Plane: latency, cost, cache, conversions.</div></div>
  </div>
</div></section>

<section class="section" id="connect"><div class="wrap">
  <h2 class="sec">Connect with Clint</h2>
  <div class="cta-row">
    <div class="cta"><div class="t">Work history</div><div class="d">Implementations background, systems work, and delivery results.</div><button data-action="resume">View work history</button></div>
    <div class="cta"><div class="t">Contact</div><div class="d">Direct line for implementation and operations conversations.</div><button data-action="contact">Open contact page</button></div>
    <div class="cta"><div class="t">Intro meeting</div><div class="d">Book a live intro slot on Clint's scheduling system.</div><button data-action="meeting">Book a meeting</button></div>
  </div>
</div></section>

<section class="section"><div class="wrap">
  <h2 class="sec">Live system stats</h2>
  <p class="form-note" style="margin:0 0 16px">Served from ProofOS telemetry via the Clintware Control Plane (last 30 days, privacy-safe aggregates).</p>
  <div class="stats-grid" id="stats">
    <div class="stat"><div class="v">—</div><div class="l">Requests</div></div>
    <div class="stat"><div class="v">—</div><div class="l">Sessions</div></div>
    <div class="stat"><div class="v">—</div><div class="l">Cache hit rate</div></div>
    <div class="stat"><div class="v">—</div><div class="l">Success rate</div></div>
  </div>
</div></section>

<footer class="bottom"><div class="wrap" style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:0">
  <span>ProofOS v${v} · <a href="https://www.clintware.com/">Clintware™</a> · <a href="https://www.clintware.com/privacy/">Privacy</a></span>
  <span class="mono">proof.clintware.com</span>
</div></footer>

<script>
(function(){
  var chip=document.getElementById('status-text');
  fetch('/health').then(function(r){return r.json()}).then(function(h){
    chip.textContent=h.ok?'live':'degraded';
    if(!h.ok){document.querySelector('.status-chip').style.color='var(--gold)';}
  }).catch(function(){chip.textContent='degraded';});

  function esc(s){var d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML}
  function md(s){return esc(s).replace(/\\*\\*([^*]+)\\*\\*/g,'<strong>$1</strong>').replace(/\\[([^\\]]+)\\]\\((https?:[^)\\s]+)\\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\`([^\`]+)\`/g,'<code>$1</code>')}

  var form=document.getElementById('brief-form'),btn=document.getElementById('brief-btn'),
      out=document.getElementById('result'),input=document.getElementById('company');
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var company=input.value.trim();if(!company)return;
    btn.disabled=true;btn.textContent='Researching…';
    out.style.display='block';
    out.innerHTML='<div class="meta"><span class="badge">Running live research…</span></div>';
    fetch('/api/brief',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({company:company})})
      .then(function(r){return r.json().then(function(j){return {status:r.status,body:j}})})
      .then(function(res){
        var b=res.body;
        if(b.mode==='research_unavailable'){
          out.innerHTML='<div class="brief-card" style="border-color:rgba(240,189,114,.45)"><h3 style="color:var(--gold)">Pipeline live — research pending activation</h3><p>'+esc(b.notice||'Live research is pending activation on the Clintware Control Plane.')+'</p><p style="opacity:.7">Routing, caching, telemetry, and conversion tracking are fully operational.</p>'+(b.request_id?'<p style="font-family:var(--mono);font-size:11px;opacity:.6">request '+esc(b.request_id)+'</p>':'')+'</div>';
          return;
        }
        if(res.status!==200||b.error){
          out.innerHTML='<div class="error-box"><strong>Research failed</strong><br>'+esc(b.detail||b.error||'Unknown error')+(b.request_id?'<br><span style="font-family:var(--mono);font-size:11px;opacity:.7">request '+esc(b.request_id)+'</span>':'')+'</div>';
          return;
        }
        var badges=[
          '<span class="badge ok">'+esc(b.cache_status==='hit'?'cache hit':(b.cache_status==='stale_fallback'?'stale fallback':'live research'))+'</span>',
          b.provider?'<span class="badge">'+esc(b.provider)+'</span>':'',
          b.model?'<span class="badge">'+esc(b.model)+'</span>':'',
          b.usage&&b.usage.total_tokens?'<span class="badge">'+esc(b.usage.total_tokens)+' tokens</span>':'',
          '<span class="badge">'+esc((b.sources||[]).length)+' sources</span>',
          b.request_id?'<span class="badge">req '+esc(String(b.request_id).slice(0,8))+'</span>':''
        ].join('');
        var html='<div class="meta">'+badges+'</div>';
        if(b.warning)html+='<div class="error-box" style="margin-bottom:14px">'+esc(b.warning)+'</div>';
        html+='<div class="brief-card">';
        (b.brief||[]).forEach(function(s){
          html+='<h3>'+esc(s.title)+'</h3>';
          String(s.body||'').split(/\\n\\n+/).forEach(function(p){if(p.trim())html+='<p>'+md(p.trim())+'</p>'});
        });
        html+='</div>';
        if(b.sources&&b.sources.length){
          html+='<div class="sources"><h4>Sources</h4>';
          b.sources.forEach(function(s,i){
            html+='<div class="source"><span class="n">'+(i+1).toString().padStart(2,'0')+'</span><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title)+'</a>'+(s.first_party?' <span class="fp">first-party</span>':'')+'<span class="d">'+esc(s.domain)+'</span></div>';
          });
          html+='</div>';
        }
        out.innerHTML=html;
      })
      .catch(function(){out.innerHTML='<div class="error-box">Network error — try again.</div>'})
      .finally(function(){btn.disabled=false;btn.textContent='Research'});
  });

  document.querySelectorAll('.cta button').forEach(function(el){
    el.addEventListener('click',function(){
      var action=el.getAttribute('data-action');
      fetch('/api/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:action})})
        .then(function(r){return r.json()})
        .then(function(j){if(j&&j.target)window.location.href=j.target})
        .catch(function(){window.location.href='https://www.clintware.com/contact/'});
    });
  });

  fetch('/api/summary').then(function(r){return r.json()}).then(function(s){
    if(!s.ok)return;
    var d=s.summary||{},cells=document.querySelectorAll('#stats .stat .v');
    var vals=[(d.event_count!=null?d.event_count:'—'),(d.unique_sessions!=null?d.unique_sessions:'—'),
              (d.cache_hit_rate!=null?Math.round(d.cache_hit_rate*100)+'%':'—'),(d.success_rate!=null?Math.round(d.success_rate*100)+'%':'—')];
    cells.forEach(function(c,i){c.textContent=vals[i]});
  }).catch(function(){});
})();
</script>
</body>
</html>`;
}
