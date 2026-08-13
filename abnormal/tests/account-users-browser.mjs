import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { enhanceApp } from '../src/enhancer.js';
import { enhanceAccountUsers } from '../src/account-users.js';
import { enhanceFunctionalCards } from '../src/functional-cards.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = await fs.readFile(path.join(root, 'src', 'index.js'), 'utf8');
const match = src.match(/const APP_GZ_B64="([A-Za-z0-9+/=]+)"/);
if (!match) throw new Error('compressed app bundle missing');
const base = zlib.gunzipSync(Buffer.from(match[1], 'base64')).toString('utf8');
const html = enhanceFunctionalCards(enhanceAccountUsers(enhanceApp(base)));
if (!html.includes('id="cw-demo-workspace-script"') || !html.includes('id="cw-account-users-script"') || !html.includes('id="cw-functional-cards-script"')) throw new Error('enhanced browser fixture is missing injected scripts');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(html);
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(8765, '127.0.0.1', resolve);
});

const chromePath = process.env.CHROME;
if (!chromePath) throw new Error('CHROME environment variable is required');
const profile = `/tmp/abnormal-cdp-${process.pid}`;
const chrome = spawn(chromePath, [
  '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-background-networking',
  '--remote-debugging-port=9222', `--user-data-dir=${profile}`, 'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeErr = '';
chrome.stderr.on('data', d => { chromeErr += String(d); if (chromeErr.length > 20000) chromeErr = chromeErr.slice(-20000); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, label, timeoutMs = 12000) {
  const end = Date.now() + timeoutMs;
  let last;
  while (Date.now() < end) {
    try { const v = await fn(); if (v) return v; } catch (e) { last = e; }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}${last ? `: ${last.message}` : ''}`);
}

let ws;
let nextId = 1;
const pending = new Map();
const runtimeErrors = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }
    }, 10000).unref();
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'Runtime.evaluate failed');
  return r.result?.value;
}

try {
  await waitFor(async () => {
    const r = await fetch('http://127.0.0.1:9222/json/version');
    return r.ok;
  }, 'Chrome DevTools endpoint');

  const tabResp = await fetch('http://127.0.0.1:9222/json/new?http://127.0.0.1:8765/', { method: 'PUT' });
  if (!tabResp.ok) throw new Error(`Could not create Chrome tab: ${tabResp.status}`);
  const tab = await tabResp.json();
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) p.reject(new Error(`${msg.error.message} (${msg.error.code})`)); else p.resolve(msg.result || {});
    }
    if (msg.method === 'Runtime.exceptionThrown') runtimeErrors.push(msg.params?.exceptionDetails?.exception?.description || msg.params?.exceptionDetails?.text || 'browser exception');
  });
  await send('Runtime.enable');
  await send('Page.enable');

  await waitFor(async () => evaluate(`document.readyState !== 'loading' && !!document.getElementById('cwDemoFab')`), 'editable account workspace');
  if (runtimeErrors.length) throw new Error(`Browser startup error: ${runtimeErrors.join(' | ')}`);

  const phase1 = await evaluate(`(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
    const click=e=>{if(!e)throw new Error('missing click target');e.click()};
    const set=(e,v)=>{if(!e)throw new Error('missing input');e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))};
    window.confirm=()=>true;
    const portfolioCard=q('.metrics .metric'); if(!portfolioCard)throw new Error('portfolio overview card missing');
    click(portfolioCard); await wait(20);
    if(!q('#cwOverviewDialog.cw-open')||!q('#cwOverviewCopy').textContent.trim())throw new Error('portfolio card drill-down failed');
    click(q('#cwOverviewClose')); await wait(10);
    const baseAccountLink=q('.focus .linkbtn'); if(!baseAccountLink)throw new Error('base account link missing');
    click(baseAccountLink); await wait(20);
    const briefTab=qa('#accountModal .tabs button').find(x=>x.textContent.includes('Meeting brief')); if(!briefTab)throw new Error('base meeting brief tab missing');
    click(briefTab); await wait(20);
    if(!q('#accountModal #brief [data-cw-base-pdf]'))throw new Error('base meeting brief PDF button missing');
    const basePdfAccount=window.cwBaseAbnormalBriefAccount();
    const basePdf=await window.cwBuildAbnormalMeetingBrief(basePdfAccount).text();
    if(!basePdf.includes('Meeting Brief')||!basePdf.includes('Success outcome'))throw new Error('base meeting brief PDF content failed');
    click(q('#accountModal .close')); await wait(10);
    click(q('#cwDemoFab')); await wait(50);
    const card=q('#cwList .cw-account'); if(!card)throw new Error('no account cards rendered');
    const accountId=card.dataset.accountId;
    const open=card.querySelector('[data-user-action="open-account"]'); if(!open)throw new Error('Open account button missing');
    click(open); await wait(50);
    if(!q('#cwAccountWorkspaceModal.cw-open'))throw new Error('account workspace did not open');
    if(qa('#cwAwUsers .cw-aw-user').length!==3)throw new Error('expected 3 seeded stakeholders');
    click(q('.cw-aw-summary [data-drill="health"]')); await wait(20);
    if(!q('#cwAwDrill.cw-open')||!q('#cwAwDrillCopy').textContent.includes('Risk:'))throw new Error('health overview drill-down failed');
    click(q('[data-fn-action="add-card"]')); await wait(20);
    set(q('#cwCardForm [name="title"]'),'Call readiness');
    set(q('#cwCardForm [name="value"]'),'Ready with gaps');
    set(q('#cwCardForm [name="detail"]'),'Confirm sponsor and decision date');
    q('#cwCardForm').requestSubmit(); await wait(40);
    let custom=qa('#cwCustomCards [data-custom-card-id]').find(x=>x.textContent.includes('Call readiness'));
    if(!custom)throw new Error('custom card add failed');
    click(custom.querySelector('[data-fn-action="edit-card"]')); await wait(20);
    set(q('#cwCardForm [name="value"]'),'Decision ready');
    q('#cwCardForm').requestSubmit(); await wait(40);
    custom=qa('#cwCustomCards [data-custom-card-id]').find(x=>x.textContent.includes('Call readiness'));
    if(!custom||!custom.textContent.includes('Decision ready'))throw new Error('custom card edit failed');
    const pdfAccount=JSON.parse(localStorage.getItem('an_demo_workspace_v2')).accounts.find(a=>a.id===accountId);
    const pdf=await window.cwBuildAbnormalMeetingBrief(pdfAccount).text();
    if(!pdf.startsWith('%PDF-1.4')||!pdf.includes('Meeting Brief')||!pdf.includes('Manual call notes')||!pdf.includes('Page 1 of'))throw new Error('meeting brief PDF structure failed');
    click(q('[data-user-action="add-user"]')); await wait(20);
    set(q('#cwUserForm [name="name"]'),'Interview Test User');
    set(q('#cwUserForm [name="title"]'),'VP, Security Operations');
    set(q('#cwUserForm [name="level"]'),'VP');
    set(q('#cwUserForm [name="lane"]'),'Executive technical sponsor');
    set(q('#cwUserForm [name="email"]'),'interview.user@test-account.example');
    set(q('#cwUserForm [name="status"]'),'Engaged');
    q('#cwUserForm').requestSubmit(); await wait(50);
    let added=qa('#cwAwUsers .cw-aw-user').find(x=>x.textContent.includes('Interview Test User'));
    if(!added||qa('#cwAwUsers .cw-aw-user').length!==4)throw new Error('add user failed');
    click(added.querySelector('[data-user-action="edit-user"]')); await wait(20);
    set(q('#cwUserForm [name="title"]'),'Senior VP, Security Operations');
    q('#cwUserForm').requestSubmit(); await wait(50);
    added=qa('#cwAwUsers .cw-aw-user').find(x=>x.textContent.includes('Interview Test User'));
    if(!added||!added.textContent.includes('Senior VP, Security Operations'))throw new Error('edit user failed');
    const stored=JSON.parse(localStorage.getItem('an_demo_workspace_v2')||'{}');
    const account=(stored.accounts||[]).find(a=>a.id===accountId);
    const user=account&&Array.isArray(account.users)&&account.users.find(u=>u.name==='Interview Test User');
    if(!user||user.title!=='Senior VP, Security Operations')throw new Error('edited user not persisted to account storage');
    const savedCard=account.customCards.find(c=>c.title==='Call readiness');
    if(!savedCard||savedCard.value!=='Decision ready')throw new Error('custom card not persisted');
    return {accountId,userId:user.id,cardId:savedCard.id,count:account.users.length};
  })()`);
  if (!phase1 || phase1.count !== 4) throw new Error(`Unexpected phase1 result: ${JSON.stringify(phase1)}`);

  await send('Page.reload', { ignoreCache: true });
  await waitFor(async () => evaluate(`document.readyState !== 'loading' && !!document.getElementById('cwDemoFab')`), 'workspace after reload');

  const phase2 = await evaluate(`(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
    window.confirm=()=>true;
    q('#cwDemoFab').click(); await wait(50);
    const card=q('#cwList .cw-account[data-account-id="${phase1.accountId}"]'); if(!card)throw new Error('same account missing after reload');
    card.querySelector('[data-user-action="open-account"]').click(); await wait(50);
    let custom=qa('#cwCustomCards [data-custom-card-id]').find(x=>x.dataset.customCardId==='${phase1.cardId}');
    if(!custom||!custom.textContent.includes('Decision ready'))throw new Error('custom card did not persist through reload');
    custom.querySelector('[data-fn-action="drill-custom"]').click(); await wait(20);
    if(!q('#cwAwDrill.cw-open')||!q('#cwAwDrillCopy').textContent.includes('Decision ready'))throw new Error('custom card drill-down failed after reload');
    custom.querySelector('[data-fn-action="remove-card"]').click(); await wait(30);
    if(q('#cwCustomCards [data-custom-card-id="${phase1.cardId}"]'))throw new Error('custom card remove failed');
    let user=qa('#cwAwUsers .cw-aw-user').find(x=>x.textContent.includes('Interview Test User'));
    if(!user)throw new Error('user did not persist through browser reload');
    if(!user.textContent.includes('Senior VP, Security Operations'))throw new Error('edited title did not persist through reload');
    user.querySelector('[data-user-action="remove-user"]').click(); await wait(50);
    if(qa('#cwAwUsers .cw-aw-user').some(x=>x.textContent.includes('Interview Test User')))throw new Error('remove user failed');
    if(qa('#cwAwUsers .cw-aw-user').length!==3)throw new Error('expected 3 seeded stakeholders after removal');
    const stored=JSON.parse(localStorage.getItem('an_demo_workspace_v2')||'{}');
    const account=(stored.accounts||[]).find(a=>a.id==='${phase1.accountId}');
    if(!account||account.users.some(u=>u.name==='Interview Test User'))throw new Error('removed user still exists in persisted storage');
    return {count:account.users.length};
  })()`);
  if (!phase2 || phase2.count !== 3) throw new Error(`Unexpected phase2 result: ${JSON.stringify(phase2)}`);
  if (runtimeErrors.length) throw new Error(`Browser runtime error: ${runtimeErrors.join(' | ')}`);

  console.log('PASS: real Chrome validates portfolio and account drill-downs, editable persisted custom cards, PDF generation, and stakeholder CRUD');
} catch (error) {
  console.error('BROWSER_E2E_FAILURE:', error.message);
  if (runtimeErrors.length) console.error('BROWSER_EXCEPTIONS:', runtimeErrors.join(' | '));
  if (chromeErr) console.error('CHROME_STDERR_TAIL:', chromeErr.slice(-5000));
  process.exitCode = 1;
} finally {
  try { if (ws) ws.close(); } catch {}
  try { chrome.kill('SIGKILL'); } catch {}
  await new Promise(resolve => server.close(resolve));
  await fs.rm(profile, { recursive: true, force: true }).catch(()=>{});
}
