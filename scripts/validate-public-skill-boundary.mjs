import fs from "node:fs";
import path from "node:path";

const roots = ["public/skills","skills","agentbridge-cloud/chatgpt-plugin/skills"].map(p=>path.resolve(p)).filter(p=>fs.existsSync(p));
const textExtensions = new Set([".md",".html",".json",".js",".mjs",".ts",".txt",".yml",".yaml"]);

const hardForbidden = [
  [/\bmcp\.clintware\.com\b/i, "private Clintware MCP hostname"],
  [/\bauth\.clintware\.com\b/i, "private Clintware auth hostname"],
  [/\bCONTROL_PLANE_(?:MCP|ADMIN)_TOKEN\b/i, "control-plane credential name"],
  [/\bGITHUB_(?:CONTROL_PLANE_TOKEN|TOKEN_[A-Z0-9_]+)\b/i, "private GitHub credential name"],
  [/\bCLOUDFLARE_(?:CONTROL_PLANE_TOKEN|API_TOKEN|ACCOUNT_ID|ZONE_ID)\b/i, "private Cloudflare credential/account name"],
  [/\bclintkosh\b/i, "personal repository/account identifier"],
  [/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/, "GitHub token-shaped value"],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/, "GitHub fine-grained token-shaped value"],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/, "API token-shaped value"],
  [/\bAIza[A-Za-z0-9_-]{20,}\b/, "Google API key-shaped value"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, "Slack token-shaped value"],
  [/\bBearer\s+[A-Za-z0-9._~+\/-]{24,}\b/i, "bearer token-shaped value"],
  [/\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3}\.)\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3}\.)\d{1,3})\b/, "private IP address"]
];

const allowedEmailDomains = new Set(["example.com","example.org","example.net","example.invalid"]);
const allowedPhone = /(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?555[ .-]?01\d{2}\b/;

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(full));
    else if(textExtensions.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

const files=[...new Set(roots.flatMap(walk))];
const violations=[];
for(const file of files){
  const body=fs.readFileSync(file,"utf8");
  const rel=path.relative(process.cwd(),file).replaceAll("\\","/");

  for(const [pattern,label] of hardForbidden){
    if(pattern.test(body)) violations.push({file:rel,label});
  }

  const emails=body.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)||[];
  for(const email of emails){
    const domain=email.split("@")[1].toLowerCase();
    if(!allowedEmailDomains.has(domain)) violations.push({file:rel,label:"non-placeholder email address",value:email});
  }

  const phones=body.match(/(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g)||[];
  for(const phone of phones){
    if(!allowedPhone.test(phone)) violations.push({file:rel,label:"non-placeholder phone number"});
  }
}

if(violations.length){
  console.error("Public skill sanitization failed.");
  for(const v of violations) console.error("- "+v.file+": "+v.label+(v.value?" ("+v.value+")":""));
  process.exit(1);
}

console.log("Public skill sanitization passed for "+files.length+" text artifacts.");
