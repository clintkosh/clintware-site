import http from 'node:http';
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';

const src=await fs.readFile(new URL('../src/index.js',import.meta.url),'utf8');
const m=src.match(/const APP_GZ_B64="([A-Za-z0-9+/=]+)"/);if(!m)throw new Error('bundle missing');
const base=zlib.gunzipSync(Buffer.from(m[1],'base64')).toString('utf8');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(base)});
await new Promise((r,j)=>{server.once('error',j);server.listen(8766,'127.0.0.1',r)});
const chromePath=process.env.CHROME;if(!chromePath)throw new Error('CHROME required');
const chrome=spawn(chromePath,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--remote-debugging-port=9223',`--user-data-dir=/tmp/ab-probe-${process.pid}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws,id=1;const pending=new Map(),exceptions=[];
function send(method,params={}){return new Promise((resolve,reject)=>{const n=id++;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));setTimeout(()=>{if(pending.has(n)){pending.delete(n);reject(new Error('timeout '+method))}},4000).unref()})}
try{
  for(let i=0;i<80;i++){try{const r=await fetch('http://127.0.0.1:9223/json/version');if(r.ok)break}catch{}await sleep(100)}
  const tr=await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'});const tab=await tr.json();ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});
  ws.addEventListener('message',ev=>{const x=JSON.parse(ev.data);if(x.id&&pending.has(x.id)){const p=pending.get(x.id);pending.delete(x.id);x.error?p.reject(new Error(x.error.message)):p.resolve(x.result||{})}if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params?.exceptionDetails?.exception?.description||x.params?.exceptionDetails?.text||'exception')});
  await send('Runtime.enable');await send('Page.enable');
  const blank=await send('Runtime.evaluate',{expression:'1+1',returnByValue:true});console.log('ABOUT_BLANK_EVAL',blank.result?.value);
  if(blank.result?.value!==2)throw new Error('about:blank eval failed');
  const nav=await send('Page.navigate',{url:'http://127.0.0.1:8766/'});console.log('NAV_RESULT',JSON.stringify(nav));
  await sleep(1000);
  console.log('EXCEPTIONS_AFTER_NAV',JSON.stringify(exceptions));
  try{const r=await send('Runtime.evaluate',{expression:'({ready:document.readyState,title:document.title,body:(document.body&&document.body.innerText||"").slice(0,120)})',returnByValue:true});console.log('REAL_PAGE_EVAL',JSON.stringify(r.result?.value))}catch(e){console.log('REAL_PAGE_EVAL_ERROR',e.message)}
  console.log('CDP_PROBE_DONE');
}finally{try{ws?.close()}catch{};try{chrome.kill('SIGKILL')}catch{};await new Promise(r=>server.close(r))}
