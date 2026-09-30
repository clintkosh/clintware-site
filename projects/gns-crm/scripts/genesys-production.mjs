import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.dirname(fileURLToPath(import.meta.url));
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const write=(rel,text)=>fs.writeFileSync(path.join(root,rel),text);
function rewrite(rel,transforms){
  const p=path.join(root,rel);
  if(!fs.existsSync(p))return;
  let text=fs.readFileSync(p,"utf8");
  for(const [from,to] of transforms)text=text.split(from).join(to);
  fs.writeFileSync(p,text);
}

let src=read("src/index.js");
src=src.replaceAll("Anthropic GSI Customer Success Workspace","Genesys Customer Success Director Workspace");
src=src.replaceAll("Anthropic GSI Guest Demo","Genesys Customer Success Guest Demo");
src=src.replaceAll("Anthropic GSI Customer Success Operating System","Genesys Customer Success Director Operating System");
src=src.replaceAll("Customer Success Manager, GSI","Customer Success, Director");
src=src.replaceAll("GSI Customer Success","Enterprise Customer Success");
src=src.replaceAll("anthropic.com","genesys.com");
if(/Doppel|doppel\.com/i.test(src))throw new Error("Source-company semantics detected in generated Genesys worker.");
write("src/index.js",src);

for(const rel of ["public/app-config.js","public/app-router.js","public/app-views.js","public/app-ai.js","public/app-forms.js","public/import-utils.js","public/dplr-shell.js","public/dplr-prep.js"]){
  rewrite(rel,[
    ["Anthropic GSI Customer Success Operating System","Genesys Customer Success Director Operating System"],
    ["ANTHROPIC GSI CS OS","GENESYS CS DIRECTOR OS"],
    ["Customer Success Manager, GSI","Customer Success, Director"],
    ["GSI Customer Success","Enterprise Customer Success"],
    ["Anthropic","Genesys"]
  ]);
}

for(const rel of ["src/index.js","public/app-config.js","public/app-router.js","public/app-views.js","public/app-ai.js","public/app-forms.js","public/import-utils.js","public/dplr-shell.js","public/dplr-prep.js"]){
 const text=read(rel);
 if(/Doppel|doppel\.com/i.test(text))throw new Error("Source-company semantics leaked into generated Genesys runtime: "+rel);
}
console.log("Genesys CRM+Cover production transform applied.");
