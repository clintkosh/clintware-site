import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "src", "index.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = await fs.readFile(sourcePath, "utf8");
assert(source.includes("const PASS='DT3XK0$H2026',SESSION_KEY='summertime_demo_access'"), "DTEX gate password/session constants missing");

const worker = (await import(`${pathToFileURL(sourcePath).href}?t=${Date.now()}`)).default;
const response = await worker.fetch(new Request("https://abc.clintware.com/"));
assert(response.status === 200, `GET / expected 200, got ${response.status}`);
const body = await response.text();

assert(body.includes('id="gate"'), "DTEX gate missing");
assert(body.includes('id="access-form"'), "DTEX access form missing");
assert(body.includes('id="pw"'), "DTEX password input missing");
assert(body.includes("Restricted preview"), "DTEX gate copy missing");
assert(body.includes("Unlock demo"), "DTEX unlock button missing");
assert(body.includes("Command Center"), "full ZSC app must be present in the same response");
assert(body.includes("Seed Demo Accounts"), "ZSC app controls missing from same response");
assert((body.match(/id="app"/g) || []).length === 1, "DTEX must control the existing ABC id=app element exactly once");
assert(!body.includes('action="/login"'), "server login form still present");

const scriptMatch = body.match(/<script id="dtex-gate-js">([\s\S]*?)<\/script>/);
assert(scriptMatch, "DTEX gate script missing");
const gateScript = scriptMatch[1];

const classes = new Set();
const storage = new Map();
const form = {};
const pw = { value: "", selected: false, select(){ this.selected = true; } };
const err = { textContent: "" };
const document = {
  title: "Private Customer Success Demo",
  body: { classList: {
    add(c){ classes.add(c); },
    remove(c){ classes.delete(c); },
    contains(c){ return classes.has(c); }
  }},
  getElementById(id){
    if (id === "access-form") return form;
    if (id === "pw") return pw;
    if (id === "gate-error") return err;
    return null;
  },
  addEventListener(name, fn){ if (name === "DOMContentLoaded") fn(); }
};
const sessionStorage = {
  setItem(k,v){ storage.set(k,String(v)); },
  getItem(k){ return storage.has(k) ? storage.get(k) : null; },
  removeItem(k){ storage.delete(k); }
};
const context = {
  document,
  sessionStorage,
  location: { hostname: "abc.clintware.com" },
  gtag: undefined,
  console
};
vm.createContext(context);
vm.runInContext(gateScript, context);
assert(typeof form.onsubmit === "function", "DTEX form handler was not bound");

pw.value = "wrong-password";
form.onsubmit({ preventDefault(){} });
assert(err.textContent === "Incorrect password.", "wrong password did not show DTEX error");
assert(pw.selected === true, "wrong password did not select input");
assert(!classes.has("unlocked"), "wrong password unlocked app");

pw.selected = false;
pw.value = "DT3XK0$H2026";
form.onsubmit({ preventDefault(){} });
assert(err.textContent === "", "correct password left error text");
assert(classes.has("unlocked"), "correct password did not add unlocked class");
assert(storage.get("summertime_demo_access") === "1", "DTEX sessionStorage unlock flag missing");

// Simulate DTEX's same-tab reload behavior with the same sessionStorage state.
classes.clear();
const form2 = {};
const pw2 = { value: "", select(){} };
const err2 = { textContent: "" };
context.document.getElementById = (id) => id === "access-form" ? form2 : id === "pw" ? pw2 : id === "gate-error" ? err2 : null;
vm.runInContext('bind()', context);
assert(classes.has("unlocked"), "DTEX sessionStorage did not auto-unlock on same-tab reload");

const post = await worker.fetch(new Request("https://abc.clintware.com/login", { method: "POST" }));
assert(post.status === 405, `old server /login path should be disabled, got ${post.status}`);

console.log("PASS: exact DTEX client gate works: wrong password rejected, exact password unlocks, sessionStorage preserves unlock, server /login removed");
