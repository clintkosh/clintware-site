let PROMPT_PLAN=null;
const LIVE={
  active:false,display:null,mic:null,ctx:null,processor:null,sources:[],mute:null,
  buffers:[],samples:0,chunkSeconds:12,overlapSeconds:.7,pending:Promise.resolve(),startedAt:null,
  transcript:[],suggestions:[],gate:"Not started",source:"",lastError:"",processing:false,
  participants:"",customerId:"",consentConfirmed:false
};

function authGate(feature){
  if(S?.access?.authenticated)return '<div class="callout"><strong>AI workspace</strong><span>'+e(feature)+' is using your account-persistent CRM workspace.</span></div>';
  return '<div class="callout"><strong>Guest AI enabled</strong><span>'+e(feature)+' works without login in this isolated guest workspace. <a href="/auth/login">Sign in only if you want the CRM data retained across sessions/devices.</a></span></div>';
}
function aiStatusBadge(){
  let r=I?.ai?.research||{},ready=r.configured===true;
  return '<div class="provider-strip"><span class="status '+(ready?'good':'warn')+'">'+(ready?'Exa ready':'Exa unavailable')+'</span><span class="muted"> · AI via Clintware Control Plane'+(r.synthesis&&r.synthesis!=='unknown'?' · '+e(r.synthesis):'')+'</span></div>'
}
function safeHttpUrl(v){
  try{let u=new URL(String(v||""));return /^https?:$/.test(u.protocol)?u.toString():""}catch{return""}
}
function livePrompt(){
  if(PROMPT_PLAN&&PROMPT_PLAN.customerId!==S.customer?.id)PROMPT_PLAN=null;
  let preview='';
  if(PROMPT_PLAN){
    const p=PROMPT_PLAN.plan||{};
    preview='<div class="card ai-plan"><div class="split"><div><div class="eyebrow">Approval required</div><h2>Interpreted update</h2></div><span class="status good">'+e(p.confidence||'Review')+'</span></div><p>'+e(p.summary||'')+'</p>'+
      '<div class="ai-ops">'+(p.operations||[]).map((op,i)=>{
        let old=op.record_id?S.records.find(r=>r.id===op.record_id):null;
        let label=old?(old.data.title||old.data.name||old.type):(op.data?.title||op.data?.name||op.type);
        let payload=op.action==='update'?op.changes:op.data;
        return '<article class="ai-op"><div class="split"><strong>'+e((op.action||'change').toUpperCase()+' · '+(label||op.type||'record'))+'</strong><span class="prov">'+e(P(op.provenance||'internal_record'))+'</span></div><div class="muted">'+e(op.reason||'')+'</div><pre>'+e(JSON.stringify(payload||{},null,2))+'</pre></article>'
      }).join('')+'</div>'+
      ((p.gaps||[]).length?'<div class="callout"><strong>Gaps</strong><span>'+p.gaps.map(x=>e(x)).join('<br>')+'</span></div>':'')+
      '<div class="actions">'+((p.operations||[]).length?'<button class="btn primary" id="prompt-approve">Approve and apply '+(p.operations||[]).length+' change'+((p.operations||[]).length===1?'':'s')+'</button>':'<span class="status warn">No writable changes proposed</span>')+'<button class="btn" id="prompt-discard">Discard</button></div>'+
      (PROMPT_PLAN.researchUsed?'<div class="muted" style="margin-top:10px">External research was used as context only. Customer facts remain sourced from CRM/user input.</div>':'')+
      ((PROMPT_PLAN.citations||[]).length?'<div class="citations">'+PROMPT_PLAN.citations.map(x=>{let u=safeHttpUrl(x.url);return u?'<a href="'+e(u)+'" target="_blank" rel="noreferrer">'+e(x.title||u)+'</a>':''}).join('')+'</div>':'');
  }
  let history=R('plan_change').slice(-8).reverse();
  return head('Natural-language operations','Live Prompt','Type what changed. Exa-backed context and the current CRM record are used to interpret the update, propose precise record/card changes, and wait for approval before writing anything.')+
    authGate('Live Prompt')+aiStatusBadge()+
    '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="eyebrow">Selected customer</div><h2>'+e(S.customer?.name||'No customer selected')+'</h2><p class="muted">Examples: “SAP connector moved to week 9, mark the integration blocked and move the dependent deployment card.” “Customer confirmed the baseline is 42 minutes.” “Research the latest public SAP connector requirements and tell me if our plan needs a review.”</p>'+
    '<div class="field"><label>What changed?</label><textarea id="prompt-change" class="textarea ai-big" placeholder="Type the update in plain language."></textarea></div>'+
    '<div class="field"><label>Exa context</label><select id="prompt-research" class="select"><option value="auto">Auto: use Exa only when the wording calls for public/external verification</option><option value="on">On: always add public implementation / best-practice context</option><option value="off">Off: CRM context only</option></select><small>Before Exa is called, the control plane generates and scrubs a de-identified public search query. Raw customer CRM text is not sent directly to Exa.</small></div>'+
    '<div class="callout"><strong>Write boundary</strong><span>No AI-proposed update is committed until you approve the interpreted plan below.</span></div>'+
    '<button class="btn primary" id="prompt-run">Interpret update</button><div id="prompt-status" class="muted" style="margin-top:10px"></div></div>'+
    '<div><div class="section" style="margin-top:0"><h2>Proposed changes</h2></div>'+(preview||'<div class="empty">No pending AI plan. The live CRM remains unchanged.</div>')+
    '<div class="section"><h2>Approved change records</h2></div>'+
    (history.length?'<div class="ai-history">'+history.map(r=>'<article class="card"><div class="split"><strong>'+e(r.data.summary||r.data.title||'Approved change')+'</strong><span class="status good">Applied</span></div><div class="muted">'+e(r.data.approvedAt||r.updatedAt||'')+'</div><div class="muted" style="margin-top:6px">'+e((r.data.applied||[]).length+' persisted operation'+((r.data.applied||[]).length===1?'':'s'))+'</div></article>').join('')+'</div>':'<div class="empty">No approved Live Prompt change records yet.</div>')+
    '</div></div>';
}

