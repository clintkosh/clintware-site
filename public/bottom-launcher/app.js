(() => {
'use strict';
const KEY='bottom-launcher:pilot:v1';
const albumSeed=[
 {n:1,title:'FALSE POSITIVE',surface:'misread signals, trust, relationships, intuition',reveal:'FEDDY senses patterns before he can explain them',depth:10},
 {n:2,title:'PACKET LOSS',surface:'memory, déjà vu, communication gaps',reveal:'something keeps getting through from outside the current frame',depth:20},
 {n:3,title:'PERSISTENT STATE',surface:'karma, attachment, recurring people',reveal:'some patterns survive the reset',depth:31},
 {n:4,title:'MISSION.LOG',surface:'purpose, burnout, responsibility',reveal:'the narrator considers whether forgetting was part of the mission',depth:43},
 {n:5,title:'ACCESS DENIED',surface:'knowledge, power, gatekeeping, representation',reveal:'information asymmetry becomes part of the conflict',depth:55},
 {n:6,title:'THE VEIL',surface:'initiation, mystery schools, hidden layers',reveal:'different symbolic systems appear to describe similar architecture',depth:66},
 {n:7,title:'PARALLEL INSTANCE',surface:'alternate selves, dreams, fractured identity',reveal:'multiple versions of the narrator begin overlapping',depth:77},
 {n:8,title:'LIFE REVIEW',surface:'consequence, family, forgiveness, perspective',reveal:'the same events replay from more than one point of view',depth:86},
 {n:9,title:'SOURCE CODE',surface:'death, Source, reincarnation, temporary hardware',reveal:'physical life may be one layer rather than the whole system',depth:94},
 {n:10,title:'ROOT // ∆',surface:'all motifs collapse into one loop',reveal:'the answer becomes another interface and Album 1 begins again',depth:100}
];
const seed={
 artist:{name:'FEDDY STYGM∆',searchName:'FEDDY STYGMA',mode:'phonk / melodic rap / dark electronic',statement:'A consciousness trying to debug the interface without pretending it already knows what reality is.',voice:'direct, skeptical, funny under pressure, intimate, technical without sounding like documentation'},
 principles:[
  'Question official answers and forbidden answers too.',
  'Trust the gut signal, then verify the pattern.',
  'Never present the narrator as a guru; he is always still looking.',
  'Use disclosure through symbols, domestic details, callbacks, and double meaning instead of exposition.',
  'Treat reincarnation, regression, simulation, and conspiracy material as questions, reports, mythology, or fiction unless independently established.',
  'Family stays oblique: recognizable to people who know, universal to everyone else.',
  'Every simultaneous vocal has a rhythmic, harmonic, narrative, or textural job.',
  'Nothing physical is identity; inventory does not cross the logout screen.'
 ],
 motifs:['false positive','packet loss','persistent state','mission log','three hallway lights','terminal blue','CRT power-on','doors / keys / mirrors','Source / source code','body as temporary hardware','lip balm / vegetables / mundane maintenance','Texas heat / red dirt / highways','hemp policy / representation error','safe channel / bad signal'],
 albums:albumSeed,
 track:{
  title:'FALSE POSITIVE',bpm:154,key:'F# minor',energy:82,loreDepth:18,
  thesis:'Being misread by people and systems while your internal telemetry keeps catching patterns early.',
  monotoneRiff:'F# · F# · F# · F# | F# · F# · G · F#',
  bassPlan:'warm sub → pitch drift → false drop → half-bar-late 808 impact → 28 Hz aftermath',
  hook:'You only opened one.',
  disclosure:'Three lights down the hall / terminal blue / safe mode / dashboard green, stomach red.'
 },
 flows:[
  {name:'Narrator',role:'low, close, controlled',rhythm:'half-time / conversational',melody:'narrow minor range'},
  {name:'Signal',role:'emotionally exposed counter-melody',rhythm:'long tones across bar lines',melody:'rising upper harmony'},
  {name:'Overclock',role:'rapid melodic syllable chain',rhythm:'triplet / sextuplet / auction-derived acceleration',melody:'pitch follows stressed internal rhyme'},
  {name:'Other FEDDY',role:'distorted responder / ghost',rhythm:'sparse interruptions',melody:'octave-down or formant-shifted'},
  {name:'Convergence',role:'all lanes intersect on one phrase',rhythm:'unison hit',melody:'resolved shared target note'}
 ],
 content:[
  {platform:'Shorts / Reels / TikTok',hook:'dashboard green. stomach red.',visual:'night drive + diagnostic overlays + one abrupt bass fake-out',purpose:'introduce intuition-as-telemetry motif'},
  {platform:'Shorts / Reels / TikTok',hook:'you only opened one',visual:'four vocal lanes appear independently, then converge on one line',purpose:'demonstrate the polyphonic vocal signature'},
  {platform:'Visualizer',hook:'SAFE CHANNEL / BAD SIGNAL',visual:'warm CRT childhood room slowly reveals signal corruption',purpose:'nostalgia-versus-environment thread'},
  {platform:'Studio clip',hook:'how the auction flow became a phonk cadence',visual:'syllable grid accelerates while pitch lanes remain melodic',purpose:'show process without giving away the whole song'},
  {platform:'Lore fragment',hook:'MISSION.LOG // 004',visual:'black terminal, voice dialogue, connection lost',purpose:'seed the album-universe mystery'},
  {platform:'Texas clip',hook:'representation error',visual:'red dirt / Austin marble / waveform packet loss metaphor',purpose:'frame civic frustration as signal degradation, not party propaganda'}
 ],
 rights:{sourceFirst:true,voiceConsent:true,aiTraining:false,aiConditioning:true,provenance:'AuralRoot-compatible source + derivative lineage'},
 updatedAt:null
};
let state=load();
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
function clone(v){return JSON.parse(JSON.stringify(v))}
function load(){try{return {...clone(seed),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return clone(seed)}}
function save(){state.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(state));toast('Project saved locally.')}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2200)}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const chips=(arr,cls='')=>'<div class="chips">'+arr.map(x=>'<span class="chip '+cls+'">'+esc(x)+'</span>').join('')+'</div>';
function route(view){
  $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const titles={launch:'Launchpad',dna:'Artist DNA',albums:'10-Album Arc',track:'Track Lab',flows:'Flow Engine',content:'Content Forge',lore:'Lore Map',rights:'Rights + Source'};
  $('#view-title').textContent=titles[view]||'Bottom Launcher';
  if(view==='dna')return renderDNA();
  if(view==='albums')return renderAlbums();
  if(view==='track')return renderTrack();
  if(view==='flows')return renderFlows();
  if(view==='content')return renderContent();
  if(view==='lore')return renderLore();
  if(view==='rights')return renderRights();
  renderLaunch();
}
function renderLaunch(){
  $('#view').innerHTML=`
  <div class="hero">
    <section class="card">
      <p class="eyebrow">CURRENT PILOT ARTIST</p>
      <h2>${esc(state.artist.name)}</h2>
      <p>${esc(state.artist.statement)}</p>
      ${chips(['artist identity','song architecture','lore continuity','content engine','release arc','rights-aware source'], 'good')}
      <div class="splitline"></div>
      <div class="kpis">
        <div class="kpi"><strong>10</strong><span>album chapters</span></div>
        <div class="kpi"><strong>${state.flows.length}</strong><span>vocal lanes</span></div>
        <div class="kpi"><strong>${state.motifs.length}</strong><span>recurring motifs</span></div>
        <div class="kpi"><strong>${state.content.length}</strong><span>content seeds</span></div>
      </div>
    </section>
    <section class="card">
      <p class="eyebrow">CURRENT TRACK</p>
      <h2 style="font-size:22px">${esc(state.track.title)}</h2>
      <p>${esc(state.track.thesis)}</p>
      <div class="chips"><span class="chip hot">${state.track.bpm} BPM</span><span class="chip cyan">${esc(state.track.key)}</span><span class="chip">Lore ${state.track.loreDepth}%</span></div>
      <div class="splitline"></div>
      <strong class="mono">${esc(state.track.hook)}</strong>
    </section>
  </div>
  <div class="grid">
    <section class="card"><h3>SONIC SIGNATURE</h3><p class="muted">Deep bass fluctuations, false drops, monotone anchor riffs, melodic counterflows, harmonized rapid runs, and carefully timed convergence.</p></section>
    <section class="card"><h3>STORY ENGINE</h3><p class="muted">Each release reveals more context. Earlier details change meaning as the listener moves deeper through the catalog.</p></section>
    <section class="card"><h3>CONTENT ENGINE</h3><p class="muted">Every track produces hooks, studio/process clips, visual lore fragments, performance moments, and creator-ready edit sections.</p></section>
  </div>`;
}
function renderDNA(){
  $('#view').innerHTML=`
  <div class="grid2">
   <section class="card"><h2>Identity</h2><div class="form2">
    <label>Artist name<input id="artist-name" value="${esc(state.artist.name)}"></label>
    <label>Search-safe name<input id="artist-search" value="${esc(state.artist.searchName)}"></label>
   </div><label style="margin-top:10px">Mode<input id="artist-mode" value="${esc(state.artist.mode)}"></label>
   <label style="margin-top:10px">Statement<textarea id="artist-statement">${esc(state.artist.statement)}</textarea></label>
   <label style="margin-top:10px">Voice<textarea id="artist-voice">${esc(state.artist.voice)}</textarea></label>
   <button id="save-dna" class="primary" style="margin-top:10px">Apply Artist DNA</button></section>
   <section class="card"><h2>Rules that keep the project coherent</h2><div class="stack">${state.principles.map((p,i)=>'<div class="lore-node"><strong>RULE '+String(i+1).padStart(2,'0')+'</strong><span>'+esc(p)+'</span></div>').join('')}</div></section>
  </div>
  <section class="card" style="margin-top:13px"><h2>Recurring motif library</h2>${chips(state.motifs,'cyan')}</section>`;
  $('#save-dna').onclick=()=>{state.artist.name=$('#artist-name').value.trim();state.artist.searchName=$('#artist-search').value.trim();state.artist.mode=$('#artist-mode').value.trim();state.artist.statement=$('#artist-statement').value.trim();state.artist.voice=$('#artist-voice').value.trim();save();renderDNA()}
}
function renderAlbums(){
  $('#view').innerHTML='<div class="notice warn" style="margin-bottom:13px">Depth rises across the series, but the narrator never becomes an unquestionable authority. More interconnected does not mean more factual; reported spiritual/conspiracy material stays framed as report, metaphor, mythology, fiction, or open question unless independently established.</div><div class="grid">'+state.albums.map(a=>`
   <article class="card album"><span class="num">${a.n}</span><p class="eyebrow">CHAPTER ${String(a.n).padStart(2,'0')}</p><h2>${esc(a.title)}</h2><p><b>Surface:</b> ${esc(a.surface)}<br><b>Reveal:</b> ${esc(a.reveal)}</p><div class="meter"><i style="width:${a.depth}%"></i></div><footer><span>lore depth</span><span>${a.depth}%</span></footer></article>`).join('')+'</div>';
}
function renderTrack(){
 $('#view').innerHTML=`
 <div class="grid2">
  <section class="card"><h2>Track brief</h2><div class="form3">
   <label>Title<input id="t-title" value="${esc(state.track.title)}"></label>
   <label>BPM<input id="t-bpm" type="number" min="60" max="220" value="${state.track.bpm}"></label>
   <label>Key<input id="t-key" value="${esc(state.track.key)}"></label>
  </div>
  <div class="form2" style="margin-top:10px"><label>Energy<input id="t-energy" type="range" min="0" max="100" value="${state.track.energy}"></label><label>Lore depth<input id="t-lore" type="range" min="0" max="100" value="${state.track.loreDepth}"></label></div>
  <label style="margin-top:10px">Thesis<textarea id="t-thesis">${esc(state.track.thesis)}</textarea></label>
  <label style="margin-top:10px">Disclosure / subtext<textarea id="t-disc">${esc(state.track.disclosure)}</textarea></label>
  <button id="apply-track" class="primary" style="margin-top:10px">Apply Track Brief</button></section>
  <section class="card"><h2>Sonic map</h2>
   <label>Monotone anchor riff<textarea id="t-riff">${esc(state.track.monotoneRiff)}</textarea></label>
   <label style="margin-top:10px">Bass / drop movement<textarea id="t-bass">${esc(state.track.bassPlan)}</textarea></label>
   <label style="margin-top:10px">Convergence hook<input id="t-hook" value="${esc(state.track.hook)}"></label>
   <div class="splitline"></div>
   <div class="timeline">
    <div class="beat"><b>COMFORT</b><span>warm sustained sub / nostalgic texture</span><span>━━━</span></div>
    <div class="beat"><b>UNEASE</b><span>slow pitch drift before lyric admits the problem</span><span>╲╱</span></div>
    <div class="beat"><b>FAKE DROP</b><span>expected impact removed</span><span>···</span></div>
    <div class="beat"><b>DISCOVERY</b><span>half-bar-late sub impact</span><span>████</span></div>
    <div class="beat"><b>AFTERMATH</b><span>barely audible low pressure / negative space</span><span>────</span></div>
   </div>
  </section>
 </div>`;
 $('#apply-track').onclick=()=>{Object.assign(state.track,{title:$('#t-title').value.trim(),bpm:+$('#t-bpm').value,key:$('#t-key').value.trim(),energy:+$('#t-energy').value,loreDepth:+$('#t-lore').value,thesis:$('#t-thesis').value.trim(),disclosure:$('#t-disc').value.trim(),monotoneRiff:$('#t-riff').value.trim(),bassPlan:$('#t-bass').value.trim(),hook:$('#t-hook').value.trim()});save();renderTrack()}
}
function renderFlows(){
 $('#view').innerHTML=`
 <div class="notice" style="margin-bottom:13px">Polyphonic rule: no duplicate vocal is allowed merely to make the record sound bigger. Every lane must carry a distinct rhythmic, melodic, narrative, or textural function.</div>
 <div class="grid2">${state.flows.map((f,i)=>`<article class="flowlane"><header><strong>${String(i+1).padStart(2,'0')} // ${esc(f.name)}</strong><span class="chip">${i===2?'auction engine':i===4?'intersection':'voice lane'}</span></header><p><b>Job:</b> ${esc(f.role)}<br><b>Rhythm:</b> ${esc(f.rhythm)}<br><b>Melody:</b> ${esc(f.melody)}</p></article>`).join('')}</div>
 <section class="card" style="margin-top:13px"><h2>Auction-derived rapid-flow module</h2><div class="grid2"><div><p class="muted">Reusable engine, not a cowboy novelty: syllable compression, controlled acceleration, numerical/repetitive phrasing, breath markers, call/response, triplet and sextuplet bursts.</p>${chips(['syllable grid','breath map','triplet','sextuplet','call/response','pitch stress'],'hot')}</div><div class="mono notice">one thought / two thought / four fork / eight<br>new route / new port / don't close that gate<br><br>→ all lanes converge only where the phrase earns it.</div></div></section>`;
}
function renderContent(){
 $('#view').innerHTML=`
 <div class="form2" style="margin-bottom:13px"><label>Track / campaign seed<input id="campaign-seed" value="${esc(state.track.title)}"></label><label>Primary payoff<input id="campaign-payoff" value="${esc(state.track.hook)}"></label></div>
 <div class="grid">${state.content.map((c,i)=>`<article class="card content-card"><span class="chip cyan">${esc(c.platform)}</span><div class="hook">${esc(c.hook)}</div><p><b>Visual:</b> ${esc(c.visual)}</p><p><b>Purpose:</b> ${esc(c.purpose)}</p><footer><span>CONTENT ${String(i+1).padStart(2,'0')}</span><button data-copy="${i}">Copy brief</button></footer></article>`).join('')}</div>`;
 $$('[data-copy]').forEach(b=>b.onclick=async()=>{const c=state.content[+b.dataset.copy];const t=`BOTTOM LAUNCHER CONTENT BRIEF\nArtist: ${state.artist.name}\nTrack: ${$('#campaign-seed').value}\nHook: ${c.hook}\nVisual: ${c.visual}\nPurpose: ${c.purpose}\nPayoff: ${$('#campaign-payoff').value}`;try{await navigator.clipboard.writeText(t);toast('Content brief copied.')}catch{toast('Clipboard unavailable.')}})
}
function renderLore(){
 const nodes=[
  ['REAL EXPERIENCE','misunderstanding · attachment · family · work · Texas · technology · childhood comfort'],
  ['FEDDY FILTER','signals · interfaces · source code · recurring rooms · temporary hardware · false positives'],
  ['MYSTERY LAYER','Source · reincarnation reports · life review · initiation · memory wipe · karmic recurrence'],
  ['POWER LAYER','information asymmetry · gatekeeping · representation error · money and access'],
  ['MEDIA MEMORY','CRT safety · 80s/90s sensory comfort · later discovery that institutions behind the screen were imperfect'],
  ['LISTENER STATE','Is this biography, metaphor, spiritual report, fiction, simulation, trauma, or all of them?']
 ];
 $('#view').innerHTML='<div class="grid2"><section class="card"><h2>Story stack</h2><div class="stack">'+nodes.map((n,i)=>`<div class="lore-node"><strong>${String(i+1).padStart(2,'0')} // ${n[0]}</strong><span>${esc(n[1])}</span></div>`).join('')+'</div></section><section class="card"><h2>Disclosure strategy</h2><p class="muted">Prefer evidence-like details over exposition. Let a line work emotionally for a casual listener and autobiographically for someone who knows the artist.</p>'+chips(['three lights','cartoons through the wall','cereal + server logs','lip balm','greens','red dirt','CRT static','safe mode','old room / new face','dashboard green / stomach red'],'good')+'<div class="splitline"></div><p class="mono">QUESTION → SEARCH → DISCOVERY → DOUBT → INITIATION → APPARENT ANSWER → DEEPER QUESTION → REPEAT</p></section></div>';
}
function renderRights(){
 $('#view').innerHTML=`
 <div class="grid2">
 <section class="card"><h2>Source + provenance</h2><div class="notice">Bottom Launcher authors artist strategy and derivative plans. AuralRoot remains the source-of-truth layer for recordings, voice consent, derivative lineage, licensing, and source offsets.</div><div class="stack" style="margin-top:12px">
  <div class="lore-node"><strong>SOURCE FIRST</strong><span>Every generated plan should point back to owned, licensed, or explicitly permitted source material.</span></div>
  <div class="lore-node"><strong>VOICE CONSENT</strong><span>Identifiable human voice use requires explicit authority; voice-clone assumptions are never inferred.</span></div>
  <div class="lore-node"><strong>AI TRAINING ≠ AI CONTEXT</strong><span>Training permission remains separate from temporary conditioning/context permission.</span></div>
  <div class="lore-node"><strong>LINEAGE</strong><span>Stems, edits, remixes, visualizers, and derivatives retain parent/source references.</span></div>
 </div></section>
 <section class="card"><h2>Pilot defaults</h2>
  <label><input id="r-source" type="checkbox" ${state.rights.sourceFirst?'checked':''}> Source-first required</label>
  <label style="margin-top:8px"><input id="r-voice" type="checkbox" ${state.rights.voiceConsent?'checked':''}> Explicit voice consent required</label>
  <label style="margin-top:8px"><input id="r-train" type="checkbox" ${state.rights.aiTraining?'checked':''}> AI training opt-in</label>
  <label style="margin-top:8px"><input id="r-context" type="checkbox" ${state.rights.aiConditioning?'checked':''}> Temporary AI context/conditioning allowed</label>
  <label style="margin-top:10px">Provenance model<textarea id="r-prov">${esc(state.rights.provenance)}</textarea></label>
  <button id="save-rights" class="primary" style="margin-top:10px">Apply Rights Defaults</button>
 </section></div>`;
 $('#save-rights').onclick=()=>{state.rights.sourceFirst=$('#r-source').checked;state.rights.voiceConsent=$('#r-voice').checked;state.rights.aiTraining=$('#r-train').checked;state.rights.aiConditioning=$('#r-context').checked;state.rights.provenance=$('#r-prov').value.trim();save();renderRights()}
}
$$('#nav button').forEach(b=>b.onclick=()=>route(b.dataset.view));
$('#save-project').onclick=save;
$('#reset-seed').onclick=()=>{if(confirm('Reset Bottom Launcher to the FEDDY STYGM∆ pilot seed?')){state=clone(seed);save();route('launch')}};
$('#export-json').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='bottom-launcher-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);toast('Project JSON exported.')};
window.addEventListener('beforeunload',()=>localStorage.setItem(KEY,JSON.stringify(state)));
route('launch');
})();