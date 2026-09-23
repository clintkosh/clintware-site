function body(){
 if(tab==='customers')return customers();
 if(tab==='accounts')return accounts();
 if(tab==='command')return command();
 if(tab==='live_prompt')return livePrompt();
 if(tab==='live_assistant')return liveAssistant();
 if(tab==='kb')return kb();
 if(tab==='implementation')return implementation();
 if(tab==='raci')return raci();
 if(tab==='deployment')return deployment();
 if(tab==='rollout')return rollout();
 if(tab==='issues')return issues();
 if(tab==='triage')return triage();
 if(tab==='meetings')return meetings();
 if(tab==='documents')return docs();
 if(tab==='handoff')return page('handoff','Sales-to-CS handoff','Scope, promise, business case, systems, and validation.',[["title","Item"],["value","Value"],["validation","Validation"],["note","Notes"]])+stakeholderPanel('Customer stakeholders')+'<div class="section"><h2>Systems & integrations</h2><button class="btn" data-add="integration">Add integration</button></div>'+table('integration',[["name","System"],["purpose","Purpose"],["connectorStatus","Status"],["technicalValidation","Validation"]]);
 if(tab==='risks')return page('risk','Risk & escalation','No surprise-at-week-10 scenarios.',[["title","Risk"],["impact","Impact"],["owner","Owner"],["mitigation","Mitigation"],["escalationStatus","Escalation"],["nextDecision","Next decision"]]);
 if(tab==='roi')return page('kpi','ROI & KPIs','Measure first; monetize only when method and inputs are documented.',[["name","Metric"],["baseline","Baseline"],["target","Target"],["sourceSystem","Source"],["cadence","Cadence"],["currentValue","Current"]]);
 if(tab==='adoption')return page('adoption','Adoption & health','Only supported or customer-provided measurements.',[["name","Metric"],["value","Value"],["period","Period"],["source","Source"],["owner","Owner"]]);
 if(tab==='renewal')return page('renewal','Renewal & value','Year-over-year value, risk, commitments, renewal plan, and expansion signals.',[["renewalDate","Renewal date"],["term","Term"],["arr","ARR"],["valueRealized","Value realized"],["renewalPlan","Plan"]]);
 return command()
}
function drawer(){return '<aside id="drawer" class="drawer hidden"><div class="section" style="margin:0"><h2>What if?</h2><button class="btn" id="close">Close</button></div><p class="muted">Scenario overlays never change live records.</p>'+SCEN.map(s=>'<label class="scenario"><input type="checkbox" data-s="'+s.id+'" '+(scen.has(s.id)?'checked':'')+'><span><strong>'+e(s.label)+'</strong><br><span class="muted">'+e(s.impact)+'</span></span></label>').join('')+'<button class="btn" id="reset">Reset</button></aside>'}
function applyTheme(){document.documentElement.dataset.theme=theme==='system'?(matchMedia('(prefers-color-scheme:light)').matches?'light':'dark'):theme}
async function moveCard(id,column){let r=S.records.find(x=>x.id===id);if(!r)return;await api('/records/'+id,{method:'PATCH',body:JSON.stringify({data:{column}})});await load(S.customer.id)}
function render(){document.querySelector('#app').innerHTML='<div>'+top()+'<div class="layout">'+side()+'<main>'+body()+'</main></div></div>'+drawer();bind()}
function bind(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{if(tab==='live_assistant'&&b.dataset.tab!=='live_assistant'&&typeof stopLiveAudio==='function'&&LIVE?.active)void stopLiveAudio();tab=b.dataset.tab;render()});
 document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>{tab=b.dataset.goto;render()});
 document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>edit(b.dataset.add));
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{let r=S.records.find(x=>x.id===b.dataset.edit);edit(r.type,r)});
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(confirm('Archive this record?')){await api('/records/'+b.dataset.del,{method:'DELETE'});load(S.customer.id)}});
 let cs=document.querySelector('#cust');if(cs)cs.onchange=x=>{if(x.target.value){if(typeof stopLiveAudio==='function'&&LIVE?.active)void stopLiveAudio();load(x.target.value)}};
 let nc=document.querySelector('#newc');if(nc)nc.onclick=newCustomer;
 let nc2=document.querySelector('#newc2');if(nc2)nc2.onclick=newCustomer;
 let im=document.querySelector('#import');if(im)im.onclick=importCustomers;
 let i2=document.querySelector('#import2');if(i2)i2.onclick=importCustomers;
 let ic=document.querySelector('#import-customers');if(ic)ic.onclick=importCustomers;
 document.querySelectorAll('[data-customer-open]').forEach(x=>x.onclick=()=>{tab='command';load(x.dataset.customerOpen)});
 let clr=document.querySelector('#clear-non-golden');if(clr)clr.onclick=async()=>{let g=S.customers.find(c=>c.isGoldenExample);if(confirm('Remove every customer except '+(g?.name||'the golden example')+'?')){await api('/customers/clear',{method:'POST',body:JSON.stringify({overrideGolden:false})});tab='customers';await load()}};
 let ca=document.querySelector('#clear-all');if(ca)ca.onclick=async()=>{let ov=document.querySelector('#override-golden')?.checked===true;if(!ov){alert('Enable the golden-example override first to remove ACME MEDICAL.');return}if(confirm('Remove ALL customers, including ACME MEDICAL?')){await api('/customers/clear',{method:'POST',body:JSON.stringify({overrideGolden:true})});tab='customers';await load()}};
 let rs=document.querySelector('#reset-samples');if(rs)rs.onclick=async()=>{if(confirm('Reset the workspace to ACME MEDICAL plus the 10 default synthetic sample customers?')){await api('/customers/reset-samples',{method:'POST',body:'{}'});tab='customers';await load()}};
 document.querySelector('#whatif').onclick=()=>document.querySelector('#drawer').classList.remove('hidden');
 document.querySelector('#close').onclick=()=>document.querySelector('#drawer').classList.add('hidden');
 document.querySelector('#reset').onclick=()=>{scen.clear();render()};
 document.querySelectorAll('[data-s]').forEach(x=>x.onchange=()=>{x.checked?scen.add(x.dataset.s):scen.delete(x.dataset.s);render();document.querySelector('#drawer').classList.remove('hidden')});
 let th=document.querySelector('#theme');th.value=theme;th.onchange=()=>{theme=th.value;localStorage.setItem('n7theme',theme);applyTheme()};
 let tm=document.querySelector('#template');if(tm)tm.onclick=accuracyTemplate;
 let br=document.querySelector('#brief');if(br)br.onclick=brief;
 let kn=document.querySelector('#kb-new');if(kn)kn.onclick=()=>kbEdit();
 let kg=document.querySelector('#kb-guideline');if(kg)kg.onclick=kbGuideline;
 let ks=document.querySelector('#kb-settings');if(ks)ks.onclick=kbSettings;
 document.querySelectorAll('[data-kb-open]').forEach(x=>x.onclick=()=>openKbArticle(x.dataset.kbOpen));
 let ra=document.querySelector('#raci-add');if(ra)ra.onclick=()=>raciEdit();
 document.querySelectorAll('[data-raci-edit]').forEach(b=>b.onclick=()=>raciEdit(Number(b.dataset.raciEdit)));
 document.querySelectorAll('[data-edit-jira]').forEach(b=>b.onclick=jiraSettings);
 document.querySelectorAll('[data-jira-create]').forEach(b=>b.onclick=()=>jiraCreateEngineering(b.dataset.jiraCreate));
 document.querySelectorAll('[data-jira-deploy]').forEach(b=>b.onclick=()=>jiraCreateDeployment(b.dataset.jiraDeploy));
 let ex=document.querySelector('#export');if(ex)ex.onclick=()=>location.href='/api/export';
 document.querySelectorAll('[data-card]').forEach(card=>card.ondragstart=ev=>ev.dataTransfer.setData('text/plain',card.dataset.card));
 document.querySelectorAll('[data-drop]').forEach(col=>{col.ondragover=ev=>{ev.preventDefault();col.classList.add('dragover')};col.ondragleave=()=>col.classList.remove('dragover');col.ondrop=ev=>{ev.preventDefault();col.classList.remove('dragover');moveCard(ev.dataTransfer.getData('text/plain'),col.dataset.drop)}});
 if(typeof bindAiFeatures==='function')bindAiFeatures();
}
applyTheme();
