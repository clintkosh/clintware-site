import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "src", "index.js");
const tempPath = path.join(root, "src", `index.auth-test-${process.pid}.mjs`);
const productionHash = "f6acf1768cd83f94d0a8b4c84e11c087612d11084e3dd829a6106617593102b2";
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

  const login = await worker.fetch(new Request("https://zsc.clintware.com/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: testPassword }).toString(),
    redirect: "manual"
  }));
  assert(login.status === 302, `successful login expected 302, got ${login.status}`);
  assert(login.headers.get("Location") === "/", `successful login Location should be /, got ${login.headers.get("Location")}`);

  const setCookie = login.headers.get("Set-Cookie") || "";
  assert(setCookie.includes("zs_session="), "session cookie missing");
  assert(setCookie.includes("Secure"), "Secure cookie attribute missing");
  assert(setCookie.includes("HttpOnly"), "HttpOnly cookie attribute missing");
  assert(setCookie.includes("SameSite=Strict"), "SameSite=Strict cookie attribute missing");
  const cookie = setCookie.split(";", 1)[0];

  const app = await worker.fetch(new Request("https://zsc.clintware.com/", {
    headers: { Cookie: cookie }
  }));
  assert(app.status === 200, `authenticated root expected 200, got ${app.status}`);
  const appBody = await app.text();
  assert(appBody.includes("Command Center"), "authenticated app missing Command Center");
  assert(appBody.includes("Seed Demo Accounts"), "authenticated app missing seeded-account control");

  const refresh = await worker.fetch(new Request("https://zsc.clintware.com/", {
    headers: { Cookie: cookie }
  }));
  assert(refresh.status === 200, `authenticated refresh expected 200, got ${refresh.status}`);
  assert((await refresh.text()).includes("Command Center"), "authenticated refresh lost app session");

  const logout = await worker.fetch(new Request("https://zsc.clintware.com/logout", {
    headers: { Cookie: cookie },
    redirect: "manual"
  }));
  assert(logout.status === 302, `logout expected 302, got ${logout.status}`);
  assert(logout.headers.get("Location") === "/", "logout should redirect to /");
  assert((logout.headers.get("Set-Cookie") || "").includes("Max-Age=0"), "logout did not expire session cookie");

  console.log("PASS: ZSC anonymous gate -> rejected bad password -> login -> cookie -> authenticated app -> refresh -> logout");
} finally {
  await fs.rm(tempPath, { force: true });
}