async function runLivePrompt(){
  let t=document.querySelector('#prompt-change')?.value.trim();
  if(!t)return;
  let b=document.querySelector('#prompt-run'),st=document.querySelector('#prompt-status');
  b.disabled=true;st.textContent='Interpreting current CRM state…';
  try{
    let x=await api('/ai/interpret-change',{method:'POST',body:JSON.stringify({customerId:S.customer.id,text:t,researchMode:document.querySelector('#prompt-research')?.value||'auto'})});
    PROMPT_PLAN={...x,customerId:S.customer.id};
    render();
  }catch(err){st.textContent='Could not interpret update: '+err.message;b.disabled=false}
}
async function approveLivePrompt(){
  if(!PROMPT_PLAN?.planId)return;
  let b=document.querySelector('#prompt-approve');if(b){b.disabled=true;b.textContent='Applying…'}
  try{
    await api('/ai/plans/'+encodeURIComponent(PROMPT_PLAN.planId)+'/apply',{method:'POST',body:'{}'});
    PROMPT_PLAN=null;
    tab='live_prompt';
    await load(S.customer.id);
    let st=document.querySelector('#prompt-status');if(st)st.textContent='Approved changes applied and customer record refreshed.';
  }catch(err){if(b){b.disabled=false;b.textContent='Approve and apply'}alert(err.message==='plan_stale'?'This customer record changed after the AI interpretation. Re-run Live Prompt so you review a fresh plan before applying it.':'Apply failed: '+err.message)}
}

