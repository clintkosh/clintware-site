(()=>{
  const INSTALLER="https://github.com/clintkosh/clintware-site/releases/download/quillgeist-v0.3.1-alpha/Quillgeist-Setup-Windows-x64.exe";
  const $=s=>document.querySelector(s);
  const compact=new Intl.NumberFormat(undefined,{notation:"compact",maximumFractionDigits:1});
  const fmt=n=>compact.format(Number(n||0));
  const pct=n=>`${Number(n||0).toFixed(1)}%`;
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function sevenDayTrend(rows,key){
    const sorted=[...(rows||[])].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const latest=sorted.slice(-7).reduce((s,r)=>s+Number(r[key]||0),0);
    const prior=sorted.slice(-14,-7).reduce((s,r)=>s+Number(r[key]||0),0);
    if(!prior)return latest?100:0;
    return (latest-prior)/prior*100;
  }
  function trendLabel(value){
    if(!Number.isFinite(value))return "—";
    if(Math.abs(value)<0.5)return "flat vs prior 7d";
    return `${value>0?"+":""}${value.toFixed(0)}% vs prior 7d`;
  }

  function ensureWindowsInstall(){
    const top=$(".top-actions");
    if(top&&!$("#installWindowsTop")){
      const a=document.createElement("a");a.id="installWindowsTop";a.className="btn primary";a.href=INSTALLER;a.textContent="Install for Windows";a.setAttribute("download","");top.prepend(a);
    }
    const home=$("#view-home .page-head .actions");
    if(home&&!$("#installWindowsHome")){
      const a=document.createElement("a");a.id="installWindowsHome";a.className="btn primary";a.href=INSTALLER;a.textContent="Install Windows app";a.setAttribute("download","");home.prepend(a);
    }
  }

  function cardMarkup(idPrefix){return `
    <div class="impact-grid">
      <div class="impact-stat"><span>Prompts compiled</span><b id="${idPrefix}Prompts">0</b><small id="${idPrefix}PromptTrend">reported</small></div>
      <div class="impact-stat"><span>Tasks completed</span><b id="${idPrefix}Runs">0</b><small>execution runs</small></div>
      <div class="impact-stat"><span>Compactions</span><b id="${idPrefix}Compactions">0</b><small id="${idPrefix}CompactionRate">0% of runs</small></div>
      <div class="impact-stat"><span>Est. net tokens saved</span><b id="${idPrefix}Saved">0</b><small id="${idPrefix}SavingsTrend">reported</small></div>
    </div>
    <div class="impact-flow">
      <div><span>Before compaction</span><b id="${idPrefix}Raw">0</b></div><i>→</i><div><span>Sent externally</span><b id="${idPrefix}Sent">0</b></div><i>+</i><div><span>Local overhead</span><b id="${idPrefix}Local">0</b></div><i>=</i><div><span>Net saved</span><b id="${idPrefix}Net">0</b></div>
    </div>
    <div class="impact-foot"><span id="${idPrefix}Reduction">0% gross reduction</span><span id="${idPrefix}NetRate">0% net savings</span><span>Aggregate only · participating installs · no prompt content</span></div>`}

  function inject(){
    ensureWindowsInstall();
    const landingCopy=$(".landing-copy");
    if(landingCopy&&!$("#publicImpact")){
      const sec=document.createElement("section");sec.id="publicImpact";sec.className="public-impact";sec.innerHTML=`<div class="kicker">Live product impact</div><h2>Measured across participating Quillgeist installs</h2>${cardMarkup("pub")}`;landingCopy.append(sec);
    }
    const home=$("#view-home");
    if(home&&!$("#homeGlobalImpact")){
      const sec=document.createElement("section");sec.id="homeGlobalImpact";sec.className="panel global-impact";sec.style.marginTop="14px";sec.innerHTML=`<div class="section-head"><div><div class="kicker">Quillgeist network</div><h2>Global impact</h2><p>Aggregate usage reported by participating installations.</p></div></div>${cardMarkup("homeGlobal")}`;home.querySelector(".metric-grid")?.after(sec);
    }
  }

  function setText(id,value){const el=$("#"+id);if(el)el.textContent=value}
  function render(data){
    const m=data?.metrics||{},t=data?.trends||[];
    const promptTrend=sevenDayTrend(t,"prompts_compiled"),savingTrend=sevenDayTrend(t,"net_tokens_saved_est");
    for(const p of ["pub","homeGlobal"]){
      setText(p+"Prompts",fmt(m.prompts_compiled));setText(p+"Runs",fmt(m.runs));setText(p+"Compactions",fmt(m.compactions));setText(p+"Saved",fmt(m.net_tokens_saved_est));
      setText(p+"Raw",fmt(m.raw_tokens_est));setText(p+"Sent",fmt(m.sent_tokens_est));setText(p+"Local",fmt(m.local_tokens_est));setText(p+"Net",fmt(m.net_tokens_saved_est));
      setText(p+"CompactionRate",`${pct(m.compaction_rate_pct)} of runs · ${fmt(m.pass_through_runs)} pass-through`);
      setText(p+"Reduction",`${pct(m.gross_reduction_pct)} gross reduction`);setText(p+"NetRate",`${pct(m.net_savings_pct)} net savings`);
      setText(p+"PromptTrend",trendLabel(promptTrend));setText(p+"SavingsTrend",trendLabel(savingTrend));
    }
  }

  async function refresh(){
    try{const r=await fetch("/api/public/product-stats?days=30",{headers:{accept:"application/json"}});if(!r.ok)throw new Error(`stats ${r.status}`);render(await r.json());}catch(e){console.debug("Quillgeist public impact unavailable",e)}
  }

  const style=document.createElement("style");style.textContent=`
    .public-impact{margin-top:30px;padding:18px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(160deg,rgba(18,27,38,.66),rgba(7,11,17,.62));box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}.public-impact h2{font-size:18px!important;line-height:1.2!important;letter-spacing:-.02em!important;margin:7px 0 14px!important}.impact-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.impact-stat{padding:11px;border:1px solid var(--line);border-radius:12px;background:rgba(3,7,12,.52)}.impact-stat span,.impact-flow span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.08em}.impact-stat b{display:block;font:800 19px Consolas,monospace;margin:4px 0}.impact-stat small{color:var(--muted);font-size:9px}.impact-flow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr;gap:8px;align-items:center;margin-top:9px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:rgba(3,7,12,.35)}.impact-flow>div b{display:block;font:750 14px Consolas,monospace;margin-top:3px}.impact-flow>i{color:var(--cyan);font-style:normal}.impact-foot{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}.impact-foot span{font-size:9px;color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:4px 7px}.global-impact .impact-grid{margin-top:12px}@media(max-width:900px){.impact-grid{grid-template-columns:repeat(2,1fr)}.impact-flow{grid-template-columns:1fr 1fr}.impact-flow>i{display:none}}@media(max-width:520px){.impact-grid{grid-template-columns:1fr}.impact-flow{grid-template-columns:1fr}}
  `;document.head.append(style);
  inject();refresh();setInterval(()=>{if(!document.hidden)refresh()},120000);
  new MutationObserver(()=>ensureWindowsInstall()).observe(document.body,{childList:true,subtree:true});
})();
