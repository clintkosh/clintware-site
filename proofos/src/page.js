// ProofOS landing page — Clintware-branded, self-contained HTML.
// Live metrics come from ProofOS telemetry through the Clintware Control Plane.
// Company research separates sourced intelligence from inference.

export function renderPage({ version } = {}) {
  const v = version || "1.0.0";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ProofOS | Don't just read my résumé. Test me.</title>
<meta name="description" content="ProofOS shows how Clint Kosh approaches customer onboarding and implementation by researching a company, citing the evidence, and separating known facts from inferred recommendations.">
<link rel="canonical" href="https://proof.clintware.com/">
<style>
:root{color-scheme:dark;--bg:#080a0e;--surface:#0f1319;--surface-2:#141a22;--surface-3:#1a212b;--text:#f4f7fb;--muted:#9da8b8;--subtle:#758194;--line:#252d38;--line-strong:#394554;--cyan:#68e4f6;--cyan-strong:#bdf7ff;--violet:#a894ff;--green:#82e7b4;--gold:#f0bd72;--danger:#ff9c92;--max:1160px;--radius:16px;--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body,h1,h2,h3,h4,p,ul{margin:0}
button,input{font:inherit}
button{color:inherit}
body{min-height:100vh;background:radial-gradient(circle at 16% -8%,rgb(104 228 246/.08),transparent 30rem),radial-gradient(circle at 92% 0%,rgb(168 148 255/.07),transparent 28rem),var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:15.5px;line-height:1.58;letter-spacing:-.005em}
a{color:var(--cyan);text-decoration:none}
a:hover{text-decoration:underline}
a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid var(--cyan);outline-offset:3px;border-radius:4px}
.skip-link{position:absolute;top:-50px;left:0;background:var(--surface-3);color:var(--cyan);padding:10px 16px;font:700 12px/1 var(--mono);text-transform:uppercase;letter-spacing:.08em;z-index:100;border:1px solid var(--line-strong);border-radius:0 0 8px 0}
.skip-link:focus{top:0}
.wrap{max-width:var(--max);margin:auto;padding:0 22px}
.metrics-ticker{overflow:hidden;border-bottom:1px solid var(--line);background:rgba(10,13,18,.97);min-height:35px}
.ticker-window{overflow:hidden;white-space:nowrap}
.ticker-track{display:inline-flex;min-width:max-content;align-items:center;animation:proofTicker 50s linear infinite;will-change:transform}
.ticker-set{display:inline-flex;align-items:center;gap:32px;padding:10px 32px 10px 0}
.tick{font:600 10.5px/1 var(--mono);text-transform:uppercase;letter-spacing:.09em;color:var(--muted)}
.tick b{color:var(--cyan-strong);font-weight:700}
.tick .good{color:var(--green)}
.metrics-ticker:hover .ticker-track{animation-play-state:paused}
@keyframes proofTicker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
header.top{border-bottom:1px solid var(--line)}
.top-in{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 0}
.brand{display:flex;align-items:baseline;gap:10px}
.brand .mark{font:700 15px/1 var(--mono);color:var(--text);letter-spacing:.02em}
.brand .mark b{color:var(--cyan)}
.brand .tag{font:400 11px/1.4 var(--mono);color:var(--subtle);text-transform:uppercase;letter-spacing:.14em}
nav.top-links{display:flex;gap:16px;flex-wrap:wrap}
nav.top-links a{font:600 11px/1.5 var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:.1em}
.status-chip{display:inline-flex;align-items:center;gap:7px;font:600 10.5px/1 var(--mono);color:var(--green);border:1px solid var(--line-strong);border-radius:999px;padding:7px 12px;text-transform:uppercase;letter-spacing:.08em}
.status-chip .dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)}
.hero{padding:48px 0 34px;border-bottom:1px solid var(--line)}
.hero .kicker{font:700 10.5px/1 var(--mono);color:var(--violet);text-transform:uppercase;letter-spacing:.22em}
.hero h1{font-size:clamp(28px,4.8vw,46px);line-height:1.1;letter-spacing:-.025em;margin:14px 0 14px;max-width:24ch}
.hero h1 em{font-style:normal;color:var(--cyan)}
.hero p.lede{color:var(--muted);max-width:69ch;font-size:16.5px}
.hero .plain{color:var(--text);max-width:69ch;font-size:14px;margin-top:16px}
.hero .test-me{font:700 13px/1.4 var(--mono);color:var(--cyan-strong);text-transform:uppercase;letter-spacing:.12em;margin-top:20px;display:inline-block;border:1px solid rgb(104 228 246/.3);border-radius:10px;padding:10px 16px;background:rgb(104 228 246/.05)}
.section{padding:36px 0;border-bottom:1px solid var(--line)}
h2.sec{font-size:13px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.18em;color:var(--cyan);margin-bottom:20px}
.hiring-banner{background:linear-gradient(135deg,rgb(104 228 246/.06),rgb(168 148 255/.06));border:1px solid rgb(104 228 246/.2);border-radius:var(--radius);padding:28px 30px}
.hiring-banner .label{font:700 10.5px/1 var(--mono);color:var(--violet);text-transform:uppercase;letter-spacing:.22em;margin-bottom:12px}
.hiring-banner h2{font-size:clamp(20px,3vw,28px);line-height:1.2;letter-spacing:-.015em;margin-bottom:10px;max-width:34ch}
.hiring-banner p{color:var(--muted);font-size:14.5px;max-width:67ch}
.hiring-banner .secondary{color:var(--subtle);font:500 12.5px/1.55 var(--mono);margin-top:12px}
.brief-form{display:flex;gap:10px;flex-wrap:wrap}
.brief-form label{position:absolute;left:-9999px}
.brief-form input{flex:1;min-width:240px;background:var(--surface-2);border:1px solid var(--line-strong);border-radius:12px;color:var(--text);padding:14px 16px;outline:none;font-size:15px}
.brief-form input:focus{border-color:var(--cyan)}
.brief-form button{background:var(--cyan);color:#06222a;font:700 12.5px/1 var(--mono);text-transform:uppercase;letter-spacing:.08em;border:0;border-radius:12px;padding:14px 22px;cursor:pointer;min-height:48px}
.brief-form button:disabled{opacity:.55;cursor:wait}
.form-note{color:var(--subtle);font-size:12.5px;margin-top:10px;max-width:78ch}
.result{margin-top:26px;display:none}
.result .meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.badge{font:600 10.5px/1 var(--mono);text-transform:uppercase;letter-spacing:.06em;border:1px solid var(--line-strong);border-radius:8px;padding:6px 10px;color:var(--muted)}
.badge.ok{color:var(--green);border-color:rgb(130 231 180/.35)}
.badge.warn{color:var(--gold);border-color:rgb(240 189 114/.35)}
.evidence-legend{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px;padding:10px 14px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px}
.evidence-legend .tier{display:inline-flex;align-items:center;gap:6px;font:600 10px/1 var(--mono);text-transform:uppercase;letter-spacing:.08em}
.evidence-legend .swatch{width:8px;height:8px;border-radius:2px;flex-shrink:0}
.evidence-legend .external{color:var(--cyan)}
.evidence-legend .external .swatch{background:var(--cyan)}
.evidence-legend .inference{color:var(--gold)}
.evidence-legend .inference .swatch{background:var(--gold)}
.evidence-legend .internal{color:var(--green)}
.evidence-legend .internal .swatch{background:var(--green)}
.brief-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:24px 26px}
.brief-card h3{font:700 11px/1.4 var(--mono);color:var(--violet);text-transform:uppercase;letter-spacing:.14em;margin:22px 0 8px}
.brief-card h3:first-child{margin-top:0}
.brief-card p{color:var(--text);font-size:14.5px;margin-top:9px}
.inference-note{margin-top:16px;padding:10px 12px;background:rgb(240 189 114/.06);border:1px solid rgb(240 189 114/.2);border-radius:8px;font:500 12px/1.55 var(--mono);color:var(--gold)}
.error-box{background:rgb(255 156 146/.06);border:1px solid rgb(255 156 146/.3);border-radius:var(--radius);padding:18px 20px;color:var(--danger)}
.sources{margin-top:18px}
.sources h4{font:700 11px/1.4 var(--mono);color:var(--cyan);text-transform:uppercase;letter-spacing:.14em;margin-bottom:10px}
.source{display:flex;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px;flex-wrap:wrap}
.source .n{font:700 11px/1 var(--mono);color:var(--subtle);min-width:26px}
.source .source-kind{font:600 9px/1 var(--mono);text-transform:uppercase;letter-spacing:.08em;padding:3px 6px;border-radius:4px;color:var(--cyan);background:rgb(104 228 246/.08);border:1px solid rgb(104 228 246/.18)}
.source .source-kind.first{color:var(--green);background:rgb(130 231 180/.08);border-color:rgb(130 231 180/.18)}
.source .d{color:var(--subtle);font:500 10.5px/1.5 var(--mono);margin-left:auto}
.source a{word-break:break-word;overflow-wrap:anywhere}
.pipeline{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px}
.pipe-step{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.pipe-step .n{font:700 10px/1 var(--mono);color:var(--subtle);letter-spacing:.14em}
.pipe-step .t{font:700 13px/1.4 var(--mono);color:var(--text);margin-top:6px}
.pipe-step .d{color:var(--subtle);font-size:12px;margin-top:4px}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.stat .v{font:700 22px/1.2 var(--mono);color:var(--cyan)}
.stat .l{font:600 10px/1.5 var(--mono);color:var(--subtle);text-transform:uppercase;letter-spacing:.12em;margin-top:4px}
.cta-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
.cta{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:22px;display:flex;flex-direction:column;gap:8px}
.cta .t{font:700 14px/1.4 var(--mono)}
.cta .d{color:var(--muted);font-size:13px;flex:1}
.cta button{background:var(--surface-3);border:1px solid var(--line-strong);border-radius:10px;color:var(--cyan);font:700 11px/1 var(--mono);text-transform:uppercase;letter-spacing:.1em;padding:12px;cursor:pointer;min-height:44px}
footer.bottom{padding:26px 0 40px;color:var(--subtle);font-size:12.5px}
footer.bottom .footer-in{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
footer.bottom .mono{font-family:var(--mono)}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}.ticker-window{overflow-x:auto}.ticker-track{transform:none!important}}
@media (max-width:768px){.top-in{flex-direction:column;align-items:flex-start;gap:12px}.hero{padding:36px 0 26px}.hero h1{max-width:none}.hero p.lede{font-size:15px}.brief-form{flex-direction:column}.brief-form input{min-width:0;width:100%}.brief-form button{width:100%}.brief-card{padding:18px 16px}.hiring-banner{padding:20px 18px}.source{flex-direction:column;gap:4px}.source .d{margin-left:0}.cta-row{grid-template-columns:1fr}.evidence-legend{flex-direction:column;gap:8px}}
@media (max-width:480px){body{font-size:14.5px}.wrap{padding:0 16px}.hero h1{font-size:25px}.stat .v{font-size:18px}.ticker-set{gap:24px;padding-right:24px}}
</style>
</head>
<body>
<a href="#main" class="skip-link">Skip to main content</a>
<div class="metrics-ticker" aria-label="Live ProofOS metrics"><div class="ticker-window"><div class="ticker-track" id="ticker-track"><span class="ticker-set"><span class="tick"><b>LIVE</b> loading current ProofOS telemetry&hellip;</span></span></div></div></div>
<header class="top"><div class="wrap top-in">
  <div class="brand"><span class="mark">Proof<b>OS</b></span><span class="tag">Clintware&trade;</span></div>
  <nav class="top-links" aria-label="Primary navigation"><a href="#brief">Run it</a><a href="#pipeline">How it works</a><a href="#hiring">Why I built it</a><a href="#stats">Live stats</a><a href="#connect">Connect</a></nav>
  <span class="status-chip" id="status-chip" role="status" aria-live="polite"><span class="dot" aria-hidden="true"></span><span id="status-text">checking</span></span>