function assistantProfile(){return R('assistant_profile')[0]||null}
function transcriptText(){return LIVE.transcript.map(x=>x.text).join('\n')}
function suggestionHtml(s){
  return '<article class="suggestion-card"><div class="split"><span class="status '+(s.customer_match==='yes'?'good':s.customer_match==='no'?'warn':'')+'">'+e(s.customer_match||'uncertain')+' customer match</span><span class="muted">'+e(s.at||'')+'</span></div><div class="eyebrow" style="margin-top:8px">'+e((s.speaker_role||'unknown')+' · '+(s.trigger||'none'))+(s.researchUsed?' · Exa reference used':'')+'</div><div class="suggestion-text">'+e(s.suggestion||'')+'</div>'+(s.follow_up?'<div class="muted"><strong>Follow-up:</strong> '+e(s.follow_up)+'</div>':'')+((s.citations||[]).length?'<div class="citations">'+s.citations.map(x=>{let u=safeHttpUrl(x.url);return u?'<a href="'+e(u)+'" target="_blank" rel="noreferrer">'+e(x.title||u)+'</a>':''}).join('')+'</div>':'')+'</article>'
}
function liveAssistant(){
  if(LIVE.customerId&&LIVE.customerId!==S.customer?.id){
    if(LIVE.active)void stopLiveAudio();
    LIVE.transcript=[];LIVE.suggestions=[];LIVE.gate="Not started";LIVE.lastError="";LIVE.startedAt=null;LIVE.source="";LIVE.participants="";LIVE.consentConfirmed=false;
  }
  LIVE.customerId=S.customer?.id||"";
  let prof=assistantProfile(),saved=R('assistant_session').slice(-5).reverse();
  if(!LIVE.participants) LIVE.participants=String(prof?.data?.participants||S.customer?.facts?.stakeholders||"");
  let transcript=LIVE.transcript.length?LIVE.transcript.map(x=>'<div class="transcript-line"><span>'+e(x.at)+'</span><b>'+e(x.source)+'</b><p>'+e(x.text)+'</p></div>').join(''):'<div class="empty">No transcript yet.</div>';
  let sugg=LIVE.suggestions.length?LIVE.suggestions.slice().reverse().map(suggestionHtml).join(''):'<div class="empty">Suggestions appear only after the customer/context gate passes or when you ask the assistant directly.</div>';
  let gateClass=LIVE.gate.includes('matched')?'good':LIVE.gate.includes('Ignoring')?'warn':'';
  return head('Consent-gated call support','Live Customer Assistant','White-label live call assistant for implementation work. It can transcribe opted-in live machine audio or past recordings, gate suggestions to the selected customer, and answer direct questions on demand.')+
    authGate('Live Customer Assistant')+aiStatusBadge()+
    '<div class="assistant-lock"><div><div class="eyebrow">Customer lock</div><strong>'+e(S.customer?.name||'No customer selected')+'</strong><div class="muted">The assistant evaluates each transcript chunk against this account before suggesting a response.</div></div><span class="status '+gateClass+'">'+e(LIVE.gate)+'</span></div>'+
    '<div class="grid g2"><div class="card"><h2>Listen / transcribe</h2>'+
      '<label class="consent"><input type="checkbox" id="live-consent"> I confirm the customer/participants opted in to recording/transcription for this session.</label>'+
      '<label class="check"><input type="checkbox" id="live-mic" checked> Include my microphone with machine/tab audio.</label>'+
      '<div class="actions"><button class="btn primary" id="live-start" '+(LIVE.active?'disabled':'')+'>Start machine audio</button><button class="btn" id="live-stop" '+(!LIVE.active?'disabled':'')+'>Stop</button></div>'+
      '<div class="field"><label>Past recorded call</label><input id="live-file" type="file" class="input" accept="audio/*,video/webm,video/mp4"><small>Audio is decoded locally, chunked into PCM WAV segments, and only audio chunks are sent for transcription. Video is never uploaded.</small></div>'+
      '<button class="btn" id="live-file-run">Transcribe recording</button>'+
      '<div id="live-progress" class="muted" style="margin-top:10px">'+e(LIVE.lastError||'Chunk size: about '+LIVE.chunkSeconds+' seconds for live audio.')+'</div>'+
    '</div>'+
    '<div class="card"><h2>Ask directly</h2><p class="muted">Direct questions bypass the conversational gate, but answers remain grounded in the selected customer record and the assistant playbook.</p><div class="field"><textarea id="live-question" class="textarea" placeholder="What should I say next? What risk am I missing? What question should I ask?"></textarea></div><button class="btn primary" id="live-ask" '+(!S?.access?.authenticated?'disabled':'')+'>Ask assistant</button>'+
      '<div class="section"><h2>Assistant playbook</h2></div><div class="field"><label>Expected customer participants / identifiers</label><input id="assistant-participants" class="input" value="'+e(LIVE.participants)+'" placeholder="Names or roles, comma separated"><small>Used as conversational context only. No voice biometrics.</small></div><textarea id="assistant-playbook" class="textarea playbook" placeholder="Reusable guidance for this account assistant.">'+e(prof?.data?.playbook||'')+'</textarea><div class="actions"><button class="btn" id="assistant-profile-save">Save playbook</button><button class="btn" id="assistant-train" '+(!LIVE.transcript.length?'disabled':'')+'>Train from transcript</button></div>'+
    '</div></div>'+
    '<div class="grid g2" style="margin-top:14px"><div><div class="section"><h2>Transcript</h2><div class="actions"><button class="btn" id="live-clear">Clear local transcript</button><button class="btn" id="live-save-session" '+(!LIVE.transcript.length?'disabled':'')+'>Save session to CRM</button></div></div><div class="transcript-box">'+transcript+'</div></div>'+
    '<div><div class="section"><h2>Live suggestions</h2></div><div class="suggestion-list">'+sugg+'</div></div></div>'+
    (saved.length?'<div class="section"><h2>Saved assistant sessions</h2></div><div class="tablewrap"><table class="table"><thead><tr><th>Session</th><th>Started</th><th>Source</th><th>Consent</th></tr></thead><tbody>'+saved.map(r=>'<tr><td>'+e(r.data.title||'Assistant session')+'</td><td>'+e(r.data.startedAt||'')+'</td><td>'+e(r.data.source||'')+'</td><td>'+e(String(r.data.consentConfirmed||''))+'</td></tr>').join('')+'</tbody></table></div>':'');
}

