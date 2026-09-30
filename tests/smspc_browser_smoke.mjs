import fs from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.SMSPC_URL || "https://smspc.clintware.com/";
const resultPath = process.env.SMSPC_SMOKE_RESULT || "ops/smspc-live-smoke.json";
const startedAt = new Date().toISOString();
const checks = [];
const consoleErrors = [];
const pageErrors = [];
const record = (name, ok, detail = "") => {
  checks.push({ name, ok: Boolean(ok), detail: String(detail || "") });
  if (!ok) throw new Error(name + (detail ? ": " + detail : ""));
};
const assert = (cond, name, detail = "") => record(name, cond, detail);

await fs.mkdir("ops", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true });
const page = await context.newPage();
page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("pageerror", err => pageErrors.push(String(err?.stack || err)));

async function waitApp() {
  await page.waitForSelector(".dplr-appbar", { timeout: 30000 });
  await page.waitForTimeout(250);
  assert(await page.locator(".startup-error").count() === 0, "No visible startup error");
}
async function noOverflow(label) {
  const x = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert(x.sw <= x.cw + 2, label + " has no horizontal overflow", x.sw + " <= " + x.cw);
}

let passed = false;
let failure = "";
let pdfBytes = 0;
let customerCount = 0;
const trackLabels = [];
try {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("__smspc_smoke_initialized")) {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem("__smspc_smoke_initialized", "1");
    }
  });

  let response=null,ready=false;
  for(let attempt=1;attempt<=30;attempt++){
    response=await page.goto(base,{waitUntil:"networkidle",timeout:60000});
    if(response&&response.ok()){
      try{
        await page.waitForSelector(".dplr-appbar",{timeout:4000});
        ready=true;
        break;
      }catch{}
    }
    await page.waitForTimeout(4000);
  }
  assert(Boolean(response&&response.ok()), "Live homepage returns HTTP success", response?.status?.());
  assert(ready, "Live CRM reaches ready app shell after deployment convergence");
  consoleErrors.length=0;
  pageErrors.length=0;
  await waitApp();

  await page.waitForSelector(".smspc-gate", { timeout: 12000 });
  assert(await page.locator("[data-smspc-track]").count() === 8, "Exactly eight operating tracks render");
  const disclosure = await page.locator(".smspc-disclosure").innerText();
  assert(/not an official SimSpace product/i.test(disclosure), "Candidate/synthetic boundary is visible");

  const bodyTextBefore = await page.locator("body").innerText();
  assert(!bodyTextBefore.includes("Sign in for durable workspace"), "Removed durable sign-in CTA is absent");
  assert(!bodyTextBefore.includes("Sign in to keep data"), "Removed keep-data sign-in CTA is absent");
  assert(await page.locator('a[href="/auth/login"]').count() === 0, "No auth-login link is exposed");

  const me = await page.evaluate(async()=>{const r=await fetch("/me");return {ok:r.ok,data:await r.json()};});
  assert(me.ok, "/me endpoint responds");
  const meData = me.data;
  assert(meData.authenticated === false, "Workspace is explicitly unauthenticated");
  assert(meData.persistence === "browser-persistent", "Workspace reports browser persistence", JSON.stringify(meData));

  const stateProbe = await page.evaluate(async()=>{const r=await fetch("/api/state");return {ok:r.ok,data:await r.json(),local:Boolean(window.SMSPC_LOCAL_MODE)};});
  assert(stateProbe.ok, "State endpoint responds through browser-local resilience");
  assert(stateProbe.local === true, "Browser-local resilience layer is active");
  const state = stateProbe.data;
  customerCount = Array.isArray(state.customers) ? state.customers.length : 0;
  assert(customerCount === 7, "Seven synthetic opportunity samples are loaded", String(customerCount));
  assert(state.customer?.name === "Aegis National Bank", "Aegis golden opportunity is selected", state.customer?.name || "");
  assert((state.customers || []).every(c => c.isSynthetic || c.isGoldenExample), "Sample portfolio does not imply private customer facts");

  await page.locator('[data-smspc-track="discovery"]').click();
  await page.waitForTimeout(350);
  assert(await page.locator(".smspc-gate").count() === 0, "Operating-track chooser closes");
  assert((await page.locator(".smspc-banner").innerText()).includes("Outcome Discovery"), "Outcome Discovery banner renders");
  assert(await page.evaluate(() => localStorage.getItem("smspcActiveTrack")) === "discovery", "Selected track persists in local storage");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#smspc-brief").click();
  const download = await downloadPromise;
  const pdfPath = await download.path();
  assert(Boolean(pdfPath), "Technical brief download has a local path");
  const pdf = await fs.readFile(pdfPath);
  pdfBytes = pdf.length;
  assert(pdf.subarray(0, 4).toString() === "%PDF", "Technical brief is a valid PDF header");
  assert(pdf.length > 500, "Technical brief PDF contains substantive output", String(pdf.length));

  await page.locator('[data-add="stakeholder"]').first().click();
  await page.waitForSelector(".overlay .modal", { timeout: 10000 });
  await page.locator('[data-f="name"]').fill("SMSPC Browser QA Stakeholder");
  await page.locator('[data-f="role"]').fill("Synthetic Evaluation Owner");
  await page.locator('[data-f="organization"]').fill("Aegis National Bank (Synthetic)");
  await page.locator('[data-f="decisionRole"]').fill("Automated browser verification only");
  await page.locator('[data-f="status"]').fill("Active");
  await page.locator('[data-f="notes"]').fill("Synthetic QA record created in an isolated browser workspace.");
  await page.locator("#pv").selectOption("template");
  await page.locator("#save").click();
  await page.waitForTimeout(600);
  assert((await page.locator("body").innerText()).includes("SMSPC Browser QA Stakeholder"), "Synthetic stakeholder create is reflected in live UI");

  await page.reload({ waitUntil: "networkidle" });
  await waitApp();
  const persistedState=await page.evaluate(async()=>{const r=await fetch("/api/state");return await r.json();});
  assert((persistedState.records||[]).some(r=>r.type==="stakeholder"&&r.data?.name==="SMSPC Browser QA Stakeholder"), "Synthetic stakeholder survives reload in browser-persistent workspace");

  const tracks = [
    ["discovery", "Outcome Discovery"],
    ["range-blueprint", "Range Blueprint"],
    ["evaluation", "Evaluation & Success Criteria"],
    ["field-engineering", "Field Engineering & Integrations"],
    ["demo-pilot", "Tailored Demo / Pilot"],
    ["rfp", "RFI / RFP Technical Narrative"],
    ["partners", "Partner Co-Sell & Enablement"],
    ["close-expand", "Technical Close, Expansion & Product Signal"]
  ];
  for (const [id, label] of tracks) {
    const current = await page.evaluate(() => localStorage.getItem("smspcActiveTrack"));
    if (current !== id) {
      await page.locator("#smspc-switch").click();
      await page.waitForSelector(".smspc-gate");
      await page.locator('[data-smspc-track="' + id + '"]').click();
      await page.waitForTimeout(250);
    }
    const banner = await page.locator(".smspc-banner").innerText();
    assert(banner.includes(label), "Track renders: " + label);
    trackLabels.push(label);
  }

  await page.locator(".dplr-more summary").click();
  await page.locator("#theme").selectOption("light");
  assert(await page.evaluate(() => document.documentElement.dataset.theme) === "light", "Light theme applies");
  await page.locator("#theme").selectOption("dark");
  assert(await page.evaluate(() => document.documentElement.dataset.theme) === "dark", "Dark theme applies");

  assert(await page.locator("#smspc-brief").count() === 1, "Technical-brief control remains present after track cycling");
  await page.screenshot({ path: "smspc-desktop-smoke.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await waitApp();
  assert(await page.locator("#smspc-switch").count() === 1, "Mobile track switcher is present");
  assert((await page.locator(".smspc-banner").innerText()).includes("Technical Close, Expansion & Product Signal"), "Selected track survives mobile reload");
  await noOverflow("Mobile SimSpace CRM");
  await page.screenshot({ path: "smspc-mobile-smoke.png", fullPage: true });

  assert(pageErrors.length === 0, "No uncaught page errors", pageErrors.join(" | "));
  assert(consoleErrors.length === 0, "No browser console errors", consoleErrors.join(" | "));
  passed = true;
} catch (err) {
  failure = String(err?.stack || err);
  try { await page.screenshot({ path: "smspc-failure.png", fullPage: true }); } catch {}
} finally {
  await browser.close();
  const result = {
    schema: "clintware-smspc-live-smoke/v1",
    target: base,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    passed,
    customer_count: customerCount,
    tracks_verified: trackLabels,
    pdf_bytes: pdfBytes,
    checks,
    console_errors: consoleErrors,
    page_errors: pageErrors,
    failure
  };
  await fs.writeFile(resultPath, JSON.stringify(result, null, 2) + "\n", "utf8");
}

if (!passed) {
  console.error(failure || "SimSpace browser smoke failed.");
  process.exitCode = 1;
} else {
  console.log("SMSPC browser smoke passed: live shell, auth-clean browser persistence, seven synthetic opportunities, stakeholder CRUD, PDF brief, all eight operating tracks, themes, and mobile layout.");
}
