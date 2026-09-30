(()=>{
  const $=s=>document.querySelector(s);
  const nf=new Intl.NumberFormat(undefined,{notation:"compact",maximumFractionDigits:1});
  const fmt=n=>nf.format(Number(n||0));
  const pct=n=>`${Number(n||0).toFixed(1)}%`;
  const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const milestones=[
    {date:"2026-09-30",kind:"INTERNAL PROOF",title:"Role-specific CRM factory passed full live verification",body:"Eight operating tracks, seven synthetic opportunity accounts, browser-local persistence, a valid generated PDF, theme switching, mobile layout, stakeholder create/reload persistence, and zero uncaught page or console errors passed in the live smoke.",evidence:"Measured execution; modeled cloud-model token reduction ≈30k–55k for this build (midpoint ≈42k), not billing telemetry."},
    {date:"2026-09-29",kind:"INTERNAL PROOF",title:"Reusable ASTRO build + browser verification path",body:"A role-specific CRM build used reviewed local execution for source refresh, materialization, checks, deploy, and live browser verification.",evidence:"Measured build/deploy 22.220s and live browser verification 13.560s in the anonymized case study; modeled token reduction ≈30k–60k."},
    {date:"2026-09-22",kind:"PRODUCT",title:"Delta-state context moved beyond recursive compaction",body:"Exact anchors, bounded working state, cold history, and just-in-time rehydration were added to reduce repeated context work while preserving hard requirements.",evidence:"Implemented product architecture; benchmark comparison remains a validation task."}
  ];
  function set(id,value){const el=$("#"+id);if(el)el.textContent=value}
  function renderSummary(data){
    const m=data.metrics||{};
    set("qgSaved",fmt(m.net_tokens_saved_est));set("qgRuns",fmt(m.runs));set("qgPrompts",fmt(m.prompts_compiled));set("qgFiles",fmt(m.files_changed));
    set("qgRaw",fmt(m.raw_tokens_est));set("qgSent",fmt(m.sent_tokens_est));set("qgLocal",fmt(m.local_tokens_est));set("qgNet",fmt(m.net_tokens_saved_est));set("qgRate",pct(m.net_savings_pct));
    const rows=(data.trends||[]).filter(r=>Number(r.prompts_compiled||0)+Number(r.runs||0)+Number(r.api_compactions||0)+Number(r.raw_tokens_est||0)+Number(r.net_tokens_saved_est||0)+Number(r.local_tokens_est||0)>0).slice().reverse();
    const feed=$("#qgDaily");
    if(feed)feed.innerHTML=rows.length?rows.map(r=>`<article class="journal-row"><div class="journal-date">${safe(r.date)}</div><div><div class="journal-title">${fmt(r.runs)} runs · ${fmt(r.prompts_compiled)} prompts · ${fmt(r.compactions)} compactions</div><div class="journal-copy">Estimated net tokens saved: <strong>${fmt(r.net_tokens_saved_est)}</strong> · raw: ${fmt(r.raw_tokens_est)} · sent externally: ${fmt(r.sent_tokens_est)} · local overhead: ${fmt(r.local_tokens_est)} · net savings rate: ${pct(r.net_savings_pct)}</div></div></article>`).join(""):'<div class="empty">No participating usage has been reported in this window.</div>';
    set("qgLatest",rows[0]?.date||"No reported activity");set("qgGenerated",new Date(data.generated_at||Date.now()).toLocaleString());
  }
  function renderMilestones(){const el=$("#qgMilestones");if(!el)return;el.innerHTML=milestones.map(x=>`<article class="milestone"><div class="journal-date">${safe(x.date)}</div><div><div class="kind">${safe(x.kind)}</div><div class="journal-title">${safe(x.title)}</div><div class="journal-copy">${safe(x.body)}</div><div class="evidence">${safe(x.evidence)}</div></div></article>`).join("")}
  async function load(){renderMilestones();try{const r=await fetch("/api/public/product-stats?days=90",{headers:{accept:"application/json"}});if(!r.ok)throw new Error("stats "+r.status);renderSummary(await r.json());document.body.dataset.progressReady="true"}catch(error){const el=$("#qgDaily");if(el)el.innerHTML='<div class="empty">Live aggregate metrics are temporarily unavailable. Product milestones remain visible.</div>';console.debug("Quillgeist progress metrics unavailable",error)}}
  load();setInterval(()=>{if(!document.hidden)load()},600000);
})();