function updateLiveDom(){
  let g=document.querySelector('.assistant-lock .status');if(g){g.textContent=LIVE.gate;g.className='status '+(LIVE.gate.includes('matched')?'good':LIVE.gate.includes('Ignoring')?'warn':'')}
  let p=document.querySelector('#live-progress');if(p)p.textContent=LIVE.lastError|| (LIVE.processing?'Processing audio…':LIVE.active?'Listening to machine audio…':'Ready');
  let tb=document.querySelector('.transcript-box');if(tb)tb.innerHTML=LIVE.transcript.length?LIVE.transcript.map(x=>'<div class="transcript-line"><span>'+e(x.at)+'</span><b>'+e(x.source)+'</b><p>'+e(x.text)+'</p></div>').join(''):'<div class="empty">No transcript yet.</div>';
  let sb=document.querySelector('.suggestion-list');if(sb)sb.innerHTML=LIVE.suggestions.length?LIVE.suggestions.slice().reverse().map(suggestionHtml).join(''):'<div class="empty">Suggestions appear only after the customer/context gate passes or when you ask the assistant directly.</div>';
  let stop=document.querySelector('#live-stop');if(stop)stop.disabled=!LIVE.active;
  let start=document.querySelector('#live-start');if(start)start.disabled=LIVE.active;
  let train=document.querySelector('#assistant-train');if(train)train.disabled=!LIVE.transcript.length;
  let save=document.querySelector('#live-save-session');if(save)save.disabled=!LIVE.transcript.length;
}
function dedupeTranscriptChunk(existing,incoming){
  const a=String(existing||'').trim().split(/\s+/).filter(Boolean),b=String(incoming||'').trim().split(/\s+/).filter(Boolean);
  if(!b.length)return '';
  const norm=x=>x.toLowerCase().replace(/[^a-z0-9']/g,'');
  for(let n=Math.min(18,a.length,b.length);n>=2;n--){let ok=true;for(let i=0;i<n;i++)if(norm(a[a.length-n+i])!==norm(b[i])){ok=false;break}if(ok)return b.slice(n).join(' ')}
  return b.join(' ')
}
function rms(samples){let sum=0;for(let i=0;i<samples.length;i++)sum+=samples[i]*samples[i];return Math.sqrt(sum/Math.max(1,samples.length))}
function mergeFloat(parts,total){let out=new Float32Array(total),at=0;for(const p of parts){out.set(p,at);at+=p.length}return out}
function downsample(input,inRate,outRate=16000){
  if(inRate===outRate)return input;
  const ratio=inRate/outRate,len=Math.max(1,Math.round(input.length/ratio)),out=new Float32Array(len);
  for(let i=0;i<len;i++){let start=Math.floor(i*ratio),end=Math.min(input.length,Math.floor((i+1)*ratio)),sum=0,n=0;for(let j=start;j<end;j++){sum+=input[j];n++}out[i]=n?sum/n:0}
  return out
}
function wavBlob(samples,sampleRate=16000){
  let buf=new ArrayBuffer(44+samples.length*2),v=new DataView(buf),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  w(0,'RIFF');v.setUint32(4,36+samples.length*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,samples.length*2,true);
  let o=44;for(let i=0;i<samples.length;i++,o+=2){let s=Math.max(-1,Math.min(1,samples[i]));v.setInt16(o,s<0?s*0x8000:s*0x7fff,true)}
  return new Blob([buf],{type:'audio/wav'})
}
async function transcribeBlob(blob,source,analyze=true){
  LIVE.processing=true;updateLiveDom();
  try{
    let r=await fetch('/api/audio/transcribe',{method:'POST',headers:{'content-type':'audio/wav','x-transcript-hint':transcriptText().slice(-800),'x-consent-confirmed':LIVE.consentConfirmed?'1':'0','x-customer-id':String(S.customer?.id||'')},body:blob});
    let x=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(x.error||r.statusText);
    let text=dedupeTranscriptChunk(transcriptText(),String(x.text||'').trim());
    if(text){
      LIVE.transcript.push({at:new Date().toLocaleTimeString(),source,text});
      if(LIVE.transcript.length>250)LIVE.transcript=LIVE.transcript.slice(-250);
      updateLiveDom();
      if(analyze)await askLiveAssistant(false,'');
    }
  }catch(err){LIVE.lastError='Transcription error: '+err.message;updateLiveDom()}
  finally{LIVE.processing=false;updateLiveDom()}
}
function flushLiveChunk(force=false){
  if(!LIVE.buffers.length||!LIVE.ctx)return;
  const rate=LIVE.ctx.sampleRate,overlap=Math.floor(rate*LIVE.overlapSeconds);
  if(!force&&LIVE.samples<rate*LIVE.chunkSeconds)return;
  if(force&&LIVE.samples<=overlap)return;
  let merged=mergeFloat(LIVE.buffers,LIVE.samples);LIVE.buffers=[];LIVE.samples=0;
  if(!force&&merged.length>overlap){let tail=merged.slice(merged.length-overlap);LIVE.buffers=[tail];LIVE.samples=tail.length}
  if(rms(merged)<0.002)return;
  let pcm=downsample(merged,rate,16000),blob=wavBlob(pcm,16000);
  LIVE.pending=LIVE.pending.then(()=>transcribeBlob(blob,LIVE.source||'live',true)).catch(err=>{LIVE.lastError=String(err);updateLiveDom()})
}
async function startLiveAudio(){
  if(!document.querySelector('#live-consent')?.checked){alert('Confirm participant consent before starting transcription.');return}
  LIVE.consentConfirmed=true;
  if(!navigator.mediaDevices?.getDisplayMedia){alert('This browser does not support machine/tab audio capture. Use current Chrome or Edge.');return}
  let display=null,mic=null;
  try{
    LIVE.lastError='';LIVE.gate='Awaiting selected customer';LIVE.startedAt=new Date().toISOString();LIVE.source='machine audio';
    display=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
    if(!display.getAudioTracks().length){display.getTracks().forEach(t=>t.stop());throw Error('No shared audio track. In the share picker, choose a tab/screen source with Share audio enabled.')}
    if(document.querySelector('#live-mic')?.checked)mic=await navigator.mediaDevices.getUserMedia({audio:true});
    let ctx=new (window.AudioContext||window.webkitAudioContext)(),processor=ctx.createScriptProcessor(4096,2,1),mute=ctx.createGain();mute.gain.value=0;processor.connect(mute);mute.connect(ctx.destination);
    let sources=[];for(const stream of [new MediaStream(display.getAudioTracks()),mic].filter(Boolean)){let src=ctx.createMediaStreamSource(stream);src.connect(processor);sources.push(src)}
    processor.onaudioprocess=ev=>{let ib=ev.inputBuffer,n=ib.length,ch=ib.numberOfChannels,mono=new Float32Array(n);for(let c=0;c<ch;c++){let d=ib.getChannelData(c);for(let i=0;i<n;i++)mono[i]+=d[i]/ch}LIVE.buffers.push(mono);LIVE.samples+=n;flushLiveChunk(false)};
    display.getVideoTracks().forEach(t=>t.onended=()=>{if(LIVE.active)stopLiveAudio()});
    LIVE.active=true;LIVE.display=display;LIVE.mic=mic;LIVE.ctx=ctx;LIVE.processor=processor;LIVE.sources=sources;LIVE.mute=mute;await ctx.resume();updateLiveDom()
  }catch(err){for(const s of [display,mic])try{s&&s.getTracks().forEach(t=>t.stop())}catch{};LIVE.lastError='Could not start audio: '+err.message;LIVE.active=false;updateLiveDom()}
}
async function stopLiveAudio(){
  if(!LIVE.active)return;
  flushLiveChunk(true);LIVE.active=false;
  try{LIVE.processor&&(LIVE.processor.onaudioprocess=null)}catch{}
  for(const s of [LIVE.display,LIVE.mic])try{s&&s.getTracks().forEach(t=>t.stop())}catch{}
  try{LIVE.sources.forEach(s=>s.disconnect())}catch{}
  try{LIVE.processor?.disconnect();LIVE.mute?.disconnect();await LIVE.ctx?.close()}catch{}
  LIVE.display=LIVE.mic=LIVE.ctx=LIVE.processor=LIVE.mute=null;LIVE.sources=[];LIVE.gate=LIVE.gate==='Not started'?'Stopped':LIVE.gate+' · stopped';updateLiveDom()
}
async function transcribeRecordedFile(){
  if(!document.querySelector('#live-consent')?.checked){alert('Confirm participant consent before transcribing the recording.');return}
  LIVE.consentConfirmed=true;
  let file=document.querySelector('#live-file')?.files?.[0];if(!file)return;
  let p=document.querySelector('#live-progress');LIVE.lastError='';LIVE.source='recorded call';LIVE.startedAt=LIVE.startedAt||new Date().toISOString();
  try{
    let ctx=new (window.AudioContext||window.webkitAudioContext)(),raw=await file.arrayBuffer(),ab=await ctx.decodeAudioData(raw.slice(0)),rate=ab.sampleRate,total=ab.length,channels=ab.numberOfChannels,chunk=Math.max(1,Math.floor(rate*25)),overlap=Math.floor(rate*LIVE.overlapSeconds),stride=Math.max(1,chunk-overlap),parts=Math.ceil(Math.max(1,total-overlap)/stride);
    for(let start=0,part=1;start<total;start+=stride,part++){
      let end=Math.min(total,start+chunk),mono=new Float32Array(end-start);
      for(let ch=0;ch<channels;ch++){let d=ab.getChannelData(ch);for(let i=start;i<end;i++)mono[i-start]+=d[i]/channels}
      if(p)p.textContent='Transcribing recording chunk '+part+' of '+parts+'…';
      if(rms(mono)>=0.002)await transcribeBlob(wavBlob(downsample(mono,rate,16000),16000),'recorded call',false);
    }
    await ctx.close();LIVE.gate='Recording transcribed · ready to train';LIVE.lastError='Recording transcription complete. Review the transcript, then train or ask directly.';updateLiveDom()
  }catch(err){LIVE.lastError='Could not transcribe recording: '+err.message;updateLiveDom()}
}
async function askLiveAssistant(direct=false,question=''){
  let recent=transcriptText().slice(-10000);
  if(!direct&&!recent)return;
  try{
    let participants=(document.querySelector('#assistant-participants')?.value||LIVE.participants||'').split(',').map(x=>x.trim()).filter(Boolean);LIVE.participants=participants.join(', ');let x=await api('/ai/live-assist',{method:'POST',body:JSON.stringify({customerId:S.customer.id,transcript:recent,direct,question,participants,researchMode:'auto'})});
    if(x.customer_match==='yes')LIVE.gate='Customer context matched';
    else if(x.customer_match==='no')LIVE.gate='Ignoring unrelated conversation';
    else LIVE.gate='Customer context uncertain';
    if(x.should_respond&&x.suggestion){
      let row={...x,at:new Date().toLocaleTimeString()};
      let last=LIVE.suggestions[LIVE.suggestions.length-1];if(!last||last.suggestion!==row.suggestion)LIVE.suggestions.push(row);
      if(LIVE.suggestions.length>30)LIVE.suggestions=LIVE.suggestions.slice(-30)
    }
    updateLiveDom()
  }catch(err){LIVE.lastError='Assistant error: '+err.message;updateLiveDom()}
}
async function directAsk(){
  let q=document.querySelector('#live-question')?.value.trim();if(!q)return;
  let b=document.querySelector('#live-ask');b.disabled=true;
  await askLiveAssistant(true,q);
  b.disabled=false;document.querySelector('#live-question').value=''
}
async function saveAssistantProfile(){
  let text=document.querySelector('#assistant-playbook')?.value||'',participants=document.querySelector('#assistant-participants')?.value||LIVE.participants||'',r=assistantProfile(),data={title:'Live Customer Assistant Playbook',playbook:text,participants,updatedFrom:'Manual / approved training'};LIVE.participants=participants;
  if(r)await api('/records/'+r.id,{method:'PATCH',body:JSON.stringify({data,provenance:'internal_record'})});
  else await api('/records',{method:'POST',body:JSON.stringify({customerId:S.customer.id,type:'assistant_profile',provenance:'internal_record',data})});
  await load(S.customer.id)
}
async function trainAssistant(){
  let tr=transcriptText();if(tr.length<40)return;
  let b=document.querySelector('#assistant-train');b.disabled=true;b.textContent='Extracting lessons…';
  try{
    let x=await api('/ai/train-assistant',{method:'POST',body:JSON.stringify({customerId:S.customer.id,transcript:tr})}),t=x.training||{},html='<h2>Training proposal</h2><p class="muted">Nothing is added to the playbook until you approve it.</p><div class="card"><strong>Summary</strong><p>'+e(t.summary||'')+'</p></div>'+
      '<div class="grid g2" style="margin-top:10px"><div class="card"><h3>Reusable guidance</h3>'+(t.lessons||[]).map(z=>'<p>• '+e(z)+'</p>').join('')+'</div><div class="card"><h3>Avoid</h3>'+(t.avoid||[]).map(z=>'<p>• '+e(z)+'</p>').join('')+'</div></div>'+
      '<div class="card" style="margin-top:10px"><h3>Customer-specific notes</h3>'+(t.customer_specific_notes||[]).map(z=>'<p>• '+e(z)+'</p>').join('')+'</div><div class="actions" style="margin-top:12px"><button class="btn primary" id="training-approve">Approve into playbook</button><button class="btn" data-close>Discard</button></div>';
    let o=modal(html);o.querySelector('#training-approve').onclick=async()=>{let current=assistantProfile()?.data?.playbook||'',stamp=new Date().toISOString().slice(0,10),addition='\n\nAPPROVED TRAINING · '+stamp+'\n'+(t.lessons||[]).map(z=>'• '+z).join('\n')+((t.avoid||[]).length?'\n\nAVOID\n'+t.avoid.map(z=>'• '+z).join('\n'):'');let r=assistantProfile(),data={title:'Live Customer Assistant Playbook',playbook:(current+addition).trim(),participants:LIVE.participants||r?.data?.participants||'',updatedFrom:'Approved transcript training'};if(r)await api('/records/'+r.id,{method:'PATCH',body:JSON.stringify({data,provenance:'internal_record'})});else await api('/records',{method:'POST',body:JSON.stringify({customerId:S.customer.id,type:'assistant_profile',provenance:'internal_record',data})});o.remove();await load(S.customer.id)}
  }catch(err){alert('Training failed: '+err.message)}
  finally{let x=document.querySelector('#assistant-train');if(x){x.disabled=false;x.textContent='Train from transcript'}}
}
async function saveAssistantSession(){
  if(!LIVE.transcript.length)return;
  let data={title:'Live assistant session · '+new Date().toLocaleString(),startedAt:LIVE.startedAt||new Date().toISOString(),endedAt:new Date().toISOString(),source:LIVE.source||'mixed',consentConfirmed:Boolean(LIVE.consentConfirmed),customerGate:LIVE.gate,transcript:transcriptText().slice(-60000),suggestions:LIVE.suggestions.slice(-30).map(x=>({at:x.at,trigger:x.trigger,suggestion:x.suggestion,follow_up:x.follow_up}))};
  await api('/records',{method:'POST',body:JSON.stringify({customerId:S.customer.id,type:'assistant_session',provenance:'internal_record',data})});
  await load(S.customer.id)
}
function bindAiFeatures(){
  let pr=document.querySelector('#prompt-run');if(pr)pr.onclick=runLivePrompt;
  let pa=document.querySelector('#prompt-approve');if(pa)pa.onclick=approveLivePrompt;
  let pd=document.querySelector('#prompt-discard');if(pd)pd.onclick=async()=>{let id=PROMPT_PLAN?.planId;PROMPT_PLAN=null;render();if(id)try{await api('/ai/plans/'+encodeURIComponent(id)+'/discard',{method:'POST',body:'{}'})}catch{}};
  let ls=document.querySelector('#live-start');if(ls)ls.onclick=startLiveAudio;
  let lp=document.querySelector('#live-stop');if(lp)lp.onclick=stopLiveAudio;
  let lf=document.querySelector('#live-file-run');if(lf)lf.onclick=transcribeRecordedFile;
  let la=document.querySelector('#live-ask');if(la)la.onclick=directAsk;
  let ps=document.querySelector('#assistant-profile-save');if(ps)ps.onclick=saveAssistantProfile;
  let tr=document.querySelector('#assistant-train');if(tr)tr.onclick=trainAssistant;
  let lc=document.querySelector('#live-clear');if(lc)lc.onclick=()=>{LIVE.transcript=[];LIVE.suggestions=[];LIVE.gate='Not started';LIVE.lastError='';LIVE.consentConfirmed=false;updateLiveDom()};
  let sv=document.querySelector('#live-save-session');if(sv)sv.onclick=saveAssistantSession;
  updateLiveDom()
}

window.addEventListener('pagehide',()=>{if(LIVE.active)void stopLiveAudio()},{capture:true});
