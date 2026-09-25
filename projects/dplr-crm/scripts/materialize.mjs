import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const source = path.join(repo, "projects", "dpl-crm");
const overlay = path.join(repo, "projects", "dplr-crm");
const out = path.join(repo, ".build", "dplr-crm");

if (!fs.existsSync(source)) throw new Error(`Missing source CRM: ${source}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.cpSync(source, out, { recursive: true });

function rewrite(file, transforms) {
  const target = path.join(out, file);
  let text = fs.readFileSync(target, "utf8");
  for (const [from, to] of transforms) text = text.split(from).join(to);
  fs.writeFileSync(target, text);
}

const common = [
  ["clintware-dpl-crm", "clintware-dplr-crm"],
  ["dpl-crm", "dplr-crm"],
  ["https://dpl.clintware.com", "https://dplrcrm.clintware.com"],
  ["__Host-dpl-", "__Host-dplr-"],
  ["Doppel Technical Customer Engineering CRM", "Doppel Technical Customer Engineering OS"],
  ["DOPPEL TCE CRM", "DOPPEL TCE OS"],
];

rewrite("src/index.js", [
  ...common,
  ['const WORKSPACE_ID="dpl-doppel";', 'const WORKSPACE_ID="dplr-doppel";'],
  ['idFromName("n7demo-main")', 'idFromName("dplr-main")'],
]);
rewrite("package.json", [...common, ["public/doppel-polish.js", "public/dplr-shell.js"]]);
rewrite("wrangler.jsonc", common);
rewrite("public/app-config.js", [
  ["dpltheme", "dplrtheme"],
  ['localStorage.getItem("dplrtheme")||"dark"', 'localStorage.getItem("dplrtheme")||"light"'],
]);
rewrite("public/app-router.js", [["dpltheme", "dplrtheme"], ["DOPPEL TCE CRM", "DOPPEL TCE OS"], ["Doppel TCE CRM", "Doppel TCE OS"]]);

for (const file of ["index.html", "dplr-ui.css", "dplr-shell.js"]) {
  fs.copyFileSync(path.join(overlay, "public", file), path.join(out, "public", file));
}
for (const stale of ["doppel-brand.css", "doppel-polish.js"]) {
  fs.rmSync(path.join(out, "public", stale), { force: true });
}

const wrangler = fs.readFileSync(path.join(out, "wrangler.jsonc"), "utf8");
if (!wrangler.includes('"name":"clintware-dplr-crm"')) throw new Error("Worker name patch failed");
const worker = fs.readFileSync(path.join(out, "src/index.js"), "utf8");
for (const required of [
  'const APP_ID="dplr-crm"',
  'const REQUIRED_CONTEXT="dplr-crm:read"',
  'ctx.includes("dplr-crm:write")',
  'const WORKSPACE_ID="dplr-doppel"',
  '/client-config/dplr-crm',
]) {
  if (!worker.includes(required)) throw new Error(`Backend identity patch missing: ${required}`);
}
const pkg = fs.readFileSync(path.join(out, "package.json"), "utf8");
if (pkg.includes("public/doppel-polish.js") || !pkg.includes("public/dplr-shell.js")) throw new Error("Package validation still targets retired UI");
const html = fs.readFileSync(path.join(out, "public/index.html"), "utf8");
if (html.includes("doppel-brand.css") || html.includes("doppel-polish.js")) throw new Error("Old marketing presentation layer leaked into DPLR");
if (!html.includes("dplr-ui.css") || !html.includes("dplr-shell.js")) throw new Error("DPLR UI overlay missing");
const config = fs.readFileSync(path.join(out, "public/app-config.js"), "utf8");
if (!config.includes('localStorage.getItem("dplrtheme")||"light"')) throw new Error("DPLR must default to N7-style light mode");

console.log(`DPLR materialized at ${out}`);