</div></header>

<main id="main">
<div class="hero"><div class="wrap">
  <div class="kicker">Live system &middot; Built and operated by Clint Kosh</div>
  <h1>Don't just read my r&eacute;sum&eacute;. <em>Test me.</em></h1>
  <p class="lede">ProofOS shows how I work, not just what I say I can do. Give it a company and it researches how that company gets customers from purchase to value using public evidence. If the company publishes an onboarding or implementation path, ProofOS maps it. If it does not, ProofOS says that plainly and proposes a practical path from the product, customer type, implementation signals, and cited evidence &mdash; with the suggestion clearly labeled as inference.</p>
  <p class="plain">The useful part is not a polished paragraph about me. It is seeing whether I can take an unfamiliar company, find what is actually known, separate it from what is not, and turn that into a workable Customer Success and implementation approach.</p>
  <span class="test-me">Give it a company and see what it finds &rarr;</span>
</div></div>

<section class="section" id="hiring"><div class="wrap">
  <div class="hiring-banner">
    <div class="label">For Hiring Managers</div>
    <h2>See how I would reason through your customer journey.</h2>
    <p>Enter your company. If your onboarding process is publicly documented, ProofOS reconstructs it from the source material. If it is not public, it says that instead of guessing, then builds a sensible first-pass onboarding path and marks that part as inference.</p>
    <p class="secondary">That distinction matters: company facts stay company facts; my proposed approach stays visibly mine.</p>
  </div>
