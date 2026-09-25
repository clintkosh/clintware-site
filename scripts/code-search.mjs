#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
if (!argv.length || argv.includes("-h") || argv.includes("--help")) {
  console.log("Usage: node scripts/code-search.mjs <query> [--path <fragment>] [--regex] [--case-sensitive] [--max <n>] [--json] [--files-only] [--root <path>]");
  process.exit(argv.length ? 0 : 2);
}

let query="", root=process.cwd(), regex=false, caseSensitive=false, max=100, json=false, filesOnly=false;
const filters=[];
for (let i=0;i<argv.length;i++) {
  const a=argv[i];
  if (!query && !a.startsWith("-")) query=a;
  else if (a==="--path") filters.push(argv[++i]||"");
  else if (a==="--regex") regex=true;
  else if (a==="--case-sensitive") caseSensitive=true;
  else if (a==="--max") max=Math.max(1,Math.min(5000,Number(argv[++i]||100)));
  else if (a==="--json") json=true;
  else if (a==="--files-only") filesOnly=true;
  else if (a==="--root") root=argv[++i]||root;
  else { console.error("Unknown argument: "+a); process.exit(2); }
}
if (!query) process.exit(2);
root=path.resolve(root);

const skipDirs=new Set([".git","node_modules",".next",".astro","dist","build","coverage",".wrangler",".cache",".venv","venv","__pycache__"]);
const binary=new Set([".7z",".avi",".bin",".bmp",".class",".dll",".doc",".docx",".eot",".exe",".gif",".gz",".ico",".jar",".jpeg",".jpg",".mov",".mp3",".mp4",".otf",".pdf",".png",".ppt",".pptx",".pyc",".so",".tar",".tif",".tiff",".ttf",".wav",".webm",".webp",".woff",".woff2",".xls",".xlsx",".zip"]);
const files=[];
function walk(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.isDirectory() && skipDirs.has(e.name)) continue;
    const full=path.join(dir,e.name);
    if(e.isDirectory()) walk(full);
    else if(e.isFile() && !binary.has(path.extname(e.name).toLowerCase())) files.push(full);
  }
}
walk(root);

const rel=f=>path.relative(root,f).split(path.sep).join("/");
const filtered=files.filter(f=>{
  if(!filters.length) return true;
  const r=caseSensitive?rel(f):rel(f).toLowerCase();
  return filters.some(x=>r.includes(caseSensitive?x:x.toLowerCase()));
}).sort((a,b)=>rel(a).localeCompare(rel(b)));

let re=null;
if(regex){
  try { re=new RegExp(query,caseSensitive?"":"i"); }
  catch(e){ console.error("Invalid regex: "+e.message); process.exit(2); }
}
const matches=[], matchedFiles=new Set();
const hit=line=>regex?(re.lastIndex=0,re.test(line)):(caseSensitive?line.includes(query):line.toLowerCase().includes(query.toLowerCase()));

for(const file of filtered){
  if(matches.length>=max && !filesOnly) break;
  let stat;
  try { stat=fs.statSync(file); } catch { continue; }
  if(stat.size>4*1024*1024) continue;
  let buf;
  try { buf=fs.readFileSync(file); } catch { continue; }
  if(buf.includes(0)) continue;
  const lines=buf.toString("utf8").split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    if(!hit(lines[i])) continue;
    const p=rel(file); matchedFiles.add(p);
    if(filesOnly) break;
    matches.push({path:p,line:i+1,text:lines[i]});
    if(matches.length>=max) break;
  }
}
const result={query,root,mode:regex?"regex":"text",caseSensitive,pathFilters:filters,filesScanned:filtered.length,matchedFiles:matchedFiles.size,matches:filesOnly?matchedFiles.size:matches.length,truncated:!filesOnly&&matches.length>=max,results:filesOnly?[...matchedFiles]:matches};
if(json) console.log(JSON.stringify(result,null,2));
else if(filesOnly) [...matchedFiles].forEach(x=>console.log(x));
else matches.forEach(x=>console.log(`${x.path}:${x.line}: ${x.text}`));
if(!json) console.error(`Matched ${result.matches}; scanned ${result.filesScanned} text candidates.`);
process.exit(result.matches?0:1);
