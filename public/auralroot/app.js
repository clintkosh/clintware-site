(() => {
  'use strict';

  const APP = 'auralroot';
  const META_KEY = `${APP}:state:v1`;
  const CURRENT_USER = { id: 'user-local', name: 'Local Creator', handle: '@local', initials: 'LC', demo: false };
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const uid = (prefix='id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const clamp = (n,min,max) => Math.max(min, Math.min(max,n));
  const fmtTime = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}.${String(Math.floor((s%1)*10))}`;
  const escapeHtml = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const nowIso = () => new Date().toISOString();

  const seedUsers = [
    { id:'u1', name:'Mara Vale', handle:'@maravale', initials:'MV', demo:true },
    { id:'u2', name:'Ishan Reed', handle:'@reedfield', initials:'IR', demo:true },
    { id:'u3', name:'Nico Tan', handle:'@nicotan', initials:'NT', demo:true },
  ];

  const demoPeaks = (seed=1, n=88) => Array.from({length:n}, (_,i) => {
    const v = Math.abs(Math.sin((i+seed)*0.39) * .55 + Math.sin((i+seed)*1.11)*.23 + Math.cos((i+seed)*.17)*.12);
    return clamp(v,.06,.96);
  });

  const defaultRights = (overrides={}) => ({
    owns:true, publicListen:true, remix:true, commercialRemix:false, aiConditioning:true,
    aiTraining:false, marketplace:false, hasVoice:false, voiceConsent:false,
    license:'CC BY-NC', customTerms:'', ...overrides
  });

  const seededSounds = [
    { id:'demo-rail', title:'Parking Garage Rail Strike', description:'Single resonant metal impact recorded in a concrete garage. Demo metadata only; no source audio file is embedded.', category:'Percussion', tags:['metal','impact','field'], duration:4.2, channels:1, sampleRate:48000, peak:.82, rms:.21, loudnessProxy:-13.6, bpm:null, key:null, waveform:demoPeaks(2), creatorId:'u1', createdAt:'2026-09-03T18:00:00Z', version:1, demo:true, parentSoundId:null, rights:defaultRights({commercialRemix:true, marketplace:true, license:'CC BY'}), forkCount:18, useCount:244, artifacts:[{id:'art-rail-1', type:'One-shot', label:'Main strike', start:0.32, end:2.1}] },
    { id:'demo-rain', title:'Rain on Tin Awning', description:'Steady rain texture captured under a shallow metal awning. Demo metadata only.', category:'Ambience', tags:['rain','texture','field'], duration:38.7, channels:2, sampleRate:44100, peak:.66, rms:.18, loudnessProxy:-15.1, bpm:null, key:null, waveform:demoPeaks(6), creatorId:'u2', createdAt:'2026-09-05T09:30:00Z', version:1, demo:true, parentSoundId:null, rights:defaultRights({aiTraining:true, commercialRemix:true, marketplace:true, license:'CC0'}), forkCount:31, useCount:507, artifacts:[{id:'art-rain-1', type:'Texture', label:'Dense section', start:8.4, end:21.2}] },
    { id:'demo-voice', title:'Breathy Vowel Stack', description:'Original three-note vocal texture with explicit voice consent. Demo metadata only.', category:'Vocal', tags:['voice','vowel','texture'], duration:7.8, channels:1, sampleRate:48000, peak:.74, rms:.24, loudnessProxy:-12.4, bpm:null, key:null, waveform:demoPeaks(11), creatorId:'u3', createdAt:'2026-09-02T12:40:00Z', version:1, demo:true, parentSoundId:null, rights:defaultRights({hasVoice:true,voiceConsent:true,commercialRemix:true,aiTraining:false,license:'CC BY'}), forkCount:12, useCount:189, artifacts:[{id:'art-vocal-1', type:'Vocal', label:'Sustain', start:1.1, end:6.5}] },
    { id:'demo-rain-fork', title:'Rain Gated Texture Fork', description:'Derived texture created from Rain on Tin Awning. Demo lineage object.', category:'Texture', tags:['rain','gate','derived'], duration:8.2, channels:2, sampleRate:44100, peak:.69, rms:.2, loudnessProxy:-14.2, bpm:null, key:null, waveform:demoPeaks(9), creatorId:'u1', createdAt:'2026-09-06T08:10:00Z', version:1, demo:true, parentSoundId:'demo-rain', rights:defaultRights({commercialRemix:false,license:'CC BY-NC'}), forkCount:4, useCount:47, artifacts:[] },
  ];

  const seededAgents = [
    { id:'agent-found', title:'Found-Sound Beatmaker', creatorId:'u1', version:'1.4', description:'Slices transient-rich field recordings into a timing grid and proposes a non-destructive sequencing recipe.', inputs:['Field recording'], outputs:['One-shots','Loop recipe'], tags:['percussion','field'], forks:42, uses:918, rating:4.8, ratings:84, demo:true, steps:['Detect transients','Create slices','Normalize slice gain','Arrange 8-step recipe'] },
    { id:'agent-ambient', title:'Ambient Field Recorder', creatorId:'u2', version:'2.1', description:'Recipe for long-form field captures: trim handling noise, retain room character, mark stable texture regions.', inputs:['Ambience'], outputs:['Texture markers'], tags:['ambient','field'], forks:19, uses:433, rating:4.7, ratings:51, demo:true, steps:['Trim edges','Mark stable regions','Tag environmental events'] },
    { id:'agent-vocal', title:'Vocal-to-Synth Recipe', creatorId:'u3', version:'0.9', description:'A configuration recipe for turning consented vocal artifacts into synth-ready source material when a compatible processor is connected.', inputs:['Vocal artifact'], outputs:['Processor recipe'], tags:['vocal','synth'], forks:11, uses:188, rating:4.5, ratings:28, demo:true, steps:['Confirm voice rights','Choose harmonic region','Export processor instructions'] },
    { id:'agent-jungle', title:'Jungle Chopper', creatorId:'u1', version:'1.0', description:'Manual workflow for slicing drum loops into retriggerable fragments while keeping source offsets and attribution intact.', inputs:['Loop'], outputs:['One-shots','Chop map'], tags:['breaks','jungle'], forks:34, uses:662, rating:4.9, ratings:73, demo:true, steps:['Mark hits','Name slices','Build chop map','Preserve parent offsets'] },
    { id:'agent-texture', title:'Texture Builder', creatorId:'u2', version:'1.2', description:'Layers compatible texture artifacts by rights, duration, and spectral density metadata. Recipe only in MVP.', inputs:['Texture'], outputs:['Layer plan'], tags:['texture','layering'], forks:15, uses:296, rating:4.6, ratings:40, demo:true, steps:['Filter by rights','Rank texture density','Build layer plan'] },
  ];

  const freshState = () => ({ sounds:[], agents:[], reports:[], user:CURRENT_USER });
  let state = loadState();
  let activeAudio = { file:null, blob:null, url:null, buffer:null, metadata:null, waveform:[], selection:{start:0,end:0}, artifacts:[], sourceName:'' };
  let mediaRecorder = null, mediaStream = null, mediaChunks = [], recordTimer = null, recordStarted = 0;

  function loadState(){
    try { return { ...freshState(), ...JSON.parse(localStorage.getItem(META_KEY) || '{}') }; }
    catch { return freshState(); }
  }
  function saveState(){ localStorage.setItem(META_KEY, JSON.stringify(state)); }
  function allSounds(){ return [...seededSounds, ...state.sounds]; }
  function allAgents(){ return [...seededAgents, ...state.agents]; }
  function allUsers(){ return [CURRENT_USER, ...seedUsers]; }
  function getUser(id){ return allUsers().find(u=>u.id===id) || {name:'Unknown creator', handle:'@unknown', initials:'?'}; }
  function getSound(id){ return allSounds().find(s=>s.id===id); }
  function showToast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._to); t._to=setTimeout(()=>t.classList.remove('show'),2600); }
  function closeModal(){ const m=$('#modal'); if(m.open) m.close(); $('#modal-content').innerHTML=''; }
  function openModal(html){ $('#modal-content').innerHTML=html; $('#modal').showModal(); $$('[data-close-modal]').forEach(b=>b.onclick=closeModal); }

  async function db(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open('auralroot-audio-v1',1);
      req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains('audio')) req.result.createObjectStore('audio'); };
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
  }
  async function putBlob(key,blob){ const d=await db(); return new Promise((res,rej)=>{ const tx=d.transaction('audio','readwrite'); tx.objectStore('audio').put(blob,key); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }
  async function getBlob(key){ const d=await db(); return new Promise((res,rej)=>{ const r=d.transaction('audio').objectStore('audio').get(key); r.onsuccess=()=>res(r.result||null); r.onerror=()=>rej(r.error); }); }

  function route(){
    const raw=(location.hash || '#/discover').replace(/^#\//,'');
    const [name,id] = raw.split('/');
    const titles={discover:'Discover',record:'Record + Upload',sounds:'Sound',agents:id?'Agent':'Agents',profile:'Creator Profile',about:'Principles'};
    $('#page-title').textContent=titles[name]||'Discover';
    $$('#nav a').forEach(a=>a.classList.toggle('active',a.dataset.route===name || (name==='sounds'&&a.dataset.route==='discover')));
    if(name==='record') return renderRecord();
    if(name==='sounds'&&id) return renderSoundDetail(id);
    if(name==='agents'&&id) return renderAgentDetail(id);
    if(name==='agents') return renderAgents();
    if(name==='profile') return renderProfile();
    if(name==='about') return renderAbout();
    renderDiscover();
  }

  function rightsChips(r){
    return [
      r.remix && '<span class="chip good">Remix</span>',
      r.commercialRemix && '<span class="chip good">Commercial</span>',
      r.aiConditioning && '<span class="chip">AI context</span>',
      r.aiTraining ? '<span class="chip good">AI training opt-in</span>' : '<span class="chip warn">No AI training</span>',
      `<span class="chip">${escapeHtml(r.license)}</span>`
    ].filter(Boolean).join('');
  }

  function miniWave(peaks){ return `<div class="wave-mini" aria-hidden="true">${(peaks||demoPeaks()).slice(0,72).map(v=>`<i style="height:${Math.max(4,Math.round(v*38))}px"></i>`).join('')}</div>`; }

  function soundCard(s){
    const u=getUser(s.creatorId);
    return `<article class="card sound-card" data-sound-id="${s.id}">
      <div class="card-header"><div><h3>${escapeHtml(s.title)}</h3><div class="meta"><span>${escapeHtml(u.handle)}</span><span>${s.demo?'Demo':'Local'}</span></div></div><span class="chip">${escapeHtml(s.category)}</span></div>
      ${miniWave(s.waveform)}
      <p>${escapeHtml(s.description||'No description.')}</p>
      <div class="meta"><span>${fmtTime(s.duration||0)}</span><span>${s.channels||'?'}ch</span><span>${s.forkCount||0} forks</span><span>${s.useCount||0} uses</span></div>
      <div class="chips">${rightsChips(s.rights)}</div>
    </article>`;
  }

  function renderDiscover(){
    const sounds=allSounds();
    $('#view').innerHTML=`
      <div class="toolbar">
        <div class="tabs" id="discover-tabs"><button class="active" data-tab="trending">Trending Sounds</button><button data-tab="new">New</button><button data-tab="forks">Forks</button></div>
        <input id="sound-search" class="search" type="search" placeholder="Search sounds, tags, creators" aria-label="Search sounds" />
        <select id="category-filter" style="max-width:180px"><option value="">All types</option>${[...new Set(sounds.map(s=>s.category))].sort().map(x=>`<option>${escapeHtml(x)}</option>`).join('')}</select>
        <label class="chip"><input id="filter-remix" type="checkbox" style="width:auto"> Remixable</label>
        <label class="chip"><input id="filter-training" type="checkbox" style="width:auto"> AI training opt-in</label>
      </div>
      <div id="sound-grid" class="grid"></div>`;
    let tab='trending';
    const repaint=()=>{
      const q=$('#sound-search').value.trim().toLowerCase(), cat=$('#category-filter').value;
      let list=sounds.filter(s=>{
        const u=getUser(s.creatorId); const hay=[s.title,s.description,s.category,...s.tags,u.name,u.handle].join(' ').toLowerCase();
        return (!q||hay.includes(q)) && (!cat||s.category===cat) && (!$('#filter-remix').checked||s.rights.remix) && (!$('#filter-training').checked||s.rights.aiTraining);
      });
      if(tab==='forks') list=list.filter(s=>s.parentSoundId);
      if(tab==='new') list.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      else list.sort((a,b)=>(b.useCount+b.forkCount*5)-(a.useCount+a.forkCount*5));
      $('#sound-grid').innerHTML=list.length?list.map(soundCard).join(''):'<div class="empty">No sound objects match these filters.</div>';
      $$('.sound-card').forEach(c=>c.onclick=()=>location.hash=`#/sounds/${c.dataset.soundId}`);
    };
    $$('#discover-tabs button').forEach(b=>b.onclick=()=>{ tab=b.dataset.tab; $$('#discover-tabs button').forEach(x=>x.classList.toggle('active',x===b)); repaint(); });
    ['sound-search','category-filter','filter-remix','filter-training'].forEach(id=>$('#'+id).addEventListener('input',repaint));
    repaint();
  }

  function renderRecord(){
    activeAudio={ file:null, blob:null, url:null, buffer:null, metadata:null, waveform:[], selection:{start:0,end:0}, artifacts:[], sourceName:'' };
    $('#view').innerHTML=`
      <div class="split">
        <div class="stack">
          <section class="card">
            <h2 class="section-title">1. Capture source</h2>
            <div id="dropzone" class="dropzone">
              <strong>Drop audio here</strong>
              <p class="muted">WAV, MP3, M4A/AAC when your browser can decode it. Audio stays in this browser in the MVP.</p>
              <input id="file-input" type="file" accept="audio/*" hidden />
              <div class="flex" style="justify-content:center"><button id="pick-file">Choose file</button><span class="muted">or</span><button id="record-button" class="primary">Record microphone</button><span id="record-time" class="timer">0:00.0</span></div>
            </div>
            <div id="capture-error" class="notice warn" style="display:none;margin-top:10px"></div>
          </section>
          <section id="analysis-panel" class="card" style="display:none">
            <div class="flex"><h2 class="section-title" style="margin:0">2. Analyze + dissect</h2><span class="spacer"></span><button disabled title="Requires model provider connection">AI Separate Stems — later</button></div>
            <div class="notice" style="margin:10px 0">This MVP computes decoded audio metadata and waveform peaks locally. Manual Artifacts are real source ranges. It does not claim AI stem separation.</div>
            <audio id="audio-player" controls style="width:100%;margin:8px 0 12px"></audio>
            <div class="canvas-wrap"><canvas id="waveform" width="1200" height="180"></canvas><span id="selection-label" class="selection-label">Selection 0:00.0 → 0:00.0</span></div>
            <div class="kpis" id="audio-kpis" style="margin-top:10px"></div>
            <hr>
            <div class="form-grid">
              <div class="field"><label>Artifact type</label><select id="artifact-type">${['One-shot','Loop','Texture','Vocal','Percussion','Bass','Instrument','Ambience','Other'].map(x=>`<option>${x}</option>`).join('')}</select></div>
              <div class="field"><label>Artifact label</label><input id="artifact-label" placeholder="e.g. clean metal strike"></div>
            </div>
            <div class="flex" style="margin-top:10px"><button id="play-selection">Play selection</button><button id="create-artifact" class="primary">Create Artifact</button></div>
            <div id="artifact-list" class="stack" style="margin-top:10px"></div>
          </section>
        </div>
        <aside class="stack">
          <section class="card">
            <h2 class="section-title">3. Publish metadata</h2>
            <div class="field"><label>Title</label><input id="publish-title" placeholder="What is this sound?"></div>
            <div class="field" style="margin-top:8px"><label>Description</label><textarea id="publish-description" placeholder="Recording source, context, useful characteristics"></textarea></div>
            <div class="form-grid" style="margin-top:8px">
              <div class="field"><label>Category</label><select id="publish-category">${['Ambience','Bass','Instrument','Loop','One-shot','Percussion','Texture','Vocal','Other'].map(x=>`<option>${x}</option>`).join('')}</select></div>
              <div class="field"><label>Tags</label><input id="publish-tags" placeholder="field, metal, impact"></div>
            </div>
          </section>
          ${rightsFormHtml('rights')}
          <button id="publish-sound" class="primary" disabled>Publish sound object</button>
        </aside>
      </div>`;
    wireCapture();
    wireRightsDependencies('rights');
    $('#publish-sound').onclick=publishCurrentSound;
  }

  function rightsFormHtml(prefix, rights=defaultRights({owns:false,aiTraining:false})){
    const c=(k)=>rights[k]?'checked':'';
    return `<section class="card" id="${prefix}-manifest">
      <h2 class="section-title">Rights Manifest</h2>
      <div class="notice warn">Remix permission and AI model training permission are separate. AI training is OFF by default.</div>
      <label class="check-row"><input id="${prefix}-owns" type="checkbox" ${c('owns')}><span><strong>I own or have permission to upload this recording</strong>Required before publication.</span></label>
      <label class="check-row"><input id="${prefix}-public" type="checkbox" ${c('publicListen')}><span><strong>Public listening</strong>Others may play the published source.</span></label>
      <label class="check-row"><input id="${prefix}-remix" type="checkbox" ${c('remix')}><span><strong>Remix allowed</strong>Others may make derivatives, subject to the license.</span></label>
      <label class="check-row"><input id="${prefix}-commercial" type="checkbox" ${c('commercialRemix')}><span><strong>Commercial remix</strong>Derivatives may be used commercially.</span></label>
      <label class="check-row"><input id="${prefix}-conditioning" type="checkbox" ${c('aiConditioning')}><span><strong>AI conditioning/context</strong>May be supplied as context to compatible tools.</span></label>
      <label class="check-row"><input id="${prefix}-training" type="checkbox" ${c('aiTraining')}><span><strong>AI model training</strong>Explicit opt-in for model training.</span></label>
      <label class="check-row"><input id="${prefix}-market" type="checkbox" ${c('marketplace')}><span><strong>Marketplace/licensing</strong>Eligible for future licensing workflows.</span></label>
      <label class="check-row"><input id="${prefix}-voice" type="checkbox" ${c('hasVoice')}><span><strong>Contains identifiable human voice</strong>Additional identity consent is required.</span></label>
      <label class="check-row" id="${prefix}-voice-consent-row" style="${rights.hasVoice?'':'display:none'}"><input id="${prefix}-voice-consent" type="checkbox" ${c('voiceConsent')}><span><strong>Voice / identity consent confirmed</strong>I have explicit permission for the identifiable voice in this source.</span></label>
      <div class="field" style="margin-top:10px"><label>License preset</label><select id="${prefix}-license">${['All Rights Reserved','CC0','CC BY','CC BY-NC','Custom'].map(x=>`<option ${rights.license===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field" id="${prefix}-custom-wrap" style="display:${rights.license==='Custom'?'grid':'none'};margin-top:8px"><label>Custom terms</label><textarea id="${prefix}-custom">${escapeHtml(rights.customTerms||'')}</textarea></div>
    </section>`;
  }

  function wireRightsDependencies(prefix){
    const voice=$(`#${prefix}-voice`), license=$(`#${prefix}-license`);
    voice.onchange=()=>{ $(`#${prefix}-voice-consent-row`).style.display=voice.checked?'flex':'none'; updatePublishEnabled(); };
    license.onchange=()=>{ $(`#${prefix}-custom-wrap`).style.display=license.value==='Custom'?'grid':'none'; updatePublishEnabled(); };
    $$(`#${prefix}-manifest input, #${prefix}-manifest select, #${prefix}-manifest textarea`).forEach(x=>x.addEventListener('input',updatePublishEnabled));
  }
  function readRights(prefix){ return {
    owns:$(`#${prefix}-owns`).checked, publicListen:$(`#${prefix}-public`).checked, remix:$(`#${prefix}-remix`).checked,
    commercialRemix:$(`#${prefix}-commercial`).checked, aiConditioning:$(`#${prefix}-conditioning`).checked, aiTraining:$(`#${prefix}-training`).checked,
    marketplace:$(`#${prefix}-market`).checked, hasVoice:$(`#${prefix}-voice`).checked, voiceConsent:$(`#${prefix}-voice-consent`)?.checked||false,
    license:$(`#${prefix}-license`).value, customTerms:$(`#${prefix}-custom`)?.value||''
  }; }
  function updatePublishEnabled(){
    const b=$('#publish-sound'); if(!b) return;
    const r=readRights('rights'); b.disabled=!(activeAudio.buffer && r.owns && (!r.hasVoice||r.voiceConsent) && $('#publish-title').value.trim());
  }

  function wireCapture(){
    const dz=$('#dropzone'), input=$('#file-input');
    $('#pick-file').onclick=()=>input.click();
    input.onchange=()=>input.files[0]&&loadAudioBlob(input.files[0], input.files[0].name);
    dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag');}); dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
    dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag'); const f=e.dataTransfer.files[0]; if(f) loadAudioBlob(f,f.name);});
    $('#record-button').onclick=toggleRecording;
    $('#publish-title').addEventListener('input',updatePublishEnabled);
  }

  async function toggleRecording(){
    const btn=$('#record-button'), err=$('#capture-error'); err.style.display='none';
    if(mediaRecorder && mediaRecorder.state==='recording'){ mediaRecorder.stop(); btn.textContent='Record microphone'; clearInterval(recordTimer); return; }
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder){ err.textContent='Microphone recording is not supported by this browser.'; err.style.display='block'; return; }
    try{
      mediaStream=await navigator.mediaDevices.getUserMedia({audio:true}); mediaChunks=[];
      const preferred=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported?.(t));
      mediaRecorder=new MediaRecorder(mediaStream, preferred?{mimeType:preferred}:undefined);
      mediaRecorder.ondataavailable=e=>{if(e.data.size)mediaChunks.push(e.data);};
      mediaRecorder.onstop=async()=>{ const blob=new Blob(mediaChunks,{type:mediaRecorder.mimeType||'audio/webm'}); mediaStream.getTracks().forEach(t=>t.stop()); mediaStream=null; await loadAudioBlob(blob,`recording-${new Date().toISOString().replace(/[:.]/g,'-')}`); };
      mediaRecorder.start(); recordStarted=Date.now(); btn.textContent='Stop recording';
      recordTimer=setInterval(()=>$('#record-time').textContent=fmtTime((Date.now()-recordStarted)/1000),100);
    }catch(e){ err.textContent=e?.name==='NotAllowedError'?'Microphone permission was denied. You can still upload an audio file.':`Could not start microphone recording: ${e.message||e}`; err.style.display='block'; }
  }

  async function loadAudioBlob(blob,name){
    const err=$('#capture-error'); err.style.display='none';
    if(!blob.type.startsWith('audio/') && !(blob instanceof File)){ err.textContent='That file does not appear to be audio.'; err.style.display='block'; return; }
    try{
      const ab=await blob.arrayBuffer(); const ctx=new (window.AudioContext||window.webkitAudioContext)();
      const buffer=await ctx.decodeAudioData(ab.slice(0));
      const meta=analyzeBuffer(buffer); const waveform=buildWaveform(buffer,240);
      if(activeAudio.url) URL.revokeObjectURL(activeAudio.url);
      activeAudio={ file:blob instanceof File?blob:null, blob, url:URL.createObjectURL(blob), buffer, metadata:meta, waveform, selection:{start:0,end:Math.min(buffer.duration,Math.max(.25,buffer.duration*.2))}, artifacts:[], sourceName:name };
      $('#analysis-panel').style.display='block'; $('#audio-player').src=activeAudio.url;
      if(!$('#publish-title').value) $('#publish-title').value=(name||'Untitled sound').replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ');
      renderAudioAnalysis(); updatePublishEnabled();
      await ctx.close();
    }catch(e){ err.textContent=`This browser could not decode that audio file. Try WAV, MP3, or another codec supported by this browser. (${e.message||'decode error'})`; err.style.display='block'; }
  }

  function analyzeBuffer(buffer){
    let peak=0,sum=0,count=0;
    for(let c=0;c<buffer.numberOfChannels;c++){
      const data=buffer.getChannelData(c); for(let i=0;i<data.length;i+=Math.max(1,Math.floor(data.length/500000))){ const a=Math.abs(data[i]); if(a>peak)peak=a; sum+=data[i]*data[i]; count++; }
    }
    const rms=Math.sqrt(sum/Math.max(1,count));
    return { duration:buffer.duration, channels:buffer.numberOfChannels, sampleRate:buffer.sampleRate, peak, rms, loudnessProxy:rms>0?20*Math.log10(rms):null, bpm:null, key:null };
  }
  function buildWaveform(buffer,bins){
    const data=buffer.getChannelData(0), step=Math.max(1,Math.floor(data.length/bins)), peaks=[];
    for(let i=0;i<bins;i++){ let max=0; const start=i*step,end=Math.min(data.length,start+step); for(let j=start;j<end;j++){const a=Math.abs(data[j]); if(a>max)max=a;} peaks.push(max); }
    const scale=Math.max(...peaks,1e-6); return peaks.map(v=>v/scale);
  }

  function renderAudioAnalysis(){
    const m=activeAudio.metadata;
    $('#audio-kpis').innerHTML=[['Duration',fmtTime(m.duration)],['Channels',m.channels],['Sample rate',`${m.sampleRate} Hz`],['Peak',m.peak.toFixed(3)],['RMS',m.rms.toFixed(3)],['Loudness proxy',m.loudnessProxy==null?'Unknown':`${m.loudnessProxy.toFixed(1)} dBFS`],['BPM','Unknown'],['Key','Unknown']].map(([k,v])=>`<div class="kpi"><strong>${v}</strong><span>${k}</span></div>`).join('');
    drawWaveform(); wireWaveformSelection(); renderArtifacts();
    $('#play-selection').onclick=playSelection; $('#create-artifact').onclick=createArtifact;
  }

  function drawWaveform(){
    const canvas=$('#waveform'); if(!canvas) return; const ctx=canvas.getContext('2d'); const w=canvas.width,h=canvas.height; ctx.clearRect(0,0,w,h); ctx.fillStyle='#090c0f';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#22303a'; ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
    const s=activeAudio.selection, dur=activeAudio.metadata.duration, x1=s.start/dur*w, x2=s.end/dur*w;
    ctx.fillStyle='rgba(102,227,180,.10)';ctx.fillRect(x1,0,Math.max(1,x2-x1),h);
    ctx.strokeStyle='#657685';ctx.beginPath(); activeAudio.waveform.forEach((v,i)=>{ const x=i/(activeAudio.waveform.length-1)*w, amp=v*h*.44; ctx.moveTo(x,h/2-amp);ctx.lineTo(x,h/2+amp); });ctx.stroke();
    ctx.strokeStyle='#66e3b4';ctx.beginPath();ctx.moveTo(x1,0);ctx.lineTo(x1,h);ctx.moveTo(x2,0);ctx.lineTo(x2,h);ctx.stroke();
    $('#selection-label').textContent=`Selection ${fmtTime(s.start)} → ${fmtTime(s.end)}`;
  }
  function wireWaveformSelection(){
    const c=$('#waveform'); let down=false,start=0;
    const timeAt=e=>clamp(((e.clientX-c.getBoundingClientRect().left)/c.getBoundingClientRect().width)*activeAudio.metadata.duration,0,activeAudio.metadata.duration);
    c.onpointerdown=e=>{down=true;start=timeAt(e);activeAudio.selection={start,end:start};c.setPointerCapture(e.pointerId);drawWaveform();};
    c.onpointermove=e=>{if(!down)return;const t=timeAt(e);activeAudio.selection={start:Math.min(start,t),end:Math.max(start,t)};drawWaveform();};
    c.onpointerup=()=>{down=false; if(activeAudio.selection.end-activeAudio.selection.start<.03) activeAudio.selection.end=Math.min(activeAudio.metadata.duration,activeAudio.selection.start+.25);drawWaveform();};
  }
  function playSelection(){ const a=$('#audio-player'),s=activeAudio.selection;if(!a||!a.src)return;a.currentTime=s.start;a.play();clearTimeout(a._sel);a._sel=setTimeout(()=>a.pause(),Math.max(50,(s.end-s.start)*1000)); }
  function createArtifact(){
    const {start,end}=activeAudio.selection; if(end-start<.03){showToast('Select a longer waveform range first.');return;}
    const type=$('#artifact-type').value,label=$('#artifact-label').value.trim()||`${type} ${activeAudio.artifacts.length+1}`;
    activeAudio.artifacts.push({id:uid('art'),type,label,start:+start.toFixed(4),end:+end.toFixed(4)}); $('#artifact-label').value='';renderArtifacts();showToast('Artifact created from exact source offsets.');
  }
  function renderArtifacts(){ const el=$('#artifact-list'); if(!el)return; el.innerHTML=activeAudio.artifacts.length?activeAudio.artifacts.map(a=>`<div class="artifact-row"><span class="chip">${a.type}</span><div><strong>${escapeHtml(a.label)}</strong><div class="meta">${fmtTime(a.start)} → ${fmtTime(a.end)} · ${(a.end-a.start).toFixed(2)}s</div></div><button class="small danger" data-del-art="${a.id}">Remove</button></div>`).join(''):'<div class="muted">No Artifacts yet. Drag across the waveform to select a range.</div>'; $$('[data-del-art]').forEach(b=>b.onclick=()=>{activeAudio.artifacts=activeAudio.artifacts.filter(a=>a.id!==b.dataset.delArt);renderArtifacts();}); }

  async function publishCurrentSound(){
    const r=readRights('rights'); if(!activeAudio.buffer)return; if(!r.owns){showToast('Ownership/permission acknowledgment is required.');return;} if(r.hasVoice&&!r.voiceConsent){showToast('Voice consent is required for identifiable human voice.');return;}
    const id=uid('snd'), blobKey=`audio:${id}`; await putBlob(blobKey,activeAudio.blob);
    const s={ id, title:$('#publish-title').value.trim(), description:$('#publish-description').value.trim(), category:$('#publish-category').value, tags:$('#publish-tags').value.split(',').map(x=>x.trim()).filter(Boolean), ...activeAudio.metadata, waveform:activeAudio.waveform, creatorId:CURRENT_USER.id, createdAt:nowIso(), version:1, demo:false, parentSoundId:null, rights:r, forkCount:0,useCount:0,artifacts:activeAudio.artifacts,blobKey,sourceName:activeAudio.sourceName };
    state.sounds.push(s);saveState();showToast('Published locally with rights manifest and provenance.');location.hash=`#/sounds/${id}`;
  }

  async function renderSoundDetail(id){
    const s=getSound(id); if(!s){$('#view').innerHTML='<div class="empty">Sound object not found.</div>';return;}
    const u=getUser(s.creatorId), parent=s.parentSoundId?getSound(s.parentSoundId):null, children=allSounds().filter(x=>x.parentSoundId===s.id);
    $('#view').innerHTML=`<div class="stack">
      <section class="card">
        <div class="detail-head"><div><div class="meta">${s.demo?'DEMO OBJECT':'LOCAL OBJECT'} · v${s.version}</div><h2>${escapeHtml(s.title)}</h2><div class="flex"><span class="avatar">${u.initials}</span><span><strong>${escapeHtml(u.name)}</strong><br><span class="muted">${escapeHtml(u.handle)}</span></span></div></div><div class="flex"><button id="fork-sound" ${s.rights.remix?'':'disabled'}>${s.rights.remix?'Fork sound':'Remix not allowed'}</button><button id="report-sound">Report rights issue</button></div></div>
        ${miniWave(s.waveform)}
        ${s.demo?'<div class="notice warn">Demo object: metadata and lineage are illustrative; no original audio file is embedded.</div>':`<audio id="detail-audio" controls style="width:100%;margin-top:10px"></audio>`}
        <p>${escapeHtml(s.description||'No description.')}</p><div class="chips">${rightsChips(s.rights)}</div>
      </section>
      <div class="split"><section class="card"><h2 class="section-title">Source metadata</h2><div class="kpis">${[['Duration',fmtTime(s.duration)],['Channels',s.channels],['Sample rate',s.sampleRate?`${s.sampleRate} Hz`:'Unknown'],['Peak',s.peak?.toFixed?.(3)||'Unknown'],['RMS',s.rms?.toFixed?.(3)||'Unknown'],['BPM','Unknown'],['Key','Unknown'],['Forks',children.length]].map(([k,v])=>`<div class="kpi"><strong>${v}</strong><span>${k}</span></div>`).join('')}</div></section>
      <section class="card"><h2 class="section-title">Rights summary</h2><div class="codebox">license: ${escapeHtml(s.rights.license)}\npublic_listen: ${s.rights.publicListen}\nremix: ${s.rights.remix}\ncommercial_remix: ${s.rights.commercialRemix}\nai_conditioning: ${s.rights.aiConditioning}\nai_training: ${s.rights.aiTraining}\nmarketplace: ${s.rights.marketplace}\nvoice_present: ${s.rights.hasVoice}\nvoice_consent: ${s.rights.voiceConsent}</div></section></div>
      <section class="card"><h2 class="section-title">Artifacts</h2><div class="stack">${s.artifacts?.length?s.artifacts.map(a=>`<div class="artifact-row"><span class="chip">${escapeHtml(a.type)}</span><div><strong>${escapeHtml(a.label)}</strong><div class="meta">Exact source offsets ${fmtTime(a.start)} → ${fmtTime(a.end)}</div></div><span class="chip good">Traceable</span></div>`).join(''):'<div class="muted">No Artifacts published from this source.</div>'}</div></section>
      <section class="card"><h2 class="section-title">Provenance + lineage</h2>${lineageGraph(s,parent,children)}</section>
    </div>`;
    if(!s.demo&&s.blobKey){ try{ const blob=await getBlob(s.blobKey); if(blob){const a=$('#detail-audio');a.src=URL.createObjectURL(blob);} }catch{} }
    $('#fork-sound').onclick=()=>openForkModal(s); $('#report-sound').onclick=()=>openReportModal(s);
  }

  function lineageGraph(s,parent,children){
    const nodes=[]; if(parent)nodes.push({type:'root',x:30,y:95,w:180,h:60,label:parent.title,sub:'parent source'}); nodes.push({type:s.parentSoundId?'fork':'root',x:270,y:95,w:190,h:60,label:s.title,sub:s.parentSoundId?'current fork':'source root'});
    (s.artifacts||[]).slice(0,3).forEach((a,i)=>nodes.push({type:'artifact',x:520,y:20+i*78,w:170,h:54,label:a.label,sub:a.type}));
    children.slice(0,3).forEach((c,i)=>nodes.push({type:'fork',x:740,y:20+i*78,w:190,h:54,label:c.title,sub:'fork'}));
    const paths=[]; if(parent)paths.push([210,125,270,125]); (s.artifacts||[]).slice(0,3).forEach((a,i)=>paths.push([460,125,520,47+i*78])); children.slice(0,3).forEach((c,i)=>paths.push([460,125,740,47+i*78]));
    return `<div class="graph"><svg viewBox="0 0 980 260" role="img" aria-label="Sound provenance graph"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#4c5a67"></path></marker></defs>${paths.map(p=>`<path d="M${p[0]},${p[1]} C${(p[0]+p[2])/2},${p[1]} ${(p[0]+p[2])/2},${p[3]} ${p[2]},${p[3]}"></path>`).join('')}${nodes.map(n=>`<g class="${n.type}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}"></rect><text x="${n.x+12}" y="${n.y+25}">${escapeHtml(n.label).slice(0,24)}</text><text class="muted" x="${n.x+12}" y="${n.y+43}">${escapeHtml(n.sub)}</text></g>`).join('')}</svg></div>`;
  }

  function openForkModal(source){
    openModal(`<form id="fork-form" class="modal-body"><div class="modal-head"><div><h2>Fork ${escapeHtml(source.title)}</h2><p class="muted">Upstream attribution remains attached. Choose rights for your new derivative.</p></div><button type="button" data-close-modal>×</button></div><div class="field"><label>Fork title</label><input id="fork-title" value="${escapeHtml(source.title)} — fork"></div>${rightsFormHtml('fork',defaultRights({owns:true,aiTraining:false,license:source.rights.license}))}<div class="modal-actions"><button type="button" data-close-modal>Cancel</button><button class="primary" type="submit">Create fork</button></div></form>`);
    wireRightsDependencies('fork'); $('#fork-form').onsubmit=e=>{e.preventDefault();const r=readRights('fork');if(!r.owns||r.hasVoice&&!r.voiceConsent){showToast('Complete required rights acknowledgments.');return;}const fork={...source,id:uid('snd'),title:$('#fork-title').value.trim()||`${source.title} — fork`,creatorId:CURRENT_USER.id,createdAt:nowIso(),version:1,demo:false,parentSoundId:source.id,rights:r,forkCount:0,useCount:0,blobKey:null,description:`Fork of ${source.title}. Upstream attribution preserved.`,artifacts:[]};state.sounds.push(fork);saveState();closeModal();showToast('Fork created with parent attribution.');location.hash=`#/sounds/${fork.id}`;};
  }
  function openReportModal(source){
    openModal(`<form id="report-form" class="modal-body"><div class="modal-head"><div><h2>Report rights issue</h2><p class="muted">MVP reports are stored locally in this browser.</p></div><button type="button" data-close-modal>×</button></div><div class="field"><label>Issue</label><select id="report-type"><option>Ownership concern</option><option>Voice / identity consent</option><option>License mismatch</option><option>Attribution problem</option><option>Other</option></select></div><div class="field" style="margin-top:8px"><label>Details</label><textarea id="report-details" required></textarea></div><div class="modal-actions"><button type="button" data-close-modal>Cancel</button><button class="primary" type="submit">Record report</button></div></form>`);
    $('#report-form').onsubmit=e=>{e.preventDefault();state.reports.push({id:uid('report'),soundId:source.id,type:$('#report-type').value,details:$('#report-details').value.trim(),createdAt:nowIso(),status:'local-review'});saveState();closeModal();showToast('Rights issue recorded locally.');};
  }

  function agentCard(a){const u=getUser(a.creatorId);return `<article class="card agent-card" data-agent-id="${a.id}"><div class="card-header"><div><h3>${escapeHtml(a.title)}</h3><div class="meta"><span>${escapeHtml(u.handle)}</span><span>v${escapeHtml(a.version)}</span><span>${a.demo?'Demo':'Local'}</span></div></div><span class="chip good">★ ${Number(a.rating).toFixed(1)}</span></div><p>${escapeHtml(a.description)}</p><div class="chips">${a.tags.map(t=>`<span class="chip">${escapeHtml(t)}</span>`).join('')}</div><div class="meta" style="margin-top:10px"><span>${a.uses} uses</span><span>${a.forks} forks</span><span>${a.ratings} ratings</span></div></article>`;}
  function renderAgents(){ $('#view').innerHTML=`<div class="toolbar"><input id="agent-search" class="search" type="search" placeholder="Search agent recipes"><button id="new-agent" class="primary">Create recipe</button></div><div id="agent-grid" class="grid"></div>`; const repaint=()=>{const q=$('#agent-search').value.toLowerCase();const list=allAgents().filter(a=>[a.title,a.description,...a.tags].join(' ').toLowerCase().includes(q));$('#agent-grid').innerHTML=list.map(agentCard).join('');$$('.agent-card').forEach(c=>c.onclick=()=>location.hash=`#/agents/${c.dataset.agentId}`);};$('#agent-search').oninput=repaint;$('#new-agent').onclick=openNewAgentModal;repaint(); }
  function openNewAgentModal(){ openModal(`<form id="agent-form" class="modal-body"><div class="modal-head"><div><h2>Create sound-processing recipe</h2><p class="muted">Recipes are shareable configuration/workflow objects. No model is executed in the MVP.</p></div><button type="button" data-close-modal>×</button></div><div class="field"><label>Title</label><input id="agent-title" required></div><div class="field" style="margin-top:8px"><label>Description</label><textarea id="agent-desc" required></textarea></div><div class="form-grid" style="margin-top:8px"><div class="field"><label>Input types</label><input id="agent-inputs" placeholder="Field recording, Loop"></div><div class="field"><label>Output types</label><input id="agent-outputs" placeholder="One-shots, recipe"></div></div><div class="field" style="margin-top:8px"><label>Steps (one per line)</label><textarea id="agent-steps" required></textarea></div><div class="field" style="margin-top:8px"><label>Tags</label><input id="agent-tags"></div><div class="modal-actions"><button type="button" data-close-modal>Cancel</button><button type="submit" class="primary">Publish recipe</button></div></form>`); $('#agent-form').onsubmit=e=>{e.preventDefault();state.agents.push({id:uid('agent'),title:$('#agent-title').value.trim(),creatorId:CURRENT_USER.id,version:'1.0',description:$('#agent-desc').value.trim(),inputs:$('#agent-inputs').value.split(',').map(x=>x.trim()).filter(Boolean),outputs:$('#agent-outputs').value.split(',').map(x=>x.trim()).filter(Boolean),steps:$('#agent-steps').value.split('\n').map(x=>x.trim()).filter(Boolean),tags:$('#agent-tags').value.split(',').map(x=>x.trim()).filter(Boolean),forks:0,uses:0,rating:0,ratings:0,demo:false});saveState();closeModal();showToast('Agent recipe published locally.');renderAgents();}; }
  function renderAgentDetail(id){const a=allAgents().find(x=>x.id===id);if(!a){$('#view').innerHTML='<div class="empty">Agent recipe not found.</div>';return;}const u=getUser(a.creatorId);$('#view').innerHTML=`<div class="split"><section class="card"><div class="meta">RECIPE · v${escapeHtml(a.version)} · ${a.demo?'DEMO':'LOCAL'}</div><h2>${escapeHtml(a.title)}</h2><div class="flex"><span class="avatar">${u.initials}</span><span><strong>${escapeHtml(u.name)}</strong><br><span class="muted">${escapeHtml(u.handle)}</span></span></div><p>${escapeHtml(a.description)}</p><div class="notice">This is a workflow/configuration object. The MVP does not pretend an LLM or audio model executed it.</div><h3 class="section-title" style="margin-top:16px">Steps</h3><div class="stack">${a.steps.map((s,i)=>`<div class="artifact-row"><span class="chip">${i+1}</span><div>${escapeHtml(s)}</div><span></span></div>`).join('')}</div></section><aside class="stack"><section class="card"><div class="kpis"><div class="kpi"><strong>★ ${Number(a.rating).toFixed(1)}</strong><span>Rating</span></div><div class="kpi"><strong>${a.uses}</strong><span>Uses</span></div><div class="kpi"><strong>${a.forks}</strong><span>Forks</span></div><div class="kpi"><strong>${a.ratings}</strong><span>Ratings</span></div></div><hr><div class="flex"><button id="fork-agent">Fork recipe</button><button id="rate-agent" class="primary">Rate recipe</button></div></section><section class="card"><h3 class="section-title">I/O contract</h3><div class="codebox">inputs: ${escapeHtml(a.inputs.join(', ')||'not specified')}\noutputs: ${escapeHtml(a.outputs.join(', ')||'not specified')}\ntags: ${escapeHtml(a.tags.join(', '))}</div></section></aside></div>`;$('#fork-agent').onclick=()=>{const fork={...a,id:uid('agent'),title:`${a.title} — fork`,creatorId:CURRENT_USER.id,version:'1.0',forks:0,uses:0,rating:0,ratings:0,demo:false};state.agents.push(fork);saveState();showToast('Recipe forked locally.');location.hash=`#/agents/${fork.id}`;};$('#rate-agent').onclick=()=>openRateModal(a);}
  function openRateModal(agent){openModal(`<form id="rate-form" class="modal-body"><div class="modal-head"><h2>Rate ${escapeHtml(agent.title)}</h2><button type="button" data-close-modal>×</button></div><div class="field"><label>Rating</label><select id="rating">${[5,4,3,2,1].map(n=>`<option value="${n}">${n} / 5</option>`).join('')}</select></div><div class="modal-actions"><button type="button" data-close-modal>Cancel</button><button class="primary" type="submit">Save rating</button></div></form>`);$('#rate-form').onsubmit=e=>{e.preventDefault();const n=+$('#rating').value;if(agent.demo){const copy={...agent,id:uid('agent'),creatorId:CURRENT_USER.id,title:`${agent.title} — rated copy`,demo:false};copy.rating=n;copy.ratings=1;state.agents.push(copy);}else{const local=state.agents.find(x=>x.id===agent.id);local.rating=((local.rating*local.ratings)+n)/(local.ratings+1);local.ratings++;}saveState();closeModal();showToast('Rating saved locally.');route();};}

  function renderProfile(){const sounds=state.sounds.filter(s=>s.creatorId===CURRENT_USER.id),agents=state.agents.filter(a=>a.creatorId===CURRENT_USER.id),forks=sounds.filter(s=>s.parentSoundId),uses=sounds.reduce((n,s)=>n+(s.useCount||0),0);$('#view').innerHTML=`<div class="stack"><section class="card"><div class="detail-head"><div class="flex"><span class="avatar" style="width:52px;height:52px">LC</span><div><h2 style="margin:0">Local Creator</h2><span class="muted">@local · browser-local MVP identity</span></div></div></div><div class="kpis" style="margin-top:14px"><div class="kpi"><strong>${sounds.length}</strong><span>Published sounds</span></div><div class="kpi"><strong>${forks.length}</strong><span>Sound forks</span></div><div class="kpi"><strong>${agents.length}</strong><span>Agent recipes</span></div><div class="kpi"><strong>${uses}</strong><span>Downstream uses</span></div></div></section><section class="card"><h2 class="section-title">Published sounds</h2><div class="grid">${sounds.length?sounds.map(soundCard).join(''):'<div class="empty">Your published sounds will appear here.</div>'}</div></section><section class="card"><h2 class="section-title">Agent recipes</h2><div class="grid">${agents.length?agents.map(agentCard).join(''):'<div class="empty">Your agent recipes will appear here.</div>'}</div></section></div>`;$$('.sound-card').forEach(c=>c.onclick=()=>location.hash=`#/sounds/${c.dataset.soundId}`);$$('.agent-card').forEach(c=>c.onclick=()=>location.hash=`#/agents/${c.dataset.agentId}`);}

  function renderAbout(){ $('#view').innerHTML=`<div class="split"><section class="card"><h2 style="margin-top:0">AuralRoot is the source layer, not another prompt-to-song generator.</h2><p class="muted">The core object is a rights-aware sound graph: source recording → exact artifacts → forks → derived works, with permissions and attribution carried forward.</p><div class="two-col-list" style="margin-top:16px"><div class="principle"><h3>Source-first creation</h3><p>Every derivative starts from an attributable source object.</p></div><div class="principle"><h3>Explicit rights</h3><p>Remix, commercial reuse, AI context, and AI training are separate controls.</p></div><div class="principle"><h3>Attribution follows derivatives</h3><p>Forks preserve parent IDs and display their upstream source.</p></div><div class="principle"><h3>Training is opt-in</h3><p>AI model training permission is OFF unless a creator explicitly enables it.</p></div><div class="principle"><h3>No pretend AI</h3><p>Unsupported processing is labeled as unavailable instead of returning fabricated results.</p></div><div class="principle"><h3>Portable architecture</h3><p>Local-first data structures can later move behind Cloudflare D1/R2 or another shared backend.</p></div></div></section><aside class="stack"><section class="card"><h3 class="section-title">MVP storage</h3><div class="codebox">metadata: browser localStorage\naudio blobs: IndexedDB\nanalysis: Web Audio API\nrecording: MediaRecorder\nlineage: parentSoundId + artifact offsets\nshared backend: not connected yet</div></section><section class="card"><h3 class="section-title">Next infrastructure boundary</h3><p class="muted">A shared collection requires authenticated server-side metadata plus object storage. The current model is intentionally structured so SoundObject metadata can move to D1/Postgres and blobs to R2/S3 without changing the core UX.</p></section></aside></div>`; }

  window.addEventListener('hashchange',route); window.addEventListener('DOMContentLoaded',route);
})();