</section>

<section class="section" id="brief"><div class="wrap">
  <h2 class="sec">How does this company get a customer live?</h2>
  <form class="brief-form" id="brief-form">
    <label for="company">Company to research</label>
    <input id="company" name="company" placeholder="Company to research, e.g. Gainsight" autocomplete="off" maxlength="80" required aria-describedby="form-note">
    <button type="submit" id="brief-btn">Research</button>
  </form>
  <p class="form-note" id="form-note">Try a company you are interviewing with. ProofOS looks for public implementation and onboarding evidence first. If the process is not published, the result should say so and use a clearly labeled suggested path rather than presenting inference as company fact. Results are cached for 12 hours.</p>
  <div class="result" id="result" role="region" aria-live="polite" aria-label="Research results"></div>
</div></section>

<section class="section" id="pipeline"><div class="wrap">
  <h2 class="sec">What happens after you type a company</h2>
  <div class="pipeline">
    <div class="pipe-step"><div class="n">01</div><div class="t">Find what is public</div><div class="d">Product, customers, implementation clues, onboarding material, recent changes.</div></div>
    <div class="pipe-step"><div class="n">02</div><div class="t">Prefer evidence</div><div class="d">First-party material is identified; other sources remain visible and cited.</div></div>
    <div class="pipe-step"><div class="n">03</div><div class="t">Map onboarding</div><div class="d">Published steps are reconstructed when the company makes them known.</div></div>
    <div class="pipe-step"><div class="n">04</div><div class="t">Fill the honest gap</div><div class="d">If onboarding is not public, a practical path can be proposed and labeled as inference.</div></div>
    <div class="pipe-step"><div class="n">05</div><div class="t">Keep provenance</div><div class="d">Sources, request IDs, provider route, and evidence boundaries stay attached.</div></div>
    <div class="pipe-step"><div class="n">06</div><div class="t">Measure the system</div><div class="d">Latency, cache use, success, sessions, and provider cost feed the live telemetry above.</div></div>
  </div>
