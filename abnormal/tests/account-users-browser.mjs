import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { enhanceApp } from '../src/enhancer.js';
import { enhanceAccountUsers } from '../src/account-users.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = await fs.readFile(path.join(root, 'src', 'index.js'), 'utf8');
const match = src.match(/const APP_GZ_B64="([A-Za-z0-9+/=]+)"/);
if (!match) throw new Error('compressed app bundle missing');
const base = zlib.gunzipSync(Buffer.from(match[1], 'base64')).toString('utf8');
let html = enhanceAccountUsers(enhanceApp(base));
if (!html.includes('id="cw-demo-workspace-script"') || !html.includes('id="cw-account-users-script"')) throw new Error('enhanced browser fixture is missing injected scripts');

const SELF_TEST = String.raw`<script id="cw-browser-e2e">
(function(){
  function result(ok,msg){
    document.documentElement.setAttribute('data-cw-browser-test',ok?'pass':'fail');
    var el=document.getElementById('cwBrowserTestResult');
    if(!el){el=document.createElement('pre');el.id='cwBrowserTestResult';el.style.cssText='position:fixed;left:0;bottom:0;z-index:2147483647;background:#000;color:#fff;padding:8px';document.body.appendChild(el)}
    el.textContent=(ok?'PASS: ':'FAIL: ')+msg;
  }
  function click(el){if(!el)throw new Error('missing click target');el.click()}
  function set(el,v){if(!el)throw new Error('missing input');el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
  function run(){
    try{
      window.confirm=function(){return true};
      var phase=sessionStorage.getItem('cw_e2e_phase')||'start';
      var fab=document.getElementById('cwDemoFab');
      if(!fab)throw new Error('editable account workspace did not install');
      click(fab);
      var card=document.querySelector('#cwList .cw-account');
      if(!card)throw new Error('no account cards rendered');
      var open=card.querySelector('[data-user-action="open-account"]');
      if(!open)throw new Error('Open account button missing');
      click(open);
      var modal=document.getElementById('cwAccountWorkspaceModal');
      if(!modal||!modal.classList.contains('cw-open'))throw new Error('account workspace did not open');
      var users=document.querySelectorAll('#cwAwUsers .cw-aw-user');
      if(phase==='start'){
        if(users.length!==3)throw new Error('expected 3 seeded stakeholders, got '+users.length);
        click(document.querySelector('[data-user-action="add-user"]'));
        set(document.querySelector('#cwUserForm [name="name"]'),'Interview Test User');
        set(document.querySelector('#cwUserForm [name="title"]'),'VP, Security Operations');
        set(document.querySelector('#cwUserForm [name="level"]'),'VP');
        set(document.querySelector('#cwUserForm [name="lane"]'),'Executive technical sponsor');
        set(document.querySelector('#cwUserForm [name="email"]'),'interview.user@test-account.example');
        set(document.querySelector('#cwUserForm [name="status"]'),'Engaged');
        document.getElementById('cwUserForm').requestSubmit();
        var added=[...document.querySelectorAll('#cwAwUsers .cw-aw-user')].find(function(x){return x.textContent.includes('Interview Test User')});
        if(!added||document.querySelectorAll('#cwAwUsers .cw-aw-user').length!==4)throw new Error('add user failed');
        click(added.querySelector('[data-user-action="edit-user"]'));
        set(document.querySelector('#cwUserForm [name="title"]'),'Senior VP, Security Operations');
        document.getElementById('cwUserForm').requestSubmit();
        if(![...document.querySelectorAll('#cwAwUsers .cw-aw-user')].some(function(x){return x.textContent.includes('Senior VP, Security Operations')}))throw new Error('edit user failed');
        sessionStorage.setItem('cw_e2e_phase','reload');
        location.reload();
        return;
      }
      if(phase==='reload'){
        var persisted=[...users].find(function(x){return x.textContent.includes('Interview Test User')});
        if(!persisted)throw new Error('user did not persist through reload');
        if(!persisted.textContent.includes('Senior VP, Security Operations'))throw new Error('edited title did not persist through reload');
        click(persisted.querySelector('[data-user-action="remove-user"]'));
        if([...document.querySelectorAll('#cwAwUsers .cw-aw-user')].some(function(x){return x.textContent.includes('Interview Test User')}))throw new Error('remove user failed');
        if(document.querySelectorAll('#cwAwUsers .cw-aw-user').length!==3)throw new Error('unexpected stakeholder count after removal');
        sessionStorage.removeItem('cw_e2e_phase');
        result(true,'account open + 3 seeded stakeholders + add + edit + persistence + remove all work');
      }
    }catch(e){result(false,String(e&&e.message||e))}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(run,250)});else setTimeout(run,250);
})();
</script>`;

const lower = html.toLowerCase();
const bodyClose = lower.lastIndexOf('</body>');
html = bodyClose >= 0 ? html.slice(0,bodyClose) + SELF_TEST + html.slice(bodyClose) : html + SELF_TEST;

const outDir = process.env.ABNORMAL_BROWSER_FIXTURE || '/tmp/abnormal-browser-fixture';
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, 'index.html'), html);
console.log(path.join(outDir, 'index.html'));
