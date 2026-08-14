const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'tools', 'assemblerer', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(Boolean);
const app = scripts[scripts.length - 1];

const listeners = {};
const storage = new Map();
const sandbox = {
  console,
  Blob: class Blob { constructor(parts, opts){ this.parts=parts; this.opts=opts; } },
  URL: { createObjectURL:()=> 'blob:test', revokeObjectURL:()=>{} },
  setTimeout:(fn)=>fn(),
  localStorage:{
    getItem:k=>storage.has(k)?storage.get(k):null,
    setItem:(k,v)=>storage.set(k,String(v)),
    removeItem:k=>storage.delete(k)
  },
  navigator:{clipboard:{writeText:async()=>{}}},
  document:{
    addEventListener:(name,fn)=>{listeners[name]=fn},
    querySelectorAll:()=>[],
    getElementById:()=>({addEventListener(){},classList:{add(){},remove(){}},style:{},value:'',textContent:'',innerHTML:'',setCustomValidity(){},reportValidity(){},focus(){}}),
    createElement:()=>({click(){},remove(){},style:{}}),
    body:{appendChild(){}}
  },
  window:{},
  gtag:()=>{}
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(app, sandbox, {filename:'assemblerer-inline.js'});
const api = sandbox.AssemblererMVP;
if(!api) throw new Error('AssemblererMVP public test API missing');

const brief = 'Build a privacy-first local Windows AI utility that recommends a model and minimizes paid API usage.';
const a = api.assembleSystem(brief, 2, 200, 'balanced');
const b = api.assembleSystem(brief, 2, 200, 'balanced');
if(a.companyId !== b.companyId) throw new Error('company ID is not deterministic');
if(a.focus !== 'security' && a.focus !== 'local-ai') throw new Error('focus classification failed');
if(a.agents.length !== 6) throw new Error('expected six agents');
if(a.tasks.length < 6) throw new Error('expected execution queue');
if(!a.tasks.some(t=>t.route === 'Local')) throw new Error('expected local route');
if(!a.tasks.some(t=>t.authority <= 1)) throw new Error('expected review-gated task');
if(a.schema !== 'clintware.assemblerer/company-manifest@0.1') throw new Error('manifest schema missing');
const safe = api.nextSafeTask(a);
if(!safe || safe.authority < 2 || safe.route !== 'Local') throw new Error('safe action selector violated policy');
const noAuto = api.assembleSystem('Build a generic company operations tool for founders and teams.', 1, 100, 'local');
if(api.nextSafeTask(noAuto) !== null) throw new Error('A1 must not auto-run actions');
console.log(JSON.stringify({ok:true, companyId:a.companyId, focus:a.focus, agents:a.agents.length, tasks:a.tasks.length, safeTask:safe.id}));