</div></section>

<section class="section" id="stats"><div class="wrap">
  <h2 class="sec">Live system stats</h2>
  <p class="form-note" style="margin:0 0 16px">Pulled from ProofOS telemetry through the Clintware Control Plane. The top tape uses the same data.</p>
  <div class="stats-grid">
    <div class="stat"><div class="v" id="stat-runs">&mdash;</div><div class="l">Research runs</div></div>
    <div class="stat"><div class="v" id="stat-sessions">&mdash;</div><div class="l">Sessions</div></div>
    <div class="stat"><div class="v" id="stat-cache">&mdash;</div><div class="l">Cache hit rate</div></div>
    <div class="stat"><div class="v" id="stat-success">&mdash;</div><div class="l">System success</div></div>
  </div>
</div></section>

<section class="section" id="connect"><div class="wrap">
  <h2 class="sec">Connect with Clint</h2>
  <div class="cta-row">
    <div class="cta"><div class="t">Work history</div><div class="d">Customer Success, implementations, systems work, and delivery results.</div><button data-action="resume">View work history</button></div>
    <div class="cta"><div class="t">Contact</div><div class="d">Direct line for Customer Success, implementation, AI adoption, and operations conversations.</div><button data-action="contact">Open contact page</button></div>
    <div class="cta"><div class="t">Intro meeting</div><div class="d">Book a live intro slot.</div><button data-action="meeting">Book a meeting</button></div>
  </div>
