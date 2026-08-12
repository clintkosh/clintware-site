import fs from 'node:fs/promises';
import zlib from 'node:zlib';

const src = await fs.readFile(new URL('../src/index.js', import.meta.url), 'utf8');
const match = src.match(/const APP_GZ_B64="([A-Za-z0-9+/=]+)"/);
if (!match) throw new Error('compressed app bundle missing');
const html = zlib.gunzipSync(Buffer.from(match[1], 'base64')).toString('utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
console.log('BASE_HTML_LENGTH', html.length, 'INLINE_SCRIPTS', scripts.length);

for (let i = 0; i < scripts.length; i++) {
  const s = scripts[i];
  console.log(`SCRIPT_${i}_LENGTH`, s.length);
  const functions = [...s.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]);
  const declarations = [...s.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1]);
  console.log(`SCRIPT_${i}_FUNCTIONS`, functions.join(','));
  console.log(`SCRIPT_${i}_GLOBALS_SAMPLE`, declarations.slice(0,150).join(','));
  const browserGlobals = new Set(['top','parent','self','window','document','location','history','frames','name','status','event','length','closed','opener','navigator','origin','screen','performance','crypto','localStorage','sessionStorage']);
  const collisions = [...new Set([...functions, ...declarations].filter(x => browserGlobals.has(x)))];
  console.log(`SCRIPT_${i}_BROWSER_GLOBAL_COLLISIONS`, collisions.join(',') || '(none)');

  for (const re of [/\bwhile\s*\(/g,/\bfor\s*\(\s*;\s*;/g,/setInterval\s*\(/g,/requestAnimationFrame\s*\(/g,/location\.reload\s*\(/g,/document\.write\s*\(/g]) {
    const found = [...s.matchAll(re)];
    console.log(`SCRIPT_${i}_${String(re).replace(/[^A-Za-z]+/g,'_')}_COUNT`, found.length);
    for (const m of found.slice(0,8)) console.log('CONTEXT', JSON.stringify(s.slice(Math.max(0,m.index-180),m.index+420)));
  }

  const tail = s.slice(-1800);
  console.log(`SCRIPT_${i}_TAIL`, JSON.stringify(tail));
}
