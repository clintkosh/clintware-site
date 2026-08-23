(()=>{
  const q=s=>document.querySelector(s);
  const fmt=n=>new Intl.NumberFormat(undefined,{notation:"compact",maximumFractionDigits:1}).format(Number(n||0));
  const pct=n=>`${Math.max(0,Math.min(100,Number(n||0))).toFixed(0)}%`;
  let usageData=null;

  function derive(){
    const events=(report&&report.events)||[];
    const runs=events.filter(e=>e.type==="run_complete");
    const external=runs.reduce((s,e)=>s+Number(e.sent_tokens_est||0),0);
    const local=runs.reduce((s,e)=>s+Number(e.local_tokens_est||0),0);
    const saved=runs.reduce((s,e)=>s+Number(e.net_tokens_saved_est||e.tokens_avoided_est||0),0);
    const raw=runs.reduce((s,e)=>s+Number(e.raw_tokens_est||0),0);
    const baseline=external+saved;
    const pressure=baseline?external/baseline*100:0;
    const avoided=baseline?saved/baseline*100:0;
    const localShare=local+external?local/(local+external)*100:0;

    const latestByDevice=new Map();
    for(const e of events){
      if(e.type!=="usage_plan_snapshot"||!e.metadata?.plans)continue;
      const key=e.device_id||"unknown";
      if(!latestByDevice.has(key)||Number(e.ts)>Number(latestByDevice.get(key).ts))latestByDevice.set(key,e);
    }
    const plans=[];const seen=new Set();
    for(const e of latestByDevice.values())for(const p of e.metadata.plans||[]){
      const key=p.plan_id||`${p.provider}:${p.plan_name}:${p.unit}`;
      if(seen.has(key))continue;seen.add(key);
      const allowance=Number(p.allowance||0),used=Number(p.used||0),remaining=allowance>0?Math.max(0,allowance-used):null;
      plans.push({...p,allowance,used,remaining,remaining_pct:allowance>0?remaining/allowance*100:null,device_id:e.device_id});
    }
    const known=plans.filter(p=>p.remaining_pct!==null);
    const byUnit={};
    for(const p of known){const u=byUnit[p.unit]||(byUnit[p.unit]={unit:p.unit,allowance:0,used:0,remaining:0,plans:0});u.allowance+=p.allowance;u.used+=p.used;u.remaining+=p.remaining;u.plans++}
    usageData={generated_at:new Date().toISOString(),consumption:{raw_tokens_est:raw,external_tokens_used_est:external,local_tokens_used_est:local,net_tokens_saved_est:saved,local_vs_external_delta_est:local-external,baseline_external_tokens_est:baseline,external_consumption_pressure_pct:pressure,avoided_external_pct:avoided,local_work_share_pct:localShare},plans,plans_summary:{connected:plans.length,provider_synced:plans.filter(p=>p.source==="provider_api").length,known_remaining:known.length,unknown_remaining:plans.length-known.length,normalized_remaining_pct:known.length?known.reduce((s,p)=>s+p.remaining_pct,0)/known.length:null,by_unit:Object.values(byUnit)}};
    return usageData;
  }

  function inject(){
    if(q("#view-usage"))return;
    const activityBtn=q('[data-view="activity"]');
    if(activityBtn){
      const b=document.createElement("button");b.className="nav-btn";b.dataset.view="usage";b.setAttribute("aria-label","Usage");b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19h16M6 16V9m4 7V5m4 11v-4m4 4V7"/></svg><span>Usage</span>';activityBtn.before(b);
    }
    const home=q("#view-home"), activity=q("#view-activity");
    const section=document.createElement("section");section.id="view-usage";section.className="view";section.dataset.title="Usage";
    section.innerHTML=`
      <div class="page-head"><div><div class="kicker">Consumption + headroom</div><h1>Usage & Savings</h1><p>External consumption falls as Quillgeist compacts or handles work locally. Plan balances are shown only when their source is known.</p></div><div class="actions"><button id="usageRefresh" class="btn primary">Refresh</button></div></div>
      <div class="usage-layout">
        <section class="panel usage-gauge-card glow"><div class="usage-ring" id="usageRing"><div><b id="usagePressure">0%</b><small>external pressure</small></div></div><div><div class="kicker">Lower is better</div><h2 id="usageAvoided">0% avoided</h2><p class="muted">External used ÷ (external used + net saved). The ring sinks as Quillgeist prevents external consumption.</p></div></section>
        <section class="panel"><div class="section-head"><div><h2>Overall</h2><p>Account telemetry across paired Nodes.</p></div><span id="usageSync" class="status-chip">online</span></div><div class="usage-stat-grid"><div><span>Saved</span><b id="uSaved">0</b></div><div><span>Local</span><b id="uLocal">0</b></div><div><span>External</span><b id="uExternal">0</b></div><div><span>Local − external</span><b id="uDelta">0</b></div><div><span>Baseline external</span><b id="uBaseline">0</b></div><div><span>Local work share</span><b id="uLocalShare">0%</b></div></div></section>
      </div>
      <div class="usage-bars panel"><div class="section-head"><div><h2>Work distribution</h2><p>Measured/estimated token flow recorded by Quillgeist.</p></div></div><div id="usageBars"></div></div>
      <section class="panel" style="margin-top:14px"><div class="section-head"><div><h2>Connected plans</h2><p>Provider API when available; otherwise manual or estimated. Unknown balances stay unknown.</p></div><div><b id="uPlanCount">0</b> <span class="muted">plans</span></div></div><div id="planSummary" class="usage-plan-summary"></div><div id="usagePlans" class="usage-plans"></div></section>`;
    (activity||home).before(section);
    if(home){const card=document.createElement("section");card.className="panel usage-home-card";card.style.marginTop="14px";card.innerHTML='<div class="section-head"><div><div class="kicker">Usage & Savings</div><h2 id="homeUsageHeadline">0% external pressure</h2><p id="homeUsageDetail">Waiting for Quillgeist consumption telemetry.</p></div><button class="btn ghost" data-view-jump="usage">Open usage</button></div>';home.querySelector(".metric-grid")?.after(card)}
    q("#usageRefresh")?.addEventListener("click",()=>refreshUsage(true));
    try{commands.push(["Usage & Savings","Consumption, local work, savings, and plan headroom","usage"])}catch{}
  }

  function bar(label,value,total){const w=total?Math.max(0,Math.min(100,value/total*100)):0;return `<div class="usage-bar-row"><div><span>${label}</span><b>${fmt(value)}</b></div><div class="usage-bar-track"><i style="width:${w}%"></i></div></div>`}
  function render(){
    if(!usageData)derive();const c=usageData.consumption,p=usageData.plans_summary;
    const pressure=c.external_consumption_pressure_pct||0;
    q("#usageRing")?.style.setProperty("--usage-pressure",`${pressure*3.6}deg`);if(q("#usagePressure"))q("#usagePressure").textContent=pct(pressure);if(q("#usageAvoided"))q("#usageAvoided").textContent=`${pct(c.avoided_external_pct)} avoided`;
    const vals={uSaved:fmt(c.net_tokens_saved_est),uLocal:fmt(c.local_tokens_used_est),uExternal:fmt(c.external_tokens_used_est),uDelta:fmt(c.local_vs_external_delta_est),uBaseline:fmt(c.baseline_external_tokens_est),uLocalShare:pct(c.local_work_share_pct)};for(const [id,v] of Object.entries(vals))if(q("#"+id))q("#"+id).textContent=v;
    const total=Math.max(1,c.external_tokens_used_est+c.net_tokens_saved_est+c.local_tokens_used_est);if(q("#usageBars"))q("#usageBars").innerHTML=bar("External used",c.external_tokens_used_est,total)+bar("External saved",c.net_tokens_saved_est,total)+bar("Local model",c.local_tokens_used_est,total);
    if(q("#uPlanCount"))q("#uPlanCount").textContent=p.connected;if(q("#planSummary"))q("#planSummary").innerHTML=`<span>${p.provider_synced} provider synced</span><span>${p.known_remaining} known balances</span><span>${p.unknown_remaining} unknown</span><span>overall headroom ${p.normalized_remaining_pct==null?"—":pct(p.normalized_remaining_pct)}</span>`;
    if(q("#usagePlans"))q("#usagePlans").innerHTML=usageData.plans.map(x=>`<article class="usage-plan"><div><div class="item-title">${esc(x.provider)} · ${esc(x.plan_name)}</div><div class="item-meta">${esc(x.source||"manual")} · ${esc(x.device_id||"")}${x.reset_at?` · resets ${esc(x.reset_at)}`:""}</div></div><div class="usage-plan-numbers"><b>${x.remaining==null?"Unknown":fmt(x.remaining)}</b><small>${x.remaining==null?"remaining not exposed":`${esc(x.unit)} remaining · ${pct(x.remaining_pct)}`}</small></div>${x.remaining_pct==null?"":`<div class="usage-plan-track"><i style="width:${Math.max(0,Math.min(100,x.remaining_pct))}%"></i></div>`}</article>`).join("")||'<div class="empty">No plan snapshot yet. Add plans in the Windows app; they synchronize through Quillgeist telemetry.</div>';
    if(q("#homeUsageHeadline"))q("#homeUsageHeadline").textContent=`${pct(pressure)} external pressure`;if(q("#homeUsageDetail"))q("#homeUsageDetail").textContent=`${fmt(c.net_tokens_saved_est)} tokens saved · ${fmt(c.local_tokens_used_est)} local · ${p.connected} connected plan${p.connected===1?"":"s"}.`;
  }

  async function refreshUsage(showToast=false){
    try{report=await api("/api/telemetry/report?limit=2000");derive();render();if(showToast)toast("Usage synchronized.")}catch(e){if(showToast)toast(e.message,"error")}
  }

  const style=document.createElement("style");style.textContent=`
    .usage-layout{display:grid;grid-template-columns:minmax(320px,.8fr) minmax(0,1.2fr);gap:14px}.usage-gauge-card{display:grid;grid-template-columns:180px 1fr;align-items:center;gap:22px}.usage-ring{--usage-pressure:0deg;width:160px;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--cyan) 0 var(--usage-pressure),rgba(255,255,255,.055) var(--usage-pressure) 360deg);position:relative}.usage-ring:after{content:"";position:absolute;inset:15px;border-radius:50%;background:var(--bg2);border:1px solid var(--line)}.usage-ring>div{z-index:1;text-align:center}.usage-ring b{display:block;font:800 30px/1 Consolas,monospace}.usage-ring small,.usage-stat-grid span,.usage-plan-numbers small{color:var(--muted);font-size:10px}.usage-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.usage-stat-grid>div{padding:12px;border:1px solid var(--line);border-radius:12px;background:rgba(3,7,12,.5)}.usage-stat-grid b{display:block;font:800 18px Consolas,monospace;margin-top:4px}.usage-bars{margin-top:14px}.usage-bar-row{margin:13px 0}.usage-bar-row>div:first-child{display:flex;justify-content:space-between;font-size:11px}.usage-bar-track,.usage-plan-track{height:8px;background:rgba(255,255,255,.05);border-radius:99px;overflow:hidden;margin-top:6px}.usage-bar-track i,.usage-plan-track i{display:block;height:100%;background:linear-gradient(90deg,var(--cyan),var(--violet));border-radius:inherit}.usage-plan-summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.usage-plan-summary span{border:1px solid var(--line);border-radius:999px;padding:5px 8px;color:var(--muted);font-size:10px}.usage-plans{display:grid;gap:8px}.usage-plan{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 16px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:13px;background:rgba(4,8,13,.55)}.usage-plan-track{grid-column:1/-1}.usage-plan-numbers{text-align:right}.usage-plan-numbers b{display:block;font:800 16px Consolas,monospace}@media(max-width:820px){.usage-layout{grid-template-columns:1fr}.usage-gauge-card{grid-template-columns:130px 1fr}.usage-ring{width:120px}.usage-stat-grid{grid-template-columns:repeat(2,1fr)}}`;
  document.head.append(style);inject();refreshUsage(false);setInterval(()=>{if(token()&&!document.hidden)refreshUsage(false)},20000);if(location.hash==="#usage")setTimeout(()=>setView("usage"),30);
})();