</div></section>
</main>

<footer class="bottom"><div class="wrap footer-in">
  <span>ProofOS v${v} &middot; <a href="https://www.clintware.com/">Clintware&trade;</a> &middot; <a href="https://www.clintware.com/privacy/">Privacy</a> &middot; <a href="https://github.com/clintkosh/clintware-site">Source</a></span>
  <span class="mono">proof.clintware.com</span>
</div></footer>

<script>
(function(){
  var statusText=document.getElementById('status-text');
  fetch('/health').then(function(r){return r.json()}).then(function(h){
    statusText.textContent=h.ok?'live':'degraded';
    if(!h.ok)document.querySelector('.status-chip').style.color='var(--gold)';
  }).catch(function(){statusText.textContent='degraded'});

  function esc(s){var d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML}
  function safeUrl(s){try{var u=new URL(String(s));return (u.protocol==='https:'||u.protocol==='http:')?u.href:'#'}catch(e){return '#'}}
  function md(s){return esc(s).replace(/\\*\\*([^*]+)\\*\\*/g,'<strong>$1</strong>').replace(/\\[([0-9]+)\\]/g,'<span class="cite">[$1]</span>')}

  var form=document.getElementById('brief-form'),btn=document.getElementById('brief-btn'),out=document.getElementById('result'),input=document.getElementById('company');
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var company=input.value.trim();if(!company)return;
    btn.disabled=true;btn.textContent='Researching\u2026';out.style.display='block';out.innerHTML='<div class="meta"><span class="badge">Running live research\u2026</span></div>';
    fetch('/api/brief',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({company:company})})
      .then(function(r){return r.json().then(function(j){return {status:r.status,body:j}})})
      .then(function(res){
        var b=res.body||{};
        if(b.mode==='research_unavailable'){
          out.innerHTML='<div class="brief-card"><h3>Research temporarily unavailable</h3><p>'+esc(b.notice||'The research provider is temporarily unavailable.')+'</p></div>';return;
        }
        if(res.status!==200||b.error){
          out.innerHTML='<div class="error-box"><strong>Research failed</strong><br>'+esc(b.detail||b.error||'Unknown error')+'</div>';return;
        }
        var badges=[
          '<span class="badge ok">'+esc(b.cache_status==='hit'?'cache hit':(b.cache_status==='stale_fallback'?'stale fallback':'live research'))+'</span>',
          b.provider?'<span class="badge">'+esc(b.provider)+'</span>':'',
          b.model?'<span class="badge">'+esc(b.model)+'</span>':'',
          '<span class="badge">'+esc((b.sources||[]).length)+' sources</span>',
          b.request_id?'<span class="badge">req '+esc(String(b.request_id).slice(0,8))+'</span>':''
        ].join('');
        var html='<div class="meta">'+badges+'</div>';
        html+='<div class="evidence-legend" role="list">';
        html+='<span class="tier external" role="listitem"><span class="swatch" aria-hidden="true"></span>External intelligence</span>';
        html+='<span class="tier inference" role="listitem"><span class="swatch" aria-hidden="true"></span>Inference</span>';
        html+='<span class="tier internal" role="listitem"><span class="swatch" aria-hidden="true"></span>Internal evidence reserved for Clint&#39;s own work artifacts</span>';
        html+='</div><div class="brief-card">';
        var sawInference=false;
        (b.brief||[]).forEach(function(s){
          var title=String(s.title||'');
          var body=String(s.body||'');
          if(/inference|suggested onboarding/i.test(title+' '+body))sawInference=true;
          html+='<h3>'+esc(title)+'</h3>';
          body.split(/\\n\\n+/).forEach(function(p){if(p.trim())html+='<p>'+md(p.trim())+'</p>'});
        });
        if(sawInference)html+='<div class="inference-note">The suggested onboarding path is an inferred recommendation based on cited evidence. It is not presented as the company&#39;s published process.</div>';
        html+='</div>';
        if(b.sources&&b.sources.length){
          html+='<div class="sources"><h4>Sources</h4>';
          b.sources.forEach(function(s,i){
            var kind=s.first_party?'FIRST-PARTY SOURCE':'EXTERNAL SOURCE';
            html+='<div class="source"><span class="n">'+String(i+1).padStart(2,'0')+'</span><span class="source-kind '+(s.first_party?'first':'')+'">'+kind+'</span><a href="'+safeUrl(s.url)+'" target="_blank" rel="noopener">'+esc(s.title||s.url)+'</a><span class="d">'+esc(s.domain||'')+'</span></div>';
          });
          html+='</div>';
        }
        out.innerHTML=html;
        loadSummary();
      })
      .catch(function(){out.innerHTML='<div class="error-box">Network error &mdash; try again.</div>'})
      .finally(function(){btn.disabled=false;btn.textContent='Research'});
  });

  var initialCompany=new URLSearchParams(window.location.search).get('company');
  if(initialCompany){
    input.value=initialCompany.slice(0,80);
    setTimeout(function(){if(form.requestSubmit)form.requestSubmit();else btn.click();},0);
  }

  document.querySelectorAll('.cta button').forEach(function(el){
    el.addEventListener('click',function(){
      var action=el.getAttribute('data-action');
      fetch('/api/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:action})})
        .then(function(r){return r.json()}).then(function(j){if(j&&j.target)window.location.href=j.target})
        .catch(function(){window.location.href='https://www.clintware.com/contact/'});
    });
  });

  function pct(v){return v!=null?Math.round(Number(v)*100)+'%':'\u2014'}
  function loadSummary(){
    fetch('/api/summary').then(function(r){return r.json()}).then(function(s){
      if(!s.ok)return;
      var d=s.summary||{};
      var researchRuns=d.successful_research_runs!=null?d.successful_research_runs:(d.features&&d.features.brief!=null?d.features.brief:null);
      var sessions=d.unique_sessions!=null?d.unique_sessions:null;
      var cacheRate=pct(d.cache_hit_rate),success=pct(d.success_rate);
      document.getElementById('stat-runs').textContent=researchRuns!=null?researchRuns:'\u2014';
      document.getElementById('stat-sessions').textContent=sessions!=null?sessions:'\u2014';
      document.getElementById('stat-cache').textContent=cacheRate;
      document.getElementById('stat-success').textContent=success;
      var track=document.getElementById('ticker-track');
      if(track){
        var hits=d.cache_hits!=null?d.cache_hits:'\u2014';
        var cost=d.total_reported_api_cost!=null?'$'+Number(d.total_reported_api_cost).toFixed(4):'\u2014';
        var group=[
          '<span class="tick"><b class="good">LIVE</b> proof.clintware.com</span>',
          '<span class="tick"><b>'+esc(researchRuns!=null?researchRuns:'\u2014')+'</b> research runs</span>',
          '<span class="tick"><b>'+esc(success)+'</b> system success</span>',
          '<span class="tick"><b>'+esc(hits)+'</b> cache hits</span>',
          '<span class="tick"><b>'+esc(cacheRate)+'</b> cache hit rate</span>',
          '<span class="tick"><b>'+esc(sessions!=null?sessions:'\u2014')+'</b> sessions</span>',
          '<span class="tick"><b>'+esc(cost)+'</b> reported provider cost</span>'
        ].join('');
        var set='<span class="ticker-set">'+group+'</span>';track.innerHTML=set+set;
      }
    }).catch(function(){});
  }
  loadSummary();
})();
</script>
</body>
</html>`;
}
