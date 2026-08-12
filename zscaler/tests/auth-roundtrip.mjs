import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "src", "index.js");
const tempPath = path.join(root, "src", `index.auth-test-${process.pid}.mjs`);
const productionHash = "0758948c6837fc67872c56f1c95668556f9d755e654a65e6ff8de8973a045dc6";
const testPassword = "zsc-auth-test-2026";
const testHash = createHash("sha256").update(testPassword).digest("hex");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const source = await fs.readFile(sourcePath, "utf8");
  assert(source.includes(productionHash), "production password hash marker missing");
  const testSource = source.replace(productionHash, testHash);
  await fs.writeFile(tempPath, testSource, "utf8");

  const moduleUrl = `${pathToFileURL(tempPath).href}?t=${Date.now()}`;
  const worker = (await import(moduleUrl)).default;

  const gate = await worker.fetch(new Request("https://zsc.clintware.com/"));
  assert(gate.status === 200, `anonymous gate expected 200, got ${gate.status}`);
  assert((await gate.text()).includes("Open the operating platform"), "anonymous gate content missing");

  const bad = await worker.fetch(new Request("https://zsc.clintware.com/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: "wrong-password" }).toString()
  }));
  assert(bad.status === 401, `bad password expected 401, got ${bad.status}`);
  assert((await bad.text()).includes("Access denied"), "bad password response missing error");

  const login = await worker.fetch(new Request("https://zsc.clintware.com/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: testPassword }).toString()
  }));
  assert(login.status === 200, `successful login expected direct 200, got ${login.status}`);
  assert(!login.headers.get("Location"), "working CRM-style login must not redirect");
  assert(!login.headers.get("Set-Cookie"), "working CRM-style login must not create a session cookie");
  const appBody = await login.text();
  assert(appBody.includes("Command Center"), "successful login did not return Command Center");
  assert(appBody.includes("Seed Demo Accounts"), "successful login did not return seeded-account control");

  const refresh = await worker.fetch(new Request("https://zsc.clintware.com/"));
  assert(refresh.status === 200, `refresh gate expected 200, got ${refresh.status}`);
  const refreshBody = await refresh.text();
  assert(refreshBody.includes("Open the operating platform"), "refresh should return to the same gate as the working CRM");
  assert(!refreshBody.includes("Command Center"), "refresh unexpectedly retained a session");

  const logout = await worker.fetch(new Request("https://zsc.clintware.com/logout", { redirect: "manual" }));
  assert(logout.status === 302, `logout expected 302, got ${logout.status}`);
  assert(logout.headers.get("Location") === "/", "logout should redirect to /");

  console.log("PASS: ZSC matches working CRM gate: anonymous gate -> reject bad password -> direct app HTML on valid password -> no cookie/session -> refresh returns gate");
} finally {
  await fs.rm(tempPath, { force: true });
}
